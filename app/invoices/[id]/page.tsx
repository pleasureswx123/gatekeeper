/**
 * 发票详情页面
 */
'use client';

import { useParams } from 'next/navigation';
import { Navigation } from '@/components/Navigation';
import { Receipt, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import { useInvoice } from '@/hooks/useData';
import { useResourceTasks } from '@/hooks/useTaskProgress';

export default function InvoiceDetailPage() {
  const params = useParams();
  const invoiceId = Number(params.id);
  const { invoice, isLoading, error } = useInvoice(invoiceId);
  const { tasks } = useResourceTasks('invoice', invoiceId);
  const latestTask = tasks[0];

  return (
    <div className="flex h-screen bg-background">
      <Navigation />

      <main className="flex-1 overflow-auto">
        <div className="bg-card border-b border-border sticky top-0 z-10">
          <div className="px-8 py-6">
            <div className="flex items-center gap-3">
              <Receipt className="w-6 h-6 text-primary" />
              <div>
                <h2 className="text-2xl font-bold text-foreground">{invoice?.invoice_number || '发票详情'}</h2>
                <p className="text-sm text-muted-foreground">{invoice?.issuer_name || `#${invoiceId}`}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="p-8 space-y-6 max-w-6xl">
          {isLoading ? (
            <div className="text-muted-foreground">正在加载发票...</div>
          ) : error || !invoice ? (
            <div className="text-red-400">发票加载失败，请确认后端服务已启动。</div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Info label="发票金额" value={`¥${Number(invoice.invoice_amount || 0).toLocaleString()}`} />
                <Info label="税额" value={`¥${Number(invoice.tax_amount || 0).toLocaleString()}`} />
                <Info label="价税合计" value={`¥${Number(invoice.total_amount || 0).toLocaleString()}`} />
                <StatusCard invoice={invoice} />
              </div>

              {latestTask && (
                <div className="bg-card border border-border rounded-lg p-5">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-foreground">最近任务</h3>
                    <span className="text-sm text-muted-foreground">{latestTask.status}</span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2">
                    <div className="bg-primary h-2 rounded-full" style={{ width: `${latestTask.progress || 0}%` }} />
                  </div>
                </div>
              )}

              <div className="bg-card border border-border rounded-lg p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4">OCR 识别结果</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Verification label="真伪验证" passed={invoice.authenticity_verified} text={invoice.authenticity_verified ? 'Mock 通过' : '待验证'} />
                  <Verification label="作废状态" passed={!invoice.is_voided} text={invoice.is_voided ? '已作废' : '未作废'} />
                  <Verification label="重复检测" passed={!invoice.is_duplicate} text={invoice.is_duplicate ? '重复发票' : '未重复'} />
                </div>
              </div>

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

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-secondary/20 rounded-lg p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium text-foreground mt-1">{value}</p>
    </div>
  );
}

function StatusCard({ invoice }: { invoice: any }) {
  const completed = invoice.status === 'verified';
  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <p className="text-sm text-muted-foreground">验证状态</p>
      <div className="flex items-center gap-2 mt-2">
        {completed ? <CheckCircle2 className="w-5 h-5 text-green-400" /> : <Clock className="w-5 h-5 text-yellow-400" />}
        <p className="font-medium text-foreground">{completed ? '已验证' : invoice.status}</p>
      </div>
    </div>
  );
}

function Verification({ label, passed, text }: { label: string; passed: boolean; text: string }) {
  return (
    <div className="border border-border rounded-lg p-4">
      <div className="flex items-center gap-2">
        {passed ? <CheckCircle2 className="w-5 h-5 text-green-400" /> : <AlertCircle className="w-5 h-5 text-yellow-400" />}
        <div>
          <p className="font-medium text-foreground">{label}</p>
          <p className="text-sm text-muted-foreground">{text}</p>
        </div>
      </div>
    </div>
  );
}
