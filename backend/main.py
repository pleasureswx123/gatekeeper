"""
FastAPI 主应用程序
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
from config import settings
from database import Base, engine, SessionLocal
from models import User
from utils.security import hash_password
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
from app.audit_logs import router as audit_logs_router
from app.system import router as system_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期管理"""
    logger.info("Starting Mingjian Financial Compliance System")
    if settings.AUTO_CREATE_TABLES:
        Base.metadata.create_all(bind=engine)

    if settings.DEMO_USER_ENABLED:
        db = SessionLocal()
        try:
            demo_user = db.query(User).filter(
                (User.username == settings.DEMO_USERNAME) | (User.email == settings.DEMO_EMAIL)
            ).first()
            if not demo_user:
                db.add(User(
                    username=settings.DEMO_USERNAME,
                    email=settings.DEMO_EMAIL,
                    password_hash=hash_password(settings.DEMO_PASSWORD),
                    full_name="演示用户",
                    department="财法风控部",
                    role="admin",
                ))
                db.commit()
        finally:
            db.close()
    yield
    logger.info("Shutting down Mingjian")


# 创建 FastAPI 应用
app = FastAPI(
    title=settings.API_TITLE,
    version=settings.API_VERSION,
    description="明鉴财法风控系统 API",
    lifespan=lifespan
)

# 配置 CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
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
app.include_router(audit_logs_router)
app.include_router(system_router)


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
            "tasks": "/api/tasks",
            "audit_logs": "/api/audit-logs",
            "system": "/api/system/info"
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

