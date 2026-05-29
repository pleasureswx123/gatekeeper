# 明鉴财法风控系统 - 快速启动指南

## 一键启动 (Docker Compose)

最简单的方法是使用 Docker Compose，它会自动启动所有必要的服务。

### 前置要求
- ✅ Docker 和 Docker Compose
- ✅ 火山方舟 API Key（用于合同分析和发票 OCR）

### 启动步骤

#### Step 1: 配置环境变量

```bash
cd /vercel/share/v0-project

# 如果没有 .env 文件，从模板创建
cp backend/.env.example backend/.env

# 编辑 .env 文件，配置 ARK_API_KEY、SECRET_KEY、ALLOWED_ORIGINS 等
# nano backend/.env
```

#### Step 2: 启动所有服务

```bash
# 启动 Docker Compose (后台运行)
docker compose up -d

# 等待所有服务启动 (大约 30 秒)
# 查看日志确认启动成功
docker compose logs -f

# 按 Ctrl+C 退出日志查看
```

#### Step 3: 数据库初始化

开发环境默认 `AUTO_CREATE_TABLES=True`，后端启动时会自动建表并创建演示账号。

#### Step 4: 启动前端开发服务器

在新的终端窗口中:

```bash
cd /vercel/share/v0-project

# 如果还未安装前端依赖
pnpm install --registry=https://registry.npmmirror.com

# 启动 Next.js 开发服务器
pnpm dev
```

### 访问应用

完成以上步骤后，访问以下地址:

| 应用 | 地址 | 说明 |
|------|------|------|
| 🎨 前端 UI | http://localhost:3000 | 主应用界面 |
| 🔌 API 文档 | http://localhost:8000/docs | Swagger 文档 |
| 📊 任务监控 | http://localhost:5555 | Celery Flower |
| 🔧 数据库 | localhost:5432 | PostgreSQL |
| 🚀 缓存 | localhost:6379 | Redis |

## 测试系统功能

### 1. 测试合同分析

1. 访问 http://localhost:3000
2. 点击"上传合同"
3. 上传一个 PDF 文件 (测试文件可以是任何 PDF)
4. 填写合同信息后点击"上传并分析"
5. 等待分析完成
6. 查看风险识别结果

### 2. 测试发票识别

1. 在主页点击"上传发票"
2. 上传一个图片或 PDF (发票)
3. 等待 OCR 识别完成
4. 查看提取的发票数据

### 3. 测试报销单

1. 在主页点击"创建报销单"
2. 添加报销项目（可以关联 OCR 已完成的发票）
3. 在报销详情页上传收据附件
4. 验证报销单并查看验证结果

## 常用命令

### Docker Compose 命令

```bash
# 启动所有服务
docker compose up -d

# 停止所有服务
docker compose down

# 查看服务日志
docker compose logs -f [service-name]

# 重启某个服务
docker compose restart [service-name]

# 进入容器
docker compose exec [service-name] bash

# 查看运行的容器
docker compose ps
```

### 数据库操作

```bash
# 连接数据库
docker compose exec postgres psql -U gatekeeper -d gatekeeper_db

# 导出数据库
docker compose exec postgres pg_dump -U gatekeeper -d gatekeeper_db > backup.sql

# 导入数据库
docker compose exec -T postgres psql -U gatekeeper -d gatekeeper_db < backup.sql
```

### Celery 任务队列

```bash
# 查看 Celery Worker 日志
docker compose logs -f celery_worker

# 查看待处理任务
# 访问 http://localhost:5555 (Flower 界面)

# 清空 Redis 缓存
docker compose exec redis redis-cli FLUSHALL
```

## 停止和清理

### 停止服务

```bash
# 停止所有服务但保留数据
docker compose down

# 完全清理 (删除所有数据和卷)
docker compose down -v
```

## 本地开发 (不使用 Docker)

如果你想在本地直接运行而不使用 Docker:

### 后端

```bash
# 1. 安装 PostgreSQL 和 Redis
# macOS: brew install postgresql redis
# Linux: sudo apt-get install postgresql redis-server
# Windows: 使用 WSL 或直接下载安装

# 2. 启动 PostgreSQL
# macOS/Linux: pg_ctl -D /usr/local/var/postgres start
# Windows: net start PostgreSQL

# 3. 启动 Redis
# macOS/Linux: redis-server
# Windows: 使用 WSL

# 4. 创建数据库
createdb gatekeeper_db

# 5. 初始化 Schema
psql -d gatekeeper_db -f backend/migrations/001_initial_schema.sql

# 6. 进入 backend 目录并安装依赖
cd backend
pip install -r requirements.txt

# 7. 启动 FastAPI 服务器
python -m uvicorn main:app --reload

# 在另一个终端启动 Celery Worker
celery -A celery_app worker --loglevel=info

# 在第三个终端启动 Celery Flower
celery -A celery_app flower --port=5555
```

### 前端

```bash
# 安装依赖
pnpm install --registry=https://registry.npmmirror.com

# 启动开发服务器
pnpm dev
```

## 调试技巧

### 查看 API 请求日志

后端 API 请求日志会输出到控制台:

```bash
docker-compose logs backend | grep "INFO"
```

### 查看数据库日志

```bash
docker-compose logs postgres
```

### 检查 Celery 任务状态

访问 http://localhost:5555 (Flower 界面)

### 查看 Redis 键值

```bash
docker-compose exec redis redis-cli
# 然后输入: KEYS *
```

## 常见问题排查

### 1. "Connection refused" 错误

**症状**: 前端无法连接后端 API

**解决**:
- 确保后端服务正在运行: `docker-compose ps`
- 检查后端日志: `docker-compose logs backend`
- 确保端口 8000 未被占用: `lsof -i :8000`

### 2. "Database connection error" 错误

**症状**: 后端无法连接 PostgreSQL

**解决**:
- 检查 PostgreSQL 服务: `docker-compose exec postgres pg_isready`
- 查看 PostgreSQL 日志: `docker-compose logs postgres`
- 重启 PostgreSQL: `docker-compose restart postgres`

### 3. Celery Worker 无法处理任务

**症状**: 任务卡在 "processing" 状态

**解决**:
- 重启 Celery Worker: `docker-compose restart celery_worker`
- 检查 Redis: `docker-compose exec redis redis-cli ping`
- 查看任务日志: `docker-compose logs celery_worker`

### 4. 文件上传失败

**症状**: 上传文件时出错

**解决**:
- 检查文件格式 (PDF/PNG/JPG)
- 确保文件大小 < 50MB
- 检查权限: `docker-compose exec backend ls -la uploads/`

## 性能优化

### 生产部署建议

1. **使用 Gunicorn 替代 Uvicorn**
   ```bash
   gunicorn main:app --workers 4 --worker-class uvicorn.workers.UvicornWorker
   ```

2. **配置 Nginx 反向代理**
   ```nginx
   upstream backend {
     server localhost:8000;
   }
   server {
     listen 80;
     location / {
       proxy_pass http://backend;
     }
   }
   ```

3. **增加 Celery Worker 数量**
   ```bash
   celery -A celery_app worker --concurrency=8
   ```

4. **启用 Redis 持久化**
   编辑 `redis.conf`: `save 900 1`

## 需要帮助?

- 📖 查看完整文档: `README.md`
- 💬 API 文档: http://localhost:8000/docs
- 🔧 Celery 监控: http://localhost:5555

