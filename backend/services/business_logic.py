"""
发票处理服务
"""
from sqlalchemy.orm import Session
from models import Invoice, InvoiceItem, InvoiceVerificationLog, AsyncTask
from schemas import InvoiceResponse, InvoiceOCRResult
from services.volcano_service import volcano_client
from datetime import datetime
from datetime import date
from decimal import Decimal, InvalidOperation
import json


class InvoiceService:
    """发票处理业务逻辑"""

    @staticmethod
    def _parse_decimal(value) -> Decimal:
        if value in (None, ""):
            return Decimal("0")
        try:
            return Decimal(str(value).replace(",", "").replace("¥", "").strip())
        except (InvalidOperation, ValueError):
            return Decimal("0")

    @staticmethod
    def _parse_date(value):
        if not value:
            return None
        if isinstance(value, date):
            return value

        text = str(value).strip().replace("/", "-").replace(".", "-")
        for fmt in ("%Y-%m-%d", "%Y年%m月%d日", "%Y%m%d"):
            try:
                return datetime.strptime(text, fmt).date()
            except ValueError:
                continue
        return None
    
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
        if invoice.ocr_status == "error":
            invoice.status = "error"
            invoice.validation_status = "invalid"
        
        if ocr_result.get("status") == "success":
            # 更新发票基本信息
            invoice.invoice_number = ocr_result.get("invoice_number")
            invoice.invoice_code = ocr_result.get("invoice_code")
            invoice.invoice_date = InvoiceService._parse_date(ocr_result.get("invoice_date"))
            invoice.issuer_name = ocr_result.get("issuer_name")
            invoice.issuer_tax_id = ocr_result.get("issuer_tax_id")
            invoice.receiver_name = ocr_result.get("receiver_name")
            invoice.receiver_tax_id = ocr_result.get("receiver_tax_id")
            invoice.invoice_amount = InvoiceService._parse_decimal(ocr_result.get("invoice_amount", 0))
            invoice.tax_amount = InvoiceService._parse_decimal(ocr_result.get("tax_amount", 0))
            invoice.total_amount = InvoiceService._parse_decimal(ocr_result.get("total_amount", 0))
            
            # 处理发票项目
            db.query(InvoiceItem).filter(InvoiceItem.invoice_id == invoice_id).delete()
            for item in ocr_result.get("items", []):
                invoice_item = InvoiceItem(
                    invoice_id=invoice_id,
                    item_name=item.get("name"),
                    item_quantity=InvoiceService._parse_decimal(item.get("quantity", 0)),
                    item_unit=item.get("unit"),
                    item_price=InvoiceService._parse_decimal(item.get("price", 0)),
                    item_amount=InvoiceService._parse_decimal(item.get("amount", 0)),
                    tax_rate=InvoiceService._parse_decimal(item.get("tax_rate", 0)),
                    tax_amount=InvoiceService._parse_decimal(item.get("tax_amount", 0)),
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
        if not invoice.invoice_number:
            return False

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
        from models import Invoice, Reimbursement, ReimbursementVerification
        
        reimbursement = db.query(Reimbursement).filter(
            Reimbursement.id == reimbursement_id
        ).first()
        
        if not reimbursement:
            raise ValueError(f"Reimbursement {reimbursement_id} not found")
        
        items = reimbursement.items
        invoice_ids = [item.invoice_id for item in items if item.invoice_id is not None]
        invoices = db.query(Invoice).filter(Invoice.id.in_(invoice_ids)).all() if invoice_ids else []
        invoices_by_id = {invoice.id: invoice for invoice in invoices}

        invoices_linked = len(invoice_ids)
        receipts_linked = sum(1 for item in items if item.receipt_file_path is not None)

        total_amount = sum(Decimal(str(item.amount or 0)) for item in items)
        invoice_total = sum(Decimal(str(invoice.total_amount or 0)) for invoice in invoices)
        amount_gap = abs(total_amount - invoice_total)
        amount_matches = bool(invoice_ids) and amount_gap <= Decimal("0.01")

        duplicate_invoice_ids = [
            invoice.id for invoice in invoices
            if invoice.is_duplicate
        ]
        invalid_invoice_ids = [
            invoice.id for invoice in invoices
            if invoice.is_voided
            or invoice.is_duplicate
            or invoice.validation_status in ("invalid", "duplicate")
            or invoice.status in ("invalid", "voided", "error")
        ]

        item_count = len(items)
        linked_ratio = Decimal(invoices_linked) / Decimal(max(1, item_count))
        valid_ratio = Decimal("1")
        if invoice_ids:
            valid_ratio = Decimal(len(invoice_ids) - len(invalid_invoice_ids)) / Decimal(max(1, len(invoice_ids)))
        amount_ratio = Decimal("1") if amount_matches else Decimal("0")
        matching_score = (linked_ratio * Decimal("0.45")) + (valid_ratio * Decimal("0.35")) + (amount_ratio * Decimal("0.20"))
        matching_score = max(Decimal("0"), min(Decimal("1"), matching_score.quantize(Decimal("0.01"))))

        if invalid_invoice_ids:
            verification_status = "failed"
        elif item_count > 0 and invoices_linked == item_count and amount_matches:
            verification_status = "verified"
        elif invoices_linked > 0:
            verification_status = "partial_verified"
        else:
            verification_status = "not_verified"

        verification_result = {
            "items_total": item_count,
            "items_with_invoice": invoices_linked,
            "receipt_count": receipts_linked,
            "reimbursement_total": str(total_amount),
            "linked_invoice_total": str(invoice_total),
            "amount_gap": str(amount_gap),
            "amount_matches": amount_matches,
            "invalid_invoice_ids": invalid_invoice_ids,
            "duplicate_invoice_ids": duplicate_invoice_ids,
            "unlinked_item_ids": [item.id for item in items if item.invoice_id is None],
            "linked_invoices": [
                {
                    "id": invoice.id,
                    "invoice_number": invoice.invoice_number,
                    "total_amount": str(invoice.total_amount or 0),
                    "status": invoice.status,
                    "validation_status": invoice.validation_status,
                    "authenticity_verified": invoice.authenticity_verified,
                }
                for invoice in invoices_by_id.values()
            ],
        }

        verification = reimbursement.verification
        if not verification:
            verification = ReimbursementVerification(reimbursement_id=reimbursement_id)
            db.add(verification)

        verification.verification_status = verification_status
        verification.item_count = item_count
        verification.invoice_count = invoices_linked
        verification.receipt_count = receipts_linked
        verification.matching_score = matching_score
        verification.duplicate_invoice_count = len(duplicate_invoice_ids)
        verification.invalid_invoice_count = len(invalid_invoice_ids)
        verification.verification_result = verification_result
        verification.verification_error = None

        db.commit()
        db.refresh(verification)
        
        return {
            "verification_status": verification.verification_status,
            "matching_score": float(matching_score),
            "item_count": item_count,
            "invoice_count": invoices_linked,
            "duplicate_invoice_count": len(duplicate_invoice_ids),
            "invalid_invoice_count": len(invalid_invoice_ids),
            "verification_result": verification_result,
        }


invoice_service = InvoiceService()
reimbursement_service = ReimbursementService()
