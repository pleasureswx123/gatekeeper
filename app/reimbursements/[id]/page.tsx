/**
 * 报销单详情页面
 */
'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { Navigation } from '@/components/Navigation';
import { apiClient } from '@/lib/api/client';
import { AlertCircle, ArrowLeft, CheckCircle2, Receipt, RefreshCw, XCircle } from 'lucide-react';
import Link from 'next/link';

export default function ReimbursementDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const [reimbursement, setReimbursement] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchReimbursement = useCallback(async () => {
    if (!id) return;

    try {
      setIsLoading(true);
      const response = (await apiClient.get(`/reimbursements/${id}`)) as any;
      setReimbursement(response);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.detail || '加载失败');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchReimbursement();
  }, [fetchReimbursement]);

  const linkedInvoiceIds = useMemo(() => {
    if (!reimbursement?.items) return [];
    return Array.from(new Set(reimbursement.items.map((item: any) => item.invoice_id).filter(Boolean)));
  }, [reimbursement]);

  const runAction = async (action: 'verify' | 'approve' | 'reject') => {
    if (!id) return;
    setIsActionLoading(true);
    setError(null);

    try {
      if (action === 'verify') {
        await apiClient.post(`/reimbursements/${id}/verify`);
      }
      if (action === 'approve') {
        await apiClient.put(`/reimbursements/${id}/approve`);
      }
      if (action === 'reject') {
        await apiClient.put(`/reimbursements/${id}/reject`, undefined, {
          params: { rejection_reason: '审批驳回' },
        });
      }
      await fetchReimbursement();
    } catch (err: any) {
      setError(err.response?.data?.detail || '操作失败，请重试');
    } finally {
      setIsActionLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen bg-background">
        <Navigation />
        <main className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground">加载中...</p>
        </main>
      </div>
    );
  }

  if (error && !reimbursement) {
    return (
      <div className="flex h-screen bg-background">
        <Navigation />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
            <p className="text-red-400">{error}</p>
            <Link href="/reimbursements">
              <button className="mt-4 text-primary hover:underline">返回列表</button>
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const verification = reimbursement?.verification;
  const verificationResult = verification?.verification_result || {};

  return (
    <div className="flex h-screen bg-background">
      <Navigation />

      <main className="flex-1 overflow-auto">
        <div className="bg-card border-b border-border sticky top-0 z-10">
          <div className="px-8 py-4 flex items-center gap-4">
            <Link href="/reimbursements">
              <button className="text-muted-foreground hover:text-foreground" aria-label="返回">
                <ArrowLeft className="w-5 h-5" />
              </button>
            </Link>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-foreground">{reimbursement.reimbursement_number}</h2>
              <p className="text-sm text-muted-foreground mt-1">报销单详情、校验结果和审批操作</p>
            </div>
            <button
              onClick={() => runAction('verify')}
              disabled={isActionLoading}
              className="flex items-center gap-2 px-4 py-2 bg-secondary/20 text-foreground rounded-lg hover:bg-secondary/30 border border-border disabled:opacity-50"
            >
              <RefreshCw className="w-4 h-4" />
              重新校验
            </button>
          </div>
        </div>

        <div className="p-8 space-y-6">
          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400">
              {error}
            </div>
          )}

          <div className="bg-card border border-border rounded-lg p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">基本信息</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <InfoItem label="报销单号" value={reimbursement.reimbursement_number} />
              <InfoItem label="提交日期" value={formatDate(reimbursement.submission_date || reimbursement.created_at)} />
              <div>
                <p className="text-sm text-muted-foreground mb-1">状态</p>
                <div className={`flex items-center gap-2 px-3 py-1 rounded-full w-fit ${getStatusColor(reimbursement.status)}`}>
                  {getStatusLabel(reimbursement.status)}
                </div>
              </div>
              <InfoItem label="总金额" value={`¥${Number(reimbursement.total_amount || 0).toFixed(2)}`} />
              <InfoItem label="审批日期" value={reimbursement.approval_date ? formatDate(reimbursement.approval_date) : '未审批'} />
              <InfoItem label="审批备注" value={reimbursement.approval_notes || '无'} />
              <div className="md:col-span-3">
                <InfoItem label="报销说明" value={reimbursement.description || '无'} />
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground">三单合一校验</h3>
              <span className={`px-3 py-1 rounded-full text-sm ${getVerificationColor(verification?.verification_status)}`}>
                {getVerificationLabel(verification?.verification_status)}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <Metric label="明细数" value={verification?.item_count ?? reimbursement.items?.length ?? 0} />
              <Metric label="关联发票" value={verification?.invoice_count ?? 0} />
              <Metric label="异常发票" value={verification?.invalid_invoice_count ?? 0} />
              <Metric label="匹配度" value={`${Math.round(Number(verification?.matching_score || 0) * 100)}%`} />
            </div>

            <div className="space-y-3">
              <ValidationItem
                label="金额匹配"
                status={Boolean(verificationResult.amount_matches)}
                details={`报销金额 ¥${Number(reimbursement.total_amount || 0).toFixed(2)}，发票合计 ¥${Number(verificationResult.linked_invoice_total || 0).toFixed(2)}`}
              />
              <ValidationItem
                label="发票有效性"
                status={(verification?.invalid_invoice_count ?? 0) === 0}
                details={`异常发票 ${verification?.invalid_invoice_count ?? 0} 张`}
              />
              <ValidationItem
                label="防重复检查"
                status={(verification?.duplicate_invoice_count ?? 0) === 0}
                details={`重复发票 ${verification?.duplicate_invoice_count ?? 0} 张`}
              />
              <ValidationItem
                label="明细关联"
                status={(verification?.invoice_count ?? 0) === (verification?.item_count ?? 0) && (verification?.item_count ?? 0) > 0}
                details={`已关联 ${verification?.invoice_count ?? 0}/${verification?.item_count ?? reimbursement.items?.length ?? 0} 条明细`}
              />
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">报销明细</h3>
            <div className="space-y-3">
              {reimbursement.items && reimbursement.items.length > 0 ? (
                reimbursement.items.map((item: any) => (
                  <div key={item.id} className="flex items-center justify-between gap-4 p-4 bg-secondary/20 rounded-lg">
                    <div className="min-w-0">
                      <p className="font-medium text-foreground truncate">{item.item_name || item.description}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {item.category || '未分类'}{item.invoice_id ? ` · 发票 #${item.invoice_id}` : ' · 未关联发票'}
                      </p>
                    </div>
                    <p className="font-semibold text-foreground shrink-0">¥{Number(item.amount || 0).toFixed(2)}</p>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground">暂无明细</p>
              )}
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">关联发票</h3>
            {linkedInvoiceIds.length > 0 ? (
              <div className="space-y-3">
                {linkedInvoiceIds.map((invoiceId: any) => (
                  <div key={invoiceId} className="p-4 bg-secondary/20 rounded-lg flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Receipt className="w-5 h-5 text-primary" />
                      <div>
                        <p className="font-medium text-foreground">发票 #{invoiceId}</p>
                        <p className="text-xs text-muted-foreground">已关联到报销明细</p>
                      </div>
                    </div>
                    <Link href={`/invoices/${invoiceId}`}>
                      <button className="text-primary hover:underline text-sm">查看</button>
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">暂无关联发票</p>
            )}
          </div>

          {reimbursement.status === 'submitted' && (
            <div className="flex gap-3">
              <button
                onClick={() => runAction('approve')}
                disabled={isActionLoading}
                className="flex-1 bg-primary text-primary-foreground py-2 rounded-lg hover:bg-primary/90 transition font-medium disabled:opacity-50"
              >
                批准
              </button>
              <button
                onClick={() => runAction('reject')}
                disabled={isActionLoading}
                className="flex-1 bg-red-500/10 text-red-400 py-2 rounded-lg hover:bg-red-500/20 transition font-medium disabled:opacity-50"
              >
                拒绝
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function InfoItem({ label, value }: any) {
  return (
    <div>
      <p className="text-sm text-muted-foreground mb-1">{label}</p>
      <p className="font-medium text-foreground break-words">{value}</p>
    </div>
  );
}

function Metric({ label, value }: any) {
  return (
    <div className="p-4 bg-secondary/20 rounded-lg border border-border">
      <p className="text-sm text-muted-foreground mb-1">{label}</p>
      <p className="text-xl font-bold text-foreground">{value}</p>
    </div>
  );
}

function ValidationItem({ label, status, details }: any) {
  return (
    <div className="flex items-start gap-4 p-3 bg-secondary/20 rounded-lg">
      <div className="mt-0.5">
        {status ? (
          <CheckCircle2 className="w-5 h-5 text-green-400" />
        ) : (
          <XCircle className="w-5 h-5 text-yellow-400" />
        )}
      </div>
      <div className="flex-1">
        <p className="font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground mt-1">{details}</p>
      </div>
    </div>
  );
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('zh-CN');
}

function getStatusColor(status: string) {
  switch (status) {
    case 'approved':
      return 'bg-green-500/10 text-green-400';
    case 'rejected':
      return 'bg-red-500/10 text-red-400';
    case 'pending_review':
      return 'bg-yellow-500/10 text-yellow-400';
    case 'submitted':
      return 'bg-blue-500/10 text-blue-400';
    default:
      return 'bg-muted text-muted-foreground';
  }
}

function getStatusLabel(status: string) {
  switch (status) {
    case 'approved':
      return '已批准';
    case 'rejected':
      return '已拒绝';
    case 'pending_review':
      return '待审批';
    case 'submitted':
      return '已提交';
    case 'reimbursed':
      return '已付款';
    default:
      return '未知';
  }
}

function getVerificationColor(status?: string) {
  switch (status) {
    case 'verified':
      return 'bg-green-500/10 text-green-400';
    case 'failed':
      return 'bg-red-500/10 text-red-400';
    case 'partial_verified':
      return 'bg-yellow-500/10 text-yellow-400';
    default:
      return 'bg-muted text-muted-foreground';
  }
}

function getVerificationLabel(status?: string) {
  switch (status) {
    case 'verified':
      return '已通过';
    case 'failed':
      return '未通过';
    case 'partial_verified':
      return '部分通过';
    case 'not_verified':
      return '未校验';
    default:
      return '暂无结果';
  }
}
