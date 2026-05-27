"""
FastAPI 主应用程序
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
from config import settings
import logging

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 导入路由
from app.auth import router as auth_router
from app.invoices import router as invoices_router
from app.contracts import router as contracts_router
from app.reimbursements import router as reimbursements_router
from app.tasks import router as tasks_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期管理"""
    logger.info("Starting Gatekeeper Financial Compliance System")
    yield
    logger.info("Shutting down Gatekeeper")


# 创建 FastAPI 应用
app = FastAPI(
    title=settings.API_TITLE,
    version=settings.API_VERSION,
    description="守门人财法风控系统 API",
    lifespan=lifespan
)

# 配置 CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # TODO: 生产环境应该限制
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册路由
app.include_router(auth_router)
app.include_router(invoices_router)
app.include_router(contracts_router)
app.include_router(reimbursements_router)
app.include_router(tasks_router)


@app.get("/")
def root():
    """根路由"""
    return {
        "name": settings.API_TITLE,
        "version": settings.API_VERSION,
        "status": "running",
        "endpoints": {
            "auth": "/api/auth",
            "invoices": "/api/invoices",
            "contracts": "/api/contracts",
            "reimbursements": "/api/reimbursements",
            "tasks": "/api/tasks"
        }
    }


@app.get("/health")
def health_check():
    """健康检查"""
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG
    )
