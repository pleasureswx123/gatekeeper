/**
 * 合同列表页面
 */
'use client';

import { useState } from 'react';
import { Navigation } from '@/components/Navigation';
import { FileText, Plus, Search, Filter, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import Link from 'next/link';

export default function ContractsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const contracts = [
    {
      id: 1,
      name: '服务采购协议',
      number: 'CTR-2024-001',
      supplier: '阿里云计算',
      amount: 500000,
      status: 'pending',
      risk: 'high',
      createdAt: '2024-05-18',
      analysisStatus: 'processing'
    },
    {
      id: 2,
      name: '硬件采购合同',
      number: 'CTR-2024-002',
      supplier: '联想集团',
      amount: 800000,
      status: 'completed',
      risk: 'medium',
      createdAt: '2024-05-15',
      analysisStatus: 'completed'
    },
    {
      id: 3,
      name: '软件许可协议',
      number: 'CTR-2024-003',
      supplier: 'Microsoft',
      amount: 300000,
      status: 'completed',
      risk: 'low',
      createdAt: '2024-05-10',
      analysisStatus: 'completed'
    },
    {
      id: 4,
      name: '租赁协议',
      number: 'CTR-2024-004',
      supplier: '中国平安',
      amount: 1200000,
      status: 'pending',
      risk: 'high',
      createdAt: '2024-05-08',
      analysisStatus: 'pending'
    }
  ];

  const getRiskColor = (risk: string) => {
    switch (risk) {
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

  const getStatusIcon = (status: string, analysisStatus: string) => {
    if (analysisStatus === 'processing') {
      return <Clock className="w-4 h-4 text-yellow-400" />;
    }
    if (status === 'completed') {
      return <CheckCircle2 className="w-4 h-4 text-primary" />;
    }
    return <Clock className="w-4 h-4 text-muted-foreground" />;
  };

  const filteredContracts = contracts.filter(contract => {
    const matchSearch = contract.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       contract.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       contract.supplier.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = filterStatus === 'all' || contract.status === filterStatus;
    return matchSearch && matchStatus;
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
              <option value="completed">已完成</option>
            </select>
          </div>

          {/* 合同列表 */}
          <div className="space-y-3">
            {filteredContracts.length === 0 ? (
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
                          <h3 className="text-lg font-semibold text-foreground">{contract.name}</h3>
                          <span className="text-xs px-2 py-1 bg-secondary/50 text-muted-foreground rounded">
                            {contract.number}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                          <div>
                            <p className="text-xs text-muted-foreground">供应商</p>
                            <p className="font-medium text-foreground">{contract.supplier}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">合同金额</p>
                            <p className="font-medium text-foreground">¥{(contract.amount / 10000).toFixed(1)}万</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">创建日期</p>
                            <p className="font-medium text-foreground">{contract.createdAt}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">分析状态</p>
                            <div className="flex items-center gap-2 mt-1">
                              {getStatusIcon(contract.status, contract.analysisStatus)}
                              <span className="font-medium text-sm">
                                {contract.analysisStatus === 'completed' ? '已完成' : 
                                 contract.analysisStatus === 'processing' ? '处理中' : '待处理'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className={`px-3 py-1 rounded-lg text-sm font-semibold ${getRiskColor(contract.risk)}`}>
                        {getRiskLabel(contract.risk)}
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
