/**
 * 活动日志页面
 */
'use client';

import { useState } from 'react';
import { Navigation } from '@/components/Navigation';
import { Activity, Filter, Search, CheckCircle2, AlertCircle, Clock } from 'lucide-react';

export default function ActivityPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');

  const activities = [
    {
      id: 1,
      type: 'contract_analyzed',
      title: '合同分析完成',
      description: '服务采购协议 (CTR-2024-001) 分析已完成',
      user: '系统',
      timestamp: '2024-05-19 14:30:00',
      severity: 'success',
      resource: { type: 'contract', id: 1, name: 'CTR-2024-001' }
    },
    {
      id: 2,
      type: 'invoice_verified',
      title: '发票验证完成',
      description: '发票 INV-2024-001 真伪验证已通过',
      user: '系统',
      timestamp: '2024-05-19 13:15:00',
      severity: 'success',
      resource: { type: 'invoice', id: 1, name: 'INV-2024-001' }
    },
    {
      id: 3,
      type: 'risk_detected',
      title: '高风险警告',
      description: '合同 CTR-2024-001 检测到3个高风险项',
      user: '系统',
      timestamp: '2024-05-19 12:45:00',
      severity: 'warning',
      resource: { type: 'contract', id: 1, name: 'CTR-2024-001' }
    },
    {
      id: 4,
      type: 'reimbursement_submitted',
      title: '报销单已提交',
      description: '报销单 REIMB-2024-001 已提交审批',
      user: '张三',
      timestamp: '2024-05-19 11:20:00',
      severity: 'info',
      resource: { type: 'reimbursement', id: 1, name: 'REIMB-2024-001' }
    },
    {
      id: 5,
      type: 'invoice_duplicate',
      title: '重复发票警告',
      description: '发票 INV-2024-004 检测到重复报销',
      user: '系统',
      timestamp: '2024-05-19 10:30:00',
      severity: 'error',
      resource: { type: 'invoice', id: 4, name: 'INV-2024-004' }
    },
    {
      id: 6,
      type: 'contract_uploaded',
      title: '合同已上传',
      description: '合同文件 服务采购协议.pdf 已上传',
      user: '李四',
      timestamp: '2024-05-19 09:15:00',
      severity: 'info',
      resource: { type: 'contract', id: 1, name: 'CTR-2024-001' }
    },
    {
      id: 7,
      type: 'reimbursement_approved',
      title: '报销单已批准',
      description: '报销单 REIMB-2024-001 已获得批准',
      user: '王五',
      timestamp: '2024-05-18 16:00:00',
      severity: 'success',
      resource: { type: 'reimbursement', id: 1, name: 'REIMB-2024-001' }
    },
    {
      id: 8,
      type: 'ocr_completed',
      title: 'OCR识别完成',
      description: '发票 INV-2024-001 已完成OCR识别',
      user: '系统',
      timestamp: '2024-05-18 15:30:00',
      severity: 'success',
      resource: { type: 'invoice', id: 1, name: 'INV-2024-001' }
    }
  ];

  const getActivityIcon = (type: string) => {
    if (type.includes('analyzed') || type.includes('verified') || type.includes('completed')) {
      return <CheckCircle2 className="w-5 h-5 text-green-400" />;
    }
    if (type.includes('risk') || type.includes('duplicate')) {
      return <AlertCircle className="w-5 h-5 text-red-400" />;
    }
    return <Clock className="w-5 h-5 text-yellow-400" />;
  };

  const getActivityColor = (severity: string) => {
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
  };

  const filteredActivities = activities.filter(activity => {
    const matchSearch = activity.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       activity.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchType = filterType === 'all' || activity.type === filterType;
    return matchSearch && matchType;
  });

  return (
    <div className="flex h-screen bg-background">
      <Navigation />
      
      <main className="flex-1 overflow-auto">
        {/* 顶部栏 */}
        <div className="bg-card border-b border-border sticky top-0 z-10">
          <div className="px-8 py-6">
            <h2 className="text-2xl font-bold text-foreground">活动日志</h2>
            <p className="text-sm text-muted-foreground mt-1">系统中所有操作和事件的完整记录</p>
          </div>
        </div>

        <div className="p-8 space-y-6 max-w-4xl">
          {/* 搜索和筛选 */}
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="w-5 h-5 absolute left-3 top-3 text-muted-foreground" />
              <input
                type="text"
                placeholder="搜索活动..."
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
              <option value="contract_analyzed">合同分析</option>
              <option value="invoice_verified">发票验证</option>
              <option value="risk_detected">风险检测</option>
              <option value="reimbursement_submitted">报销提交</option>
            </select>
          </div>

          {/* 统计信息 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-card border border-border rounded-lg p-4">
              <p className="text-sm text-muted-foreground">总事件数</p>
              <p className="text-2xl font-bold text-foreground mt-1">{activities.length}</p>
            </div>
            <div className="bg-card border border-border rounded-lg p-4">
              <p className="text-sm text-muted-foreground">成功</p>
              <p className="text-2xl font-bold text-green-400 mt-1">
                {activities.filter(a => a.severity === 'success').length}
              </p>
            </div>
            <div className="bg-card border border-border rounded-lg p-4">
              <p className="text-sm text-muted-foreground">警告</p>
              <p className="text-2xl font-bold text-yellow-400 mt-1">
                {activities.filter(a => a.severity === 'warning').length}
              </p>
            </div>
            <div className="bg-card border border-border rounded-lg p-4">
              <p className="text-sm text-muted-foreground">错误</p>
              <p className="text-2xl font-bold text-red-400 mt-1">
                {activities.filter(a => a.severity === 'error').length}
              </p>
            </div>
          </div>

          {/* 活动列表 */}
          <div className="space-y-3">
            {filteredActivities.length === 0 ? (
              <div className="text-center py-12">
                <Activity className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">没有找到符合条件的活动</p>
              </div>
            ) : (
              filteredActivities.map((activity) => (
                <div
                  key={activity.id}
                  className={`border rounded-lg p-4 ${getActivityColor(activity.severity)} hover:border-primary/50 transition`}
                >
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 mt-1">
                      {getActivityIcon(activity.type)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-semibold text-foreground">{activity.title}</h4>
                          <p className="text-sm text-muted-foreground mt-1">{activity.description}</p>
                          <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                            <span>由 {activity.user} 执行</span>
                            <span>•</span>
                            <span>{activity.timestamp}</span>
                          </div>
                        </div>
                        {activity.resource && (
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground">{activity.resource.type}</p>
                            <p className="text-sm font-medium text-primary">{activity.resource.name}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* 分页 */}
          <div className="flex items-center justify-center gap-2 pt-6">
            <button className="px-4 py-2 bg-card border border-border rounded-lg hover:bg-secondary/10 transition text-foreground">
              上一页
            </button>
            <div className="flex items-center gap-1">
              <button className="w-10 h-10 rounded-lg bg-primary text-primary-foreground">1</button>
              <button className="w-10 h-10 rounded-lg hover:bg-secondary/50 text-foreground">2</button>
              <button className="w-10 h-10 rounded-lg hover:bg-secondary/50 text-foreground">3</button>
            </div>
            <button className="px-4 py-2 bg-card border border-border rounded-lg hover:bg-secondary/10 transition text-foreground">
              下一页
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
