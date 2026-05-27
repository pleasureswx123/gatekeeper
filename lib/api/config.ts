/**
 * API 常量定义
 */
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

export const API_ENDPOINTS = {
  // 认证
  AUTH_LOGIN: '/auth/login',
  AUTH_REGISTER: '/auth/register',
  AUTH_ME: '/auth/me',

  // 系统
  SYSTEM_INFO: '/system/info',

  // 审计日志
  AUDIT_LOGS_LIST: '/audit-logs/',

  // 合同
  CONTRACTS_LIST: '/contracts/',
  CONTRACTS_UPLOAD: '/contracts/upload',
  CONTRACTS_GET: (id: number) => `/contracts/${id}`,
  CONTRACTS_FILE: (id: number) => `/contracts/${id}/file`,
  CONTRACTS_RISKS: (id: number) => `/contracts/${id}/risks`,
  CONTRACTS_STATUS: (id: number) => `/contracts/${id}/analysis-status`,

  // 发票
  INVOICES_LIST: '/invoices/',
  INVOICES_UPLOAD: '/invoices/upload',
  INVOICES_GET: (id: number) => `/invoices/${id}`,
  INVOICES_FILE: (id: number) => `/invoices/${id}/file`,
  INVOICES_VERIFY: (id: number) => `/invoices/${id}/verify`,
  INVOICES_BATCH_VERIFY: '/invoices/batch/verify',
  INVOICES_OCR_STATUS: (id: number) => `/invoices/${id}/ocr-status`,

  // 报销
  REIMBURSEMENTS_LIST: '/reimbursements/',
  REIMBURSEMENTS_CREATE: '/reimbursements/',
  REIMBURSEMENTS_GET: (id: number) => `/reimbursements/${id}`,
  REIMBURSEMENTS_VERIFY: (id: number) => `/reimbursements/${id}/verify`,
  REIMBURSEMENTS_APPROVE: (id: number) => `/reimbursements/${id}/approve`,
  REIMBURSEMENTS_REJECT: (id: number) => `/reimbursements/${id}/reject`,
  REIMBURSEMENTS_ITEM_RECEIPT: (reimbursementId: number, itemId: number) => `/reimbursements/${reimbursementId}/items/${itemId}/receipt`,

  // 任务
  TASKS_STATUS: (taskId: string) => `/tasks/${taskId}`,
  TASKS_RESULT: (taskId: string) => `/tasks/${taskId}/result`,
  TASKS_RESOURCE: (resourceType: string, resourceId: number) => `/tasks/resource/${resourceType}/${resourceId}`,
};
