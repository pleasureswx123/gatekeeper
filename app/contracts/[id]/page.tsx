/**
 * 合同详情页面
 */
'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { Navigation } from '@/components/Navigation';
import { FileText, AlertCircle, CheckCircle, AlertTriangle, Clock, Download, Eye } from 'lucide-react';
import { useContract } from '@/hooks/useData';
import { useResourceTasks } from '@/hooks/useTaskProgress';
import { API_ENDPOINTS } from '@/lib/api/config';
import { downloadAuthenticatedFile, previewAuthenticatedFile } from '@/lib/api/download';

export default function ContractDetailPage() {
  const params = useParams();
  const contractId = Number(params.id);
  const { contract, isLoading, error } = useContract(contractId);
  const { tasks } = useResourceTasks('contract', contractId);
  const [actionError, setActionError] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const latestTask = tasks[0];

  const riskLevel = contract?.risk_level || 'unknown';

  const handleDownload = async () => {
    if (!contract) return;
    setIsDownloading(true);
    setActionError('');

    try {
      await downloadAuthenticatedFile(
        API_ENDPOINTS.CONTRACTS_FILE(contract.id),
        contract.file_name || `${contract.contract_number}.pdf`
      );
    } catch (err: any) {
      setActionError(err.message || '合同文件下载失败');
    } finally {
      setIsDownloading(false);
    }
  };

  const handlePreview = async () => {
    if (!contract) return;
    setIsPreviewing(true);
    setActionError('');

    try {
      await previewAuthenticatedFile(
        API_ENDPOINTS.CONTRACTS_FILE(contract.id),
        contract.file_name || `${contract.contract_number}.pdf`
      );
    } catch (err: any) {
      setActionError(err.message || '合同文件预览失败');
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
                <FileText className="w-6 h-6 text-primary shrink-0" />
                <div className="min-w-0">
                  <h2 className="text-2xl font-bold text-foreground truncate">
                    {contract?.contract_name || '合同详情'}
                  </h2>
                  <p className="text-sm text-muted-foreground">{contract?.contract_number || `#${contractId}`}</p>
                </div>
              </div>
              {contract && (
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
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="p-8">
          {isLoading ? (
            <div className="text-muted-foreground">正在加载合同...</div>
          ) : error || !contract ? (
            <div className="text-red-400">合同加载失败，请确认后端服务已启动。</div>
          ) : (
            <div className="space-y-6">
              {actionError && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-400">
                  {actionError}
                </div>
              )}

              {contract.analysis_error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-400">
                  {contract.analysis_error}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Info label="供应商" value={contract.supplier_name || '-'} />
                <Info label="合同金额" value={`¥${Number(contract.amount || 0).toLocaleString()}`} />
                <StatusCard label="分析状态" status={contract.status} />
                <RiskCard level={riskLevel} score={contract.risk_score} />
              </div>

              <div className="bg-card border border-border rounded-lg p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4">原始文件</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Info label="文件名" value={contract.file_name || '-'} />
                  <Info label="文件大小" value={formatFileSize(contract.file_size)} />
                </div>
              </div>

              {latestTask && (
                <div className={`bg-card border rounded-lg p-5 ${latestTask.status === 'failed' ? 'border-red-500/40' : 'border-border'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-foreground">最近任务</h3>
                    <span className={`text-sm ${latestTask.status === 'failed' ? 'text-red-400' : 'text-muted-foreground'}`}>
                      {getTaskStatusLabel(latestTask.status)}
                    </span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2">
                    <div className={`h-2 rounded-full ${latestTask.status === 'failed' ? 'bg-red-500' : latestTask.status === 'completed' ? 'bg-green-500' : 'bg-primary'}`} style={{ width: `${latestTask.progress || 0}%` }} />
                  </div>
                  <p className="text-sm text-muted-foreground mt-3">
                    {latestTask.status_message || latestTask.current_step || latestTask.error_message || '暂无任务详情'}
                  </p>
                </div>
              )}

              <div className="bg-card border border-border rounded-lg p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4">风险详情</h3>
                {contract.risks?.length ? (
                  <div className="space-y-3">
                    {contract.risks.map((risk) => (
                      <div key={risk.id} className="border border-border rounded-lg p-4">
                        <div className="flex items-start gap-3">
                          <AlertTriangle className="w-5 h-5 text-yellow-500 mt-0.5" />
                          <div>
                            <p className="font-medium text-foreground">{risk.risk_type || '风险项'}</p>
                            <p className="text-sm text-muted-foreground mt-1">{risk.description}</p>
                            {risk.remediation_suggestion && (
                              <p className="text-sm text-primary mt-2">建议：{risk.remediation_suggestion}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">暂无风险明细。分析完成后会显示模型返回的风险项。</p>
                )}
              </div>

              <div className="bg-card border border-border rounded-lg p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4">模型分析原文</h3>
                <pre className="bg-secondary/30 rounded-lg p-4 overflow-auto text-sm text-muted-foreground">
                  {JSON.stringify(contract.llm_analysis_result || contract.analysis_result || {}, null, 2)}
                </pre>
              </div>
            </div>
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
    <div className="bg-card border border-border rounded-lg p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold text-foreground mt-2">{value}</p>
    </div>
  );
}

function StatusCard({ label, status }: { label: string; status: string }) {
  const completed = status === 'completed';
  const failed = status === 'error';
  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <div className="flex items-center gap-2 mt-2">
        {completed ? <CheckCircle className="w-5 h-5 text-green-400" /> : failed ? <AlertCircle className="w-5 h-5 text-red-400" /> : <Clock className="w-5 h-5 text-yellow-400" />}
        <span className="font-semibold text-foreground">{getContractStatusLabel(status)}</span>
      </div>
    </div>
  );
}

function getContractStatusLabel(status: string) {
  switch (status) {
    case 'completed':
      return '已完成';
    case 'analyzing':
      return '分析中';
    case 'error':
      return '分析失败';
    case 'pending':
      return '待分析';
    default:
      return status || '未知';
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

function RiskCard({ level, score }: { level: string; score?: number }) {
  const risky = ['high', 'critical'].includes(level);
  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <p className="text-sm text-muted-foreground">风险等级</p>
      <div className="flex items-center gap-2 mt-2">
        {risky ? <AlertCircle className="w-5 h-5 text-red-400" /> : <CheckCircle className="w-5 h-5 text-green-400" />}
        <span className="font-semibold text-foreground">{level === 'unknown' ? '待分析' : level}</span>
        {score !== undefined && <span className="text-sm text-muted-foreground">({score})</span>}
      </div>
    </div>
  );
}
