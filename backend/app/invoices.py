"""
FastAPI 发票管理 API 路由
"""
from fastapi import APIRouter, Depends, File, UploadFile, HTTPException, status, Query
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from database import get_db
from schemas import InvoiceResponse, InvoiceUpload, InvoiceBatchVerifyRequest
from models import Invoice, AsyncTask, User
from services.business_logic import invoice_service
from utils.file_handler import save_upload_file, get_file_extension, get_file_size
from tasks.celery_tasks import invoice_ocr_recognition, invoice_verify_authenticity
from config import settings
from deps import get_current_user
from utils.audit import write_audit_log
import os
import uuid

router = APIRouter(prefix="/api/invoices", tags=["invoices"])

INVOICE_EXTENSIONS = {".pdf", ".png", ".jpg", ".jpeg"}


@router.post("/upload")
async def upload_invoice(
    file: UploadFile = File(...),
    invoice_type: str = "normal",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """上传发票文件"""
    # 检查文件类型
    if get_file_extension(file.filename) not in INVOICE_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF, PNG, JPG and JPEG invoice files are supported"
        )
    
    # 保存文件
    file_path = save_upload_file(file, subfolder="invoices")
    file_size = get_file_size(file_path)
    
    # 检查文件大小
    if file_size > settings.MAX_FILE_SIZE:
        os.remove(file_path)
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="File size exceeds 50MB limit"
        )
    
    # 创建发票记录
    invoice = invoice_service.create_invoice(
        db,
        file_path=file_path,
        file_name=file.filename,
        file_size=file_size,
        user_id=current_user.id,
        invoice_type=invoice_type
    )
    
    task_id = str(uuid.uuid4())
    db.add(AsyncTask(
        task_id=task_id,
        task_type="invoice_ocr",
        status="pending",
        resource_type="invoice",
        resource_id=invoice.id,
    ))
    db.commit()

    write_audit_log(
        db,
        action="invoice_uploaded",
        resource_type="invoice",
        resource_id=invoice.id,
        user_id=current_user.id,
        changes={
            "file_name": file.filename,
            "invoice_type": invoice_type,
        },
    )

    if settings.BACKGROUND_TASK_MODE == "inline":
        invoice_ocr_recognition.apply(args=[invoice.id, file_path], task_id=task_id)
    else:
        invoice_ocr_recognition.apply_async(args=[invoice.id, file_path], task_id=task_id)
    
    return {
        "invoice_id": invoice.id,
        "file_name": file.filename,
        "task_id": task_id,
        "status": "uploaded",
        "message": "Invoice uploaded successfully, OCR processing started"
    }


@router.get("/{invoice_id}", response_model=InvoiceResponse)
def get_invoice(
    invoice_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """获取发票详情"""
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    
    if not invoice or (current_user.role != "admin" and invoice.upload_user_id != current_user.id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice not found"
        )

    return invoice


@router.get("/{invoice_id}/file")
def download_invoice_file(
    invoice_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """下载发票原始文件"""
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()

    if not invoice or (current_user.role != "admin" and invoice.upload_user_id != current_user.id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice not found"
        )

    if not invoice.file_path or not os.path.exists(invoice.file_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice file not found"
        )

    return FileResponse(
        invoice.file_path,
        filename=invoice.file_name or f"invoice-{invoice_id}{get_file_extension(invoice.file_path)}",
        media_type="application/octet-stream",
    )


@router.get("/", response_model=list[InvoiceResponse])
def list_invoices(
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    status: str = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """列表查询发票"""
    query = db.query(Invoice)
    if current_user.role != "admin":
        query = query.filter(Invoice.upload_user_id == current_user.id)
    
    if status:
        query = query.filter(Invoice.status == status)
    
    invoices = query.order_by(Invoice.created_at.desc()).offset(skip).limit(limit).all()
    return invoices


@router.post("/batch/verify")
def batch_verify_invoices(
    request: InvoiceBatchVerifyRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """批量验证发票"""
    tasks = []
    skipped = []

    for invoice_id in request.invoice_ids:
        query = db.query(Invoice).filter(Invoice.id == invoice_id)
        if current_user.role != "admin":
            query = query.filter(Invoice.upload_user_id == current_user.id)
        invoice = query.first()
        if not invoice:
            skipped.append({"invoice_id": invoice_id, "reason": "not_found"})
            continue

        if invoice.ocr_status != "completed":
            skipped.append({"invoice_id": invoice_id, "reason": "ocr_not_completed"})
            continue

        task_id = str(uuid.uuid4())
        db.add(AsyncTask(
            task_id=task_id,
            task_type="invoice_verification",
            status="pending",
            resource_type="invoice",
            resource_id=invoice_id,
        ))
        db.commit()
        write_audit_log(
            db,
            action="invoice_verification_started",
            resource_type="invoice",
            resource_id=invoice_id,
            user_id=current_user.id,
            changes={
                "invoice_number": invoice.invoice_number,
                "task_id": task_id,
                "source": "batch",
            },
        )
        if settings.BACKGROUND_TASK_MODE == "inline":
            invoice_verify_authenticity.apply(args=[invoice_id], task_id=task_id)
        else:
            invoice_verify_authenticity.apply_async(args=[invoice_id], task_id=task_id)
        tasks.append({
            "invoice_id": invoice_id,
            "task_id": task_id
        })

    return {
        "total": len(request.invoice_ids),
        "started": len(tasks),
        "skipped": skipped,
        "tasks": tasks
    }


@router.post("/{invoice_id}/verify")
def verify_invoice(
    invoice_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """验证发票真伪"""
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    
    if not invoice or (current_user.role != "admin" and invoice.upload_user_id != current_user.id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice not found"
        )

    if invoice.ocr_status != "completed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invoice OCR must be completed before verification"
        )
    
    task_id = str(uuid.uuid4())
    db.add(AsyncTask(
        task_id=task_id,
        task_type="invoice_verification",
        status="pending",
        resource_type="invoice",
        resource_id=invoice_id,
    ))
    db.commit()

    write_audit_log(
        db,
        action="invoice_verification_started",
        resource_type="invoice",
        resource_id=invoice_id,
        user_id=current_user.id,
        changes={
            "invoice_number": invoice.invoice_number,
            "task_id": task_id,
        },
    )

    if settings.BACKGROUND_TASK_MODE == "inline":
        invoice_verify_authenticity.apply(args=[invoice_id], task_id=task_id)
    else:
        invoice_verify_authenticity.apply_async(args=[invoice_id], task_id=task_id)
    
    return {
        "invoice_id": invoice_id,
        "task_id": task_id,
        "status": "verification_started",
        "message": "Invoice verification task started"
    }


@router.get("/{invoice_id}/ocr-status")
def get_ocr_status(
    invoice_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """获取 OCR 识别状态"""
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    
    if not invoice or (current_user.role != "admin" and invoice.upload_user_id != current_user.id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice not found"
        )
    
    return {
        "invoice_id": invoice_id,
        "ocr_status": invoice.ocr_status,
        "ocr_confidence": invoice.ocr_confidence,
        "status": invoice.status,
        "ocr_result": invoice.ocr_result
    }
