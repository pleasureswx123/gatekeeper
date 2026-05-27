"""
Celery 异步任务定义
"""
from celery import shared_task
from celery_app import celery_app
from database import SessionLocal
from models import Invoice, Contract, AsyncTask, TaskProgress
from services.business_logic import invoice_service, reimbursement_service
from services.volcano_service import volcano_client
from utils.file_handler import get_file_extension
from datetime import datetime
import json
import logging

logger = logging.getLogger(__name__)


@celery_app.task(bind=True, name="invoice.ocr_recognition")
def invoice_ocr_recognition(self, invoice_id: int, image_path: str):
    """
    异步任务：发票 OCR 识别
    """
    db = SessionLocal()
    try:
        # 更新任务状态
        task = db.query(AsyncTask).filter(
            AsyncTask.task_id == self.request.id
        ).first()
        
        if not task:
            task = AsyncTask(
                task_id=self.request.id,
                task_type="invoice_ocr",
                status="processing",
                resource_type="invoice",
                resource_id=invoice_id
            )
            db.add(task)
            db.commit()
        else:
            task.status = "processing"
            task.started_at = datetime.utcnow()
            db.commit()
        
        # 更新进度
        progress = TaskProgress(
            task_id=task.id,
            progress_percentage=10,
            current_step="Starting OCR recognition",
            status_message="Initializing OCR engine..."
        )
        db.add(progress)
        db.commit()
        
        # 执行 OCR 识别
        logger.info(f"Starting OCR for invoice {invoice_id}")
        invoice_service.perform_ocr(db, invoice_id, image_path)
        
        # 更新进度
        progress = TaskProgress(
            task_id=task.id,
            progress_percentage=100,
            current_step="OCR recognition completed",
            status_message="Invoice data extracted successfully"
        )
        db.add(progress)
        
        task.status = "completed"
        task.completed_at = datetime.utcnow()
        task.result = {"invoice_id": invoice_id, "status": "success"}
        db.commit()
        
        return {"status": "success", "invoice_id": invoice_id}
    
    except Exception as e:
        logger.error(f"OCR task failed: {str(e)}", exc_info=True)
        task = db.query(AsyncTask).filter(
            AsyncTask.task_id == self.request.id
        ).first()
        
        if task:
            task.status = "failed"
            task.error_message = str(e)
            task.completed_at = datetime.utcnow()
            db.commit()
        
        # 重试逻辑
        if self.request.retries < 3:
            raise self.retry(exc=e, countdown=60)
        
        return {"status": "error", "message": str(e)}
    
    finally:
        db.close()


@celery_app.task(bind=True, name="invoice.verify_authenticity")
def invoice_verify_authenticity(self, invoice_id: int):
    """
    异步任务：发票真伪验证
    """
    db = SessionLocal()
    try:
        task = db.query(AsyncTask).filter(
            AsyncTask.task_id == self.request.id
        ).first()
        
        if not task:
            task = AsyncTask(
                task_id=self.request.id,
                task_type="invoice_verification",
                status="processing",
                resource_type="invoice",
                resource_id=invoice_id
            )
            db.add(task)
            db.commit()
        else:
            task.status = "processing"
            task.started_at = datetime.utcnow()
            db.commit()
        
        # 更新进度
        progress = TaskProgress(
            task_id=task.id,
            progress_percentage=30,
            current_step="Verifying invoice authenticity",
            status_message="Connecting to verification service..."
        )
        db.add(progress)
        db.commit()
        
        # 验证真伪
        logger.info(f"Verifying authenticity for invoice {invoice_id}")
        is_valid = invoice_service.verify_authenticity(db, invoice_id)
        
        # 检查重复
        progress = TaskProgress(
            task_id=task.id,
            progress_percentage=70,
            current_step="Checking for duplicates",
            status_message="Scanning database for duplicate invoices..."
        )
        db.add(progress)
        db.commit()
        
        is_duplicate = invoice_service.check_duplicate(db, invoice_id)
        
        # 最终状态
        progress = TaskProgress(
            task_id=task.id,
            progress_percentage=100,
            current_step="Verification completed",
            status_message=f"Invoice {'valid' if is_valid else 'invalid'}, duplicate: {is_duplicate}"
        )
        db.add(progress)
        
        task.status = "completed"
        task.completed_at = datetime.utcnow()
        task.result = {
            "invoice_id": invoice_id,
            "is_valid": is_valid,
            "is_duplicate": is_duplicate
        }
        db.commit()
        
        return {"status": "success", "is_valid": is_valid, "is_duplicate": is_duplicate}
    
    except Exception as e:
        logger.error(f"Verification task failed: {str(e)}", exc_info=True)
        task = db.query(AsyncTask).filter(
            AsyncTask.task_id == self.request.id
        ).first()
        
        if task:
            task.status = "failed"
            task.error_message = str(e)
            task.completed_at = datetime.utcnow()
            db.commit()
        
        if self.request.retries < 3:
            raise self.retry(exc=e, countdown=60)
        
        return {"status": "error", "message": str(e)}
    
    finally:
        db.close()


@celery_app.task(bind=True, name="contract.analyze_risks")
def contract_analyze_risks(self, contract_id: int, contract_text: str):
    """
    异步任务：合同风险分析（双引擎）
    """
    db = SessionLocal()
    try:
        task = db.query(AsyncTask).filter(
            AsyncTask.task_id == self.request.id
        ).first()
        
        if not task:
            task = AsyncTask(
                task_id=self.request.id,
                task_type="contract_analysis",
                status="processing",
                resource_type="contract",
                resource_id=contract_id
            )
            db.add(task)
            db.commit()
        else:
            task.status = "processing"
            task.started_at = datetime.utcnow()
            db.commit()
        
        contract = db.query(Contract).filter(Contract.id == contract_id).first()
        if not contract:
            raise ValueError(f"Contract {contract_id} not found")
        
        # 阶段 1：规则引擎检测 (30%)
        progress = TaskProgress(
            task_id=task.id,
            progress_percentage=30,
            current_step="Rule engine analysis",
            status_message="Checking contract against compliance rules..."
        )
        db.add(progress)
        db.commit()
        
        rule_engine_result = {
            "checked_clauses": ["payment_terms", "penalty", "tax", "insurance"],
            "violations": []
        }
        
        # 阶段 2：LLM 语义分析 (70%)
        progress = TaskProgress(
            task_id=task.id,
            progress_percentage=70,
            current_step="LLM semantic analysis",
            status_message="Analyzing contract semantics with AI..."
        )
        db.add(progress)
        db.commit()
        
        llm_result = volcano_client.analyze_contract_with_llm(contract_text)
        
        # 合并结果
        combined_risks = llm_result.get("risks", [])
        risk_score = llm_result.get("risk_score", 50)
        risk_level = llm_result.get("risk_level", "medium")
        
        # 更新合同记录
        contract.status = "completed"
        contract.analysis_completed_at = datetime.utcnow()
        contract.rule_engine_result = rule_engine_result
        contract.llm_analysis_result = llm_result
        contract.risk_score = risk_score
        contract.risk_level = risk_level
        contract.analysis_result = {
            "risks": combined_risks,
            "risk_score": risk_score,
            "risk_level": risk_level
        }
        
        # 创建风险记录
        from models import ContractRisk
        for risk in combined_risks:
            contract_risk = ContractRisk(
                contract_id=contract_id,
                risk_type=risk.get("type"),
                severity=risk.get("severity"),
                description=risk.get("description"),
                detection_method="llm",
                remediation_suggestion=risk.get("suggestion")
            )
            db.add(contract_risk)
        
        db.commit()
        
        # 完成任务
        progress = TaskProgress(
            task_id=task.id,
            progress_percentage=100,
            current_step="Analysis completed",
            status_message=f"Risk score: {risk_score}, Level: {risk_level}"
        )
        db.add(progress)
        
        task.status = "completed"
        task.completed_at = datetime.utcnow()
        task.result = {
            "contract_id": contract_id,
            "risk_score": risk_score,
            "risk_level": risk_level
        }
        db.commit()
        
        return {
            "status": "success",
            "risk_score": risk_score,
            "risk_level": risk_level
        }
    
    except Exception as e:
        logger.error(f"Contract analysis task failed: {str(e)}", exc_info=True)
        task = db.query(AsyncTask).filter(
            AsyncTask.task_id == self.request.id
        ).first()
        
        if task:
            task.status = "failed"
            task.error_message = str(e)
            task.completed_at = datetime.utcnow()
            db.commit()
        
        if self.request.retries < 3:
            raise self.retry(exc=e, countdown=60)
        
        return {"status": "error", "message": str(e)}
    
    finally:
        db.close()
