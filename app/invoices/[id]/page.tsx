/**
 * 发票详情页面
 */
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { Navigation } from '@/components/Navigation';
import { apiClient } from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/api/config';
import { AlertCircle, CheckCircle2, Clock, Download, Eye, Receipt, RefreshCw, XCircle } from 'lucide-react';
import { useInvoice } from '@/hooks/useData';
import { useResourceTasks, useTaskMonitor } from '@/hooks/useTaskProgress';
import { downloadAuthenticatedFile, previewAuthenticatedFile } from '@/lib/api/download';

export default function InvoiceDetailPage() {
  const params = useParams();
  const invoiceId = Number(params.id);
  const { invoice, isLoading, error, mutate } = useInvoice(invoiceId);
  const { tasks, refresh: refreshTasks } = useResourceTasks('invoice', invoiceId);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const { progress: activeProgress, result: activeResult } = useTaskMonitor(activeTaskId);

  const latestTask = tasks[0];
  const displayTask = activeProgress || latestTask;

  const taskPercent = useMemo(() => {
    if (!displayTask) return 0;
    return Number(displayTask.progress_percentage ?? displayTask.progress ?? 0);
  }, [displayTask]);

  useEffect(() => {
    if (!activeProgress || !['completed', 'failed'].includes(activeProgress.status)) return;
    setIsVerifying(false);
    mutate();
    refreshTasks();
  }, [activeProgress?.status, activeProgress, mutate, refreshTasks]);

  const handleVerify = async () => {
    if (!invoice) return;
    setIsVerifying(true);
    setActionError(null);

    try {
      const response = (await apiClient.post(API_ENDPOINTS.INVOICES_VERIFY(invoice.id))) as any;
      setActiveTaskId(response.task_id);
      await refreshTasks();
    } catch (err: any) {
      setActionError(err.response?.data?.detail || '发票验真启动失败');
      setIsVerifying(false);
    }
  };

  const handleDownload = async () => {
    if (!invoice) return;
    setIsDownloading(true);
    setActionError(null);

    try {
      await downloadAuthenticatedFile(
        API_ENDPOINTS.INVOICES_FILE(invoice.id),
        invoice.file_name || `invoice-${invoice.id}.pdf`
      );
    } catch (err: any) {
      setActionError(err.message || '发票文件下载失败');
    } finally {
      setIsDownloading(false);
    }
  };

  const handlePreview = async () => {
    if (!invoice) return;
    setIsPreviewing(true);
    setActionError(null);

    try {
      await previewAuthenticatedFile(
        API_ENDPOINTS.INVOICES_FILE(invoice.id),
        invoice.file_name || `invoice-${invoice.id}.pdf`
      );
    } catch (err: any) {
      setActionError(err.message || '发票文件预览失败');
    } finally {
      setIsPreviewing(false);
    }
  };

  return (
    <div className="flex h-screen bg-background">
      <Navigation />

      <main className="flex-1 overflow-auto">
        <div className="bg-card border-b border-border sticky top-0 z-10">
          <div className="px-8 py-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <Receipt className="w-6 h-6 text-primary shrink-0" />
                <div className="min-w-0">
                  <h2 className="text-2xl font-bold text-foreground truncate">{invoice?.invoice_number || '发票详情'}</h2>
                  <p className="text-sm text-muted-foreground">{invoice?.issuer_name || `#${invoiceId}`}</p>
                </div>
              </div>
              {invoice && (
                <div className="flex gap-3">
                  <button
                    onClick={handlePreview}
                    disabled={isPreviewing}
                    className="flex items-center gap-2 px-4 py-2 bg-secondary/20 text-foreground rounded-lg hover:bg-secondary/30 border border-border disabled:opacity-50"
                  >
                    <Eye className="w-4 h-4" />
                    {isPreviewing ? '打开中...' : '预览原文件'}
                  </button>
                  <button
                    onClick={handleDownload}
                    disabled={isDownloading}
                    className="flex items-center gap-2 px-4 py-2 bg-secondary/20 text-foreground rounded-lg hover:bg-secondary/30 border border-border disabled:opacity-50"
                  >
                    <Download className="w-4 h-4" />
                    {isDownloading ? '下载中...' : '下载原文件'}
                  </button>
                  <button
                    onClick={handleVerify}
                    disabled
                    title="发票真伪验证后续将接入腾讯服务"
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition disabled:opacity-50"
                  >
                    <RefreshCw className={`w-4 h-4 ${isVerifying ? 'animate-spin' : ''}`} />
                    验真待接入
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="p-8 space-y-6 max-w-6xl">
          {isLoading ? (
            <div className="text-muted-foreground">正在加载发票...</div>
          ) : error || !invoice ? (
            <div className="text-red-400">
              发票加载失败：{getApiErrorMessage(error) || '请稍后重试'}
            </div>
          ) : (
            <>
              {actionError && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-400">
                  {actionError}
                </div>
              )}

              {invoice.verification_error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-400">
                  {invoice.verification_error}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Info label="发票金额" value={`¥${Number(invoice.invoice_amount || 0).toLocaleString()}`} />
                <Info label="税额" value={`¥${Number(invoice.tax_amount || 0).toLocaleString()}`} />
                <Info label="价税合计" value={`¥${Number(invoice.total_amount || 0).toLocaleString()}`} />
                <StatusCard invoice={invoice} />
              </div>

              <div className="bg-card border border-border rounded-lg p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4">原始文件</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Info label="文件名" value={invoice.file_name || '-'} />
                  <Info label="文件大小" value={formatFileSize(invoice.file_size)} />
                </div>
              </div>

              {displayTask && (
                <div className={`bg-card border rounded-lg p-5 ${displayTask.status === 'failed' ? 'border-red-500/40' : 'border-border'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-foreground">最近任务</h3>
                    <span className={`text-sm ${displayTask.status === 'failed' ? 'text-red-400' : 'text-muted-foreground'}`}>
                      {getTaskStatusLabel(displayTask.status)}
                    </span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2">
                    <div className={`h-2 rounded-full ${displayTask.status === 'failed' ? 'bg-red-500' : displayTask.status === 'completed' ? 'bg-green-500' : 'bg-primary'}`} style={{ width: `${taskPercent}%` }} />
                  </div>
                  <p className="text-sm text-muted-foreground mt-3">
                    {displayTask.status_message || displayTask.current_step || activeResult?.error_message || '暂无任务详情'}
                  </p>
                </div>
              )}

              <div className="bg-card border border-border rounded-lg p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4">OCR 识别结果</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Info label="OCR 状态" value={getOcrStatusLabel(invoice.ocr_status)} />
                  <Info label="置信度" value={`${Math.round(Number(invoice.ocr_confidence || 0) * 100)}%`} />
                  <Info label="发票代码" value={invoice.invoice_code || '-'} />
                  <Info label="开票日期" value={invoice.invoice_date || '-'} />
                  <Info label="销售方" value={invoice.issuer_name || '-'} />
                  <Info label="销售方税号" value={invoice.issuer_tax_id || '-'} />
                  <Info label="购买方" value={invoice.receiver_name || '-'} />
                  <Info label="购买方税号" value={invoice.receiver_tax_id || '-'} />
                </div>
              </div>

              <div className="bg-card border border-border rounded-lg p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4">验证结果</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Verification label="真伪验证" passed={false} text="待接入腾讯服务" />
                  <Verification label="验真方式" passed={false} text="未执行" />
                  <Verification label="作废状态" passed={!invoice.is_voided} text={invoice.is_voided ? '已作废' : '未作废'} />
                  <Verification label="重复检测" passed={!invoice.is_duplicate} text={invoice.is_duplicate ? '重复发票' : '未重复'} />
                </div>
              </div>

              {invoice.items?.length > 0 && (
                <div className="bg-card border border-border rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-foreground mb-4">发票明细</h3>
                  <div className="space-y-3">
                    {invoice.items.map((item) => (
                      <div key={item.id} className="grid grid-cols-1 md:grid-cols-[1fr_120px_120px_120px] gap-3 bg-secondary/20 rounded-lg p-4">
                        <Info label="项目名称" value={item.item_name || '-'} />
                        <Info label="数量" value={String(item.item_quantity || '-')} />
                        <Info label="单价" value={`¥${Number(item.item_price || 0).toFixed(2)}`} />
                        <Info label="金额" value={`¥${Number(item.item_amount || 0).toFixed(2)}`} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-card border border-border rounded-lg p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4">模型返回原文</h3>
                <pre className="bg-secondary/30 rounded-lg p-4 overflow-auto text-sm text-muted-foreground">
                  {JSON.stringify(invoice.ocr_result || {}, null, 2)}
                </pre>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

function formatFileSize(size?: number) {
  if (!size) return '-';
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-secondary/20 rounded-lg p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium text-foreground mt-1 break-words">{value}</p>
    </div>
  );
}

function StatusCard({ invoice }: { invoice: any }) {
  const completed = invoice.status === 'verified';
  const failed = invoice.status === 'invalid' || invoice.status === 'error';
  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <p className="text-sm text-muted-foreground">验证状态</p>
      <div className="flex items-center gap-2 mt-2">
        {completed ? <CheckCircle2 className="w-5 h-5 text-green-400" /> : failed ? <XCircle className="w-5 h-5 text-red-400" /> : <Clock className="w-5 h-5 text-yellow-400" />}
        <p className="font-medium text-foreground">{getInvoiceStatusLabel(invoice.status)}</p>
      </div>
    </div>
  );
}

function Verification({ label, passed, text }: { label: string; passed: boolean; text: string }) {
  return (
    <div className="border border-border rounded-lg p-4">
      <div className="flex items-center gap-2">
        {passed ? <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0" /> : <AlertCircle className="w-5 h-5 text-yellow-400 shrink-0" />}
        <div>
          <p className="font-medium text-foreground">{label}</p>
          <p className="text-sm text-muted-foreground">{text}</p>
        </div>
      </div>
    </div>
  );
}

function getInvoiceStatusLabel(status: string) {
  switch (status) {
    case 'verified':
      return '已验证';
    case 'invalid':
      return '异常';
    case 'error':
      return '识别失败';
    case 'processing':
      return '处理中';
    case 'pending':
      return '待真实验真';
    default:
      return '待处理';
  }
}

function getOcrStatusLabel(status: string) {
  switch (status) {
    case 'completed':
      return '已完成';
    case 'error':
      return '识别失败';
    case 'processing':
      return '处理中';
    default:
      return '待识别';
  }
}

function getTaskStatusLabel(status: string) {
  switch (status) {
    case 'completed':
      return '已完成';
    case 'failed':
      return '失败';
    case 'processing':
      return '处理中';
    default:
      return '待处理';
  }
}

function getApiErrorMessage(error: any) {
  if (!error) return '';
  const detail = error.response?.data?.detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) return detail.map((item) => item.msg || item.message).filter(Boolean).join('；');
  if (error.response?.status >= 500) return '服务器处理发票数据时出错';
  return error.message || '';
}
