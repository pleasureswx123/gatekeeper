#!/usr/bin/env bash
set -euo pipefail

HOST_NAME="${HOST_NAME:-192.168.10.122}"
USER_NAME="${USER_NAME:-root}"
REMOTE_DIR="${REMOTE_DIR:-/opt/gatekeeper}"
ENV_FILE="${ENV_FILE:-deploy.env}"
SKIP_PORT_CHECK="${SKIP_PORT_CHECK:-0}"
NO_BUILD="${NO_BUILD:-0}"

while [ $# -gt 0 ]; do
  case "$1" in
    --host) HOST_NAME="$2"; shift 2 ;;
    --user) USER_NAME="$2"; shift 2 ;;
    --remote-dir) REMOTE_DIR="$2"; shift 2 ;;
    --env-file) ENV_FILE="$2"; shift 2 ;;
    --skip-port-check) SKIP_PORT_CHECK=1; shift ;;
    --no-build) NO_BUILD=1; shift ;;
    *) echo "Unknown argument: $1" >&2; exit 2 ;;
  esac
done

require_command() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "Missing required command: $1" >&2
    exit 1
  }
}

read_env() {
  local key="$1"
  local default="$2"
  if [ -f "$ENV_FILE" ]; then
    local value
    value="$(grep -E "^${key}=" "$ENV_FILE" | tail -n 1 | cut -d= -f2- || true)"
    [ -n "$value" ] && { echo "$value"; return; }
  fi
  echo "$default"
}

set_env_value() {
  local key="$1"
  local value="$2"
  if grep -qE "^${key}=" "$ENV_FILE"; then
    python3 - "$ENV_FILE" "$key" "$value" <<'PY'
from pathlib import Path
import sys
path = Path(sys.argv[1])
key = sys.argv[2]
value = sys.argv[3]
lines = path.read_text().splitlines()
for i, line in enumerate(lines):
    if line.startswith(key + "="):
        lines[i] = f"{key}={value}"
        break
path.write_text("\n".join(lines) + "\n")
PY
  else
    printf '%s=%s\n' "$key" "$value" >> "$ENV_FILE"
  fi
}

read_backend_env() {
  local key="$1"
  if [ -f backend/.env ]; then
    local value
    value="$(grep -E "^${key}=" backend/.env | tail -n 1 | cut -d= -f2- || true)"
    [ -n "$value" ] && { echo "$value"; return; }
  fi
  echo ""
}

require_command ssh
require_command scp
require_command tar

cd "$(dirname "$0")/.."

if [ ! -f "$ENV_FILE" ]; then
  cp deploy.env.example "$ENV_FILE"
  secret="$(LC_ALL=C tr -dc 'A-Za-z0-9' </dev/urandom | head -c 48 || true)"
  dbpass="gatekeeper$((100000 + RANDOM % 900000))"
  sed -i.bak \
    -e "s/change-this-long-random-secret/${secret}/" \
    -e "s/change-this-db-password/${dbpass}/" \
    "$ENV_FILE"
  rm -f "${ENV_FILE}.bak"
  echo "Created $ENV_FILE from deploy.env.example. Review it if you need to set ARK_API_KEY or custom ports."
fi

for key in ARK_API_KEY ARK_BASE_URL ARK_CHAT_MODEL INVOICE_VERIFICATION_MODE; do
  current="$(read_env "$key" "")"
  backend_value="$(read_backend_env "$key")"
  if [ -z "$current" ] && [ -n "$backend_value" ]; then
    set_env_value "$key" "$backend_value"
  fi
done

FRONTEND_PORT="$(read_env FRONTEND_PORT 3000)"
BACKEND_PORT="$(read_env BACKEND_PORT 8000)"
FLOWER_PORT="$(read_env FLOWER_PORT 5555)"
POSTGRES_PORT="$(read_env POSTGRES_PORT 5432)"
REDIS_PORT="$(read_env REDIS_PORT 6379)"
COMPOSE_PROJECT_NAME="$(read_env COMPOSE_PROJECT_NAME gatekeeper)"
SSH_TARGET="${USER_NAME}@${HOST_NAME}"

echo "Checking Docker on ${SSH_TARGET}..."
ssh "$SSH_TARGET" "docker --version >/dev/null && (docker compose version >/dev/null || docker-compose --version >/dev/null)"

if [ "$SKIP_PORT_CHECK" != "1" ]; then
  echo "Checking target ports: ${FRONTEND_PORT}, ${BACKEND_PORT}, ${FLOWER_PORT}, ${POSTGRES_PORT}, ${REDIS_PORT}"
  ssh "$SSH_TARGET" "set -eu
conflicts=''
for p in ${FRONTEND_PORT} ${BACKEND_PORT} ${FLOWER_PORT} ${POSTGRES_PORT} ${REDIS_PORT}; do
  line=\$(ss -tulpen 2>/dev/null | grep -E \":\$p[[:space:]]\" || true)
  if [ -n \"\$line\" ]; then
    names=\$(docker ps --filter \"publish=\$p\" --format '{{.Names}}' 2>/dev/null || true)
    if echo \"\$names\" | grep -q \"^${COMPOSE_PROJECT_NAME}-\"; then
      continue
    fi
    conflicts=\"\$conflicts
\$line\"
  fi
done
if [ -n \"\$conflicts\" ]; then
  echo 'Port conflict detected:'
  echo \"\$conflicts\"
  exit 23
fi"
fi

tmp="$(mktemp -t gatekeeper-deploy.XXXXXX.tar.gz)"
trap 'rm -f "$tmp"' EXIT

echo "Creating deployment archive..."
tar \
  --exclude=".git" \
  --exclude=".idea" \
  --exclude=".next" \
  --exclude="node_modules" \
  --exclude="uploads" \
  --exclude="backend/.env" \
  --exclude=".env" \
  --exclude=".env.local" \
  --exclude="*.log" \
  -czf "$tmp" .

echo "Uploading archive to ${SSH_TARGET}..."
ssh "$SSH_TARGET" "mkdir -p '$REMOTE_DIR' /tmp/gatekeeper-deploy"
scp "$tmp" "${SSH_TARGET}:/tmp/gatekeeper-deploy/app.tar.gz"
scp "$ENV_FILE" "${SSH_TARGET}:${REMOTE_DIR}/.env"

build_flag="--build"
[ "$NO_BUILD" = "1" ] && build_flag="--no-build"

echo "Deploying on remote server..."
ssh "$SSH_TARGET" "set -eu
cd '$REMOTE_DIR'
tar -xzf /tmp/gatekeeper-deploy/app.tar.gz -C '$REMOTE_DIR'
if docker compose version >/dev/null 2>&1; then
  compose='docker compose'
else
  compose='docker-compose'
fi
\$compose --env-file .env -f docker-compose.prod.yml up -d ${build_flag} --remove-orphans
\$compose --env-file .env -f docker-compose.prod.yml ps
echo
echo 'Frontend: http://${HOST_NAME}:${FRONTEND_PORT}'
echo 'API docs: http://${HOST_NAME}:${BACKEND_PORT}/docs'
echo 'Flower:   http://${HOST_NAME}:${FLOWER_PORT}'"
