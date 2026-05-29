param(
  [string]$HostName = "192.168.10.122",
  [string]$User = "root",
  [string]$RemoteDir = "/opt/gatekeeper",
  [string]$EnvFile = "deploy.env",
  [switch]$SkipPortCheck,
  [switch]$NoBuild
)

$ErrorActionPreference = "Stop"

function Require-Command($Name) {
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "Missing required command: $Name"
  }
}

function Read-DeployEnv($Path) {
  $values = @{}
  if (Test-Path $Path) {
    Get-Content $Path | ForEach-Object {
      $line = $_.Trim()
      if ($line -and -not $line.StartsWith("#") -and $line.Contains("=")) {
        $key, $value = $line.Split("=", 2)
        $values[$key.Trim()] = $value.Trim()
      }
    }
  }
  return $values
}

function Set-DeployEnvValue($Path, $Key, $Value) {
  $lines = if (Test-Path $Path) { @(Get-Content -LiteralPath $Path) } else { @() }
  $found = $false
  $updated = foreach ($line in $lines) {
    if ($line -match "^$([regex]::Escape($Key))=") {
      $found = $true
      "$Key=$Value"
    } else {
      $line
    }
  }
  if (-not $found) {
    $updated += "$Key=$Value"
  }
  Set-Content -LiteralPath $Path -Value $updated -Encoding UTF8
}

Require-Command ssh
Require-Command scp
Require-Command tar

function Assert-LastExit($Action) {
  if ($LASTEXITCODE -ne 0) {
    throw "$Action failed with exit code $LASTEXITCODE"
  }
}

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $repoRoot

if (-not (Test-Path $EnvFile)) {
  Copy-Item "deploy.env.example" $EnvFile
  $secret = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 48 | ForEach-Object {[char]$_})
  (Get-Content $EnvFile) `
    -replace "change-this-long-random-secret", $secret `
    -replace "change-this-db-password", "gatekeeper$(Get-Random -Minimum 100000 -Maximum 999999)" |
    Set-Content $EnvFile -Encoding UTF8
  Write-Host "Created $EnvFile from deploy.env.example. Review it if you need to set ARK_API_KEY or custom ports."
}

$envValues = Read-DeployEnv $EnvFile
$backendEnvValues = Read-DeployEnv "backend/.env"
foreach ($key in @("ARK_API_KEY", "ARK_BASE_URL", "ARK_CHAT_MODEL", "INVOICE_VERIFICATION_MODE")) {
  if (($backendEnvValues[$key]) -and -not ($envValues[$key])) {
    Set-DeployEnvValue $EnvFile $key $backendEnvValues[$key]
  }
}
$envValues = Read-DeployEnv $EnvFile
$projectName = $envValues["COMPOSE_PROJECT_NAME"]
if (-not $projectName) {
  $projectName = "gatekeeper"
}
$ports = @(
  ($envValues["FRONTEND_PORT"] ?? "3000"),
  ($envValues["BACKEND_PORT"] ?? "8000"),
  ($envValues["FLOWER_PORT"] ?? "5555"),
  ($envValues["POSTGRES_PORT"] ?? "5432"),
  ($envValues["REDIS_PORT"] ?? "6379")
) | Select-Object -Unique

$sshTarget = "$User@$HostName"

Write-Host "Checking Docker on $sshTarget..."
ssh $sshTarget "docker --version >/dev/null && (docker compose version >/dev/null || docker-compose --version >/dev/null)"
Assert-LastExit "Docker check"

if (-not $SkipPortCheck) {
  $portList = $ports -join " "
  $remoteCheck = @"
set -eu
project="$projectName"
conflicts=""
for p in $portList; do
  line=`$(ss -tulpen 2>/dev/null | grep -E ":`$p[[:space:]]" || true)
  if [ -n "`$line" ]; then
    names=`$(docker ps --filter "publish=`$p" --format '{{.Names}}' 2>/dev/null || true)
    if echo "`$names" | grep -q "^`$project-"; then
      continue
    fi
    conflicts="`$conflicts
`$line"
  fi
done
if [ -n "`$conflicts" ]; then
  echo "Port conflict detected:"
  echo "`$conflicts"
  exit 23
fi
"@
  Write-Host "Checking target ports: $($ports -join ', ')"
  ssh $sshTarget $remoteCheck
  Assert-LastExit "Port check"
}

$tmp = Join-Path ([System.IO.Path]::GetTempPath()) "gatekeeper-deploy-$([guid]::NewGuid()).tar.gz"
try {
  Write-Host "Creating deployment archive..."
  tar `
    --exclude=".git" `
    --exclude=".idea" `
    --exclude=".next" `
    --exclude="node_modules" `
    --exclude="uploads" `
    --exclude="backend/.env" `
    --exclude=".env" `
    --exclude=".env.local" `
    --exclude="*.log" `
    -czf $tmp .
  Assert-LastExit "Archive creation"

  Write-Host "Uploading archive to $sshTarget..."
  ssh $sshTarget "mkdir -p '$RemoteDir' /tmp/gatekeeper-deploy"
  Assert-LastExit "Remote directory creation"
  scp $tmp "${sshTarget}:/tmp/gatekeeper-deploy/app.tar.gz"
  Assert-LastExit "Archive upload"
  scp $EnvFile "${sshTarget}:${RemoteDir}/.env"
  Assert-LastExit "Environment upload"

  $buildFlag = if ($NoBuild) { "--no-build" } else { "--build" }
  $remoteDeploy = @"
set -eu
cd '$RemoteDir'
tar -xzf /tmp/gatekeeper-deploy/app.tar.gz -C '$RemoteDir'
if docker compose version >/dev/null 2>&1; then
  compose="docker compose"
else
  compose="docker-compose"
fi
`$compose --env-file .env -f docker-compose.prod.yml up -d $buildFlag --remove-orphans
`$compose --env-file .env -f docker-compose.prod.yml ps
echo
echo "Frontend: http://${HostName}:`${FRONTEND_PORT:-3000}"
echo "API docs: http://${HostName}:`${BACKEND_PORT:-8000}/docs"
echo "Flower:   http://${HostName}:`${FLOWER_PORT:-5555}"
"@

  Write-Host "Deploying on remote server..."
  ssh $sshTarget $remoteDeploy
  Assert-LastExit "Remote deploy"
}
finally {
  if (Test-Path $tmp) {
    Remove-Item $tmp -Force
  }
}
