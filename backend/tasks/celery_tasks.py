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
from utils.audit import write_audit_log
from datetime import datetime
import json
import logging
import re

logger = logging.getLogger(__name__)


def _create_progress(db, task_id: int, percentage: int, step: str, message: str):
    progress = TaskProgress(
        task_id=task_id,
        progress_percentage=percentage,
        current_step=step,
        status_message=message
    )
    db.add(progress)
    db.commit()
    return progress


def _resource_owner_id(db, resource_type: str, resource_id: int) -> int | None:
    if resource_type == "contract":
        resource = db.query(Contract).filter(Contract.id == resource_id).first()
        return resource.upload_user_id if resource else None
    if resource_type == "invoice":
        resource = db.query(Invoice).filter(Invoice.id == resource_id).first()
        return resource.upload_user_id if resource else None
    return None


def _write_task_audit_log(db, task: AsyncTask, action: str, changes: dict):
    if not task:
        return

    write_audit_log(
        db,
        action=action,
        resource_type=task.resource_type or "task",
        resource_id=task.resource_id,
        user_id=_resource_owner_id(db, task.resource_type, task.resource_id),
        changes={
            "task_id": task.task_id,
            "task_type": task.task_type,
            **changes,
        },
    )


def _normalize_severity(value: str) -> str:
    severity = (value or "").strip().lower()
    mapping = {
        "低": "low",
        "中": "medium",
        "高": "high",
        "严重": "critical",
        "critical": "critical",
        "high": "high",
        "medium": "medium",
        "low": "low",
    }
    return mapping.get(severity, "medium")


def _risk_level_from_score(score: int) -> str:
    if score >= 80:
        return "critical"
    if score >= 60:
        return "high"
    if score >= 30:
        return "medium"
    return "low"


def _run_contract_rule_engine(contract_text: str) -> dict:
    text = contract_text or ""
    compact_text = re.sub(r"\s+", "", text)
    violations = []

    def add_violation(risk_type: str, severity: str, description: str, suggestion: str, highlighted_text: str = ""):
        violations.append({
            "type": risk_type,
            "severity": severity,
            "description": description,
            "suggestion": suggestion,
            "highlighted_text": highlighted_text,
        })

    payment_days = [int(match) for match in re.findall(r"(?:付款|支付|结算)[^。\n]{0,20}?(\d{2,3})\s*(?:个)?(?:自然日|工作日|日|天)", text)]
    if payment_days and max(payment_days) > 60:
        add_violation(
            "payment_term",
            "high",
            f"合同约定最长付款周期为 {max(payment_days)} 天，可能带来现金流压力。",
            "建议将付款周期控制在 30-60 天内，并明确逾期付款责任。",
        )

    if "违约" not in compact_text and "赔偿" not in compact_text:
        add_violation(
            "penalty_clause",
            "high",
            "未发现明确的违约责任或赔偿条款。",
            "建议补充违约场景、责任承担方式、赔偿范围和违约金计算方式。",
        )

    if (
        not any(keyword in compact_text for keyword in ("发票", "税率", "增值税", "专票", "普票"))
        or any(keyword in compact_text for keyword in ("未约定发票", "未明确发票", "无发票条款"))
    ):
        add_violation(
            "tax_invoice",
            "medium",
            "未发现发票或税率相关约定。",
            "建议明确发票类型、开票时间、税率、价税合计以及税务变更处理方式。",
        )

    if (
        ("保险" not in compact_text and "保函" not in compact_text)
        or any(keyword in compact_text for keyword in ("未约定保险", "未明确保险", "无保险条款"))
    ):
        add_violation(
            "insurance",
            "medium",
            "未发现保险或履约保障条款。",
            "如合同涉及服务交付、施工、运输或高价值标的，建议补充保险或履约保障要求。",
        )

    if "保密" not in compact_text or any(keyword in compact_text for keyword in ("未约定保密", "未明确保密", "无保密条款")):
        add_violation(
            "confidentiality",
            "medium",
            "未发现保密条款。",
            "建议补充保密范围、保密期限、例外情形和泄密责任。",
        )

    if (
        not any(keyword in compact_text for keyword in ("争议解决", "仲裁", "管辖法院", "诉讼"))
        or any(keyword in compact_text for keyword in ("未约定争议解决", "未明确争议解决", "无争议解决条款"))
    ):
        add_violation(
            "dispute_resolution",
            "medium",
            "未发现争议解决条款。",
            "建议明确争议解决方式、管辖法院或仲裁机构。",
        )

    severity_weight = {"low": 8, "medium": 15, "high": 25, "critical": 40}
    score = min(100, sum(severity_weight.get(v["severity"], 15) for v in violations))
    if any(v["severity"] == "critical" for v in violations):
        risk_level = "critical"
    elif any(v["severity"] == "high" for v in violations):
        risk_level = "high"
    else:
        risk_level = _risk_level_from_score(score)

    return {
        "checked_clauses": ["payment_terms", "penalty", "tax_invoice", "insurance", "confidentiality", "dispute_resolution"],
        "violations": violations,
        "risk_score": score,
        "risk_level": risk_level,
    }


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
        invoice = invoice_service.perform_ocr(db, invoice_id, image_path)

        if invoice.ocr_status == "completed":
            # 发票上传后只做大模型 OCR 识别；真伪验证后续接腾讯服务时再启用。
            invoice_service.update_invoice_status(db, invoice_id, "pending", "pending")
        else:
            progress = TaskProgress(
                task_id=task.id,
                progress_percentage=100,
                current_step="OCR recognition failed",
                status_message=invoice.ocr_error or "Invoice data extraction failed"
            )
            db.add(progress)

            task.status = "failed"
            task.completed_at = datetime.utcnow()
            task.error_message = invoice.ocr_error
            task.result = {
                "invoice_id": invoice_id,
                "status": "error",
                "error_message": invoice.ocr_error
            }
            db.commit()
            _write_task_audit_log(
                db,
                task,
                "task_failed",
                {
                    "invoice_id": invoice_id,
                    "error_message": invoice.ocr_error,
                },
            )
            return {"status": "error", "invoice_id": invoice_id, "message": invoice.ocr_error}
        
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
        task.result = {
            "invoice_id": invoice_id,
            "status": "success",
            "ocr_status": invoice.ocr_status,
            "verification_status": "not_started",
        }
        db.commit()
        _write_task_audit_log(
            db,
            task,
            "task_completed",
                {
                    "invoice_id": invoice_id,
                    "invoice_status": invoice.status,
                    "verification_status": "not_started",
                },
            )
        
        return {"status": "success", "invoice_id": invoice_id}
    
    except Exception as e:
        logger.error(f"OCR task failed: {str(e)}", exc_info=True)
        task = db.query(AsyncTask).filter(
            AsyncTask.task_id == self.request.id
        ).first()
        
        if task:
            progress = TaskProgress(
                task_id=task.id,
                progress_percentage=100,
                current_step="OCR recognition failed",
                status_message=str(e)
            )
            db.add(progress)
            task.status = "failed"
            task.error_message = str(e)
            task.completed_at = datetime.utcnow()
            task.result = {
                "invoice_id": invoice_id,
                "status": "error",
                "error_message": str(e)
            }
            db.commit()
            _write_task_audit_log(
                db,
                task,
                "task_failed",
                {
                    "invoice_id": invoice_id,
                    "error_message": str(e),
                },
            )
        
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
        invoice_service.update_invoice_status(
            db,
            invoice_id,
            "verified" if is_valid and not is_duplicate else "invalid",
            "duplicate" if is_duplicate else ("valid" if is_valid else "invalid")
        )
        
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
        _write_task_audit_log(
            db,
            task,
            "task_completed",
            {
                "invoice_id": invoice_id,
                "is_valid": is_valid,
                "is_duplicate": is_duplicate,
            },
        )
        
        return {"status": "success", "is_valid": is_valid, "is_duplicate": is_duplicate}
    
    except Exception as e:
        logger.error(f"Verification task failed: {str(e)}", exc_info=True)
        task = db.query(AsyncTask).filter(
            AsyncTask.task_id == self.request.id
        ).first()
        
        if task:
            progress = TaskProgress(
                task_id=task.id,
                progress_percentage=100,
                current_step="Verification failed",
                status_message=str(e)
            )
            db.add(progress)
            task.status = "failed"
            task.error_message = str(e)
            task.completed_at = datetime.utcnow()
            task.result = {
                "invoice_id": invoice_id,
                "status": "error",
                "error_message": str(e)
            }
            db.commit()
            _write_task_audit_log(
                db,
                task,
                "task_failed",
                {
                    "invoice_id": invoice_id,
                    "error_message": str(e),
                },
            )
        
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
        
        contract.status = "analyzing"
        contract.analysis_started_at = datetime.utcnow()
        db.commit()

        if not contract_text or len(contract_text.strip()) < 20:
            contract.status = "error"
            contract.analysis_error = "合同文本过短或为空，无法进行风险分析"
            db.commit()
            raise ValueError(contract.analysis_error)

        _create_progress(
            db,
            task.id,
            30,
            "Rule engine analysis",
            "Checking contract against built-in compliance rules..."
        )

        rule_engine_result = _run_contract_rule_engine(contract_text)
        
        # 阶段 2：LLM 语义分析 (70%)
        _create_progress(
            db,
            task.id,
            70,
            "LLM semantic analysis",
            "Analyzing contract semantics with AI..."
        )
        
        llm_result = volcano_client.analyze_contract_with_llm(contract_text)
        llm_error = None
        if llm_result.get("status") == "error":
            llm_error = llm_result.get("error_message") or "Contract semantic analysis failed"
            logger.warning("Contract LLM analysis failed, using rule engine result: %s", llm_error)
            llm_result = {
                "status": "error",
                "error_message": llm_error,
                "risks": [],
                "risk_score": 0,
                "risk_level": "unknown",
                "analysis_confidence": 0,
            }
        
        # 合并结果
        rule_risks = rule_engine_result.get("violations", [])
        llm_risks = llm_result.get("risks", [])
        combined_risks = rule_risks + llm_risks
        llm_score = int(llm_result.get("risk_score") or 0)
        rule_score = int(rule_engine_result.get("risk_score") or 0)
        risk_score = min(100, max(rule_score, llm_score))
        risk_level = rule_engine_result.get("risk_level") if rule_score >= llm_score else _risk_level_from_score(risk_score)
        
        # 更新合同记录
        contract.status = "completed"
        contract.analysis_completed_at = datetime.utcnow()
        contract.analysis_error = None
        contract.rule_engine_result = rule_engine_result
        contract.llm_analysis_result = llm_result
        contract.risk_score = risk_score
        contract.risk_level = risk_level
        contract.analysis_result = {
            "risks": combined_risks,
            "risk_score": risk_score,
            "risk_level": risk_level,
            "rule_engine_result": rule_engine_result,
            "llm_analysis_result": llm_result,
        }
        
        # 创建风险记录
        from models import ContractRisk
        db.query(ContractRisk).filter(ContractRisk.contract_id == contract_id).delete()
        for risk in combined_risks:
            contract_risk = ContractRisk(
                contract_id=contract_id,
                risk_type=risk.get("type"),
                severity=_normalize_severity(risk.get("severity")),
                description=risk.get("description"),
                highlighted_text=risk.get("highlighted_text"),
                detection_method="rule_engine" if risk in rule_risks else "llm",
                remediation_suggestion=risk.get("suggestion")
            )
            db.add(contract_risk)
        
        db.commit()
        
        _create_progress(
            db,
            task.id,
            100,
            "Analysis completed",
            f"Risk score: {risk_score}, Level: {risk_level}"
        )
        
        task.status = "completed"
        task.completed_at = datetime.utcnow()
        task.result = {
            "contract_id": contract_id,
            "risk_score": risk_score,
            "risk_level": risk_level,
            "llm_error": llm_error,
        }
        db.commit()
        _write_task_audit_log(
            db,
            task,
            "task_completed",
            {
                "contract_id": contract_id,
                "risk_score": risk_score,
                "risk_level": risk_level,
            },
        )
        
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
            progress = TaskProgress(
                task_id=task.id,
                progress_percentage=100,
                current_step="Analysis failed",
                status_message=str(e)
            )
            db.add(progress)
            task.status = "failed"
            task.error_message = str(e)
            task.completed_at = datetime.utcnow()
            task.result = {
                "contract_id": contract_id,
                "status": "error",
                "error_message": str(e)
            }
            db.commit()
            _write_task_audit_log(
                db,
                task,
                "task_failed",
                {
                    "contract_id": contract_id,
                    "error_message": str(e),
                },
            )
        
        if self.request.retries < 3:
            raise self.retry(exc=e, countdown=60)
        
        return {"status": "error", "message": str(e)}
    
    finally:
        db.close()
