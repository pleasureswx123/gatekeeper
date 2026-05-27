"""
FastAPI 合同管理 API 路由
"""
from fastapi import APIRouter, Depends, File, UploadFile, HTTPException, status, Query
from sqlalchemy.orm import Session
from database import get_db
from schemas import ContractResponse, ContractUpload
from models import Contract
from services.business_logic import invoice_service
from utils.file_handler import save_upload_file, is_allowed_file, get_file_size
from tasks.celery_tasks import contract_analyze_risks
from config import settings
import os

router = APIRouter(prefix="/api/contracts", tags=["contracts"])


def extract_pdf_text(file_path: str) -> str:
    """从 PDF 提取文本"""
    try:
        import PyPDF2
        text = ""
        with open(file_path, 'rb') as f:
            pdf_reader = PyPDF2.PdfReader(f)
            for page in pdf_reader.pages:
                text += page.extract_text()
        return text
    except:
        return ""


@router.post("/upload")
async def upload_contract(
    file: UploadFile = File(...),
    contract_name: str = None,
    supplier_name: str = None,
    amount: float = None,
    db: Session = Depends(get_db)
):
    """上传合同文件"""
    # 检查文件类型
    if not is_allowed_file(file.filename):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File type not allowed"
        )
    
    # 保存文件
    file_path = save_upload_file(file, subfolder="contracts")
    file_size = get_file_size(file_path)
    
    # 检查文件大小
    if file_size > settings.MAX_FILE_SIZE:
        os.remove(file_path)
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="File size exceeds limit"
        )
    
    # 创建合同记录
    contract = Contract(
        contract_number=f"CTR-{file.filename.split('.')[0]}",
        contract_name=contract_name or file.filename,
        supplier_name=supplier_name,
        amount=amount,
        file_path=file_path,
        file_name=file.filename,
        file_size=file_size,
        upload_user_id=1,  # TODO: 从认证信息获取
        status="pending"
    )
    
    db.add(contract)
    db.commit()
    db.refresh(contract)
    
    # 提取合同文本
    contract_text = extract_pdf_text(file_path)
    
    # 异步触发分析任务
    task = contract_analyze_risks.delay(contract.id, contract_text[:5000])
    
    return {
        "contract_id": contract.id,
        "contract_number": contract.contract_number,
        "file_name": file.filename,
        "task_id": task.id,
        "status": "uploaded",
        "message": "Contract uploaded successfully, analysis started"
    }


@router.get("/{contract_id}", response_model=ContractResponse)
def get_contract(contract_id: int, db: Session = Depends(get_db)):
    """获取合同详情"""
    contract = db.query(Contract).filter(Contract.id == contract_id).first()
    
    if not contract:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Contract not found"
        )
    
    return contract


@router.get("/", response_model=list[ContractResponse])
def list_contracts(
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    status: str = Query(None),
    risk_level: str = Query(None),
    db: Session = Depends(get_db)
):
    """列表查询合同"""
    query = db.query(Contract)
    
    if status:
        query = query.filter(Contract.status == status)
    
    if risk_level:
        query = query.filter(Contract.risk_level == risk_level)
    
    contracts = query.offset(skip).limit(limit).all()
    return contracts


@router.get("/{contract_id}/risks")
def get_contract_risks(contract_id: int, db: Session = Depends(get_db)):
    """获取合同风险"""
    from models import ContractRisk
    
    contract = db.query(Contract).filter(Contract.id == contract_id).first()
    
    if not contract:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Contract not found"
        )
    
    risks = db.query(ContractRisk).filter(
        ContractRisk.contract_id == contract_id
    ).all()
    
    return {
        "contract_id": contract_id,
        "risk_score": contract.risk_score,
        "risk_level": contract.risk_level,
        "total_risks": len(risks),
        "risks": risks
    }


@router.get("/{contract_id}/analysis-status")
def get_analysis_status(contract_id: int, db: Session = Depends(get_db)):
    """获取分析状态"""
    contract = db.query(Contract).filter(Contract.id == contract_id).first()
    
    if not contract:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Contract not found"
        )
    
    return {
        "contract_id": contract_id,
        "status": contract.status,
        "risk_score": contract.risk_score,
        "risk_level": contract.risk_level,
        "analysis_started_at": contract.analysis_started_at,
        "analysis_completed_at": contract.analysis_completed_at,
        "error": contract.analysis_error
    }
