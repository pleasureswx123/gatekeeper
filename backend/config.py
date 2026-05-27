"""
FastAPI 应用配置
"""
import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()
load_dotenv(Path(__file__).resolve().parent / ".env", override=False)

class Settings:
    # 数据库配置
    DATABASE_URL = os.getenv(
        "DATABASE_URL",
        "postgresql://postgres:password@localhost:5432/gatekeeper"
    )
    
    # JWT 认证
    SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")
    ALGORITHM = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES = 30
    
    # 火山方舟配置
    ARK_API_KEY = os.getenv("ARK_API_KEY", os.getenv("VOLCANO_API_KEY", ""))
    ARK_BASE_URL = os.getenv("ARK_BASE_URL", "https://ark.cn-beijing.volces.com/api/v3")
    ARK_CHAT_MODEL = os.getenv("ARK_CHAT_MODEL", "doubao-seed-2-0-lite-260428")

    # 发票配置
    INVOICE_VERIFICATION_MODE = os.getenv("INVOICE_VERIFICATION_MODE", "mock")

    # 兼容旧配置
    VOLCANO_API_KEY = os.getenv("VOLCANO_API_KEY", "")
    VOLCANO_API_SECRET = os.getenv("VOLCANO_API_SECRET", "")
    VOLCANO_REGION = os.getenv("VOLCANO_REGION", "cn-beijing")
    
    # Redis 配置（Celery）
    REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    
    # Celery 配置
    CELERY_BROKER_URL = os.getenv("CELERY_BROKER_URL", "redis://localhost:6379/1")
    CELERY_RESULT_BACKEND = os.getenv("CELERY_RESULT_BACKEND", "redis://localhost:6379/2")
    
    # 文件上传配置
    UPLOAD_DIR = os.getenv("UPLOAD_DIR", "./uploads")
    MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB
    ALLOWED_EXTENSIONS = {".pdf", ".doc", ".docx", ".xls", ".xlsx", ".png", ".jpg", ".jpeg"}
    
    # 应用配置
    API_TITLE = "守门人财法风控系统"
    API_VERSION = "1.0.0"
    DEBUG = os.getenv("DEBUG", "False") == "True"
    AUTO_CREATE_TABLES = os.getenv("AUTO_CREATE_TABLES", "True") == "True"
    DEMO_USER_ENABLED = os.getenv("DEMO_USER_ENABLED", "True") == "True"
    DEMO_USERNAME = os.getenv("DEMO_USERNAME", "demo")
    DEMO_EMAIL = os.getenv("DEMO_EMAIL", "demo@gatekeeper.com")
    DEMO_PASSWORD = os.getenv("DEMO_PASSWORD", "demo123")
    BACKGROUND_TASK_MODE = os.getenv("BACKGROUND_TASK_MODE", "inline")

settings = Settings()
