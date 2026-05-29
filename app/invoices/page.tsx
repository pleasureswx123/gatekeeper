/**
 * 发票列表页面
 */
'use client';

import { useState } from 'react';
import { Navigation } from '@/components/Navigation';
import { ProcessHint } from '@/components/ProcessHint';
import { Receipt, Plus, Search, CheckCircle2, AlertCircle, Clock, Eye, Trash2, Upload, ScanLine, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { useInvoices } from '@/hooks/useData';
import { apiClient } from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/api/config';

export default function InvoicesPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const { invoices = [], isLoading, error, mutate } = useInvoices(0, 50, filterStatus === 'all' ? undefined : filterStatus);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'verified':
        return <CheckCircle2 className="w-4 h-4 text-green-400" />;
      case 'processing':
        return <Clock className="w-4 h-4 text-yellow-400" />;
      case 'invalid':
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-400" />;
      default:
        return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'verified':
        return '已验证';
      case 'processing':
        return '处理中';
      case 'invalid':
        return '异常';
      case 'error':
        return '识别失败';
      default:
        return '待处理';
    }
  };

  const filteredInvoices = invoices.filter((invoice) => {
    const term = searchTerm.toLowerCase();
    return (invoice.invoice_number || '').toLowerCase().includes(term) ||
      (invoice.issuer_name || '').toLowerCase().includes(term);
  });

  const handleDeleteInvoice = async (event: React.MouseEvent, invoiceId: number, invoiceLabel: string) => {
    event.preventDefault();
    event.stopPropagation();

    if (!window.confirm(`确定删除「${invoiceLabel}」吗？删除后不可恢复。`)) {
      return;
    }

    try {
      setDeletingId(invoiceId);
      await apiClient.delete(API_ENDPOINTS.INVOICES_DELETE(invoiceId));
      await mutate();
    } catch (error) {
      window.alert('删除发票失败，请稍后重试');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="flex h-screen bg-background">
      <Navigation />

      <main className="flex-1 overflow-auto">
        <div className="bg-card border-b border-border sticky top-0 z-10">
          <div className="px-8 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-foreground">发票管理</h2>
                <p className="text-sm text-muted-foreground mt-1">上传发票后，系统用 AI OCR 提取结构化字段，并做重复、作废等状态展示</p>
              </div>
              <ProcessHint
                steps={[
                  { label: '上传发票', icon: Upload },
                  { label: 'AI 识别发票', icon: ScanLine },
                  { label: '验真待接入', icon: ShieldCheck },
                ]}
              />
              <Link href="/invoices/upload">
                <button className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition">
                  <Plus className="w-4 h-4" />
                  上传发票
                </button>
              </Link>
            </div>
          </div>
        </div>

        <div className="p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <GuidanceBox title="系统在做什么" text="把发票图片或 PDF 首页交给 AI OCR，提取发票号、代码、日期、购销方、金额、税额和明细。" />
            <GuidanceBox title="哪里用了 AI" text="AI 只用于发票字段识别；真伪验证目前未接入真实外部服务，页面会显示待验或 Mock 状态。" />
            <GuidanceBox title="你要看什么" text="重点核对 OCR 字段、金额、重复标记、作废状态，再决定是否用于报销关联。" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <StatCard label="总发票数" value={invoices.length} icon={Receipt} />
            <StatCard label="已验证" value={invoices.filter((i) => i.status === 'verified').length} icon={CheckCircle2} />
            <StatCard label="处理中" value={invoices.filter((i) => i.status === 'processing').length} icon={Clock} />
            <StatCard label="重复发票" value={invoices.filter((i) => i.is_duplicate).length} icon={AlertCircle} />
          </div>

          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="w-5 h-5 absolute left-3 top-3 text-muted-foreground" />
              <input
                type="text"
                placeholder="搜索发票号或公司名..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
            >
              <option value="all">全部状态</option>
              <option value="verified">已验证</option>
              <option value="processing">处理中</option>
              <option value="invalid">异常</option>
              <option value="error">识别失败</option>
            </select>
          </div>

          <div className="space-y-3">
            {isLoading ? (
              <div className="text-center py-12 text-muted-foreground">正在加载发票...</div>
            ) : error ? (
              <div className="text-center py-12 text-red-400">发票加载失败，请确认后端服务已启动</div>
            ) : filteredInvoices.length === 0 ? (
              <div className="text-center py-12">
                <Receipt className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">没有找到符合条件的发票</p>
              </div>
            ) : (
              filteredInvoices.map((invoice) => (
                <div key={invoice.id} className="bg-card border border-border rounded-lg p-6 hover:border-primary/50 hover:bg-secondary/10 transition">
                  <div className="flex items-center justify-between gap-3">
                    <Link href={`/invoices/${invoice.id}`} className="flex-1">
                      <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <Receipt className="w-5 h-5 text-primary" />
                          <h3 className="text-lg font-semibold text-foreground">{invoice.invoice_number || `发票 #${invoice.id}`}</h3>
                          {invoice.is_duplicate && (
                            <span className="text-xs px-2 py-1 bg-red-500/10 text-red-400 rounded font-semibold">重复发票</span>
                          )}
                          {invoice.is_voided && (
                            <span className="text-xs px-2 py-1 bg-yellow-500/10 text-yellow-400 rounded font-semibold">已作废</span>
                          )}
                        </div>

                        <div className="grid grid-cols-3 md:grid-cols-5 gap-4">
                          <Info label="公司名称" value={invoice.issuer_name || '-'} />
                          <Info label="发票金额" value={`¥${Number(invoice.invoice_amount || 0).toLocaleString()}`} />
                          <Info label="发票日期" value={invoice.invoice_date || '-'} />
                          <div>
                            <p className="text-xs text-muted-foreground">验证状态</p>
                            <div className="flex items-center gap-2 mt-1">
                              {getStatusIcon(invoice.status)}
                              <span className="font-medium text-sm">{getStatusLabel(invoice.status)}</span>
                            </div>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">真伪验证</p>
                            <div className="flex items-center gap-2 mt-1">
                              {invoice.authenticity_verified ? (
                                <>
                                  <CheckCircle2 className="w-4 h-4 text-green-400" />
                                  <span className="font-medium text-sm text-green-400">Mock 通过</span>
                                </>
                              ) : (
                                <>
                                  <AlertCircle className="w-4 h-4 text-yellow-400" />
                                  <span className="font-medium text-sm text-yellow-400">待验</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="p-2 hover:bg-secondary/50 rounded-lg transition">
                        <Eye className="w-5 h-5 text-muted-foreground" />
                      </div>
                    </div>
                    </Link>
                    <button
                      type="button"
                      onClick={(event) => handleDeleteInvoice(event, invoice.id, invoice.invoice_number || `发票 #${invoice.id}`)}
                      disabled={deletingId === invoice.id}
                      title="删除发票"
                      className="p-2 text-muted-foreground hover:text-red-400 hover:bg-red-500/10 rounded-lg transition disabled:opacity-50"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium text-foreground text-sm">{value}</p>
    </div>
  );
}

function StatCard({ label, value, icon: Icon }: any) {
  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold text-foreground mt-1">{value}</p>
        </div>
        <div className="p-3 bg-primary/10 rounded-lg">
          <Icon className="w-5 h-5 text-primary" />
        </div>
      </div>
    </div>
  );
}

function GuidanceBox({ title, text }: { title: string; text: string }) {
  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <p className="text-sm font-semibold text-foreground mb-2">{title}</p>
      <p className="text-sm text-muted-foreground leading-6">{text}</p>
    </div>
  );
}
