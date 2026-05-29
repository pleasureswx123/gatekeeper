"""
PostgreSQL 数据库 Schema - 明鉴财法风控系统
六大表族: 用户、合同、报销、发票、异步任务、审计日志
"""

-- ============================================
-- 1. 用户与认证系统
-- ============================================

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(200),
    role VARCHAR(50) DEFAULT 'employee', -- employee, reviewer, admin
    department VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    action VARCHAR(100),
    resource_type VARCHAR(50), -- contract, reimbursement, invoice
    resource_id INTEGER,
    changes JSONB,
    ip_address VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 2. 合同管理表族
-- ============================================

CREATE TABLE IF NOT EXISTS contracts (
    id SERIAL PRIMARY KEY,
    contract_number VARCHAR(100) UNIQUE NOT NULL,
    contract_name VARCHAR(255) NOT NULL,
    supplier_name VARCHAR(255),
    amount DECIMAL(15, 2),
    currency VARCHAR(3) DEFAULT 'CNY',
    start_date DATE,
    end_date DATE,
    file_path VARCHAR(500),
    file_name VARCHAR(255),
    file_size INTEGER, -- bytes
    upload_user_id INTEGER REFERENCES users(id),
    status VARCHAR(50) DEFAULT 'pending', -- pending, analyzing, completed, error
    analysis_result JSONB, -- 存储风险识别结果
    risk_score DECIMAL(3, 1), -- 0-100
    risk_level VARCHAR(20), -- low, medium, high, critical
    rule_engine_result JSONB, -- 规则引擎检测结果
    llm_analysis_result JSONB, -- LLM 语义分析结果
    analysis_error TEXT,
    analysis_started_at TIMESTAMP,
    analysis_completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_status (status),
    INDEX idx_risk_level (risk_level),
    INDEX idx_upload_user (upload_user_id)
);

CREATE TABLE IF NOT EXISTS contract_risks (
    id SERIAL PRIMARY KEY,
    contract_id INTEGER NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
    risk_type VARCHAR(100), -- tax_rate, payment_term, penalty_clause, force_majeure, etc.
    severity VARCHAR(20), -- low, medium, high, critical
    description TEXT,
    highlighted_text TEXT,
    page_number INTEGER,
    location_coordinates JSONB, -- {x, y, width, height} for PDF highlighting
    detection_method VARCHAR(50), -- rule_engine, llm
    remediation_suggestion TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_contract (contract_id),
    INDEX idx_severity (severity)
);

CREATE TABLE IF NOT EXISTS contract_clauses (
    id SERIAL PRIMARY KEY,
    contract_id INTEGER NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
    clause_type VARCHAR(100), -- payment_terms, penalty, tax, insurance, etc.
    clause_text TEXT,
    extracted_data JSONB, -- 提取的结构化数据
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_contract (contract_id)
);

-- ============================================
-- 3. 报销单系统
-- ============================================

CREATE TABLE IF NOT EXISTS reimbursements (
    id SERIAL PRIMARY KEY,
    reimbursement_number VARCHAR(100) UNIQUE NOT NULL,
    submitter_id INTEGER NOT NULL REFERENCES users(id),
    approver_id INTEGER REFERENCES users(id),
    total_amount DECIMAL(15, 2),
    currency VARCHAR(3) DEFAULT 'CNY',
    description TEXT,
    status VARCHAR(50) DEFAULT 'submitted', -- submitted, pending_review, approved, rejected, reimbursed
    submission_date DATE,
    approval_date DATE,
    approval_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_status (status),
    INDEX idx_submitter (submitter_id),
    INDEX idx_approver (approver_id)
);

CREATE TABLE IF NOT EXISTS reimbursement_items (
    id SERIAL PRIMARY KEY,
    reimbursement_id INTEGER NOT NULL REFERENCES reimbursements(id) ON DELETE CASCADE,
    item_name VARCHAR(255),
    category VARCHAR(100), -- meal, transport, accommodation, etc.
    amount DECIMAL(15, 2),
    invoice_id INTEGER REFERENCES invoices(id),
    receipt_file_path VARCHAR(500),
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_reimbursement (reimbursement_id),
    INDEX idx_invoice (invoice_id)
);

CREATE TABLE IF NOT EXISTS reimbursement_verification (
    id SERIAL PRIMARY KEY,
    reimbursement_id INTEGER NOT NULL REFERENCES reimbursements(id) ON DELETE CASCADE,
    verification_status VARCHAR(50), -- not_verified, verified, partial_verified, failed
    item_count INTEGER,
    invoice_count INTEGER,
    receipt_count INTEGER,
    matching_score DECIMAL(3, 2), -- 0-1, 发票与报销单的匹配度
    duplicate_invoice_count INTEGER DEFAULT 0,
    invalid_invoice_count INTEGER DEFAULT 0,
    verification_result JSONB,
    verification_error TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_reimbursement (reimbursement_id)
);

-- ============================================
-- 4. 发票管理系统（合规管家）
-- ============================================

CREATE TABLE IF NOT EXISTS invoices (
    id SERIAL PRIMARY KEY,
    invoice_number VARCHAR(100),
    invoice_code VARCHAR(50), -- 发票代码
    invoice_type VARCHAR(50), -- normal, special, electronic, etc.
    issuer_name VARCHAR(255),
    issuer_tax_id VARCHAR(50),
    receiver_name VARCHAR(255),
    receiver_tax_id VARCHAR(50),
    invoice_amount DECIMAL(15, 2),
    tax_amount DECIMAL(15, 2),
    total_amount DECIMAL(15, 2),
    currency VARCHAR(3) DEFAULT 'CNY',
    invoice_date DATE,
    file_path VARCHAR(500),
    file_name VARCHAR(255),
    file_size INTEGER, -- bytes
    upload_user_id INTEGER REFERENCES users(id),
    ocr_status VARCHAR(50) DEFAULT 'pending', -- pending, processing, completed, error
    ocr_result JSONB, -- OCR 识别结果 - 结构化数据
    ocr_confidence DECIMAL(3, 2), -- 0-1, OCR 识别置信度
    ocr_error TEXT,
    validation_status VARCHAR(50) DEFAULT 'pending', -- pending, valid, invalid, duplicate
    is_duplicate BOOLEAN DEFAULT FALSE,
    duplicate_invoice_id INTEGER REFERENCES invoices(id),
    is_voided BOOLEAN DEFAULT FALSE, -- 是否已作废
    authenticity_verified BOOLEAN DEFAULT FALSE,
    verification_timestamp TIMESTAMP,
    verification_method VARCHAR(100), -- online_check, batch_verification, etc.
    verification_error TEXT,
    status VARCHAR(50) DEFAULT 'processing', -- processing, verified, invalid, voided, error
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_invoice_number (invoice_number),
    INDEX idx_status (status),
    INDEX idx_ocr_status (ocr_status),
    INDEX idx_validation_status (validation_status),
    INDEX idx_is_duplicate (is_duplicate),
    INDEX idx_upload_user (upload_user_id)
);

CREATE TABLE IF NOT EXISTS invoice_items (
    id SERIAL PRIMARY KEY,
    invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    item_name VARCHAR(255),
    item_quantity DECIMAL(10, 2),
    item_unit VARCHAR(50),
    item_price DECIMAL(15, 2),
    item_amount DECIMAL(15, 2),
    tax_rate DECIMAL(5, 2),
    tax_amount DECIMAL(15, 2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_invoice (invoice_id)
);

CREATE TABLE IF NOT EXISTS invoice_verification_logs (
    id SERIAL PRIMARY KEY,
    invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    verification_type VARCHAR(50), -- authenticity, duplicate, voided, tax_id, etc.
    verification_result BOOLEAN,
    verification_details JSONB,
    external_api_response JSONB, -- 火山引擎或第三方 API 返回结果
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_invoice (invoice_id)
);

-- ============================================
-- 5. 异步任务管理系统（Celery 集成）
-- ============================================

CREATE TABLE IF NOT EXISTS async_tasks (
    id SERIAL PRIMARY KEY,
    task_id VARCHAR(100) UNIQUE NOT NULL, -- Celery task ID
    task_type VARCHAR(100), -- contract_analysis, invoice_ocr, invoice_verification, reimbursement_verification
    status VARCHAR(50) DEFAULT 'pending', -- pending, processing, completed, failed, retry
    priority INTEGER DEFAULT 0, -- 0=normal, 1=high, -1=low
    resource_type VARCHAR(50), -- contract, invoice, reimbursement
    resource_id INTEGER,
    input_params JSONB,
    result JSONB,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_task_id (task_id),
    INDEX idx_status (status),
    INDEX idx_resource (resource_type, resource_id),
    INDEX idx_created (created_at)
);

CREATE TABLE IF NOT EXISTS task_progress (
    id SERIAL PRIMARY KEY,
    task_id INTEGER NOT NULL REFERENCES async_tasks(id) ON DELETE CASCADE,
    progress_percentage INTEGER, -- 0-100
    current_step VARCHAR(200),
    status_message TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_task (task_id)
);

-- ============================================
-- 6. 系统日志与缓存
-- ============================================

CREATE TABLE IF NOT EXISTS system_logs (
    id SERIAL PRIMARY KEY,
    log_level VARCHAR(20), -- DEBUG, INFO, WARNING, ERROR, CRITICAL
    logger_name VARCHAR(100),
    message TEXT,
    exception_stack TEXT,
    context_data JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_level (log_level),
    INDEX idx_created (created_at)
);

CREATE TABLE IF NOT EXISTS api_rate_limits (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    api_endpoint VARCHAR(255),
    request_count INTEGER DEFAULT 0,
    reset_time TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_user (user_id),
    INDEX idx_endpoint (api_endpoint)
);

-- ============================================
-- 创建索引和视图
-- ============================================

-- 视图：高风险合同
CREATE OR REPLACE VIEW high_risk_contracts AS
SELECT 
    c.id,
    c.contract_number,
    c.contract_name,
    c.risk_level,
    c.risk_score,
    COUNT(cr.id) as risk_count
FROM contracts c
LEFT JOIN contract_risks cr ON c.id = cr.contract_id
WHERE c.risk_level IN ('high', 'critical')
GROUP BY c.id, c.contract_number, c.contract_name, c.risk_level, c.risk_score;

-- 视图：待审批报销单
CREATE OR REPLACE VIEW pending_reimbursements AS
SELECT 
    r.id,
    r.reimbursement_number,
    u.full_name as submitter_name,
    r.total_amount,
    r.submission_date,
    rv.verification_status,
    rv.matching_score
FROM reimbursements r
JOIN users u ON r.submitter_id = u.id
LEFT JOIN reimbursement_verification rv ON r.id = rv.reimbursement_id
WHERE r.status IN ('submitted', 'pending_review');

-- 视图：发票验证摘要
CREATE OR REPLACE VIEW invoice_verification_summary AS
SELECT 
    COUNT(*) as total_invoices,
    SUM(CASE WHEN status = 'verified' THEN 1 ELSE 0 END) as verified_count,
    SUM(CASE WHEN is_duplicate = TRUE THEN 1 ELSE 0 END) as duplicate_count,
    SUM(CASE WHEN is_voided = TRUE THEN 1 ELSE 0 END) as voided_count,
    SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) as error_count,
    AVG(ocr_confidence) as avg_ocr_confidence
FROM invoices;

