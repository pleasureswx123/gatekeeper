/**
 * 仪表板主页
 */
'use client';

import { Navigation } from '@/components/Navigation';
import { AlertCircle, CheckCircle2, Clock, CreditCard, FileText, Receipt, ShieldAlert, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { useAuditLogs, useContracts, useInvoices, useReimbursements, useSystemInfo } from '@/hooks/useData';
import type { AuditLog } from '@/types';

export default function Dashboard() {
  const { contracts = [], isLoading: contractsLoading } = useContracts(0, 100);
  const { invoices = [], isLoading: invoicesLoading } = useInvoices(0, 100);
  const { reimbursements = [], isLoading: reimbursementsLoading } = useReimbursements(0, 100);
  const { auditLogs = [], isLoading: logsLoading } = useAuditLogs(0, 6);
  const { systemInfo, isLoading: systemLoading } = useSystemInfo();

  const isLoading = contractsLoading || invoicesLoading || reimbursementsLoading || logsLoading || systemLoading;
  const highRiskContracts = contracts.filter((contract) => ['high', 'critical'].includes(contract.risk_level || '')).length;
  const duplicateInvoices = invoices.filter((invoice) => invoice.is_duplicate || invoice.is_voided || invoice.status === 'invalid').length;
  const pendingReimbursements = reimbursements.filter((item) => item.status === 'submitted' || item.status === 'pending_review').length;
  const riskAlerts = highRiskContracts + duplicateInvoices;

  const today = new Date().toDateString();
  const todayContracts = contracts.filter((item) => new Date(item.created_at).toDateString() === today).length;
  const todayInvoices = invoices.filter((item) => new Date(item.created_at).toDateString() === today).length;
  const todayApproved = reimbursements.filter((item) => item.status === 'approved' && new Date(item.created_at).toDateString() === today).length;

  return (
    <div className="flex h-screen bg-background">
      <Navigation />

      <main className="flex-1 overflow-auto">
        <div className="bg-card border-b border-border sticky top-0 z-10">
          <div className="px-8 py-6">
            <h2 className="text-2xl font-bold text-foreground">仪表板</h2>
            <p className="text-sm text-muted-foreground mt-1">实时监控财务审计数据和流程</p>
          </div>
        </div>

        <div className="p-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="合同总数"
              value={contracts.length}
              icon={<FileText className="w-5 h-5" />}
              trend={isLoading ? '加载中' : `${contracts.filter((item) => item.status === 'completed').length} 份已完成`}
            />
            <StatCard
              label="发票处理"
              value={invoices.length}
              icon={<Receipt className="w-5 h-5" />}
              trend={isLoading ? '加载中' : `${invoices.filter((item) => item.status === 'verified').length} 张已验证`}
            />
            <StatCard
              label="待审批报销"
              value={pendingReimbursements}
              icon={<CreditCard className="w-5 h-5" />}
              trend={`${reimbursements.length} 笔总报销`}
              isCritical={pendingReimbursements > 0}
            />
            <StatCard
              label="风险警告"
              value={riskAlerts}
              icon={<AlertCircle className="w-5 h-5" />}
              trend={riskAlerts > 0 ? '需要关注' : '暂无高风险'}
              isCritical={riskAlerts > 0}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <QuickActionCard
              title="上传合同"
              description="上传新合同进行智能风险分析"
              href="/contracts/upload"
              icon={<FileText className="w-7 h-7" />}
            />
            <QuickActionCard
              title="发票验证"
              description="OCR 识别和模拟验真"
              href="/invoices/upload"
              icon={<Receipt className="w-7 h-7" />}
            />
            <QuickActionCard
              title="报销审批"
              description="三单合一自动校验"
              href="/reimbursements"
              icon={<CreditCard className="w-7 h-7" />}
            />
          </div>

          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-foreground">最近活动</h3>
              <Link href="/activity" className="text-sm text-primary hover:underline">查看全部</Link>
            </div>
            <div className="space-y-3">
              {logsLoading ? (
                <div className="text-muted-foreground py-8 text-center">正在加载活动...</div>
              ) : auditLogs.length === 0 ? (
                <div className="text-muted-foreground py-8 text-center">暂无活动日志</div>
              ) : (
                auditLogs.map((item) => {
                  const meta = getAuditMeta(item);
                  return (
                    <div key={item.id} className="flex items-center justify-between p-4 bg-secondary/20 rounded-lg hover:bg-secondary/40 transition">
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className="p-2 rounded-lg bg-primary/10 text-primary">{getResourceIcon(item.resource_type)}</div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground truncate">{meta.title}</p>
                          <p className="text-xs text-muted-foreground">{meta.resourceLabel} · {new Date(item.created_at).toLocaleString('zh-CN')}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(item.action)}
                        <span className="text-sm text-muted-foreground">{meta.status}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-card border border-border rounded-lg p-6">
              <h4 className="font-semibold text-foreground mb-4">系统状态</h4>
              <div className="space-y-3">
                <StatusItem label="数据库连接" status="正常" />
                <StatusItem label="API 服务" status={systemInfo?.status === 'healthy' ? '正常' : '异常'} tone={systemInfo?.status === 'healthy' ? 'success' : 'error'} />
                <StatusItem label="任务模式" status={formatTaskMode(systemInfo?.background_task_mode)} />
                <StatusItem label="发票验真" status={formatVerificationMode(systemInfo?.invoice_verification_mode)} tone={systemInfo?.invoice_verification_mode === 'mock' ? 'warning' : 'success'} />
                <StatusItem label="Ark Key" status={systemInfo?.ark_api_key_configured ? '已配置' : '未配置'} tone={systemInfo?.ark_api_key_configured ? 'success' : 'error'} />
                <StatusItem label="合同模型" status={systemInfo?.ark_chat_model || '未配置'} tone={systemInfo?.ark_chat_model ? 'success' : 'warning'} />
              </div>
            </div>

            <div className="bg-card border border-border rounded-lg p-6">
              <h4 className="font-semibold text-foreground mb-4">今日统计</h4>
              <div className="space-y-3">
                <StatsItem label="新增合同" value={`${todayContracts} 份`} />
                <StatsItem label="新增发票" value={`${todayInvoices} 张`} />
                <StatsItem label="已批准报销" value={`${todayApproved} 笔`} />
                <StatsItem label="风险事项" value={`${riskAlerts} 个`} />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function StatCard({ label, value, icon, trend, isCritical }: any) {
  return (
    <div className="bg-card border border-border rounded-lg p-6 hover:border-primary/50 transition">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground mb-1">{label}</p>
          <p className={`text-3xl font-bold ${isCritical ? 'text-red-400' : 'text-foreground'}`}>
            {value}
          </p>
        </div>
        <div className={`p-3 rounded-lg ${isCritical ? 'bg-red-500/10 text-red-400' : 'bg-primary/10 text-primary'}`}>
          {icon}
        </div>
      </div>
      <p className={`text-xs mt-3 flex items-center gap-1 ${isCritical ? 'text-red-400/70' : 'text-muted-foreground'}`}>
        <TrendingUp className="w-3 h-3" />
        {trend}
      </p>
    </div>
  );
}

function QuickActionCard({ title, description, href, icon }: any) {
  return (
    <Link href={href}>
      <div className="bg-card border border-border rounded-lg p-6 hover:border-primary/50 hover:bg-secondary/10 transition cursor-pointer group">
        <div className="w-12 h-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-3 group-hover:scale-105 transition">{icon}</div>
        <h4 className="font-semibold text-foreground mb-2">{title}</h4>
        <p className="text-sm text-muted-foreground">{description}</p>
        <div className="mt-4 flex items-center gap-2 text-primary text-sm font-medium group-hover:gap-3 transition">
          立即开始
          <span aria-hidden="true">›</span>
        </div>
      </div>
    </Link>
  );
}

function StatusItem({ label, status, tone = 'success' }: any) {
  const toneClass = tone === 'error' ? 'text-red-400' : tone === 'warning' ? 'text-yellow-400' : 'text-green-400';
  const dotClass = tone === 'error' ? 'bg-red-400' : tone === 'warning' ? 'bg-yellow-400' : 'bg-green-400';

  return (
    <div className="flex items-center justify-between p-3 bg-secondary/20 rounded-lg">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${dotClass}`}></div>
        <span className={`text-sm font-medium ${toneClass}`}>{status}</span>
      </div>
    </div>
  );
}

function formatTaskMode(mode?: string) {
  if (mode === 'inline') return '本地同步';
  if (mode === 'celery') return 'Celery 异步';
  return mode || '未知';
}

function formatVerificationMode(mode?: string) {
  if (mode === 'mock') return 'Mock 模式';
  return mode || '未配置';
}

function StatsItem({ label, value }: any) {
  return (
    <div className="flex items-center justify-between p-3 bg-secondary/20 rounded-lg">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-semibold text-primary">{value}</span>
    </div>
  );
}

function getAuditMeta(log: AuditLog) {
  const changes = log.changes || {};
  const resourceName = changes.contract_name || changes.reimbursement_number || changes.invoice_number || changes.file_name || `#${log.resource_id || '-'}`;
  switch (log.action) {
    case 'contract_uploaded':
      return { title: `合同已上传：${resourceName}`, resourceLabel: '合同', status: '已提交' };
    case 'contract_upload_failed':
      return { title: `合同上传失败：${resourceName}`, resourceLabel: '合同', status: '失败' };
    case 'invoice_uploaded':
      return { title: `发票已上传：${resourceName}`, resourceLabel: '发票', status: '识别中' };
    case 'invoice_verification_started':
      return { title: `发票验真已启动：${resourceName}`, resourceLabel: '发票', status: '验真中' };
    case 'task_completed':
      return { title: `后台任务已完成：${getTaskName(changes.task_type)}`, resourceLabel: getResourceLabel(log.resource_type), status: '已完成' };
    case 'task_failed':
      return { title: `后台任务失败：${getTaskName(changes.task_type)}`, resourceLabel: getResourceLabel(log.resource_type), status: '失败' };
    case 'reimbursement_submitted':
      return { title: `报销单已提交：${resourceName}`, resourceLabel: '报销', status: '待审批' };
    case 'reimbursement_approved':
      return { title: `报销单已批准：${resourceName}`, resourceLabel: '报销', status: '已批准' };
    case 'reimbursement_rejected':
      return { title: `报销单已拒绝：${resourceName}`, resourceLabel: '报销', status: '已拒绝' };
    default:
      return { title: log.action, resourceLabel: getResourceLabel(log.resource_type), status: '已记录' };
  }
}

function getResourceIcon(resourceType?: string) {
  if (resourceType === 'contract') return <FileText className="w-5 h-5" />;
  if (resourceType === 'invoice') return <Receipt className="w-5 h-5" />;
  if (resourceType === 'reimbursement') return <CreditCard className="w-5 h-5" />;
  return <ShieldAlert className="w-5 h-5" />;
}

function getResourceLabel(resourceType?: string) {
  if (resourceType === 'contract') return '合同';
  if (resourceType === 'invoice') return '发票';
  if (resourceType === 'reimbursement') return '报销';
  return '系统';
}

function getTaskName(taskType?: string) {
  if (taskType === 'contract_analysis') return '合同分析';
  if (taskType === 'invoice_ocr') return '发票 OCR';
  if (taskType === 'invoice_verification') return '发票验真';
  return taskType || '后台任务';
}

function getStatusIcon(action: string) {
  if (action.includes('approved') || action.includes('verified')) return <CheckCircle2 className="w-4 h-4 text-primary" />;
  if (action.includes('failed') || action.includes('rejected')) return <AlertCircle className="w-4 h-4 text-red-400" />;
  if (action.includes('completed')) return <CheckCircle2 className="w-4 h-4 text-primary" />;
  return <Clock className="w-4 h-4 text-yellow-400" />;
}
