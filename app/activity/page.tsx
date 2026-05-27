/**
 * 活动日志页面
 */
'use client';

import { useMemo, useState } from 'react';
import { Navigation } from '@/components/Navigation';
import { Activity, AlertCircle, CheckCircle2, Clock, Search } from 'lucide-react';
import { useAuditLogs } from '@/hooks/useData';
import type { AuditLog } from '@/types';

export default function ActivityPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [resourceType, setResourceType] = useState('all');
  const { auditLogs = [], isLoading, error } = useAuditLogs(
    0,
    100,
    filterType === 'all' ? undefined : filterType,
    resourceType === 'all' ? undefined : resourceType
  );

  const filteredActivities = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return auditLogs;

    return auditLogs.filter((activity) => {
      const meta = getActivityMeta(activity);
      return meta.title.toLowerCase().includes(term)
        || meta.description.toLowerCase().includes(term)
        || (activity.user?.full_name || activity.user?.username || '').toLowerCase().includes(term);
    });
  }, [auditLogs, searchTerm]);

  const stats = useMemo(() => {
    return {
      total: auditLogs.length,
      success: auditLogs.filter((log) => getSeverity(log.action) === 'success').length,
      warning: auditLogs.filter((log) => getSeverity(log.action) === 'warning').length,
      error: auditLogs.filter((log) => getSeverity(log.action) === 'error').length,
    };
  }, [auditLogs]);

  return (
    <div className="flex h-screen bg-background">
      <Navigation />

      <main className="flex-1 overflow-auto">
        <div className="bg-card border-b border-border sticky top-0 z-10">
          <div className="px-8 py-6">
            <h2 className="text-2xl font-bold text-foreground">活动日志</h2>
            <p className="text-sm text-muted-foreground mt-1">系统中所有真实操作和事件记录</p>
          </div>
        </div>

        <div className="p-8 space-y-6 max-w-5xl">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative min-w-0">
              <Search className="w-5 h-5 absolute left-3 top-3 text-muted-foreground" />
              <input
                type="text"
                placeholder="搜索活动、描述或操作人..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
              />
            </div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-4 py-2 bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
            >
              <option value="all">全部事件</option>
              <option value="contract_uploaded">合同上传</option>
              <option value="contract_upload_failed">合同上传失败</option>
              <option value="invoice_uploaded">发票上传</option>
              <option value="invoice_verification_started">发票验真</option>
              <option value="task_completed">任务完成</option>
              <option value="task_failed">任务失败</option>
              <option value="reimbursement_submitted">报销提交</option>
              <option value="reimbursement_verified">报销校验</option>
              <option value="reimbursement_approved">报销批准</option>
              <option value="reimbursement_rejected">报销拒绝</option>
            </select>
            <select
              value={resourceType}
              onChange={(e) => setResourceType(e.target.value)}
              className="px-4 py-2 bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
            >
              <option value="all">全部资源</option>
              <option value="contract">合同</option>
              <option value="invoice">发票</option>
              <option value="reimbursement">报销单</option>
              <option value="user">用户</option>
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <StatCard label="总事件数" value={stats.total} />
            <StatCard label="成功" value={stats.success} tone="success" />
            <StatCard label="警告" value={stats.warning} tone="warning" />
            <StatCard label="错误" value={stats.error} tone="error" />
          </div>

          <div className="space-y-3">
            {isLoading ? (
              <div className="text-center py-12 text-muted-foreground">正在加载活动日志...</div>
            ) : error ? (
              <div className="text-center py-12 text-red-400">活动日志加载失败，请确认后端服务已启动</div>
            ) : filteredActivities.length === 0 ? (
              <div className="text-center py-12">
                <Activity className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">没有找到符合条件的活动</p>
              </div>
            ) : (
              filteredActivities.map((activity) => {
                const meta = getActivityMeta(activity);
                const severity = getSeverity(activity.action);

                return (
                  <div
                    key={activity.id}
                    className={`border rounded-lg p-4 ${getActivityColor(severity)} hover:border-primary/50 transition`}
                  >
                    <div className="flex gap-4">
                      <div className="flex-shrink-0 mt-1">
                        {getActivityIcon(severity)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <h4 className="font-semibold text-foreground">{meta.title}</h4>
                            <p className="text-sm text-muted-foreground mt-1">{meta.description}</p>
                            <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                              <span>由 {activity.user?.full_name || activity.user?.username || '系统'} 执行</span>
                              <span>|</span>
                              <span>{new Date(activity.created_at).toLocaleString('zh-CN')}</span>
                            </div>
                          </div>
                          {activity.resource_type && (
                            <div className="text-right shrink-0">
                              <p className="text-xs text-muted-foreground">{getResourceLabel(activity.resource_type)}</p>
                              <p className="text-sm font-medium text-primary">{meta.resourceName}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function getActivityMeta(activity: AuditLog) {
  const changes = activity.changes || {};
  const resourceName = changes.contract_number
    || changes.reimbursement_number
    || changes.invoice_number
    || changes.file_name
    || (activity.resource_id ? `#${activity.resource_id}` : '-');

  switch (activity.action) {
    case 'contract_uploaded':
      return {
        title: '合同已上传',
        description: `合同 ${changes.contract_name || resourceName} 已进入分析流程`,
        resourceName,
      };
    case 'contract_upload_failed':
      return {
        title: '合同上传失败',
        description: changes.error_message || `合同 ${changes.contract_name || resourceName} 未能进入分析流程`,
        resourceName,
      };
    case 'invoice_uploaded':
      return {
        title: '发票已上传',
        description: `发票文件 ${changes.file_name || resourceName} 已进入 OCR 识别流程`,
        resourceName,
      };
    case 'invoice_verification_started':
      return {
        title: '发票验真已启动',
        description: `发票 ${resourceName} 已启动验真任务`,
        resourceName,
      };
    case 'task_completed':
      return {
        title: '后台任务已完成',
        description: getTaskDescription(changes, 'completed'),
        resourceName,
      };
    case 'task_failed':
      return {
        title: '后台任务失败',
        description: getTaskDescription(changes, 'failed'),
        resourceName,
      };
    case 'reimbursement_submitted':
      return {
        title: '报销单已提交',
        description: `报销单 ${resourceName} 已提交，金额 ¥${changes.total_amount || '0.00'}`,
        resourceName,
      };
    case 'reimbursement_verified':
      return {
        title: '报销单已校验',
        description: `报销单 ${resourceName} 校验状态：${changes.verification_status || '-'}`,
        resourceName,
      };
    case 'reimbursement_approved':
      return {
        title: '报销单已批准',
        description: `报销单 ${resourceName} 已获得批准`,
        resourceName,
      };
    case 'reimbursement_rejected':
      return {
        title: '报销单已拒绝',
        description: `报销单 ${resourceName} 已被拒绝`,
        resourceName,
      };
    default:
      return {
        title: activity.action,
        description: JSON.stringify(changes),
        resourceName,
      };
  }
}

function getSeverity(action: string) {
  if (action.includes('failed') || action.includes('rejected')) return 'error';
  if (action.includes('completed') || action.includes('verified') || action.includes('approved')) return 'success';
  if (action.includes('started') || action.includes('uploaded') || action.includes('submitted')) return 'info';
  return 'warning';
}

function getTaskDescription(changes: Record<string, any>, status: 'completed' | 'failed') {
  const taskTypeMap: Record<string, string> = {
    contract_analysis: '合同分析',
    invoice_ocr: '发票 OCR 识别',
    invoice_verification: '发票验真',
  };
  const taskName = taskTypeMap[changes.task_type] || changes.task_type || '后台任务';
  if (status === 'failed') {
    return `${taskName}失败：${changes.error_message || '未知错误'}`;
  }
  if (changes.risk_level) {
    return `${taskName}完成，风险等级 ${changes.risk_level}，评分 ${changes.risk_score ?? '-'}`;
  }
  if (typeof changes.is_valid !== 'undefined') {
    return `${taskName}完成，验真结果：${changes.is_valid ? '通过' : '未通过'}，重复：${changes.is_duplicate ? '是' : '否'}`;
  }
  return `${taskName}已完成`;
}

function getActivityIcon(severity: string) {
  if (severity === 'success') return <CheckCircle2 className="w-5 h-5 text-green-400" />;
  if (severity === 'error') return <AlertCircle className="w-5 h-5 text-red-400" />;
  return <Clock className="w-5 h-5 text-yellow-400" />;
}

function getActivityColor(severity: string) {
  switch (severity) {
    case 'success':
      return 'bg-green-500/10 border-green-500/20';
    case 'error':
      return 'bg-red-500/10 border-red-500/20';
    case 'warning':
      return 'bg-yellow-500/10 border-yellow-500/20';
    default:
      return 'bg-blue-500/10 border-blue-500/20';
  }
}

function getResourceLabel(resourceType: string) {
  switch (resourceType) {
    case 'contract':
      return '合同';
    case 'invoice':
      return '发票';
    case 'reimbursement':
      return '报销单';
    default:
      return resourceType;
  }
}

function StatCard({ label, value, tone }: { label: string; value: number; tone?: string }) {
  const color = tone === 'success' ? 'text-green-400' : tone === 'warning' ? 'text-yellow-400' : tone === 'error' ? 'text-red-400' : 'text-foreground';
  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
    </div>
  );
}
