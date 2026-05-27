"""
FastAPI 报销管理 API 路由
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from database import get_db
from schemas import ReimbursementCreate, ReimbursementResponse, ReimbursementItemResponse
from models import Reimbursement, ReimbursementItem, ReimbursementVerification
from services.business_logic import reimbursement_service
from datetime import date

router = APIRouter(prefix="/api/reimbursements", tags=["reimbursements"])


@router.post("/", response_model=ReimbursementResponse)
def create_reimbursement(
    reimbursement: ReimbursementCreate,
    db: Session = Depends(get_db)
):
    """创建报销单"""
    # 生成报销单号
    import uuid
    reimbursement_number = f"REIMB-{uuid.uuid4().hex[:8].upper()}"
    
    # 创建报销单
    db_reimbursement = Reimbursement(
        reimbursement_number=reimbursement_number,
        submitter_id=1,  # TODO: 从认证信息获取
        description=reimbursement.description,
        status="submitted",
        submission_date=date.today()
    )
    
    db.add(db_reimbursement)
    db.flush()
    
    # 添加报销项目
    total_amount = 0
    for item_data in reimbursement.items:
        item = ReimbursementItem(
            reimbursement_id=db_reimbursement.id,
            item_name=item_data.get("item_name"),
            category=item_data.get("category"),
            amount=float(item_data.get("amount", 0)),
            invoice_id=item_data.get("invoice_id"),
            receipt_file_path=item_data.get("receipt_file_path"),
            description=item_data.get("description")
        )
        db.add(item)
        total_amount += float(item_data.get("amount", 0))
    
    db_reimbursement.total_amount = total_amount
    db.commit()
    db.refresh(db_reimbursement)
    
    return db_reimbursement


@router.get("/{reimbursement_id}", response_model=ReimbursementResponse)
def get_reimbursement(reimbursement_id: int, db: Session = Depends(get_db)):
    """获取报销单详情"""
    reimbursement = db.query(Reimbursement).filter(
        Reimbursement.id == reimbursement_id
    ).first()
    
    if not reimbursement:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Reimbursement not found"
        )
    
    return reimbursement


@router.get("/", response_model=list[ReimbursementResponse])
def list_reimbursements(
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    status: str = Query(None),
    db: Session = Depends(get_db)
):
    """列表查询报销单"""
    query = db.query(Reimbursement)
    
    if status:
        query = query.filter(Reimbursement.status == status)
    
    reimbursements = query.offset(skip).limit(limit).all()
    return reimbursements


@router.post("/{reimbursement_id}/verify")
def verify_reimbursement(reimbursement_id: int, db: Session = Depends(get_db)):
    """验证报销单 - 三单合一检查"""
    reimbursement = db.query(Reimbursement).filter(
        Reimbursement.id == reimbursement_id
    ).first()
    
    if not reimbursement:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Reimbursement not found"
        )
    
    # 执行验证
    result = reimbursement_service.verify_reimbursement(db, reimbursement_id)
    
    return {
        "reimbursement_id": reimbursement_id,
        "verification_result": result
    }


@router.put("/{reimbursement_id}/approve")
def approve_reimbursement(
    reimbursement_id: int,
    approval_notes: str = "",
    db: Session = Depends(get_db)
):
    """批准报销单"""
    reimbursement = db.query(Reimbursement).filter(
        Reimbursement.id == reimbursement_id
    ).first()
    
    if not reimbursement:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Reimbursement not found"
        )
    
    reimbursement.status = "approved"
    reimbursement.approver_id = 1  # TODO: 从认证信息获取
    reimbursement.approval_date = date.today()
    reimbursement.approval_notes = approval_notes
    
    db.commit()
    db.refresh(reimbursement)
    
    return {
        "reimbursement_id": reimbursement_id,
        "status": "approved",
        "message": "Reimbursement approved successfully"
    }


@router.put("/{reimbursement_id}/reject")
def reject_reimbursement(
    reimbursement_id: int,
    rejection_reason: str = "",
    db: Session = Depends(get_db)
):
    """拒绝报销单"""
    reimbursement = db.query(Reimbursement).filter(
        Reimbursement.id == reimbursement_id
    ).first()
    
    if not reimbursement:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Reimbursement not found"
        )
    
    reimbursement.status = "rejected"
    reimbursement.approver_id = 1  # TODO: 从认证信息获取
    reimbursement.approval_date = date.today()
    reimbursement.approval_notes = rejection_reason
    
    db.commit()
    db.refresh(reimbursement)
    
    return {
        "reimbursement_id": reimbursement_id,
        "status": "rejected",
        "message": "Reimbursement rejected"
    }
