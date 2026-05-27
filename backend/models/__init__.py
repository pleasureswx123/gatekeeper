"""
SQLAlchemy ORM 模型
"""
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Text, DECIMAL, ForeignKey, JSON, Date, Index
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base


# ==================== 用户模型 ====================

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(100), unique=True, nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(200))
    role = Column(String(50), default="employee")  # employee, reviewer, admin
    department = Column(String(100))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # 关系
    contracts = relationship("Contract", back_populates="upload_user")
    invoices = relationship("Invoice", back_populates="upload_user")
    reimbursements = relationship("Reimbursement", back_populates="submitter", foreign_keys="Reimbursement.submitter_id")
    approvals = relationship("Reimbursement", back_populates="approver", foreign_keys="Reimbursement.approver_id")
    audit_logs = relationship("AuditLog", back_populates="user")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    action = Column(String(100))
    resource_type = Column(String(50))  # contract, reimbursement, invoice
    resource_id = Column(Integer)
    changes = Column(JSON)
    ip_address = Column(String(50))
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    user = relationship("User", back_populates="audit_logs")


# ==================== 合同模型 ====================

class Contract(Base):
    __tablename__ = "contracts"

    id = Column(Integer, primary_key=True, index=True)
    contract_number = Column(String(100), unique=True, nullable=False, index=True)
    contract_name = Column(String(255), nullable=False)
    supplier_name = Column(String(255))
    amount = Column(DECIMAL(15, 2))
    currency = Column(String(3), default="CNY")
    start_date = Column(Date)
    end_date = Column(Date)
    file_path = Column(String(500))
    file_name = Column(String(255))
    file_size = Column(Integer)
    upload_user_id = Column(Integer, ForeignKey("users.id"), index=True)
    status = Column(String(50), default="pending", index=True)  # pending, analyzing, completed, error
    analysis_result = Column(JSON)
    risk_score = Column(Float)
    risk_level = Column(String(20), index=True)  # low, medium, high, critical
    rule_engine_result = Column(JSON)
    llm_analysis_result = Column(JSON)
    analysis_error = Column(Text)
    analysis_started_at = Column(DateTime)
    analysis_completed_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # 关系
    upload_user = relationship("User", back_populates="contracts")
    risks = relationship("ContractRisk", back_populates="contract", cascade="all, delete-orphan")
    clauses = relationship("ContractClause", back_populates="contract", cascade="all, delete-orphan")


class ContractRisk(Base):
    __tablename__ = "contract_risks"

    id = Column(Integer, primary_key=True, index=True)
    contract_id = Column(Integer, ForeignKey("contracts.id", ondelete="CASCADE"), nullable=False, index=True)
    risk_type = Column(String(100))  # tax_rate, payment_term, penalty_clause, etc.
    severity = Column(String(20), index=True)  # low, medium, high, critical
    description = Column(Text)
    highlighted_text = Column(Text)
    page_number = Column(Integer)
    location_coordinates = Column(JSON)
    detection_method = Column(String(50))  # rule_engine, llm
    remediation_suggestion = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

    contract = relationship("Contract", back_populates="risks")


class ContractClause(Base):
    __tablename__ = "contract_clauses"

    id = Column(Integer, primary_key=True, index=True)
    contract_id = Column(Integer, ForeignKey("contracts.id", ondelete="CASCADE"), nullable=False, index=True)
    clause_type = Column(String(100))  # payment_terms, penalty, tax, insurance, etc.
    clause_text = Column(Text)
    extracted_data = Column(JSON)
    created_at = Column(DateTime, default=datetime.utcnow)

    contract = relationship("Contract", back_populates="clauses")


# ==================== 报销模型 ====================

class Reimbursement(Base):
    __tablename__ = "reimbursements"

    id = Column(Integer, primary_key=True, index=True)
    reimbursement_number = Column(String(100), unique=True, nullable=False, index=True)
    submitter_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    approver_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    total_amount = Column(DECIMAL(15, 2))
    currency = Column(String(3), default="CNY")
    description = Column(Text)
    status = Column(String(50), default="submitted", index=True)  # submitted, pending_review, approved, rejected, reimbursed
    submission_date = Column(Date)
    approval_date = Column(Date)
    approval_notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # 关系
    submitter = relationship("User", back_populates="reimbursements", foreign_keys=[submitter_id])
    approver = relationship("User", back_populates="approvals", foreign_keys=[approver_id])
    items = relationship("ReimbursementItem", back_populates="reimbursement", cascade="all, delete-orphan")
    verification = relationship("ReimbursementVerification", back_populates="reimbursement", uselist=False, cascade="all, delete-orphan")


class ReimbursementItem(Base):
    __tablename__ = "reimbursement_items"

    id = Column(Integer, primary_key=True, index=True)
    reimbursement_id = Column(Integer, ForeignKey("reimbursements.id", ondelete="CASCADE"), nullable=False, index=True)
    item_name = Column(String(255))
    category = Column(String(100))  # meal, transport, accommodation, etc.
    amount = Column(DECIMAL(15, 2))
    invoice_id = Column(Integer, ForeignKey("invoices.id"), nullable=True, index=True)
    receipt_file_path = Column(String(500))
    description = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

    reimbursement = relationship("Reimbursement", back_populates="items")


class ReimbursementVerification(Base):
    __tablename__ = "reimbursement_verification"

    id = Column(Integer, primary_key=True, index=True)
    reimbursement_id = Column(Integer, ForeignKey("reimbursements.id", ondelete="CASCADE"), nullable=False, index=True)
    verification_status = Column(String(50))  # not_verified, verified, partial_verified, failed
    item_count = Column(Integer)
    invoice_count = Column(Integer)
    receipt_count = Column(Integer)
    matching_score = Column(DECIMAL(3, 2))  # 0-1
    duplicate_invoice_count = Column(Integer, default=0)
    invalid_invoice_count = Column(Integer, default=0)
    verification_result = Column(JSON)
    verification_error = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    reimbursement = relationship("Reimbursement", back_populates="verification")


# ==================== 发票模型 ====================

class Invoice(Base):
    __tablename__ = "invoices"

    id = Column(Integer, primary_key=True, index=True)
    invoice_number = Column(String(100), index=True)
    invoice_code = Column(String(50))  # 发票代码
    invoice_type = Column(String(50))  # normal, special, electronic, etc.
    issuer_name = Column(String(255))
    issuer_tax_id = Column(String(50))
    receiver_name = Column(String(255))
    receiver_tax_id = Column(String(50))
    invoice_amount = Column(DECIMAL(15, 2))
    tax_amount = Column(DECIMAL(15, 2))
    total_amount = Column(DECIMAL(15, 2))
    currency = Column(String(3), default="CNY")
    invoice_date = Column(Date)
    file_path = Column(String(500))
    file_name = Column(String(255))
    file_size = Column(Integer)
    upload_user_id = Column(Integer, ForeignKey("users.id"), index=True)
    ocr_status = Column(String(50), default="pending", index=True)  # pending, processing, completed, error
    ocr_result = Column(JSON)
    ocr_confidence = Column(Float)
    ocr_error = Column(Text)
    validation_status = Column(String(50), default="pending", index=True)
    is_duplicate = Column(Boolean, default=False, index=True)
    duplicate_invoice_id = Column(Integer, ForeignKey("invoices.id"), nullable=True)
    is_voided = Column(Boolean, default=False)
    authenticity_verified = Column(Boolean, default=False)
    verification_timestamp = Column(DateTime)
    verification_method = Column(String(100))
    verification_error = Column(Text)
    status = Column(String(50), default="processing", index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # 关系
    upload_user = relationship("User", back_populates="invoices")
    items = relationship("InvoiceItem", back_populates="invoice", cascade="all, delete-orphan")
    verification_logs = relationship("InvoiceVerificationLog", back_populates="invoice", cascade="all, delete-orphan")


class InvoiceItem(Base):
    __tablename__ = "invoice_items"

    id = Column(Integer, primary_key=True, index=True)
    invoice_id = Column(Integer, ForeignKey("invoices.id", ondelete="CASCADE"), nullable=False, index=True)
    item_name = Column(String(255))
    item_quantity = Column(DECIMAL(10, 2))
    item_unit = Column(String(50))
    item_price = Column(DECIMAL(15, 2))
    item_amount = Column(DECIMAL(15, 2))
    tax_rate = Column(DECIMAL(5, 2))
    tax_amount = Column(DECIMAL(15, 2))
    created_at = Column(DateTime, default=datetime.utcnow)

    invoice = relationship("Invoice", back_populates="items")


class InvoiceVerificationLog(Base):
    __tablename__ = "invoice_verification_logs"

    id = Column(Integer, primary_key=True, index=True)
    invoice_id = Column(Integer, ForeignKey("invoices.id", ondelete="CASCADE"), nullable=False, index=True)
    verification_type = Column(String(50))  # authenticity, duplicate, voided, tax_id, etc.
    verification_result = Column(Boolean)
    verification_details = Column(JSON)
    external_api_response = Column(JSON)
    created_at = Column(DateTime, default=datetime.utcnow)

    invoice = relationship("Invoice", back_populates="verification_logs")


# ==================== 异步任务模型 ====================

class AsyncTask(Base):
    __tablename__ = "async_tasks"

    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(String(100), unique=True, nullable=False, index=True)
    task_type = Column(String(100))  # contract_analysis, invoice_ocr, invoice_verification, reimbursement_verification
    status = Column(String(50), default="pending", index=True)  # pending, processing, completed, failed, retry
    priority = Column(Integer, default=0)
    resource_type = Column(String(50))
    resource_id = Column(Integer)
    input_params = Column(JSON)
    result = Column(JSON)
    error_message = Column(Text)
    retry_count = Column(Integer, default=0)
    max_retries = Column(Integer, default=3)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    started_at = Column(DateTime)
    completed_at = Column(DateTime)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    progress = relationship("TaskProgress", back_populates="task", cascade="all, delete-orphan")


class TaskProgress(Base):
    __tablename__ = "task_progress"

    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("async_tasks.id", ondelete="CASCADE"), nullable=False, index=True)
    progress_percentage = Column(Integer)
    current_step = Column(String(200))
    status_message = Column(Text)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    task = relationship("AsyncTask", back_populates="progress")
