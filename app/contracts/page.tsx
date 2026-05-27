/**
 * 合同列表页面
 */
'use client';

import { useState } from 'react';
import { Navigation } from '@/components/Navigation';
import { FileText, Plus, Search, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import Link from 'next/link';
import { useContracts } from '@/hooks/useData';

export default function ContractsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const { contracts = [], isLoading, error } = useContracts(0, 50, filterStatus === 'all' ? undefined : filterStatus);

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'critical':
        return 'text-red-300 bg-red-500/20';
      case 'high':
        return 'text-red-400 bg-red-500/10';
      case 'medium':
        return 'text-yellow-400 bg-yellow-500/10';
      case 'low':
        return 'text-green-400 bg-green-500/10';
      default:
        return 'text-gray-400';
    }
  };

  const getRiskLabel = (risk: string) => {
    switch (risk) {
      case 'critical':
        return '严重风险';
      case 'high':
        return '高风险';
      case 'medium':
        return '中等风险';
      case 'low':
        return '低风险';
      default:
        return '未知';
    }
  };

  const getStatusIcon = (status: string) => {
    if (status === 'analyzing' || status === 'pending') {
      return <Clock className="w-4 h-4 text-yellow-400" />;
    }
    if (status === 'error') {
      return <AlertCircle className="w-4 h-4 text-red-400" />;
    }
    if (status === 'completed') {
      return <CheckCircle2 className="w-4 h-4 text-primary" />;
    }
    return <Clock className="w-4 h-4 text-muted-foreground" />;
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed':
        return '已完成';
      case 'analyzing':
        return '处理中';
      case 'error':
        return '分析失败';
      case 'pending':
        return '待处理';
      default:
        return status || '未知';
    }
  };

  const filteredContracts = contracts.filter(contract => {
    const term = searchTerm.toLowerCase();
    return (contract.contract_name || '').toLowerCase().includes(term) ||
      (contract.contract_number || '').toLowerCase().includes(term) ||
      (contract.supplier_name || '').toLowerCase().includes(term);
  });

  return (
    <div className="flex h-screen bg-background">
      <Navigation />
      
      <main className="flex-1 overflow-auto">
        {/* 顶部栏 */}
        <div className="bg-card border-b border-border sticky top-0 z-10">
          <div className="px-8 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-foreground">合同管理</h2>
                <p className="text-sm text-muted-foreground mt-1">共 {contracts.length} 份合同，{filteredContracts.length} 份符合条件</p>
              </div>
              <Link href="/contracts/upload">
                <button className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition">
                  <Plus className="w-4 h-4" />
                  上传合同
                </button>
              </Link>
            </div>
          </div>
        </div>

        <div className="p-8 space-y-6">
          {/* 搜索和筛选 */}
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="w-5 h-5 absolute left-3 top-3 text-muted-foreground" />
              <input
                type="text"
                placeholder="搜索合同名称、合同号或供应商..."
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
              <option value="pending">待处理</option>
              <option value="analyzing">处理中</option>
              <option value="completed">已完成</option>
              <option value="error">分析失败</option>
            </select>
          </div>

          {/* 合同列表 */}
          <div className="space-y-3">
            {isLoading ? (
              <div className="text-center py-12 text-muted-foreground">正在加载合同...</div>
            ) : error ? (
              <div className="text-center py-12 text-red-400">合同加载失败，请确认后端服务已启动</div>
            ) : filteredContracts.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">没有找到符合条件的合同</p>
              </div>
            ) : (
              filteredContracts.map((contract) => (
                <Link key={contract.id} href={`/contracts/${contract.id}`}>
                  <div className="bg-card border border-border rounded-lg p-6 hover:border-primary/50 hover:bg-secondary/10 transition cursor-pointer">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <FileText className="w-5 h-5 text-primary" />
                          <h3 className="text-lg font-semibold text-foreground">{contract.contract_name}</h3>
                          <span className="text-xs px-2 py-1 bg-secondary/50 text-muted-foreground rounded">
                            {contract.contract_number}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                          <div>
                            <p className="text-xs text-muted-foreground">供应商</p>
                            <p className="font-medium text-foreground">{contract.supplier_name || '-'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">合同金额</p>
                            <p className="font-medium text-foreground">¥{(((contract.amount || 0) as number) / 10000).toFixed(1)}万</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">创建日期</p>
                            <p className="font-medium text-foreground">{new Date(contract.created_at).toLocaleDateString()}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">分析状态</p>
                            <div className="flex items-center gap-2 mt-1">
                              {getStatusIcon(contract.status)}
                              <span className="font-medium text-sm">{getStatusLabel(contract.status)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className={`px-3 py-1 rounded-lg text-sm font-semibold ${getRiskColor(contract.risk_level || 'unknown')}`}>
                        {getRiskLabel(contract.risk_level || 'unknown')}
                      </div>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
