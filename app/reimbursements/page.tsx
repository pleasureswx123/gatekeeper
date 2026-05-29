/**
 * 报销单列表页面
 */
'use client';

import { useState } from 'react';
import { Navigation } from '@/components/Navigation';
import { ProcessHint } from '@/components/ProcessHint';
import { useReimbursements } from '@/hooks/useData';
import { Plus, Search, FileText, Clock, AlertCircle, CheckCircle2, Trash2, ClipboardPlus, ReceiptText, BadgeCheck } from 'lucide-react';
import Link from 'next/link';
import { apiClient } from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/api/config';

export default function ReimbursementsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const { reimbursements, isLoading, mutate } = useReimbursements(
    0,
    20,
    statusFilter === 'all' ? undefined : statusFilter
  );

  const getStatusColor = (status: string) => {
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
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'approved':
        return '已批准';
      case 'rejected':
        return '已拒绝';
      case 'pending_review':
        return '待审批';
      case 'submitted':
        return '已提交';
      default:
        return '未知';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle2 className="w-4 h-4" />;
      case 'rejected':
        return <AlertCircle className="w-4 h-4" />;
      case 'pending_review':
      case 'submitted':
        return <Clock className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  const filteredReimbursements = reimbursements?.filter((r: any) => 
    r.reimbursement_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.description?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const handleDeleteReimbursement = async (reimbursementId: number, reimbursementNumber: string) => {
    if (!window.confirm(`确定删除报销单「${reimbursementNumber}」吗？删除后不可恢复。`)) {
      return;
    }

    try {
      setDeletingId(reimbursementId);
      await apiClient.delete(API_ENDPOINTS.REIMBURSEMENTS_DELETE(reimbursementId));
      await mutate();
    } catch (error) {
      window.alert('删除报销单失败，请稍后重试');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="flex h-screen bg-background">
      <Navigation />

      <main className="flex-1 overflow-auto">
        {/* 顶部栏 */}
        <div className="bg-card border-b border-border sticky top-0 z-10">
          <div className="px-8 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-foreground">报销单管理</h2>
                <p className="text-sm text-muted-foreground mt-1">创建报销单后，系统按规则校验明细金额、关联发票和凭证附件，再由审批人处理</p>
              </div>
              <ProcessHint
                steps={[
                  { label: '创建报销单', icon: ClipboardPlus },
                  { label: '关联发票', icon: ReceiptText },
                  { label: '规则校验', icon: BadgeCheck },
                ]}
              />
              <Link href="/reimbursements/create">
                <button className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition">
                  <Plus className="w-4 h-4" />
                  创建报销单
                </button>
              </Link>
            </div>
          </div>
        </div>

        <div className="p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <GuidanceBox title="系统在做什么" text="汇总报销明细，检查是否关联发票、金额是否匹配、发票是否异常，并统计凭证附件。" />
            <GuidanceBox title="哪里用了 AI" text="报销校验本身不用 AI；如果关联了发票，发票字段可能来自前一步 AI OCR 识别。" />
            <GuidanceBox title="你要看什么" text="重点看匹配度、异常发票、未关联明细和审批意见，最终批准或拒绝仍由审批人决定。" />
          </div>

          {/* 筛选器和搜索 */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="搜索报销单号或描述..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-secondary/20 border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 bg-secondary/20 border border-border rounded-lg text-foreground focus:outline-none focus:border-primary"
              >
                <option value="all">所有状态</option>
                <option value="submitted">已提交</option>
                <option value="pending_review">待审批</option>
                <option value="approved">已批准</option>
                <option value="rejected">已拒绝</option>
              </select>
            </div>
          </div>

          {/* 报销单列表 */}
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            {isLoading ? (
              <div className="p-8 text-center text-muted-foreground">加载中...</div>
            ) : filteredReimbursements.length === 0 ? (
              <div className="p-8 text-center">
                <FileText className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground">暂无报销单</p>
                <Link href="/reimbursements/create">
                  <button className="mt-4 text-primary hover:underline">创建第一个报销单</button>
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-secondary/20 border-b border-border">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">报销单号</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">金额</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">提交日期</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">状态</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredReimbursements.map((reimbursement: any) => (
                      <tr key={reimbursement.id} className="border-b border-border/50 hover:bg-secondary/10 transition">
                        <td className="px-6 py-4 text-sm font-medium text-foreground">
                          {reimbursement.reimbursement_number}
                        </td>
                        <td className="px-6 py-4 text-sm text-foreground">
                          ¥{Number(reimbursement.total_amount || 0).toFixed(2)}
                        </td>
                        <td className="px-6 py-4 text-sm text-muted-foreground">
                          {new Date(reimbursement.created_at).toLocaleDateString('zh-CN')}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <div className={`flex items-center gap-2 px-3 py-1 rounded-full w-fit ${getStatusColor(reimbursement.status)}`}>
                            {getStatusIcon(reimbursement.status)}
                            {getStatusLabel(reimbursement.status)}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <div className="flex items-center gap-3">
                            <Link href={`/reimbursements/${reimbursement.id}`}>
                              <span className="text-primary hover:underline">查看详情</span>
                            </Link>
                            <button
                              type="button"
                              onClick={() => handleDeleteReimbursement(reimbursement.id, reimbursement.reimbursement_number)}
                              disabled={deletingId === reimbursement.id}
                              title="删除报销单"
                              className="p-2 text-muted-foreground hover:text-red-400 hover:bg-red-500/10 rounded-lg transition disabled:opacity-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* 统计信息 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <StatBox label="总报销单数" value={reimbursements?.length || 0} />
            <StatBox 
              label="待审批" 
              value={reimbursements?.filter((r: any) => r.status === 'pending_review' || r.status === 'submitted').length || 0}
              isHighlight
            />
            <StatBox 
              label="已批准" 
              value={reimbursements?.filter((r: any) => r.status === 'approved').length || 0}
            />
            <StatBox 
              label="已拒绝" 
              value={reimbursements?.filter((r: any) => r.status === 'rejected').length || 0}
            />
          </div>
        </div>
      </main>
    </div>
  );
}

function StatBox({ label, value, isHighlight }: any) {
  return (
    <div className={`bg-card border rounded-lg p-6 ${isHighlight ? 'border-yellow-500/50' : 'border-border'}`}>
      <p className="text-sm text-muted-foreground mb-1">{label}</p>
      <p className={`text-2xl font-bold ${isHighlight ? 'text-yellow-400' : 'text-foreground'}`}>
        {value}
      </p>
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
