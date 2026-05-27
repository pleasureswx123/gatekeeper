"""
FastAPI 报销管理 API 路由
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from database import get_db
from schemas import ReimbursementCreate, ReimbursementResponse
from models import Invoice, Reimbursement, ReimbursementItem, User
from services.business_logic import reimbursement_service
from deps import get_current_user
from utils.audit import write_audit_log
from datetime import date
from decimal import Decimal, InvalidOperation

router = APIRouter(prefix="/api/reimbursements", tags=["reimbursements"])


def can_review_reimbursements(user: User) -> bool:
    return user.role in ("admin", "reviewer")


def can_access_reimbursement(user: User, reimbursement: Reimbursement) -> bool:
    return can_review_reimbursements(user) or reimbursement.submitter_id == user.id


@router.post("/", response_model=ReimbursementResponse)
def create_reimbursement(
    reimbursement: ReimbursementCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """创建报销单"""
    if not reimbursement.items:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Reimbursement must contain at least one item"
        )

    # 生成报销单号
    import uuid
    reimbursement_number = f"REIMB-{uuid.uuid4().hex[:8].upper()}"
    
    # 创建报销单
    db_reimbursement = Reimbursement(
        reimbursement_number=reimbursement_number,
        submitter_id=current_user.id,
        description=reimbursement.description,
        status="submitted",
        submission_date=date.today()
    )
    
    db.add(db_reimbursement)
    db.flush()
    
    # 添加报销项目
    total_amount = Decimal("0")
    for item_data in reimbursement.items:
        try:
            item_amount = Decimal(str(item_data.get("amount", 0)))
        except (InvalidOperation, ValueError):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid reimbursement item amount"
            )

        if item_amount <= 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Reimbursement item amount must be greater than 0"
            )

        invoice_id = item_data.get("invoice_id")
        if invoice_id:
            invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
            if not invoice or (current_user.role != "admin" and invoice.upload_user_id != current_user.id):
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Invoice {invoice_id} not found"
                )
            if invoice.ocr_status != "completed":
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invoice {invoice_id} OCR is not completed"
                )

        item = ReimbursementItem(
            reimbursement_id=db_reimbursement.id,
            item_name=item_data.get("item_name") or item_data.get("description") or item_data.get("category"),
            category=item_data.get("category"),
            amount=item_amount,
            invoice_id=invoice_id,
            receipt_file_path=item_data.get("receipt_file_path"),
            description=item_data.get("description")
        )
        db.add(item)
        total_amount += item_amount
    
    db_reimbursement.total_amount = total_amount
    db.commit()

    reimbursement_service.verify_reimbursement(db, db_reimbursement.id)
    write_audit_log(
        db,
        action="reimbursement_submitted",
        resource_type="reimbursement",
        resource_id=db_reimbursement.id,
        user_id=current_user.id,
        changes={
            "reimbursement_number": db_reimbursement.reimbursement_number,
            "total_amount": str(db_reimbursement.total_amount),
        },
    )
    db.refresh(db_reimbursement)
    
    return db_reimbursement


@router.get("/{reimbursement_id}", response_model=ReimbursementResponse)
def get_reimbursement(
    reimbursement_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """获取报销单详情"""
    reimbursement = db.query(Reimbursement).filter(
        Reimbursement.id == reimbursement_id
    ).first()
    
    if not reimbursement or not can_access_reimbursement(current_user, reimbursement):
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
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """列表查询报销单"""
    query = db.query(Reimbursement)
    if not can_review_reimbursements(current_user):
        query = query.filter(Reimbursement.submitter_id == current_user.id)
    
    if status:
        query = query.filter(Reimbursement.status == status)
    
    reimbursements = query.order_by(Reimbursement.created_at.desc()).offset(skip).limit(limit).all()
    return reimbursements


@router.post("/{reimbursement_id}/verify")
def verify_reimbursement(
    reimbursement_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """验证报销单 - 三单合一检查"""
    reimbursement = db.query(Reimbursement).filter(
        Reimbursement.id == reimbursement_id
    ).first()
    
    if not reimbursement or not can_access_reimbursement(current_user, reimbursement):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Reimbursement not found"
        )
    
    # 执行验证
    result = reimbursement_service.verify_reimbursement(db, reimbursement_id)
    write_audit_log(
        db,
        action="reimbursement_verified",
        resource_type="reimbursement",
        resource_id=reimbursement_id,
        user_id=current_user.id,
        changes=result,
    )
    
    return {
        "reimbursement_id": reimbursement_id,
        "verification_result": result
    }


@router.put("/{reimbursement_id}/approve")
def approve_reimbursement(
    reimbursement_id: int,
    approval_notes: str = "",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
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
    if not can_review_reimbursements(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only reviewers or admins can approve reimbursements"
        )
    
    reimbursement.status = "approved"
    reimbursement.approver_id = current_user.id
    reimbursement.approval_date = date.today()
    reimbursement.approval_notes = approval_notes
    
    db.commit()
    db.refresh(reimbursement)
    write_audit_log(
        db,
        action="reimbursement_approved",
        resource_type="reimbursement",
        resource_id=reimbursement_id,
        user_id=current_user.id,
        changes={
            "reimbursement_number": reimbursement.reimbursement_number,
            "approval_notes": approval_notes,
        },
    )
    
    return {
        "reimbursement_id": reimbursement_id,
        "status": "approved",
        "message": "Reimbursement approved successfully"
    }


@router.put("/{reimbursement_id}/reject")
def reject_reimbursement(
    reimbursement_id: int,
    rejection_reason: str = "",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
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
    if not can_review_reimbursements(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only reviewers or admins can reject reimbursements"
        )
    
    reimbursement.status = "rejected"
    reimbursement.approver_id = current_user.id
    reimbursement.approval_date = date.today()
    reimbursement.approval_notes = rejection_reason
    
    db.commit()
    db.refresh(reimbursement)
    write_audit_log(
        db,
        action="reimbursement_rejected",
        resource_type="reimbursement",
        resource_id=reimbursement_id,
        user_id=current_user.id,
        changes={
            "reimbursement_number": reimbursement.reimbursement_number,
            "rejection_reason": rejection_reason,
        },
    )
    
    return {
        "reimbursement_id": reimbursement_id,
        "status": "rejected",
        "message": "Reimbursement rejected"
    }
