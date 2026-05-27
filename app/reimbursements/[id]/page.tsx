/**
 * 报销单详情页面 - 显示三单合一校验结果
 */
'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Navigation } from '@/components/Navigation';
import { apiClient } from '@/lib/api/client';
import { ArrowLeft, CheckCircle2, AlertCircle, Clock, FileText, Receipt, DollarSign } from 'lucide-react';
import Link from 'next/link';

export default function ReimbursementDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const [reimbursement, setReimbursement] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    const fetchReimbursement = async () => {
      try {
        setIsLoading(true);
        const response = await apiClient.get(`/reimbursements/${id}`);
        setReimbursement(response.data);
        setError(null);
      } catch (err: any) {
        setError(err.response?.data?.detail || '加载失败');
      } finally {
        setIsLoading(false);
      }
    };

    fetchReimbursement();
  }, [id]);

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

  if (error || !reimbursement) {
    return (
      <div className="flex h-screen bg-background">
        <Navigation />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
            <p className="text-red-400">{error || '报销单不存在'}</p>
            <Link href="/reimbursements">
              <button className="mt-4 text-primary hover:underline">返回列表</button>
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-500/10 text-green-400';
      case 'rejected':
        return 'bg-red-500/10 text-red-400';
      case 'pending':
        return 'bg-yellow-500/10 text-yellow-400';
      case 'submitted':
        return 'bg-blue-500/10 text-blue-400';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'approved':
        return '已批准';
      case 'rejected':
        return '已拒绝';
      case 'pending':
        return '待审批';
      case 'submitted':
        return '已提交';
      default:
        return '未知';
    }
  };

  const validateThreeWayMatch = reimbursement.three_way_match_result || {
    amount_match: false,
    date_match: false,
    invoice_verified: false,
    no_duplicate: false,
    overall_result: 'pending'
  };

  return (
    <div className="flex h-screen bg-background">
      <Navigation />

      <main className="flex-1 overflow-auto">
        {/* 顶部栏 */}
        <div className="bg-card border-b border-border sticky top-0 z-10">
          <div className="px-8 py-4 flex items-center gap-4">
            <Link href="/reimbursements">
              <button className="text-muted-foreground hover:text-foreground">
                <ArrowLeft className="w-5 h-5" />
              </button>
            </Link>
            <div>
              <h2 className="text-2xl font-bold text-foreground">{reimbursement.reimbursement_number}</h2>
              <p className="text-sm text-muted-foreground mt-1">报销单详情和三单合一校验</p>
            </div>
          </div>
        </div>

        <div className="p-8 space-y-6">
          {/* 基本信息 */}
          <div className="bg-card border border-border rounded-lg p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">基本信息</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <InfoItem label="报销单号" value={reimbursement.reimbursement_number} />
              <InfoItem label="提交日期" value={new Date(reimbursement.created_at).toLocaleDateString('zh-CN')} />
              <div>
                <p className="text-sm text-muted-foreground mb-1">状态</p>
                <div className={`flex items-center gap-2 px-3 py-1 rounded-full w-fit ${getStatusColor(reimbursement.status)}`}>
                  {getStatusLabel(reimbursement.status)}
                </div>
              </div>
              <InfoItem label="总金额" value={`¥${reimbursement.total_amount?.toFixed(2) || '0.00'}`} />
              <InfoItem label="申请人" value={reimbursement.employee_name || '未指定'} />
              <InfoItem label="部门" value={reimbursement.department || '未指定'} />
            </div>
          </div>

          {/* 三单合一校验结果 */}
          <div className="bg-card border border-border rounded-lg p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">三单合一校验</h3>
            <div className="space-y-3">
              <ValidationItem
                label="报销单金额"
                icon="💳"
                status={validateThreeWayMatch.amount_match}
                details={`报销金额: ¥${reimbursement.total_amount?.toFixed(2) || '0.00'}`}
              />
              <ValidationItem
                label="发票真伪验证"
                icon="🧾"
                status={validateThreeWayMatch.invoice_verified}
                details="发票已通过真伪验证"
              />
              <ValidationItem
                label="金额匹配"
                icon="✓"
                status={validateThreeWayMatch.amount_match}
                details="报销金额与发票金额相符"
              />
              <ValidationItem
                label="日期匹配"
                icon="📅"
                status={validateThreeWayMatch.date_match}
                details="报销日期晚于发票开具日期"
              />
              <ValidationItem
                label="防重复检查"
                icon="🔍"
                status={validateThreeWayMatch.no_duplicate}
                details="未发现重复报销"
              />
            </div>

            {/* 总体结果 */}
            <div className="mt-6 p-4 rounded-lg bg-secondary/20 border border-border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">总体校验结果</p>
                  <p className="text-lg font-semibold text-foreground">
                    {validateThreeWayMatch.overall_result === 'passed' ? '✓ 通过' : '待审批'}
                  </p>
                </div>
                <div className={`p-3 rounded-lg ${validateThreeWayMatch.overall_result === 'passed' ? 'bg-green-500/10' : 'bg-yellow-500/10'}`}>
                  {validateThreeWayMatch.overall_result === 'passed' ? (
                    <CheckCircle2 className="w-6 h-6 text-green-400" />
                  ) : (
                    <Clock className="w-6 h-6 text-yellow-400" />
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 报销单明细 */}
          <div className="bg-card border border-border rounded-lg p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">报销明细</h3>
            <div className="space-y-3">
              {reimbursement.items && reimbursement.items.length > 0 ? (
                reimbursement.items.map((item: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-secondary/20 rounded-lg">
                    <div>
                      <p className="font-medium text-foreground">{item.description}</p>
                      <p className="text-xs text-muted-foreground mt-1">{item.category}</p>
                    </div>
                    <p className="font-semibold text-foreground">¥{item.amount?.toFixed(2) || '0.00'}</p>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground">暂无明细</p>
              )}
            </div>
          </div>

          {/* 关联发票 */}
          <div className="bg-card border border-border rounded-lg p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">关联发票</h3>
            {reimbursement.invoice_ids && reimbursement.invoice_ids.length > 0 ? (
              <div className="space-y-3">
                {reimbursement.invoice_ids.map((invoiceId: any, index: number) => (
                  <div key={index} className="p-4 bg-secondary/20 rounded-lg flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Receipt className="w-5 h-5 text-primary" />
                      <div>
                        <p className="font-medium text-foreground">发票 #{invoiceId}</p>
                        <p className="text-xs text-muted-foreground">已验证</p>
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

          {/* 操作按钮 */}
          {reimbursement.status === 'submitted' && (
            <div className="flex gap-3">
              <button className="flex-1 bg-primary text-primary-foreground py-2 rounded-lg hover:bg-primary/90 transition font-medium">
                批准
              </button>
              <button className="flex-1 bg-red-500/10 text-red-400 py-2 rounded-lg hover:bg-red-500/20 transition font-medium">
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
      <p className="font-medium text-foreground">{value}</p>
    </div>
  );
}

function ValidationItem({ label, icon, status, details }: any) {
  return (
    <div className="flex items-start gap-4 p-3 bg-secondary/20 rounded-lg">
      <div className="text-xl">{icon}</div>
      <div className="flex-1">
        <p className="font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground mt-1">{details}</p>
      </div>
      <div>
        {status ? (
          <CheckCircle2 className="w-5 h-5 text-green-400" />
        ) : (
          <AlertCircle className="w-5 h-5 text-yellow-400" />
        )}
      </div>
    </div>
  );
}
