"""
Pydantic 数据验证 Schema
"""
from pydantic import BaseModel, EmailStr, Field
from datetime import datetime, date
from typing import Optional, List, Dict, Any
from decimal import Decimal

# ==================== 用户相关 ====================

class UserBase(BaseModel):
    username: str = Field(..., min_length=3, max_length=100)
    email: EmailStr
    full_name: str
    department: str
    role: str = "employee"


class UserCreate(UserBase):
    password: str = Field(..., min_length=6)


class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = Field(None, min_length=1, max_length=200)
    department: Optional[str] = Field(None, min_length=1, max_length=100)


class UserResponse(UserBase):
    id: int
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ==================== 审计日志 ====================

class AuditUserResponse(BaseModel):
    id: int
    username: str
    full_name: Optional[str]
    role: str

    class Config:
        from_attributes = True


class AuditLogResponse(BaseModel):
    id: int
    action: str
    resource_type: Optional[str]
    resource_id: Optional[int]
    changes: Optional[Dict[str, Any]]
    ip_address: Optional[str]
    created_at: datetime
    user: Optional[AuditUserResponse]

    class Config:
        from_attributes = True


class UserLogin(BaseModel):
    username: str
    password: str


# ==================== 合同相关 ====================

class ContractRiskResponse(BaseModel):
    id: int
    risk_type: str
    severity: str
    description: str
    highlighted_text: Optional[str]
    page_number: Optional[int]
    remediation_suggestion: Optional[str]

    class Config:
        from_attributes = True


class ContractClauseResponse(BaseModel):
    id: int
    clause_type: str
    clause_text: str
    extracted_data: Optional[Dict[str, Any]]

    class Config:
        from_attributes = True


class ContractAnalysisResult(BaseModel):
    rule_engine_result: Optional[Dict[str, Any]]
    llm_analysis_result: Optional[Dict[str, Any]]
    risk_score: float
    risk_level: str


class ContractResponse(BaseModel):
    id: int
    contract_number: str
    contract_name: str
    supplier_name: Optional[str]
    amount: Optional[Decimal]
    status: str
    risk_level: Optional[str]
    risk_score: Optional[float]
    file_name: Optional[str]
    file_size: Optional[int]
    analysis_result: Optional[Dict[str, Any]]
    llm_analysis_result: Optional[Dict[str, Any]]
    risks: List[ContractRiskResponse] = []
    clauses: List[ContractClauseResponse] = []
    created_at: datetime
    analysis_completed_at: Optional[datetime]

    class Config:
        from_attributes = True


class ContractUpload(BaseModel):
    contract_name: str
    supplier_name: Optional[str]
    amount: Optional[Decimal]
    currency: str = "CNY"
    start_date: Optional[str]
    end_date: Optional[str]


# ==================== 发票相关 ====================

class InvoiceItemResponse(BaseModel):
    id: int
    item_name: str
    item_quantity: Decimal
    item_unit: str
    item_price: Decimal
    item_amount: Decimal

    class Config:
        from_attributes = True


class InvoiceOCRResult(BaseModel):
    invoice_number: Optional[str]
    invoice_date: Optional[date]
    issuer_name: Optional[str]
    issuer_tax_id: Optional[str]
    receiver_name: Optional[str]
    receiver_tax_id: Optional[str]
    total_amount: Optional[Decimal]
    items: List[Dict[str, Any]] = []
    confidence: float = 0.0


class InvoiceResponse(BaseModel):
    id: int
    invoice_number: Optional[str]
    invoice_code: Optional[str]
    invoice_type: Optional[str]
    issuer_name: Optional[str]
    issuer_tax_id: Optional[str]
    receiver_name: Optional[str]
    receiver_tax_id: Optional[str]
    invoice_amount: Optional[Decimal]
    tax_amount: Optional[Decimal]
    total_amount: Optional[Decimal]
    invoice_date: Optional[str]
    status: str
    ocr_status: str
    validation_status: str
    is_duplicate: bool
    is_voided: bool
    authenticity_verified: bool
    file_name: Optional[str]
    file_size: Optional[int]
    ocr_result: Optional[Dict[str, Any]]
    ocr_confidence: Optional[float]
    items: List[InvoiceItemResponse] = []
    created_at: datetime

    class Config:
        from_attributes = True


class InvoiceUpload(BaseModel):
    invoice_type: str = "normal"


class InvoiceBatchVerifyRequest(BaseModel):
    invoice_ids: List[int]


# ==================== 报销相关 ====================

class ReimbursementItemResponse(BaseModel):
    id: int
    item_name: str
    category: str
    amount: Decimal
    invoice_id: Optional[int]
    description: Optional[str]

    class Config:
        from_attributes = True


class ReimbursementVerificationResponse(BaseModel):
    verification_status: str
    item_count: int
    invoice_count: int
    receipt_count: int = 0
    matching_score: Decimal
    duplicate_invoice_count: int = 0
    invalid_invoice_count: int = 0
    verification_result: Optional[Dict[str, Any]]

    class Config:
        from_attributes = True


class ReimbursementResponse(BaseModel):
    id: int
    reimbursement_number: str
    total_amount: Decimal
    status: str
    submission_date: date
    description: Optional[str]
    items: List[ReimbursementItemResponse] = []
    verification: Optional[ReimbursementVerificationResponse]
    approval_date: Optional[date]
    approval_notes: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class ReimbursementCreate(BaseModel):
    description: str
    items: List[Dict[str, Any]]


# ==================== 异步任务相关 ====================

class TaskProgressResponse(BaseModel):
    task_id: str
    status: str
    progress_percentage: int
    current_step: str
    status_message: Optional[str]

    class Config:
        from_attributes = True


class TaskResultResponse(BaseModel):
    task_id: str
    status: str
    result: Optional[Dict[str, Any]]
    error_message: Optional[str]

    class Config:
        from_attributes = True
