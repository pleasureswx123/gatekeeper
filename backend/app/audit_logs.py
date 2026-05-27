"""
FastAPI 审计日志 API 路由
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session, joinedload
from database import get_db
from deps import get_current_user
from models import AuditLog, User
from schemas import AuditLogResponse

router = APIRouter(prefix="/api/audit-logs", tags=["audit-logs"])


@router.get("/", response_model=list[AuditLogResponse])
def list_audit_logs(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    action: str = Query(None),
    resource_type: str = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """查询审计日志"""
    query = db.query(AuditLog).options(joinedload(AuditLog.user))

    if current_user.role != "admin":
        query = query.filter(AuditLog.user_id == current_user.id)

    if action:
        query = query.filter(AuditLog.action == action)

    if resource_type:
        query = query.filter(AuditLog.resource_type == resource_type)

    return query.order_by(AuditLog.created_at.desc()).offset(skip).limit(limit).all()
