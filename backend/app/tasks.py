"""
FastAPI 异步任务 API 路由
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
from models import AsyncTask, TaskProgress, User, Contract, Invoice, Reimbursement
from schemas import TaskProgressResponse, TaskResultResponse
from deps import get_current_user

router = APIRouter(prefix="/api/tasks", tags=["tasks"])


def _can_access_task(db: Session, task: AsyncTask, user: User) -> bool:
    if user.role == "admin":
        return True
    if task.resource_type == "contract":
        resource = db.query(Contract).filter(Contract.id == task.resource_id).first()
        return bool(resource and resource.upload_user_id == user.id)
    if task.resource_type == "invoice":
        resource = db.query(Invoice).filter(Invoice.id == task.resource_id).first()
        return bool(resource and resource.upload_user_id == user.id)
    if task.resource_type == "reimbursement":
        resource = db.query(Reimbursement).filter(Reimbursement.id == task.resource_id).first()
        return bool(resource and resource.submitter_id == user.id)
    return False


@router.get("/{task_id}", response_model=TaskProgressResponse)
def get_task_status(
    task_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """获取任务状态"""
    task = db.query(AsyncTask).filter(AsyncTask.task_id == task_id).first()
    
    if not task or not _can_access_task(db, task, current_user):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )
    
    progress = db.query(TaskProgress).filter(
        TaskProgress.task_id == task.id
    ).order_by(TaskProgress.updated_at.desc()).first()
    
    return {
        "task_id": task_id,
        "status": task.status,
        "progress_percentage": progress.progress_percentage if progress else 0,
        "current_step": progress.current_step if progress else None,
        "status_message": progress.status_message if progress else None
    }


@router.get("/{task_id}/result", response_model=TaskResultResponse)
def get_task_result(
    task_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """获取任务结果"""
    task = db.query(AsyncTask).filter(AsyncTask.task_id == task_id).first()
    
    if not task or not _can_access_task(db, task, current_user):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )
    
    return {
        "task_id": task_id,
        "status": task.status,
        "result": task.result if task.status == "completed" else None,
        "error_message": task.error_message if task.status == "failed" else None
    }


@router.get("/resource/{resource_type}/{resource_id}")
def get_resource_tasks(
    resource_type: str,
    resource_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """获取资源相关的所有任务"""
    tasks = db.query(AsyncTask).filter(
        AsyncTask.resource_type == resource_type,
        AsyncTask.resource_id == resource_id
    ).order_by(AsyncTask.created_at.desc()).all()
    tasks = [task for task in tasks if _can_access_task(db, task, current_user)]
    
    result = []
    for task in tasks:
        progress = db.query(TaskProgress).filter(
            TaskProgress.task_id == task.id
        ).order_by(TaskProgress.updated_at.desc()).first()
        
        result.append({
            "task_id": task.task_id,
            "task_type": task.task_type,
            "status": task.status,
            "progress": progress.progress_percentage if progress else 0,
            "current_step": progress.current_step if progress else None,
            "status_message": progress.status_message if progress else None,
            "error_message": task.error_message,
            "created_at": task.created_at,
            "completed_at": task.completed_at
        })
    
    return result
