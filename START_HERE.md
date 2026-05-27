# 🎉 准备就绪！立即开始使用

## ⚡ 3 分钟快速启动

```bash
# 进入项目目录
cd /vercel/share/v0-project

# 启动所有服务
./start.sh

# 稍等 30 秒，所有服务就绪...
```

## 🌐 访问应用

| 地址 | 说明 |
|-----|------|
| http://localhost:3000 | 🎨 前端应用界面 |
| http://localhost:8000/docs | 📚 API 文档（Swagger） |
| http://localhost:5555 | 📊 任务监控（Celery Flower） |

## 🔑 演示账号

```
邮箱: demo@gatekeeper.com
密码: demo123
```

## ✨ 功能体验

### 1️⃣ 合同审核
- 点击 "上传合同"
- 上传 PDF 或图片
- 系统自动分析风险
- 查看详细报告

### 2️⃣ 发票验证
- 点击 "发票验证"
- 上传发票
- OCR 自动识别
- 真伪验证结果

### 3️⃣ 报销审批
- 点击 "报销审批"
- 创建报销单
- 自动三单合一校验
- 生成审批意见

## 📚 查看文档

| 文档 | 描述 |
|-----|------|
| QUICK_REFERENCE.md | ⚡ 2 分钟快速参考 |
| README.md | 📖 完整功能说明 |
| DEPLOYMENT.md | 🚀 生产部署指南 |
| 其他 | 📑 详见 DOCUMENTATION_INDEX.md |

## 🐳 常用命令

```bash
# 启动服务
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down

# 查看 API 文档
# 访问 http://localhost:8000/docs

# 监控任务
# 访问 http://localhost:5555
```

## 🔧 如果有问题

| 问题 | 解决方案 |
|-----|--------|
| Docker 未启动 | `docker desktop` 或 `systemctl start docker` |
| 端口被占用 | 修改 docker-compose.yml 中的端口 |
| 服务启动失败 | 查看日志：`docker-compose logs` |
| 无法连接 API | 检查防火墙或 CORS 设置 |
| 需要帮助 | 查看 DEPLOYMENT.md 故障排除部分 |

## 📊 系统配置

- ✅ 后端: FastAPI + PostgreSQL + Redis
- ✅ 前端: Next.js 15 + React 19
- ✅ 任务: Celery + Flower
- ✅ 集成: 火山引擎（LLM + OCR）

## 🎯 后续步骤

1. **体验功能** - 用演示账号测试所有功能
2. **阅读文档** - 理解系统架构和实现
3. **配置环境** - 修改环境变量以适应需求
4. **部署上线** - 按照 DEPLOYMENT.md 部署到生产环境

## 📞 获取帮助

- 📖 **查看文档**: 8 份详细文档，2,000+ 行说明
- 🔍 **API 文档**: Swagger 完整接口文档
- 💻 **代码注释**: 源代码包含详细注释
- 📊 **监控面板**: Celery Flower 实时任务监控

---

**系统已完全就绪！现在就可以开始使用了。**

祝你使用愉快！🚀
