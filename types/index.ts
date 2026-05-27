/**
 * TypeScript 类型定义
 */

// 用户
export interface User {
  id: number;
  username: string;
  email: string;
  full_name: string;
  role: 'employee' | 'reviewer' | 'admin';
  department: string;
  is_active: boolean;
  created_at: string;
}

// 合同
export interface ContractRisk {
  id: number;
  risk_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  highlighted_text?: string;
  page_number?: number;
  remediation_suggestion?: string;
}

export interface ContractClause {
  id: number;
  clause_type: string;
  clause_text: string;
  extracted_data?: Record<string, any>;
}

export interface Contract {
  id: number;
  contract_number: string;
  contract_name: string;
  supplier_name?: string;
  amount?: number;
  status: 'pending' | 'analyzing' | 'completed' | 'error';
  risk_level?: 'low' | 'medium' | 'high' | 'critical';
  risk_score?: number;
  analysis_result?: Record<string, any>;
  risks: ContractRisk[];
  clauses: ContractClause[];
  created_at: string;
  analysis_completed_at?: string;
}

// 发票
export interface InvoiceItem {
  id: number;
  item_name: string;
  item_quantity: number;
  item_unit: string;
  item_price: number;
  item_amount: number;
}

export interface Invoice {
  id: number;
  invoice_number?: string;
  invoice_type?: string;
  issuer_name?: string;
  invoice_amount?: number;
  invoice_date?: string;
  status: 'processing' | 'verified' | 'invalid' | 'voided' | 'error';
  ocr_status: 'pending' | 'processing' | 'completed' | 'error';
  validation_status: 'pending' | 'valid' | 'invalid' | 'duplicate';
  is_duplicate: boolean;
  is_voided: boolean;
  authenticity_verified: boolean;
  ocr_result?: Record<string, any>;
  ocr_confidence?: number;
  items: InvoiceItem[];
  created_at: string;
}

// 报销
export interface ReimbursementItem {
  id: number;
  item_name: string;
  category: string;
  amount: number;
  invoice_id?: number;
  description?: string;
}

export interface ReimbursementVerification {
  verification_status: 'not_verified' | 'verified' | 'partial_verified' | 'failed';
  item_count: number;
  invoice_count: number;
  matching_score: number;
  duplicate_invoice_count: number;
  invalid_invoice_count: number;
}

export interface Reimbursement {
  id: number;
  reimbursement_number: string;
  total_amount: number;
  status: 'submitted' | 'pending_review' | 'approved' | 'rejected' | 'reimbursed';
  submission_date: string;
  description?: string;
  items: ReimbursementItem[];
  verification?: ReimbursementVerification;
  created_at: string;
}

// 异步任务
export interface TaskProgress {
  task_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'retry';
  progress_percentage: number;
  current_step: string;
  status_message?: string;
}

export interface TaskResult {
  task_id: string;
  status: string;
  result?: Record<string, any>;
  error_message?: string;
}

// 表单类型
export interface LoginFormData {
  username: string;
  password: string;
}

export interface ContractUploadFormData {
  file: File;
  contract_name: string;
  supplier_name?: string;
  amount?: number;
}

export interface InvoiceUploadFormData {
  file: File;
  invoice_type?: string;
}

export interface ReimbursementFormData {
  description: string;
  items: Array<{
    item_name: string;
    category: string;
    amount: number;
    invoice_id?: number;
    receipt_file_path?: string;
    description?: string;
  }>;
}
