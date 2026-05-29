# 明鉴财法风控系统

明鉴是一个面向企业财务、法务、审计和报销审批场景的数字化风控平台。它把合同风险审核、发票结构化识别、报销三单合一校验、异步任务进度、审计日志放到同一个系统里，减少人工反复核对和事后追责困难的问题。

## 一句话

这是一个“财务资料进入系统后，自动识别、校验、留痕、辅助审批”的风控工作台。

## 解决的问题

| 问题 | 系统怎么解决 |
| --- | --- |
| 合同风险靠人工逐条看，容易漏条款 | PDF/DOCX 上传后，规则引擎 + 火山方舟大模型共同分析合同风险，沉淀风险分数、风险等级和修复建议 |
| 发票字段靠手录，效率低且容易错 | 发票 PDF/图片上传后，通过火山方舟多模态能力做 OCR 结构化识别，写入发票主表和明细表 |
| 报销单、发票、收据之间金额和状态难对齐 | 报销单创建后自动运行三单合一校验，输出匹配分、缺失项、重复/无效发票列表 |
| 长耗时任务阻塞前端 | 合同分析、发票 OCR 等任务通过 Celery 或 inline 模式执行，前端轮询任务进度 |
| 谁上传、谁审批、谁修改难追踪 | 关键操作写入审计日志，支持后续追责和复盘 |
| 项目时间久了启动/部署方式容易忘 | 本 README 记录本地启动、服务器部署、后续迭代发布和关键代码阅读顺序 |

> 当前边界：发票“真伪验证”接口在代码中保留了任务和 mock 服务能力，但正式 API `POST /api/invoices/{id}/verify` 当前返回 `501`，说明真实验真服务尚未接入；后续计划通过腾讯发票核验服务完成。当前可用能力是发票大模型 OCR、重复检测逻辑基础、报销校验和合同分析。

## 上下游

| 方向 | 参与方/系统 | 说明 |
| --- | --- | --- |
| 上游用户 | 员工、审核人、管理员 | 登录系统后上传合同/发票、创建报销单、审批或驳回报销 |
| 上游文件 | 合同 PDF/DOCX、发票 PDF/PNG/JPG/JPEG、报销收据附件 | 进入 `uploads` 或容器 volume，数据库保存文件路径和结构化结果 |
| 核心系统 | Next.js 前端、FastAPI 后端、Celery Worker | 前端展示和交互，后端提供 API，Worker 处理耗时任务 |
| 下游依赖 | PostgreSQL、Redis、火山方舟 API | PostgreSQL 保存业务数据，Redis 做 Celery broker/result backend，火山方舟用于合同 LLM 分析和发票 OCR |
| 运维入口 | Docker Compose、Flower、部署脚本 | 本地和生产都可容器化启动，Flower 监控任务，`scripts/deploy.*` 发布到服务器 |

## C4 模型

### C4 Level 1：系统上下文

```mermaid
flowchart LR
  Employee["员工/提交人"] --> Web["明鉴 Web 工作台"]
  Reviewer["审核人/管理员"] --> Web
  Web --> API["明鉴 API 服务"]
  API --> DB["PostgreSQL 业务库"]
  API --> Redis["Redis 队列/结果缓存"]
  API --> Uploads["上传文件存储"]
  API --> Ark["火山方舟 API"]
  Worker["Celery Worker"] --> Redis
  Worker --> DB
  Worker --> Uploads
  Worker --> Ark
  Ops["运维/开发"] --> Flower["Flower 任务监控"]
  Flower --> Redis
```

### C4 Level 2：容器视图

```mermaid
flowchart TD
  Browser["浏览器"] --> Frontend["frontend: Next.js 16 / React 19"]
  Frontend --> ApiClient["lib/api/client.ts"]
  ApiClient --> Backend["backend: FastAPI"]

  Backend --> Auth["JWT 认证和权限"]
  Backend --> Routes["业务路由 app/*.py"]
  Backend --> Services["业务服务 services/*.py"]
  Backend --> Models["SQLAlchemy Models"]
  Backend --> TaskRecords["async_tasks / task_progress"]

  Services --> Ark["火山方舟 Chat Completions"]
  Services --> Uploads["uploads 文件目录"]
  Models --> Postgres["PostgreSQL"]

  Backend --> Redis["Redis"]
  Redis --> Worker["Celery Worker"]
  Worker --> Services
  Flower["Celery Flower"] --> Redis
```

### C4 Level 3：后端组件

```mermaid
flowchart LR
  Main["backend/main.py"] --> Routers["app/auth|contracts|invoices|reimbursements|tasks|audit_logs|system.py"]
  Routers --> Deps["deps.py 当前用户依赖"]
  Routers --> Schemas["schemas.py 请求/响应模型"]
  Routers --> FileUtils["utils/file_handler.py + file_response.py"]
  Routers --> Biz["services/business_logic.py"]
  Routers --> CeleryTasks["tasks/celery_tasks.py"]
  CeleryTasks --> Biz
  Biz --> Volcano["services/volcano_service.py"]
  Biz --> ORM["models/__init__.py"]
  Routers --> Audit["utils/audit.py"]
  ORM --> Database["database.py SessionLocal/Base"]
  Main --> Config["config.py 环境变量"]
```

## 业务链路总览

```mermaid
flowchart TD
  Login["登录/注册"] --> Token["前端保存 JWT token"]
  Token --> Workbench["进入工作台"]
  Workbench --> Contract["合同上传与分析"]
  Workbench --> Invoice["发票上传与 OCR"]
  Workbench --> Reimbursement["创建报销单"]

  Contract --> ContractTask["合同分析任务"]
  ContractTask --> ContractResult["风险分数/等级/风险明细"]

  Invoice --> InvoiceTask["发票 OCR 任务"]
  InvoiceTask --> InvoiceResult["发票字段/明细/置信度"]

  InvoiceResult --> Reimbursement
  Reimbursement --> Verify["三单合一校验"]
  Verify --> Review["审核人/管理员审批或驳回"]
  Review --> Audit["审计日志留痕"]
```

## 关键流程图

### 合同审核流程

```mermaid
flowchart TD
  A["上传 PDF/DOCX"] --> B["校验扩展名和 50MB 大小限制"]
  B --> C["保存到 uploads/contracts"]
  C --> D["创建 contracts 记录"]
  D --> E["从 PDF/DOCX 提取文本"]
  E --> F{"文本是否可分析"}
  F -- 否 --> G["合同标记 error 并写审计日志"]
  F -- 是 --> H["创建 async_tasks 记录"]
  H --> I["按 BACKGROUND_TASK_MODE 执行任务"]
  I --> J["规则引擎检查付款/违约/税票/保险/保密/争议"]
  J --> K["火山方舟 LLM 语义分析"]
  K --> L["合并风险并写 contract_risks"]
  L --> M["更新合同 risk_score/risk_level/status"]
```

### 发票 OCR 流程

```mermaid
flowchart TD
  A["上传 PDF/PNG/JPG/JPEG"] --> B["校验格式和大小"]
  B --> C["保存到 uploads/invoices"]
  C --> D["创建 invoices 记录"]
  D --> E["创建 invoice_ocr 异步任务"]
  E --> F["Worker 读取文件"]
  F --> G["PDF 首页转图片或直接读取图片"]
  G --> H["调用火山方舟多模态模型"]
  H --> I{"OCR 是否成功"}
  I -- 否 --> J["ocr_status=error,status=error"]
  I -- 是 --> K["写发票号码/代码/日期/金额/购销方/明细"]
  K --> L["status=pending,validation_status=pending"]
  L --> M["前端轮询展示进度和结果"]
```

### 报销三单合一流程

```mermaid
flowchart TD
  A["创建报销单"] --> B["校验至少一个明细且金额大于 0"]
  B --> C["如绑定发票，校验发票存在且 OCR completed"]
  C --> D["写 reimbursements 和 reimbursement_items"]
  D --> E["自动执行 verify_reimbursement"]
  E --> F["统计明细数、绑定发票数、收据数"]
  F --> G["比较报销总额和绑定发票总额"]
  G --> H["检查重复/作废/无效发票"]
  H --> I["计算 matching_score"]
  I --> J{"状态判断"}
  J -- 有无效发票 --> K["failed"]
  J -- 全部绑定且金额匹配 --> L["verified"]
  J -- 部分绑定 --> M["partial_verified"]
  J -- 无绑定 --> N["not_verified"]
```

## 关键节点时序图

### 登录与 API 访问

```mermaid
sequenceDiagram
  participant U as 用户
  participant FE as Next.js 前端
  participant API as FastAPI /api/auth
  participant DB as PostgreSQL

  U->>FE: 输入用户名/邮箱和密码
  FE->>API: POST /api/auth/login
  API->>DB: 查询用户和 password_hash
  DB-->>API: 返回用户
  API->>API: bcrypt 校验密码并生成 JWT
  API-->>FE: access_token + user
  FE->>FE: localStorage 保存 token
  FE->>API: 后续请求携带 Authorization: Bearer token
```

### 合同分析时序

```mermaid
sequenceDiagram
  participant U as 用户
  participant FE as 合同上传页
  participant API as /api/contracts/upload
  participant DB as PostgreSQL
  participant W as Celery/inline 任务
  participant Ark as 火山方舟

  U->>FE: 选择合同文件
  FE->>API: multipart 上传文件 + 合同信息
  API->>DB: 创建合同和 async_task
  API->>W: contract.analyze_risks(task_id)
  API-->>FE: contract_id + task_id
  FE->>API: GET /api/tasks/{task_id} 轮询
  W->>DB: 写 30% 规则引擎进度
  W->>W: 运行内置规则引擎
  W->>DB: 写 70% LLM 进度
  W->>Ark: 合同语义分析
  Ark-->>W: JSON 风险结果
  W->>DB: 写合同风险、分数、任务结果、审计日志
  FE->>API: GET /api/contracts/{id}/risks
  API-->>FE: 风险明细和分数
```

### 发票 OCR 时序

```mermaid
sequenceDiagram
  participant U as 用户
  participant FE as 发票上传页
  participant API as /api/invoices/upload
  participant DB as PostgreSQL
  participant W as Celery/inline 任务
  participant Ark as 火山方舟

  U->>FE: 上传发票文件
  FE->>API: multipart 上传
  API->>DB: 创建 invoice 和 async_task
  API->>W: invoice.ocr_recognition(task_id)
  API-->>FE: invoice_id + task_id
  FE->>API: GET /api/tasks/{task_id} 轮询
  W->>DB: 写 OCR 开始进度
  W->>Ark: 发送图片 data URL 和结构化提示词
  Ark-->>W: 发票字段 JSON
  W->>DB: 更新 invoices、invoice_items、任务结果
  FE->>API: GET /api/invoices/{id}
  API-->>FE: 发票结构化结果
```

### 报销审批时序

```mermaid
sequenceDiagram
  participant E as 员工
  participant FE as 报销页面
  participant API as /api/reimbursements
  participant DB as PostgreSQL
  participant R as 审核人/管理员

  E->>FE: 填写报销明细并选择发票
  FE->>API: POST /api/reimbursements/
  API->>DB: 校验发票归属和 OCR 状态
  API->>DB: 创建报销单和明细
  API->>DB: 执行三单合一校验并写 verification
  API-->>FE: 返回报销单详情
  R->>FE: 查看待审报销
  FE->>API: PUT approve 或 reject
  API->>DB: 更新状态、审批人、审批意见
  API->>DB: 写审计日志
  API-->>FE: 审批结果
```

## 数据流

```mermaid
flowchart LR
  Files["上传文件"] --> Uploads["uploads / Docker uploads volume"]
  Uploads --> Extraction["文本提取或图片编码"]
  Extraction --> AI["火山方舟模型响应"]
  AI --> Struct["结构化 JSON"]
  Struct --> DB["PostgreSQL 业务表"]
  DB --> API["FastAPI 响应"]
  API --> FE["Next.js 页面"]

  DB --> TaskTables["async_tasks + task_progress"]
  TaskTables --> Polling["useTaskProgress/useTaskResult 轮询"]
  Polling --> FE

  DB --> Audit["audit_logs"]
```

## 核心状态

### 合同状态

```mermaid
stateDiagram-v2
  [*] --> pending: 上传成功
  pending --> analyzing: 分析任务开始
  analyzing --> completed: 规则/LLM 分析完成
  pending --> error: 文本无法提取
  analyzing --> error: 任务失败
```

### 发票状态

```mermaid
stateDiagram-v2
  [*] --> processing: 上传成功
  processing --> pending: OCR completed
  processing --> error: OCR failed
  pending --> verified: 验真成功且非重复(内部任务保留)
  pending --> invalid: 验真失败或重复(内部任务保留)
```

### 报销单状态

```mermaid
stateDiagram-v2
  [*] --> submitted: 创建报销单
  submitted --> approved: reviewer/admin 批准
  submitted --> rejected: reviewer/admin 驳回
  pending_review --> approved
  pending_review --> rejected
  approved --> reimbursed: 后续打款完成时可扩展
```

### 异步任务状态

```mermaid
stateDiagram-v2
  [*] --> pending: 创建 async_task
  pending --> processing: Worker/inline 开始执行
  processing --> completed: 写入 result
  processing --> failed: 写入 error_message
  failed --> processing: Celery retry
```

## 目录结构

```text
gatekeeper/
├── app/                         # Next.js App Router 页面
│   ├── page.tsx                 # 仪表盘
│   ├── login/page.tsx           # 登录页
│   ├── contracts/               # 合同列表、上传、详情
│   ├── invoices/                # 发票列表、上传、详情
│   ├── reimbursements/          # 报销列表、创建、详情
│   ├── activity/page.tsx        # 审计/活动页面
│   └── settings/page.tsx        # 设置/系统信息
├── components/                  # 导航、业务提示和 shadcn 风格 UI 组件
├── hooks/                       # 数据获取和任务轮询 Hook
├── lib/api/                     # 前端 API 配置、axios 客户端、下载工具
├── types/                       # 前端 TypeScript 类型
├── backend/
│   ├── main.py                  # FastAPI 应用入口、路由注册、生命周期
│   ├── config.py                # 环境变量和运行配置
│   ├── database.py              # SQLAlchemy engine/session/Base
│   ├── celery_app.py            # Celery broker/backend/任务配置
│   ├── deps.py                  # 当前用户认证依赖
│   ├── app/                     # API 路由层
│   │   ├── auth.py              # 注册、登录、当前用户
│   │   ├── contracts.py         # 合同上传、列表、详情、风险、文件
│   │   ├── invoices.py          # 发票上传、列表、详情、文件、OCR 状态
│   │   ├── reimbursements.py    # 报销创建、校验、审批、附件
│   │   ├── tasks.py             # 异步任务状态和结果
│   │   ├── audit_logs.py        # 审计日志查询
│   │   └── system.py            # 系统运行信息
│   ├── models/__init__.py       # SQLAlchemy 表模型
│   ├── schemas.py               # Pydantic 请求/响应模型
│   ├── services/
│   │   ├── business_logic.py    # 发票 OCR 入库、重复检测、报销校验
│   │   └── volcano_service.py   # 火山方舟 LLM/OCR 集成
│   ├── tasks/celery_tasks.py    # 合同分析、发票 OCR、发票验证任务
│   ├── utils/                   # 安全、文件、审计工具
│   ├── migrations/              # 初始 SQL 脚本
│   └── requirements.txt         # Python 依赖
├── scripts/
│   ├── deploy.ps1               # Windows PowerShell 服务器部署脚本
│   └── deploy.sh                # Linux/macOS 服务器部署脚本
├── Dockerfile.backend           # 后端/Worker/Flower 镜像
├── Dockerfile.frontend          # 前端生产镜像
├── docker-compose.yml           # 本地后端依赖和服务
├── docker-compose.prod.yml      # 生产全栈 Compose
├── deploy.env.example           # 服务器部署环境变量模板
├── deploy.env                   # 本地部署目标配置，包含敏感项，不要提交
├── start.sh                     # 本地快速启动脚本
└── README.md                    # 当前文档
```

## 技术栈

| 层 | 技术 |
| --- | --- |
| 前端 | Next.js 16、React 19、TypeScript、Tailwind CSS、Radix UI、SWR、axios |
| 后端 | FastAPI、SQLAlchemy、Pydantic、PyJWT/passlib、Uvicorn |
| 异步任务 | Celery、Redis、Flower |
| 数据库 | PostgreSQL 15 |
| AI 能力 | 火山方舟 OpenAI 兼容 Chat Completions，多模态发票 OCR，合同语义风险分析 |
| 部署 | Docker、Docker Compose、PowerShell/Bash 部署脚本 |

## 数据库模型

| 领域 | 表 | 用途 |
| --- | --- | --- |
| 用户和权限 | `users` | 用户账号、角色、部门、状态 |
| 审计 | `audit_logs` | 关键操作留痕 |
| 合同 | `contracts` | 合同主表、文件路径、风险分数、分析结果 |
| 合同 | `contract_risks` | 合同风险明细 |
| 合同 | `contract_clauses` | 合同条款提取结果，当前预留 |
| 发票 | `invoices` | 发票主表、OCR 字段、状态、验真字段 |
| 发票 | `invoice_items` | 发票行项目 |
| 发票 | `invoice_verification_logs` | 发票验证日志 |
| 报销 | `reimbursements` | 报销单主表、提交人、审批人、状态 |
| 报销 | `reimbursement_items` | 报销明细、绑定发票和收据 |
| 报销 | `reimbursement_verification` | 三单合一校验结果 |
| 任务 | `async_tasks` | 任务 id、类型、资源、状态、结果 |
| 任务 | `task_progress` | 任务进度百分比和当前步骤 |

## 角色和权限

| 角色 | 能力 |
| --- | --- |
| `employee` | 查看本人数据、上传合同和发票、创建并校验本人报销单 |
| `reviewer` | 查看全部报销单、校验报销单、审批或驳回报销单 |
| `admin` | 查看全部业务数据和审计日志、审批报销、管理全局数据 |

默认演示用户由 `DEMO_USER_ENABLED=True` 自动创建：

```text
用户名: demo
邮箱: demo@gatekeeper.com
密码: demo123
角色: admin
```

## API 端点速查

所有业务 API 默认以 `/api` 开头，前端默认读取 `NEXT_PUBLIC_API_URL=http://localhost:8000/api`。

| 模块 | 端点 |
| --- | --- |
| 认证 | `POST /api/auth/register`、`POST /api/auth/login`、`GET /api/auth/me`、`PUT /api/auth/me` |
| 系统 | `GET /api/system/info` |
| 审计 | `GET /api/audit-logs/` |
| 合同 | `POST /api/contracts/upload`、`GET /api/contracts/`、`GET /api/contracts/{id}`、`DELETE /api/contracts/{id}`、`GET /api/contracts/{id}/file`、`GET /api/contracts/{id}/risks`、`GET /api/contracts/{id}/analysis-status` |
| 发票 | `POST /api/invoices/upload`、`GET /api/invoices/`、`GET /api/invoices/{id}`、`DELETE /api/invoices/{id}`、`GET /api/invoices/{id}/file`、`GET /api/invoices/{id}/ocr-status`、`POST /api/invoices/batch/verify` |
| 报销 | `POST /api/reimbursements/`、`GET /api/reimbursements/`、`GET /api/reimbursements/{id}`、`DELETE /api/reimbursements/{id}`、`POST /api/reimbursements/{id}/verify`、`PUT /api/reimbursements/{id}/approve`、`PUT /api/reimbursements/{id}/reject`、`POST/GET /api/reimbursements/{id}/items/{item_id}/receipt` |
| 任务 | `GET /api/tasks/{task_id}`、`GET /api/tasks/{task_id}/result`、`GET /api/tasks/resource/{resource_type}/{resource_id}` |

## 本地启动

### 前置要求

- Docker 和 Docker Compose
- Node.js 18+，建议使用 Node.js 22
- pnpm 10+
- 如需运行非容器后端：Python 3.10+

### 推荐方式：Docker 启动后端依赖 + 本地启动前端

1. 创建后端环境变量：

```bash
cp backend/.env.example backend/.env
```

如果没有 `backend/.env.example`，可创建 `backend/.env`：

```env
DATABASE_URL=postgresql://gatekeeper:gatekeeper123@localhost:5432/gatekeeper_db
SECRET_KEY=change-this-in-local
ARK_API_KEY=
ARK_BASE_URL=https://ark.cn-beijing.volces.com/api/v3
ARK_CHAT_MODEL=doubao-seed-2-0-lite-260428
INVOICE_VERIFICATION_MODE=mock
REDIS_URL=redis://localhost:6379/0
CELERY_BROKER_URL=redis://localhost:6379/1
CELERY_RESULT_BACKEND=redis://localhost:6379/2
UPLOAD_DIR=./uploads
ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
AUTO_CREATE_TABLES=True
DEMO_USER_ENABLED=True
DEMO_USERNAME=demo
DEMO_EMAIL=demo@gatekeeper.com
DEMO_PASSWORD=demo123
BACKGROUND_TASK_MODE=inline
DEBUG=True
```

2. 启动 PostgreSQL、Redis、后端、Worker、Flower：

```bash
docker compose up -d
```

本地 `docker-compose.yml` 会启动后端，后端代码通过 volume 挂载，默认端口：

```text
后端 API: http://localhost:8000
API 文档: http://localhost:8000/docs
Flower: http://localhost:5555
PostgreSQL: localhost:5432
Redis: localhost:6379
```

3. 启动前端：

```bash
pnpm install
$env:NEXT_PUBLIC_API_URL="http://localhost:8000/api" # PowerShell
pnpm dev
```

Linux/macOS 使用：

```bash
NEXT_PUBLIC_API_URL=http://localhost:8000/api pnpm dev
```

访问：

```text
前端: http://localhost:3000
```

4. 登录演示账号：

```text
用户名或邮箱: demo 或 demo@gatekeeper.com
密码: demo123
```

### 一键脚本方式

Linux/macOS 可使用：

```bash
chmod +x start.sh
./start.sh
```

该脚本会启动 Docker Compose 服务并启动前端开发服务。Windows 下建议按上面的手动步骤执行，或者直接使用 PowerShell 分别执行 `docker compose up -d` 和 `pnpm dev`。

### 纯本地后端开发

当你需要调试 Python 后端而不希望后端跑在容器里：

```bash
docker compose up -d postgres redis
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python -m uvicorn main:app --reload --port 8000
```

另开一个终端启动 Worker：

```bash
cd backend
.\.venv\Scripts\Activate.ps1
celery -A celery_app worker --loglevel=info
```

如果 `BACKGROUND_TASK_MODE=inline`，上传接口会在请求内同步触发 Celery task 的 `apply`，便于本地少开一个 Worker；如果 `BACKGROUND_TASK_MODE=celery`，必须启动 Redis 和 Celery Worker。

## 常用开发命令

```bash
# 前端开发
pnpm dev

# 前端构建
pnpm build

# 前端生产启动
pnpm start

# 前端 lint
pnpm lint

# 启动本地 Compose 服务
docker compose up -d

# 查看服务
docker compose ps

# 查看后端日志
docker compose logs -f backend

# 查看 Worker 日志
docker compose logs -f celery_worker

# 停止服务
docker compose down
```

## 环境变量说明

| 变量 | 作用 | 本地建议 |
| --- | --- | --- |
| `DATABASE_URL` | 后端数据库连接 | Compose 内用 `postgres` 主机，本机后端用 `localhost` |
| `SECRET_KEY` | JWT 签名密钥 | 本地任意长随机值，生产必须更换 |
| `ARK_API_KEY` | 火山方舟 API Key | 没有时合同 LLM/OCR 会失败或降级 |
| `ARK_BASE_URL` | 火山方舟 OpenAI 兼容地址 | 默认 `https://ark.cn-beijing.volces.com/api/v3` |
| `ARK_CHAT_MODEL` | 使用的大模型 | 默认 `doubao-seed-2-0-lite-260428` |
| `INVOICE_VERIFICATION_MODE` | 发票验真模式 | 当前 `mock` |
| `REDIS_URL` | Redis 通用连接 | `redis://localhost:6379/0` |
| `CELERY_BROKER_URL` | Celery broker | `redis://localhost:6379/1` |
| `CELERY_RESULT_BACKEND` | Celery result backend | `redis://localhost:6379/2` |
| `UPLOAD_DIR` | 上传文件目录 | 本地 `./uploads`，容器 `/app/uploads` |
| `ALLOWED_ORIGINS` | CORS 白名单 | 前端地址，例如 `http://localhost:3000` |
| `AUTO_CREATE_TABLES` | 启动时自动建表 | 本地可 True，生产建议配合迁移策略 |
| `DEMO_USER_ENABLED` | 自动创建 demo 用户 | 本地 True，生产按需要关闭 |
| `BACKGROUND_TASK_MODE` | `inline` 或 `celery` | 本地 inline 简单，生产 celery |

## 服务器部署

项目内置了可重复执行的部署脚本，适合首次部署，也适合后续迭代完成后再次发布。

默认部署目标：

```text
SSH: root@192.168.10.122
远端目录: /opt/gatekeeper
前端: http://192.168.10.122:3000
API 文档: http://192.168.10.122:8000/docs
Flower: http://192.168.10.122:5555
```

### 1. 准备部署环境文件

首次执行部署脚本时会自动从 `deploy.env.example` 创建 `deploy.env`，并生成 `SECRET_KEY` 和数据库密码。也可以手动复制：

```bash
cp deploy.env.example deploy.env
```

重点检查：

```env
COMPOSE_PROJECT_NAME=gatekeeper
SECRET_KEY=change-this-long-random-secret
POSTGRES_PASSWORD=change-this-db-password
ARK_API_KEY=
ARK_BASE_URL=https://ark.cn-beijing.volces.com/api/v3
ARK_CHAT_MODEL=doubao-seed-2-0-lite-260428
INVOICE_VERIFICATION_MODE=mock
FRONTEND_PORT=3000
BACKEND_PORT=8000
FLOWER_PORT=5555
POSTGRES_PORT=5432
REDIS_PORT=6379
NEXT_PUBLIC_API_URL=http://192.168.10.122:8000/api
ALLOWED_ORIGINS=http://192.168.10.122:3000
BACKGROUND_TASK_MODE=celery
```

`deploy.env` 含敏感信息，不要提交到 Git。

### 2. 执行部署

Windows PowerShell：

```powershell
.\scripts\deploy.ps1
```

可指定服务器：

```powershell
.\scripts\deploy.ps1 -HostName "192.168.10.122" -User "root" -RemoteDir "/opt/gatekeeper"
```

Linux/macOS：

```bash
chmod +x scripts/deploy.sh
./scripts/deploy.sh
```

脚本会执行：

1. 检查本机 `ssh`、`scp`、`tar`。
2. 检查远端 Docker 和 Docker Compose。
3. 检查目标端口是否被非本项目服务占用。
4. 打包当前工作区，排除 `.git`、`.next`、`node_modules`、`uploads`、环境文件和日志。
5. 上传压缩包到服务器。
6. 上传 `deploy.env` 到远端 `/opt/gatekeeper/.env`。
7. 在远端执行 `docker compose --env-file .env -f docker-compose.prod.yml up -d --build --remove-orphans`。
8. 输出容器状态和访问地址。

### 3. 端口冲突处理

如果服务器已有服务占用端口，修改 `deploy.env`：

```env
FRONTEND_PORT=3001
BACKEND_PORT=8001
FLOWER_PORT=5556
POSTGRES_PORT=15432
REDIS_PORT=16379
NEXT_PUBLIC_API_URL=http://192.168.10.122:8001/api
ALLOWED_ORIGINS=http://192.168.10.122:3001
```

然后重新执行部署脚本。

### 4. 部署后验证

```bash
curl http://192.168.10.122:8000/health
curl http://192.168.10.122:8000/docs
```

远端查看日志：

```bash
ssh root@192.168.10.122
cd /opt/gatekeeper
docker compose --env-file .env -f docker-compose.prod.yml ps
docker compose --env-file .env -f docker-compose.prod.yml logs -f backend
docker compose --env-file .env -f docker-compose.prod.yml logs -f celery_worker
```

## 后续迭代完成后如何发布

每次功能迭代完成后，按这个顺序走，能最大限度避免“本地能跑，服务器忘了怎么发”的问题：

1. 本地确认代码和文档：

```bash
pnpm lint
pnpm build
docker compose up -d
```

2. 手动跑一遍关键业务：

```text
登录 demo
上传合同并等待任务完成
上传发票并等待 OCR 完成
创建报销单并查看校验结果
审核人/管理员审批或驳回
查看审计日志
```

3. 如果修改了数据库模型：

```text
更新 backend/models/__init__.py
同步更新 backend/migrations/ 或明确 AUTO_CREATE_TABLES 策略
更新本 README 的“数据库模型”和“部署注意事项”
生产部署前备份 PostgreSQL
```

4. 如果修改了环境变量：

```text
更新 deploy.env.example
更新服务器 /opt/gatekeeper/.env 或本地 deploy.env
更新本 README 的“环境变量说明”
```

5. 如果修改了前端 API 地址、端口或域名：

```text
同步修改 NEXT_PUBLIC_API_URL
同步修改 ALLOWED_ORIGINS
重新 build frontend 镜像
```

6. 执行部署脚本：

```powershell
.\scripts\deploy.ps1
```

或：

```bash
./scripts/deploy.sh
```

7. 部署后验证：

```text
前端页面可打开
/health 返回 healthy
/docs 可打开
Flower 可打开
上传文件链路正常
Worker 日志无连续失败
```

## 生产运维建议

### 备份数据库

```bash
docker compose --env-file .env -f docker-compose.prod.yml exec postgres \
  pg_dump -U gatekeeper gatekeeper_db > gatekeeper_backup.sql
```

恢复：

```bash
docker compose --env-file .env -f docker-compose.prod.yml exec -T postgres \
  psql -U gatekeeper -d gatekeeper_db < gatekeeper_backup.sql
```

### 文件备份

生产上传文件在 `docker-compose.prod.yml` 的 `uploads` volume 中。做服务器迁移或大版本发布前，需要同时备份：

```text
PostgreSQL 数据
uploads volume
远端 /opt/gatekeeper/.env
```

### 安全注意事项

- 生产必须替换 `SECRET_KEY`、数据库密码和 demo 密码。
- 生产建议关闭或重置 `DEMO_USER_ENABLED`。
- 不要把 PostgreSQL、Redis、Flower 暴露到公网；如果必须暴露，增加防火墙、Basic Auth 或 VPN。
- 对外域名部署时，配置 HTTPS 和反向代理。
- `ALLOWED_ORIGINS` 只保留真实前端域名。
- `ARK_API_KEY` 只放在环境变量中，不写入代码。

## 故障排查

| 现象 | 排查方式 |
| --- | --- |
| 前端 401 或跳登录 | 检查 token 是否过期，重新登录；检查后端 `SECRET_KEY` 是否变过 |
| 前端请求跨域失败 | 检查 `NEXT_PUBLIC_API_URL` 和后端 `ALLOWED_ORIGINS` |
| 合同分析失败 | 检查文件是否是可复制文本 PDF/DOCX；检查 `ARK_API_KEY`；查看 `contracts.analysis_error` 和 Worker 日志 |
| 发票 OCR 失败 | 检查文件格式、PDF 是否可渲染、`ARK_API_KEY`、Worker 日志 |
| 任务一直 pending | 如果 `BACKGROUND_TASK_MODE=celery`，检查 Redis 和 `celery_worker` 是否运行 |
| Flower 打不开 | 检查 `celery_flower` 容器和端口映射 |
| 数据表不存在 | 检查 `AUTO_CREATE_TABLES=True` 或执行 `backend/migrations/001_initial_schema.sql` |
| 服务器端口冲突 | 修改 `deploy.env` 的端口并重新部署 |

## 如何读代码

建议按下面顺序读，能最快建立心智模型：

1. `backend/main.py`：看 FastAPI 如何注册路由、启动时如何自动建表和创建 demo 用户。
2. `backend/config.py`：看所有环境变量和默认运行模式。
3. `backend/models/__init__.py`：看业务对象、状态字段和表关系。
4. `backend/app/auth.py` + `backend/deps.py`：看 JWT 登录和当前用户鉴权。
5. `backend/app/contracts.py` + `backend/tasks/celery_tasks.py`：看合同上传、文本提取、任务创建和双引擎分析。
6. `backend/app/invoices.py` + `backend/services/volcano_service.py`：看发票上传、OCR 和火山方舟调用。
7. `backend/app/reimbursements.py` + `backend/services/business_logic.py`：看报销创建、三单合一校验和审批权限。
8. `backend/app/tasks.py`：看前端轮询任务状态的返回格式。
9. `lib/api/config.ts` + `lib/api/client.ts`：看前端如何拼 API 地址、注入 JWT、处理 401。
10. `hooks/useTaskProgress.ts`：看任务轮询间隔和终止条件。
11. `docker-compose.yml`、`docker-compose.prod.yml`、`scripts/deploy.ps1`：看本地和生产环境如何启动。

## 后续迭代方向

- 接入真实发票验真服务，替换当前 `501` 占位接口和 mock 模式。
- 引入正式迁移工具，例如 Alembic，替代生产环境依赖 `AUTO_CREATE_TABLES`。
- 给 Flower 增加访问控制，或只允许内网访问。
- 为合同分析、发票 OCR、报销校验补充自动化测试。
- 把上传文件存储替换为对象存储，便于多实例部署。
- 增加反向代理和 HTTPS 配置样例。

## 许可证

MIT
