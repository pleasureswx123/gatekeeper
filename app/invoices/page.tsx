/**
 * 发票列表页面
 */
'use client';

import { useState } from 'react';
import { Navigation } from '@/components/Navigation';
import { Receipt, Plus, Search, Filter, CheckCircle2, AlertCircle, Clock, Eye } from 'lucide-react';
import Link from 'next/link';

export default function InvoicesPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const invoices = [
    {
      id: 1,
      number: 'INV-2024-001',
      company: '北京科技有限公司',
      amount: 50000,
      date: '2024-05-18',
      status: 'verified',
      verificationStatus: 'passed',
      isDuplicate: false,
      isVoided: false
    },
    {
      id: 2,
      number: 'INV-2024-002',
      company: '上海电子商务',
      amount: 120000,
      date: '2024-05-17',
      status: 'processing',
      verificationStatus: 'pending',
      isDuplicate: false,
      isVoided: false
    },
    {
      id: 3,
      number: 'INV-2024-003',
      company: '深圳服务公司',
      amount: 75000,
      date: '2024-05-16',
      status: 'verified',
      verificationStatus: 'passed',
      isDuplicate: false,
      isVoided: false
    },
    {
      id: 4,
      number: 'INV-2024-004',
      company: '广州贸易',
      amount: 200000,
      date: '2024-05-15',
      status: 'rejected',
      verificationStatus: 'failed',
      isDuplicate: true,
      isVoided: false
    },
    {
      id: 5,
      number: 'INV-2024-005',
      company: '杭州技术',
      amount: 80000,
      date: '2024-05-14',
      status: 'verified',
      verificationStatus: 'passed',
      isDuplicate: false,
      isVoided: false
    }
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'verified':
        return <CheckCircle2 className="w-4 h-4 text-green-400" />;
      case 'processing':
        return <Clock className="w-4 h-4 text-yellow-400" />;
      case 'rejected':
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
      case 'rejected':
        return '已拒绝';
      default:
        return '待处理';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'verified':
        return 'text-green-400 bg-green-500/10';
      case 'processing':
        return 'text-yellow-400 bg-yellow-500/10';
      case 'rejected':
        return 'text-red-400 bg-red-500/10';
      default:
        return 'text-gray-400';
    }
  };

  const filteredInvoices = invoices.filter(invoice => {
    const matchSearch = invoice.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       invoice.company.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = filterStatus === 'all' || invoice.status === filterStatus;
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
                <h2 className="text-2xl font-bold text-foreground">发票管理</h2>
                <p className="text-sm text-muted-foreground mt-1">共 {invoices.length} 份发票，{filteredInvoices.length} 份符合条件</p>
              </div>
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
          {/* 统计卡片 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <StatCard label="总发票数" value={invoices.length} icon={Receipt} />
            <StatCard 
              label="已验证" 
              value={invoices.filter(i => i.status === 'verified').length}
              icon={CheckCircle2}
            />
            <StatCard 
              label="处理中" 
              value={invoices.filter(i => i.status === 'processing').length}
              icon={Clock}
            />
            <StatCard 
              label="重复发票" 
              value={invoices.filter(i => i.isDuplicate).length}
              icon={AlertCircle}
            />
          </div>

          {/* 搜索和筛选 */}
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
              <option value="rejected">已拒绝</option>
            </select>
          </div>

          {/* 发票列表 */}
          <div className="space-y-3">
            {filteredInvoices.length === 0 ? (
              <div className="text-center py-12">
                <Receipt className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">没有找到符合条件的发票</p>
              </div>
            ) : (
              filteredInvoices.map((invoice) => (
                <Link key={invoice.id} href={`/invoices/${invoice.id}`}>
                  <div className="bg-card border border-border rounded-lg p-6 hover:border-primary/50 hover:bg-secondary/10 transition cursor-pointer">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <Receipt className="w-5 h-5 text-primary" />
                          <h3 className="text-lg font-semibold text-foreground">{invoice.number}</h3>
                          {invoice.isDuplicate && (
                            <span className="text-xs px-2 py-1 bg-red-500/10 text-red-400 rounded font-semibold">
                              重复发票
                            </span>
                          )}
                          {invoice.isVoided && (
                            <span className="text-xs px-2 py-1 bg-yellow-500/10 text-yellow-400 rounded font-semibold">
                              已作废
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-3 md:grid-cols-5 gap-4">
                          <div>
                            <p className="text-xs text-muted-foreground">公司名称</p>
                            <p className="font-medium text-foreground text-sm">{invoice.company}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">发票金额</p>
                            <p className="font-medium text-foreground">¥{invoice.amount.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">发票日期</p>
                            <p className="font-medium text-foreground">{invoice.date}</p>
                          </div>
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
                              {invoice.verificationStatus === 'passed' ? (
                                <>
                                  <CheckCircle2 className="w-4 h-4 text-green-400" />
                                  <span className="font-medium text-sm text-green-400">真实</span>
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

                      <button className="p-2 hover:bg-secondary/50 rounded-lg transition">
                        <Eye className="w-5 h-5 text-muted-foreground" />
                      </button>
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
