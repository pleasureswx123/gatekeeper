"""
FastAPI 系统信息 API 路由
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from deps import get_current_user
from config import settings
from models import User

router = APIRouter(prefix="/api/system", tags=["system"])


@router.get("/info")
def get_system_info(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """获取安全的系统运行信息"""
    db_driver = "PostgreSQL" if settings.DATABASE_URL.startswith("postgresql") else "SQLite/Other"
    return {
        "name": settings.API_TITLE,
        "version": settings.API_VERSION,
        "status": "healthy",
        "database": db_driver,
        "background_task_mode": settings.BACKGROUND_TASK_MODE,
        "invoice_verification_mode": settings.INVOICE_VERIFICATION_MODE,
        "ark_base_url": settings.ARK_BASE_URL,
        "ark_chat_model": settings.ARK_CHAT_MODEL,
        "auto_create_tables": settings.AUTO_CREATE_TABLES,
        "current_user": current_user.username,
    }
