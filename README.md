守门人财法风控系统
===

一个完整的数字化财务审计解决方案，包含智能合同审核、发票验证和报销审批功能。

## 📋 项目概述

### 这是什么？

**守门人财法风控系统** 是一个企业级的财务合规管理平台。它通过AI技术和自动化流程，帮助企业快速识别财务风险、验证发票真伪、自动审批报销申请。

系统由三个核心模块组成：
1. **智能合同审核** - 自动识别合同中的财务和法律风险
2. **发票合规验证** - OCR识别 + 联网核验 + 防重复
3. **报销三单合一** - 自动对账报销单、发票、银行单据

### 解决的问题

#### 业务问题
- ❌ **手工审核效率低** → ✅ AI双引擎自动分析，秒级完成
- ❌ **发票真伪难辨** → ✅ 火山引擎OCR + 国家税务查询
- ❌ **报销对账复杂** → ✅ 自动三单合一校验
- ❌ **风险难以追踪** → ✅ 完整的审计日志和追踪系统
- ❌ **数据孤立无法协作** → ✅ 统一平台，所有人可见

#### 技术问题
- ❌ **前后端耦合** → ✅ 前后端分离，独立部署
- ❌ **长时间操作阻塞** → ✅ Celery异步处理
- ❌ **难以扩展** → ✅ 模块化架构，易于定制
- ❌ **缺乏监控** → ✅ 完整的日志、任务监控、审计追踪

### 关键特性

| 特性 | 说明 |
|------|------|
| 🤖 双引擎分析 | 规则引擎 + LLM语义分析 |
| 🔍 智能OCR | 火山引擎高精度识别 |
| ⚡ 异步处理 | Celery队列，支持重试 |
| 📊 实时监控 | 任务进度、系统状态 |
| 🔒 安全认证 | JWT + 密码加密 |
| 📝 审计日志 | 完整的操作记录 |
| 🎨 现代UI | 深色主题、响应式设计 |
| 📦 容器化 | Docker一键部署 |

---

## 📚 项目编写逻辑

### 整体架构思想

系统采用**分层设计**，从上到下分为5层：

```
┌─────────────────────────────────────────────────────┐
│  表现层 (UI Layer) - Next.js 页面和React组件       │
│  • 用户交互、表单、展示、实时反馈                  │
└─────────────────────────────────────────────────────┘
                         ↕ HTTP/REST API
┌─────────────────────────────────────────────────────┐
│  API层 (API Layer) - FastAPI 路由                  │
│  • 请求验证、认证、授权、响应格式化               │
└─────────────────────────────────────────────────────┘
                         ↕ 业务调用
┌─────────────────────────────────────────────────────┐
│  业务层 (Business Logic Layer) - 服务类            │
│  • 核心业务逻辑、规则引擎、数据处理               │
└─────────────────────────────────────────────────────┘
                         ↕ 数据操作
┌─────────────────────────────────────────────────────┐
│  数据层 (Data Layer) - ORM和数据库操作             │
│  • SQLAlchemy ORM、查询优化、事务管理              │
└─────────────────────────────────────────────────────┘
                         ↕
┌─────────────────────────────────────────────────────┐
│  基础设施层 (Infrastructure) - 数据库、队列、缓存  │
│  • PostgreSQL、Redis、Celery、火山引擎             │
└─────────────────────────────────────────────────────┘
```

### 核心设计原则

#### 1. 关注点分离 (Separation of Concerns)
每一层只负责自己的职责，不越界：
- **前端** 只处理展示和用户交互，不涉及业务逻辑
- **API层** 只做请求验证和路由，不处理复杂业务
- **业务层** 集中所有业务逻辑，易于测试和复用
- **数据层** 只处理数据的CRUD操作

#### 2. 异步优先 (Async First)
长时间的操作都放在后台异步处理：
- 合同分析 → Celery任务
- 发票OCR → Celery任务  
- 发票验证 → Celery任务
- 报销验证 → Celery任务

用户无需等待，前端通过WebSocket/轮询监听进度。

#### 3. 数据驱动 (Data Driven)
系统的核心是数据流，而不是界面：
```
文件上传 → 文件处理 → 数据提取 → 业务处理 → 数据存储 → 结果呈现
```

每一步都有明确的输入输出数据模型。

#### 4. 错误恢复 (Error Recovery)
设计时考虑失败场景：
- Celery任务支持重试机制
- 异常详细记录到审计日志
- 用户友好的错误提示
- 支持人工介入和修正

### 代码组织逻辑

#### 后端代码组织

```
backend/
├── app/                    # API 路由层
│   ├── auth.py            # 认证相关接口
│   ├── contracts.py       # 合同相关接口
│   ├── invoices.py        # 发票相关接口
│   ├── reimbursements.py  # 报销相关接口
│   └── tasks.py           # 任务查询接口
├── models/                # ORM 模型层
│   └── __init__.py        # 所有数据库表定义
├── schemas/               # 请求/响应 Schema
│   └── __init__.py        # Pydantic 验证模型
├── services/              # 业务逻辑层
│   ├── volcano_service.py # 火山引擎集成
│   └── business_logic.py  # 核心业务逻辑
├── tasks/                 # 异步任务层
│   └── celery_tasks.py    # Celery 任务定义
├── utils/                 # 工具函数
│   ├── security.py        # 密码、JWT
│   └── file_handler.py    # 文件处理
└── database.py            # 数据库连接
```

**流程示例：用户上传合同**

```
1. API层 (contracts.py)
   POST /contracts/upload
   → 验证用户认证
   → 验证文件格式
   → 保存文件到本地

2. 业务层 (business_logic.py)
   → 检查重复上传
   → 创建合同记录
   → 触发异步任务

3. 任务层 (celery_tasks.py)
   analyze_contract_task()
   → 调用火山引擎LLM分析
   → 调用规则引擎检查
   → 存储风险结果
   → 更新任务进度

4. 数据层 (models/__init__.py)
   → 所有数据操作最终都来这里
   → 事务管理、关系维护

5. 前端轮询任务状态
   GET /api/tasks/{task_id}
   → 获取进度百分比
   → 显示实时结果
```

#### 前端代码组织

```
app/                      # Next.js 页面
├── page.tsx             # 仪表板
├── login/page.tsx       # 登录
├── contracts/           # 合同模块
│   ├── page.tsx        # 列表
│   ├── upload/page.tsx # 上传
│   └── [id]/page.tsx   # 详情+分析
├── invoices/            # 发票模块
│   ├── page.tsx        # 列表
│   ├── upload/page.tsx # 上传
│   └── [id]/page.tsx   # 详情+验证
└── reimbursements/      # 报销模块
    ├── page.tsx        # 列表
    ├── create/page.tsx # 创建
    └── [id]/page.tsx   # 详情

lib/api/                 # API 客户端层
├── config.ts           # API 配置
└── client.ts           # 请求拦截、错误处理

hooks/                   # 自定义 Hooks
├── useData.ts          # 数据获取
└── useTaskProgress.ts  # 任务监听

components/             # 可复用组件
└── Navigation.tsx      # 导航组件

types/                  # TypeScript 类型
└── index.ts
```

**前端数据流逻辑**

```
用户交互
  ↓
Hook 调用 API 客户端
  ↓
API 客户端发送请求 + 拦截
  ↓
获取响应数据
  ↓
组件状态更新 (React render)
  ↓
页面展示

特殊：长时间任务
  ↓
useTaskProgress hook
  ↓
轮询 GET /api/tasks/{id}
  ↓
实时更新进度条
```

### 核心模块的实现逻辑

#### 模块1：智能合同审核

**双引擎架构**

```
用户上传PDF
  ├─→ 规则引擎
  │   ├─ 检查付款条件
  │   ├─ 检查违约责任
  │   ├─ 检查知识产权
  │   └─ 检查生效条款
  │
  └─→ LLM语义分析 (火山引擎)
      ├─ 整体合同理解
      ├─ 条款间逻辑关系
      ├─ 隐含风险识别
      └─ 修复建议生成

合并结果 → 生成风险报告
```

**优势**：
- 规则引擎快速、准确、可解释
- LLM分析深入、全面、发现隐含风险
- 两者互补，覆盖显性和隐性风险

#### 模块2：发票合规管家

**四维验证框架**

```
上传发票图片
  ↓
1️⃣ OCR识别 (火山引擎)
   提取: 号码、日期、金额、税号、公司
  ↓
2️⃣ 真伪验证 (国家税务系统)
   查询: 发票是否存在、是否有效
  ↓
3️⃣ 重复检测 (历史12个月)
   检查: 相同号码是否已报销
  ↓
4️⃣ 信息一致性 (字段匹配)
   验证: 金额、日期、号码的匹配度
  ↓
综合评分: 0-100分，生成合规报告
```

**审计追踪**：每一步都记录日志，完整追踪审验过程

#### 模块3：报销三单合一

**自动对账逻辑**

```
报销单 vs 发票 vs 银行单
     ↓
1. 金额检查
   报销单金额 = 发票金额 = 银行支付金额
     ↓
2. 日期检查
   报销日期 ≥ 发票日期
   银行支付日期 ≤ 报销日期 + 30天
     ↓
3. 真伪检查
   发票已通过真伪验证
     ↓
4. 重复检查
   该发票未在其他报销单中使用
     ↓
5. 人员检查
   报销人员与发票收方一致
     ↓
匹配分数 = (匹配项数 / 总项数) * 100
自动决策: ≥90% 自动批准，50-90% 待审批，<50% 拒绝
```

### 数据库设计逻辑

采用**规范化设计** (3NF)：

```
用户层
  ├─ users (用户账户)

合同层
  ├─ contracts (合同)
  ├─ contract_risks (风险)
  └─ contract_clauses (条款)

发票层
  ├─ invoices (发票)
  ├─ invoice_items (行项)
  └─ invoice_verification_logs (验证日志)

报销层
  ├─ reimbursements (报销单)
  ├─ reimbursement_items (报销项)
  └─ reimbursement_verification (验证结果)

系统层
  ├─ async_tasks (异步任务)
  ├─ task_progress (进度)
  └─ audit_logs (审计日志)
```

**关键设计决策**：
- 分离主数据表和日志表（便于查询）
- 冗余存储关键数据（便于快速查询）
- 使用软删除而非真删除（便于审计）

### 安全设计

```
1. 认证层
   POST /auth/login
   → 密码 bcrypt 验证
   → 生成 JWT token
   → 过期时间 24h

2. 授权层
   每个 API 请求
   → 检查 JWT 有效性
   → 检查用户权限
   → 记录到审计日志

3. 数据保护
   所有涉及金额的操作
   → 使用 Decimal 精确计算
   → 记录每个变更
   → 防止精度丢失

4. 日志追踪
   所有操作自动记录
   → 谁做了什么
   → 何时做的
   → 做了什么改变
```

---

## 系统架构

### 前端 (Next.js 15)
- 反应式用户界面
- 实时文件上传和进度追踪
- 异步任务监听（WebSocket/轮询）
- TypeScript + SWR 数据获取

### 后端 (FastAPI)
- RESTful API
- 数据库: PostgreSQL
- 异步任务队列: Celery + Redis
- 火山引擎集成 (LLM + OCR)

## 核心功能

### 1. 智能合同"找茬"引擎
- 双引擎分析: 规则引擎 + LLM 语义分析
- 识别财务风险 (税率、付款条件、违约责任等)
- PDF 高亮标注风险文本
- 自动生成修复建议

### 2. 报销"三单合一"校验
- 自动核对报销单、发票、收据的一致性
- 计算匹配度分数
- 检测缺失的发票或收据

### 3. 发票合规管家
- OCR 发票识别 (结构化数据提取)
- 联网真伪验证
- 重复发票检测
- 作废发票检查
- 税号验证

## 快速开始

### 前置条件
- Docker & Docker Compose
- PostgreSQL 15
- Redis 7
- Python 3.10+
- Node.js 18+

### 安装步骤

#### 1. 克隆项目并配置环境

```bash
cd /vercel/share/v0-project

# 复制 .env 配置
cp backend/.env.example backend/.env

# 编辑 .env 文件，配置火山引擎 API KEY
# VOLCANO_API_KEY=your-api-key
# VOLCANO_API_SECRET=your-api-secret
```

#### 2. 使用 Docker Compose 启动全栈

```bash
# 启动所有服务 (PostgreSQL + Redis + FastAPI + Celery Worker + Flower)
docker-compose up -d

# 查看日志
docker-compose logs -f backend
docker-compose logs -f celery_worker

# 停止服务
docker-compose down
```

#### 3. 初始化数据库

```bash
# 进入后端容器
docker-compose exec backend bash

# 运行 SQL 脚本初始化数据库
psql -h postgres -U gatekeeper -d gatekeeper_db -f migrations/001_initial_schema.sql
```

#### 4. 启动前端开发服务器

```bash
# 安装前端依赖 (如果还未安装)
pnpm install

# 设置 API 地址
export NEXT_PUBLIC_API_URL=http://localhost:8000/api

# 启动开发服务器
pnpm dev
```

访问: http://localhost:3000

### 服务地址

| 服务 | 地址 |
|------|------|
| Next.js 前端 | http://localhost:3000 |
| FastAPI 后端 | http://localhost:8000 |
| API 文档 | http://localhost:8000/docs |
| Celery Flower | http://localhost:5555 |
| PostgreSQL | localhost:5432 |
| Redis | localhost:6379 |

## API 端点

### 认证
- `POST /api/auth/register` - 用户注册
- `POST /api/auth/login` - 用户登录
- `GET /api/auth/me` - 获取当前用户

### 合同管理
- `POST /api/contracts/upload` - 上传合同
- `GET /api/contracts` - 列表查询合同
- `GET /api/contracts/{id}` - 获取合同详情
- `GET /api/contracts/{id}/risks` - 获取合同风险
- `GET /api/contracts/{id}/analysis-status` - 获取分析状态

### 发票管理
- `POST /api/invoices/upload` - 上传发票
- `GET /api/invoices` - 列表查询发票
- `GET /api/invoices/{id}` - 获取发票详情
- `POST /api/invoices/{id}/verify` - 验证发票真伪
- `POST /api/invoices/batch/verify` - 批量验证发票
- `GET /api/invoices/{id}/ocr-status` - 获取 OCR 状态

### 报销管理
- `POST /api/reimbursements` - 创建报销单
- `GET /api/reimbursements` - 列表查询报销单
- `GET /api/reimbursements/{id}` - 获取报销单详情
- `POST /api/reimbursements/{id}/verify` - 验证报销单
- `PUT /api/reimbursements/{id}/approve` - 批准报销单
- `PUT /api/reimbursements/{id}/reject` - 拒绝报销单

### 异步任务
- `GET /api/tasks/{task_id}` - 获取任务进度
- `GET /api/tasks/{task_id}/result` - 获取任务结果
- `GET /api/tasks/resource/{resource_type}/{resource_id}` - 获取资源相关的所有任务

## 数据库 Schema

### 主要表
- `users` - 用户账户
- `contracts` - 合同存储
- `contract_risks` - 合同风险记录
- `contract_clauses` - 合同条款提取
- `invoices` - 发票存储
- `invoice_items` - 发票行项目
- `invoice_verification_logs` - 发票验证日志
- `reimbursements` - 报销单
- `reimbursement_items` - 报销项目
- `reimbursement_verification` - 报销单验证结果
- `async_tasks` - 异步任务队列
- `task_progress` - 任务进度跟踪
- `audit_logs` - 审计日志

## 异步任务

系统使用 Celery + Redis 处理长时间运行的任务:

1. **contract_analysis** - 合同风险分析 (双引擎)
2. **invoice_ocr** - 发票 OCR 识别
3. **invoice_verification** - 发票真伪验证
4. **reimbursement_verification** - 报销单验证

### 监控任务

使用 Flower Web 界面监控 Celery 任务:
访问 http://localhost:5555

## 配置

### 环境变量

参考 `backend/.env.example`:

```env
DATABASE_URL=postgresql://gatekeeper:gatekeeper123@localhost:5432/gatekeeper_db
SECRET_KEY=your-secret-key
VOLCANO_API_KEY=your-api-key
VOLCANO_API_SECRET=your-api-secret
REDIS_URL=redis://localhost:6379/0
CELERY_BROKER_URL=redis://localhost:6379/1
UPLOAD_DIR=./uploads
DEBUG=False
```

### 火山引擎集成

1. 获取火山引擎 API Key
2. 在 `.env` 文件中配置
3. 系统将自动调用火山引擎进行:
   - LLM 语义分析 (合同风险)
   - OCR 发票识别
   - 发票真伪验证

## 开发

### 后端开发

```bash
# 进入后端目录
cd backend

# 安装依赖
pip install -r requirements.txt

# 启动开发服务器
python -m uvicorn main:app --reload --port 8000

# 启动 Celery Worker
celery -A celery_app worker --loglevel=info

# 启动 Celery Flower
celery -A celery_app flower --port=5555
```

### 前端开发

```bash
# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev

# 构建生产版本
pnpm build

# 启动生产服务器
pnpm start
```

## 项目结构

```
/vercel/share/v0-project/
├── backend/
│   ├── app/                 # API 路由
│   ├── models/              # SQLAlchemy ORM 模型
│   ├── schemas/             # Pydantic 验证 Schema
│   ├── services/            # 业务逻辑服务
│   ├── tasks/               # Celery 异步任务
│   ├── utils/               # 工具函数
│   ├── migrations/          # 数据库迁移脚本
│   ├── main.py              # FastAPI 主应用
│   ├── config.py            # 配置管理
│   ├── database.py          # 数据库连接
│   ├── celery_app.py        # Celery 配置
│   └── requirements.txt      # Python 依赖
├── app/                     # Next.js 页面
├── components/              # React 组件 (UI)
├── lib/                     # 工具库
│   └── api/                 # API 客户端
├── hooks/                   # 自定义 React Hooks
├── types/                   # TypeScript 类型定义
└── docker-compose.yml       # Docker Compose 配置
```

## 常见问题

### 1. 如何添加新的合同风险类型?

编辑 `backend/services/volcano_service.py` 中的 `analyze_contract_with_llm` 方法，更新 LLM 提示。

### 2. 如何修改发票识别的字段?

编辑 `backend/models/__init__.py` 中的 `Invoice` 模型，添加新字段。

### 3. 如何扩展报销单验证逻辑?

编辑 `backend/services/business_logic.py` 中的 `ReimbursementService.verify_reimbursement` 方法。

### 4. 如何部署到生产环境?

- 使用 Docker 容器化部署
- 配置 Nginx 反向代理
- 使用 Gunicorn 或 Uvicorn 作为生产 ASGI 服务器
- 配置数据库备份和恢复策略
- 启用 HTTPS/SSL
- 配置日志和监控

## 许可证

MIT

## 支持

如有问题，请查看项目文档或联系技术支持。

### 前端 (Next.js 15)
- 反应式用户界面
- 实时文件上传和进度追踪
- 异步任务监听（WebSocket/轮询）
- TypeScript + SWR 数据获取

### 后端 (FastAPI)
- RESTful API
- 数据库: PostgreSQL
- 异步任务队列: Celery + Redis
- 火山引擎集成 (LLM + OCR)

## 核心功能

### 1. 智能合同"找茬"引擎
- 双引擎分析: 规则引擎 + LLM 语义分析
- 识别财务风险 (税率、付款条件、违约责任等)
- PDF 高亮标注风险文本
- 自动生成修复建议

### 2. 报销"三单合一"校验
- 自动核对报销单、发票、收据的一致性
- 计算匹配度分数
- 检测缺失的发票或收据

### 3. 发票合规管家
- OCR 发票识别 (结构化数据提取)
- 联网真伪验证
- 重复发票检测
- 作废发票检查
- 税号验证

## 快速开始

### 前置条件
- Docker & Docker Compose
- PostgreSQL 15
- Redis 7
- Python 3.10+
- Node.js 18+

### 安装步骤

#### 1. 克隆项目并配置环境

```bash
cd /vercel/share/v0-project

# 复制 .env 配置
cp backend/.env.example backend/.env

# 编辑 .env 文件，配置火山引擎 API KEY
# VOLCANO_API_KEY=your-api-key
# VOLCANO_API_SECRET=your-api-secret
```

#### 2. 使用 Docker Compose 启动全栈

```bash
# 启动所有服务 (PostgreSQL + Redis + FastAPI + Celery Worker + Flower)
docker-compose up -d

# 查看日志
docker-compose logs -f backend
docker-compose logs -f celery_worker

# 停止服务
docker-compose down
```

#### 3. 初始化数据库

```bash
# 进入后端容器
docker-compose exec backend bash

# 运行 SQL 脚本初始化数据库
psql -h postgres -U gatekeeper -d gatekeeper_db -f migrations/001_initial_schema.sql
```

#### 4. 启动前端开发服务器

```bash
# 安装前端依赖 (如果还未安装)
pnpm install

# 设置 API 地址
export NEXT_PUBLIC_API_URL=http://localhost:8000/api

# 启动开发服务器
pnpm dev
```

访问: http://localhost:3000

### 服务地址

| 服务 | 地址 |
|------|------|
| Next.js 前端 | http://localhost:3000 |
| FastAPI 后端 | http://localhost:8000 |
| API 文档 | http://localhost:8000/docs |
| Celery Flower | http://localhost:5555 |
| PostgreSQL | localhost:5432 |
| Redis | localhost:6379 |

## API 端点

### 认证
- `POST /api/auth/register` - 用户注册
- `POST /api/auth/login` - 用户登录
- `GET /api/auth/me` - 获取当前用户

### 合同管理
- `POST /api/contracts/upload` - 上传合同
- `GET /api/contracts` - 列表查询合同
- `GET /api/contracts/{id}` - 获取合同详情
- `GET /api/contracts/{id}/risks` - 获取合同风险
- `GET /api/contracts/{id}/analysis-status` - 获取分析状态

### 发票管理
- `POST /api/invoices/upload` - 上传发票
- `GET /api/invoices` - 列表查询发票
- `GET /api/invoices/{id}` - 获取发票详情
- `POST /api/invoices/{id}/verify` - 验证发票真伪
- `POST /api/invoices/batch/verify` - 批量验证发票
- `GET /api/invoices/{id}/ocr-status` - 获取 OCR 状态

### 报销管理
- `POST /api/reimbursements` - 创建报销单
- `GET /api/reimbursements` - 列表查询报销单
- `GET /api/reimbursements/{id}` - 获取报销单详情
- `POST /api/reimbursements/{id}/verify` - 验证报销单
- `PUT /api/reimbursements/{id}/approve` - 批准报销单
- `PUT /api/reimbursements/{id}/reject` - 拒绝报销单

### 异步任务
- `GET /api/tasks/{task_id}` - 获取任务进度
- `GET /api/tasks/{task_id}/result` - 获取任务结果
- `GET /api/tasks/resource/{resource_type}/{resource_id}` - 获取资源相关的所有任务

## 数据库 Schema

### 主要表
- `users` - 用户账户
- `contracts` - 合同存储
- `contract_risks` - 合同风险记录
- `contract_clauses` - 合同条款提取
- `invoices` - 发票存储
- `invoice_items` - 发票行项目
- `invoice_verification_logs` - 发票验证日志
- `reimbursements` - 报销单
- `reimbursement_items` - 报销项目
- `reimbursement_verification` - 报销单验证结果
- `async_tasks` - 异步任务队列
- `task_progress` - 任务进度跟踪
- `audit_logs` - 审计日志

## 异步任务

系统使用 Celery + Redis 处理长时间运行的任务:

1. **contract_analysis** - 合同风险分析 (双引擎)
2. **invoice_ocr** - 发票 OCR 识别
3. **invoice_verification** - 发票真伪验证
4. **reimbursement_verification** - 报销单验证

### 监控任务

使用 Flower Web 界面监控 Celery 任务:
访问 http://localhost:5555

## 配置

### 环境变量

参考 `backend/.env.example`:

```env
DATABASE_URL=postgresql://gatekeeper:gatekeeper123@localhost:5432/gatekeeper_db
SECRET_KEY=your-secret-key
VOLCANO_API_KEY=your-api-key
VOLCANO_API_SECRET=your-api-secret
REDIS_URL=redis://localhost:6379/0
CELERY_BROKER_URL=redis://localhost:6379/1
UPLOAD_DIR=./uploads
DEBUG=False
```

### 火山引擎集成

1. 获取火山引擎 API Key
2. 在 `.env` 文件中配置
3. 系统将自动调用火山引擎进行:
   - LLM 语义分析 (合同风险)
   - OCR 发票识别
   - 发票真伪验证

## 开发

### 后端开发

```bash
# 进入后端目录
cd backend

# 安装依赖
pip install -r requirements.txt

# 启动开发服务器
python -m uvicorn main:app --reload --port 8000

# 启动 Celery Worker
celery -A celery_app worker --loglevel=info

# 启动 Celery Flower
celery -A celery_app flower --port=5555
```

### 前端开发

```bash
# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev

# 构建生产版本
pnpm build

# 启动生产服务器
pnpm start
```

## 项目结构

```
/vercel/share/v0-project/
├── backend/
│   ├── app/                 # API 路由
│   ├── models/              # SQLAlchemy ORM 模型
│   ├── schemas/             # Pydantic 验证 Schema
│   ├── services/            # 业务逻辑服务
│   ├── tasks/               # Celery 异步任务
│   ├── utils/               # 工具函数
│   ├── migrations/          # 数据库迁移脚本
│   ├── main.py              # FastAPI 主应用
│   ├── config.py            # 配置管理
│   ├── database.py          # 数据库连接
│   ├── celery_app.py        # Celery 配置
│   └── requirements.txt      # Python 依赖
├── app/                     # Next.js 页面
├── components/              # React 组件 (UI)
├── lib/                     # 工具库
│   └── api/                 # API 客户端
├── hooks/                   # 自定义 React Hooks
├── types/                   # TypeScript 类型定义
└── docker-compose.yml       # Docker Compose 配置
```

## 常见问题

### 1. 如何添加新的合同风险类型?

编辑 `backend/services/volcano_service.py` 中的 `analyze_contract_with_llm` 方法，更新 LLM 提示。

### 2. 如何修改发票识别的字段?

编辑 `backend/models/__init__.py` 中的 `Invoice` 模型，添加新字段。

### 3. 如何扩展报销单验证逻辑?

编辑 `backend/services/business_logic.py` 中的 `ReimbursementService.verify_reimbursement` 方法。

### 4. 如何部署到生产环境?

- 使用 Docker 容器化部署
- 配置 Nginx 反向代理
- 使用 Gunicorn 或 Uvicorn 作为生产 ASGI 服务器
- 配置数据库备份和恢复策略
- 启用 HTTPS/SSL
- 配置日志和监控

## 许可证

MIT

## 支持

如有问题，请查看项目文档或联系技术支持。
