#!/bin/bash

echo "🚀 守门人财法风控系统 - 快速启动脚本"
echo "=========================================="
echo ""

# 检查是否已安装 Docker
if ! command -v docker &> /dev/null; then
    echo "❌ 请先安装 Docker"
    echo "📚 访问: https://docs.docker.com/get-docker/"
    exit 1
fi

echo "✅ Docker 已安装"
echo ""

# 启动所有服务
echo "📦 启动服务中..."
echo ""

cd "$(dirname "$0")"

# 启动后端服务 (PostgreSQL, Redis, FastAPI, Celery)
echo "1️⃣  启动数据库和后端服务..."
docker-compose up -d

echo "⏳ 等待服务启动（约30秒）..."
sleep 30

# 检查 FastAPI 是否就绪
echo ""
echo "2️⃣  检查 FastAPI API 服务..."
for i in {1..10}; do
    if curl -s http://localhost:8000/docs > /dev/null; then
        echo "✅ FastAPI 已就绪"
        break
    fi
    echo "⏳ 等待 FastAPI ($i/10)..."
    sleep 3
done

# 启动前端
echo ""
echo "3️⃣  启动前端开发服务器..."
echo ""
echo "📝 注意：下面的终端窗口会显示 Next.js 编译信息"
echo ""

pnpm dev

echo ""
echo "🎉 应用启动完成！"
echo ""
echo "📍 访问地址："
echo "   • 前端: http://localhost:3000"
echo "   • API 文档: http://localhost:8000/docs"
echo "   • Celery 监控: http://localhost:5555"
echo ""
echo "🔑 演示账号："
echo "   • 邮箱: demo@gatekeeper.com"
echo "   • 密码: demo123"
echo ""
echo "📚 更多信息请查看: README.md"
