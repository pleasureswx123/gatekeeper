# 🚀 快速参考卡

## 启动命令

```bash
# 进入项目目录
cd /vercel/share/v0-project

# 启动所有服务（推荐）
./start.sh

# 或分别启动
docker-compose up -d      # 启动后端
pnpm dev                    # 启动前端
```

## 访问地址

| 服务 | URL |
|-----|-----|
| 📱 前端应用 | http://localhost:3000 |
| 🔐 登录页面 | http://localhost:3000/login |
| 📚 API 文档 | http://localhost:8000/docs |
| 📊 任务监控 | http://localhost:5555 |

## 演示账号

```
邮箱: demo@gatekeeper.com
密码: demo123
```

## 核心功能

1. **合同审核** (`/contracts/upload`)
   - 上传 PDF/图片合同
   - 自动风险分析
   - 关键条款提取

2. **发票验证** (`/invoices/upload`)
   - OCR 识别
   - 真伪验证
   - 重复检测

3. **报销审批** (`/reimbursements`)
   - 三单合一校验
   - 自动对账
   - 审批流程

## 常用命令

### 查看日志
```bash
docker-compose logs -f         # 所有日志
docker-compose logs fastapi -f # FastAPI 日志
docker-compose logs celery -f  # Celery 日志
```

### 停止服务
```bash
docker-compose down            # 停止所有服务
docker-compose down -v         # 停止并删除数据
```

### 数据库操作
```bash
# 连接数据库
docker-compose exec postgres psql -U gatekeeper -d gatekeeper

# 备份数据库
docker-compose exec postgres pg_dump -U gatekeeper gatekeeper > backup.sql

# 导入数据库
docker-compose exec -T postgres psql -U gatekeeper gatekeeper < backup.sql
```

## 文件位置

| 文件 | 路径 |
|-----|------|
| 📖 项目概述 | README.md |
| 🚀 快速开始 | QUICKSTART.md |
| 📋 部署指南 | DEPLOYMENT.md |
| 🏗️ 项目结构 | PROJECT_STRUCTURE.md |
| ✅ 系统清单 | SYSTEM_READY.md |
| 📊 完成报告 | COMPLETION_REPORT.md |

## 技术栈简览

**后端**: FastAPI + PostgreSQL + Redis + Celery + 火山引擎  
**前端**: Next.js 15 + React 19 + TypeScript + Tailwind CSS  
**部署**: Docker + Docker Compose

## 关键目录

```
/vercel/share/v0-project/
├── backend/        # FastAPI 后端代码
├── app/            # Next.js 前端代码
├── components/     # React 组件
├── lib/            # 工具库
├── types/          # TypeScript 类型
└── uploads/        # 上传的文件（自动创建）
```

## 首次使用步骤

1. 启动系统: `./start.sh`
2. 等待所有服务就绪（约 30 秒）
3. 打开 http://localhost:3000
4. 使用演示账号登录
5. 测试各个功能模块

## 问题排查

| 问题 | 解决方案 |
|-----|--------|
| Docker 未安装 | 访问 https://docs.docker.com/get-docker/ |
| 端口被占用 | 修改 docker-compose.yml 中的端口 |
| 无法连接数据库 | 检查 PostgreSQL 服务: `docker-compose logs postgres` |
| API 无法访问 | 检查防火墙或 CORS 配置 |
| 任务未执行 | 检查 Celery worker: `docker-compose logs celery` |

## 获取帮助

- 📖 查看完整文档
- 🌐 访问 API 文档: http://localhost:8000/docs
- 📊 Celery 监控: http://localhost:5555
- 🔍 检查代码注释

---

**需要帮助？查看 README.md 或 DEPLOYMENT.md**
