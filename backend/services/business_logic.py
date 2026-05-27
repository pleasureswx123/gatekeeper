"""
发票处理服务
"""
from sqlalchemy.orm import Session
from models import Invoice, InvoiceItem, InvoiceVerificationLog, AsyncTask
from schemas import InvoiceResponse, InvoiceOCRResult
from services.volcano_service import volcano_client
from datetime import datetime
import json


class InvoiceService:
    """发票处理业务逻辑"""
    
    @staticmethod
    def create_invoice(db: Session, file_path: str, file_name: str, file_size: int, 
                      user_id: int, invoice_type: str = "normal") -> Invoice:
        """创建发票记录"""
        invoice = Invoice(
            invoice_type=invoice_type,
            file_path=file_path,
            file_name=file_name,
            file_size=file_size,
            upload_user_id=user_id,
            status="processing",
            ocr_status="pending"
        )
        db.add(invoice)
        db.commit()
        db.refresh(invoice)
        return invoice
    
    @staticmethod
    def perform_ocr(db: Session, invoice_id: int, image_path: str) -> InvoiceOCRResult:
        """执行 OCR 识别"""
        invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
        if not invoice:
            raise ValueError(f"Invoice {invoice_id} not found")
        
        # 调用火山引擎 OCR
        ocr_result = volcano_client.recognize_invoice_ocr(image_path)
        
        # 更新发票记录
        invoice.ocr_status = "completed" if ocr_result.get("status") == "success" else "error"
        invoice.ocr_result = ocr_result
        invoice.ocr_confidence = ocr_result.get("confidence", 0.0)
        invoice.ocr_error = ocr_result.get("error_message")
        
        if ocr_result.get("status") == "success":
            # 更新发票基本信息
            invoice.invoice_number = ocr_result.get("invoice_number")
            invoice.invoice_code = ocr_result.get("invoice_code")
            invoice.invoice_date = ocr_result.get("invoice_date")
            invoice.issuer_name = ocr_result.get("issuer_name")
            invoice.issuer_tax_id = ocr_result.get("issuer_tax_id")
            invoice.receiver_name = ocr_result.get("receiver_name")
            invoice.receiver_tax_id = ocr_result.get("receiver_tax_id")
            invoice.invoice_amount = float(ocr_result.get("invoice_amount", 0))
            invoice.tax_amount = float(ocr_result.get("tax_amount", 0))
            invoice.total_amount = float(ocr_result.get("total_amount", 0))
            
            # 处理发票项目
            for item in ocr_result.get("items", []):
                invoice_item = InvoiceItem(
                    invoice_id=invoice_id,
                    item_name=item.get("name"),
                    item_quantity=float(item.get("quantity", 0)),
                    item_unit=item.get("unit"),
                    item_price=float(item.get("price", 0)),
                    item_amount=float(item.get("amount", 0))
                )
                db.add(invoice_item)
        
        db.commit()
        db.refresh(invoice)
        return invoice
    
    @staticmethod
    def verify_authenticity(db: Session, invoice_id: int) -> bool:
        """验证发票真伪"""
        invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
        if not invoice:
            raise ValueError(f"Invoice {invoice_id} not found")
        
        # 调用火山引擎验证接口
        verify_result = volcano_client.verify_invoice_authenticity(
            invoice.invoice_number,
            invoice.invoice_code
        )
        
        # 记录验证日志
        log = InvoiceVerificationLog(
            invoice_id=invoice_id,
            verification_type="authenticity",
            verification_result=verify_result.get("is_valid", False),
            verification_details=verify_result,
            external_api_response=verify_result
        )
        db.add(log)
        
        # 更新发票状态
        if verify_result.get("status") == "success":
            invoice.authenticity_verified = verify_result.get("is_valid", False)
            invoice.is_voided = verify_result.get("is_voided", False)
            invoice.verification_timestamp = datetime.utcnow()
            invoice.verification_method = verify_result.get("verification_method")
            invoice.validation_status = "valid" if verify_result.get("is_valid") else "invalid"
        else:
            invoice.verification_error = verify_result.get("error_message")
        
        db.commit()
        return verify_result.get("is_valid", False)
    
    @staticmethod
    def check_duplicate(db: Session, invoice_id: int) -> bool:
        """检查重复发票"""
        invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
        if not invoice:
            raise ValueError(f"Invoice {invoice_id} not found")
        
        # 查询数据库中是否有相同编号的已验证发票
        existing = db.query(Invoice).filter(
            Invoice.invoice_number == invoice.invoice_number,
            Invoice.receiver_tax_id == invoice.receiver_tax_id,
            Invoice.id != invoice_id,
            Invoice.status == "verified"
        ).first()
        
        if existing:
            # 标记为重复
            invoice.is_duplicate = True
            invoice.duplicate_invoice_id = existing.id
            invoice.validation_status = "duplicate"
            
            # 记录验证日志
            log = InvoiceVerificationLog(
                invoice_id=invoice_id,
                verification_type="duplicate",
                verification_result=True,
                verification_details={
                    "duplicate_invoice_id": existing.id,
                    "previous_submission_date": existing.created_at.isoformat()
                }
            )
            db.add(log)
            db.commit()
            return True
        
        return False
    
    @staticmethod
    def update_invoice_status(db: Session, invoice_id: int, status: str, 
                             validation_status: str = None):
        """更新发票状态"""
        invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
        if not invoice:
            raise ValueError(f"Invoice {invoice_id} not found")
        
        invoice.status = status
        if validation_status:
            invoice.validation_status = validation_status
        
        db.commit()
        db.refresh(invoice)
        return invoice


class ReimbursementService:
    """报销单业务逻辑"""
    
    @staticmethod
    def verify_reimbursement(db: Session, reimbursement_id: int) -> dict:
        """验证报销单 - 三单合一检查"""
        from models import Reimbursement, ReimbursementVerification
        
        reimbursement = db.query(Reimbursement).filter(
            Reimbursement.id == reimbursement_id
        ).first()
        
        if not reimbursement:
            raise ValueError(f"Reimbursement {reimbursement_id} not found")
        
        items = reimbursement.items
        invoices_linked = sum(1 for item in items if item.invoice_id is not None)
        receipts_linked = sum(1 for item in items if item.receipt_file_path is not None)
        
        total_amount = sum(float(item.amount or 0) for item in items)
        
        # 计算匹配度
        matching_score = min(1.0, invoices_linked / max(1, len(items)))
        
        verification = ReimbursementVerification(
            reimbursement_id=reimbursement_id,
            verification_status="verified" if matching_score > 0.8 else "partial_verified",
            item_count=len(items),
            invoice_count=invoices_linked,
            receipt_count=receipts_linked,
            matching_score=matching_score,
            verification_result={
                "items_verified": invoices_linked,
                "items_total": len(items),
                "amount_verified": total_amount
            }
        )
        
        db.add(verification)
        db.commit()
        db.refresh(verification)
        
        return {
            "verification_status": verification.verification_status,
            "matching_score": float(matching_score),
            "item_count": len(items),
            "invoice_count": invoices_linked
        }


invoice_service = InvoiceService()
reimbursement_service = ReimbursementService()
