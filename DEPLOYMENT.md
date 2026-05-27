# 部署指南

## 快速启动（本地开发）

### 前置要求
- Docker & Docker Compose
- Node.js 18+
- pnpm

### 一键启动

```bash
# 使用启动脚本
chmod +x start.sh
./start.sh

# 或手动启动
docker-compose up -d
pnpm dev
```

访问地址：
- **前端**: http://localhost:3000
- **API 文档**: http://localhost:8000/docs  
- **Celery 监控**: http://localhost:5555

演示账号：
- 邮箱：`demo@gatekeeper.com`
- 密码：`demo123`

---

## 环境配置

### 1. 后端环境变量

创建 `backend/.env` 文件：

```env
# 数据库
DATABASE_URL=postgresql://gatekeeper:gatekeeper@localhost:5432/gatekeeper
SQLALCHEMY_ECHO=false

# JWT
SECRET_KEY=your-secret-key-change-this-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# 火山方舟配置：合同分析 + 发票 OCR
ARK_API_KEY=your-ark-api-key
ARK_BASE_URL=https://ark.cn-beijing.volces.com/api/v3
ARK_CHAT_MODEL=doubao-seed-2-0-lite-260428

# 发票验真配置：当前可用 mock，真实验真后续接入专门服务
INVOICE_VERIFICATION_MODE=mock

# Redis
REDIS_URL=redis://localhost:6379/0

# Celery
CELERY_BROKER_URL=redis://localhost:6379/1
CELERY_RESULT_BACKEND=redis://localhost:6379/2

# 文件上传
UPLOAD_DIR=/app/uploads
MAX_FILE_SIZE=52428800  # 50MB

# CORS
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001

# 任务执行模式：本地开发可用 inline；生产建议使用 celery
BACKGROUND_TASK_MODE=inline

# 日志
LOG_LEVEL=INFO
```

### 2. 前端环境变量

创建 `.env.local` 文件：

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_APP_NAME=守门人
```

---

## 生产部署

### Docker 容器部署

#### 1. 构建后端镜像

```bash
cd backend
docker build -f ../Dockerfile.backend -t gatekeeper-api:latest .
docker tag gatekeeper-api:latest registry.example.com/gatekeeper-api:latest
docker push registry.example.com/gatekeeper-api:latest
```

#### 2. 使用 docker-compose 生产环境配置

创建 `docker-compose.prod.yml`：

```yaml
version: '3.9'

services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: gatekeeper
      POSTGRES_USER: gatekeeper
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - gatekeeper-net
    restart: always

  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
    networks:
      - gatekeeper-net
    restart: always

  fastapi:
    image: registry.example.com/gatekeeper-api:latest
    environment:
      DATABASE_URL: postgresql://gatekeeper:${DB_PASSWORD}@postgres:5432/gatekeeper
      REDIS_URL: redis://redis:6379/0
      CELERY_BROKER_URL: redis://redis:6379/1
      CELERY_RESULT_BACKEND: redis://redis:6379/2
      SECRET_KEY: ${SECRET_KEY}
      ARK_API_KEY: ${ARK_API_KEY}
      ARK_BASE_URL: https://ark.cn-beijing.volces.com/api/v3
      ARK_CHAT_MODEL: doubao-seed-2-0-lite-260428
      INVOICE_VERIFICATION_MODE: mock
      ALLOWED_ORIGINS: https://your-domain.com
      BACKGROUND_TASK_MODE: celery
    depends_on:
      - postgres
      - redis
    networks:
      - gatekeeper-net
    restart: always
    ports:
      - "8000:8000"

  celery:
    image: registry.example.com/gatekeeper-api:latest
    command: celery -A celery_app worker -l info
    environment:
      DATABASE_URL: postgresql://gatekeeper:${DB_PASSWORD}@postgres:5432/gatekeeper
      REDIS_URL: redis://redis:6379/0
      CELERY_BROKER_URL: redis://redis:6379/1
      CELERY_RESULT_BACKEND: redis://redis:6379/2
    depends_on:
      - postgres
      - redis
    networks:
      - gatekeeper-net
    restart: always

volumes:
  postgres_data:
  redis_data:

networks:
  gatekeeper-net:
    driver: bridge
```

启动生产环境：

```bash
docker-compose -f docker-compose.prod.yml up -d
```

### Vercel 部署（前端）

#### 1. 连接 GitHub

```bash
# 推送代码到 GitHub
git remote add origin https://github.com/your-org/gatekeeper.git
git push -u origin main
```

#### 2. 在 Vercel 部署

1. 登录 [Vercel Dashboard](https://vercel.com)
2. 点击 "Add New Project"
3. 导入 GitHub 仓库
4. 环境变量设置：
   ```
   NEXT_PUBLIC_API_URL=https://api.your-domain.com
   ```
5. 部署

### Kubernetes 部署

使用 Helm 为生产环境创建高可用部署。详见 `k8s/` 目录。

---

## 监控和维护

### 查看日志

```bash
# FastAPI
docker-compose logs fastapi -f

# Celery
docker-compose logs celery -f

# PostgreSQL
docker-compose logs postgres -f

# Redis
docker-compose logs redis -f
```

### 数据库备份

```bash
# 备份 PostgreSQL
docker-compose exec postgres pg_dump -U gatekeeper gatekeeper > backup.sql

# 恢复备份
docker-compose exec -T postgres psql -U gatekeeper gatekeeper < backup.sql
```

### 监控 Celery 任务

访问 Flower 监控面板：http://localhost:5555

---

## 故障排除

### FastAPI 无法连接数据库

```bash
# 检查 PostgreSQL 状态
docker-compose ps postgres

# 查看 PostgreSQL 日志
docker-compose logs postgres

# 重新初始化数据库
docker-compose exec postgres psql -U gatekeeper -d gatekeeper < backend/migrations/001_initial_schema.sql
```

### Redis 连接失败

```bash
# 检查 Redis 状态
docker-compose ps redis

# 连接 Redis 查看数据
docker-compose exec redis redis-cli

# 清空 Redis
docker-compose exec redis redis-cli FLUSHALL
```

### Celery 任务未执行

```bash
# 检查 Celery worker 状态
docker-compose logs celery

# 查看任务队列
docker-compose exec redis redis-cli KEYS "*celery*"

# 重启 Celery worker
docker-compose restart celery
```

### 前端无法连接后端

1. 检查 `NEXT_PUBLIC_API_URL` 环境变量
2. 检查 CORS 配置（后端 `config.py`）
3. 检查防火墙规则
4. 检查 API 网络可达性：
   ```bash
   curl http://localhost:8000/docs
   ```

---

## 性能优化

### 1. 数据库优化

- 添加必要的索引
- 定期运行 VACUUM
- 监控慢查询日志

### 2. Redis 缓存

- 配置缓存过期时间
- 使用 Redis 集群提高吞吐量

### 3. Celery 优化

- 调整 worker 并发数
- 配置任务超时时间
- 使用任务优先级

### 4. CDN 配置

- 缓存静态资源
- 压缩响应
- 启用 Gzip

---

## 安全建议

- ✅ 更改默认密码和 SECRET_KEY
- ✅ 配置 HTTPS/SSL
- ✅ 启用防火墙和 WAF
- ✅ 定期更新依赖包
- ✅ 配置备份策略
- ✅ 启用审计日志
- ✅ 限制 API 速率

---

## 联系支持

遇到问题？查看详细文档：
- [README.md](./README.md)
- [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md)
- [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md)
