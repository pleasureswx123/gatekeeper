/**
 * 仪表板主页
 */
'use client';

import { useState, useEffect } from 'react';
import { Navigation } from '@/components/Navigation';
import { FileText, Receipt, CreditCard, AlertCircle, CheckCircle2, Clock, TrendingUp } from 'lucide-react';
import Link from 'next/link';

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalContracts: 24,
    totalInvoices: 156,
    pendingReimbursements: 8,
    riskAlerts: 3
  });

  const [recentItems, setRecentItems] = useState([
    { id: 1, type: '合同', title: '服务采购协议', status: '审核中', risk: 'high', time: '2小时前' },
    { id: 2, type: '发票', title: '技术服务费', status: '已验证', risk: 'low', time: '4小时前' },
    { id: 3, type: '报销', title: '差旅费申请', status: '待审批', risk: 'medium', time: '今天' },
    { id: 4, type: '合同', title: '租赁合同', status: '已完成', risk: 'low', time: '昨天' }
  ]);

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'high':
        return 'text-red-400';
      case 'medium':
        return 'text-yellow-400';
      case 'low':
        return 'text-green-400';
      default:
        return 'text-muted-foreground';
    }
  };

  const getRiskLabel = (risk: string) => {
    switch (risk) {
      case 'high':
        return '高风险';
      case 'medium':
        return '中风险';
      case 'low':
        return '低风险';
      default:
        return '未知';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case '已完成':
      case '已验证':
        return <CheckCircle2 className="w-4 h-4 text-primary" />;
      case '审核中':
      case '待审批':
        return <Clock className="w-4 h-4 text-yellow-400" />;
      default:
        return <AlertCircle className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case '合同':
        return '📄';
      case '发票':
        return '🧾';
      case '报销':
        return '💳';
      default:
        return '📋';
    }
  };

  return (
    <div className="flex h-screen bg-background">
      <Navigation />
      
      <main className="flex-1 overflow-auto">
        {/* 顶部栏 */}
        <div className="bg-card border-b border-border sticky top-0 z-10">
          <div className="px-8 py-6">
            <h2 className="text-2xl font-bold text-foreground">仪表板</h2>
            <p className="text-sm text-muted-foreground mt-1">实时监控财务审计数据和流程</p>
          </div>
        </div>

        <div className="p-8 space-y-8">
          {/* 统计卡片 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="合同总数"
              value={stats.totalContracts}
              icon={<FileText className="w-5 h-5" />}
              trend="+12%"
            />
            <StatCard
              label="发票处理"
              value={stats.totalInvoices}
              icon={<Receipt className="w-5 h-5" />}
              trend="+8%"
            />
            <StatCard
              label="待审批报销"
              value={stats.pendingReimbursements}
              icon={<CreditCard className="w-5 h-5" />}
              trend="-2"
              isCritical
            />
            <StatCard
              label="风险警告"
              value={stats.riskAlerts}
              icon={<AlertCircle className="w-5 h-5" />}
              trend="需要关注"
              isCritical
            />
          </div>

          {/* 快速操作 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <QuickActionCard
              title="上传合同"
              description="上传新合同进行智能风险分析"
              href="/contracts/upload"
              icon="📄"
            />
            <QuickActionCard
              title="发票验证"
              description="OCR识别和真伪验证"
              href="/invoices/upload"
              icon="🧾"
            />
            <QuickActionCard
              title="报销审批"
              description="三单合一自动校验"
              href="/reimbursements"
              icon="💳"
            />
          </div>

          {/* 最近活动 */}
          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-foreground">最近活动</h3>
              <Link href="/activity" className="text-sm text-primary hover:underline">查看全部 →</Link>
            </div>
            <div className="space-y-3">
              {recentItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-4 bg-secondary/20 rounded-lg hover:bg-secondary/40 transition">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="text-xl">{getTypeIcon(item.type)}</div>
                    <div className="flex-1">
                      <p className="font-medium text-foreground">{item.title}</p>
                      <p className="text-xs text-muted-foreground">{item.type} · {item.time}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`text-xs font-semibold ${getRiskColor(item.risk)}`}>
                      {getRiskLabel(item.risk)}
                    </span>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(item.status)}
                      <span className="text-sm text-muted-foreground">{item.status}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 系统状态 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-card border border-border rounded-lg p-6">
              <h4 className="font-semibold text-foreground mb-4">系统状态</h4>
              <div className="space-y-3">
                <StatusItem label="数据库连接" status="正常" />
                <StatusItem label="任务队列" status="正常" />
                <StatusItem label="OCR 服务" status="正常" />
                <StatusItem label="LLM 分析" status="正常" />
              </div>
            </div>

            <div className="bg-card border border-border rounded-lg p-6">
              <h4 className="font-semibold text-foreground mb-4">今日统计</h4>
              <div className="space-y-3">
                <StatsItem label="已处理合同" value="5份" />
                <StatsItem label="已验证发票" value="23份" />
                <StatsItem label="已审批报销" value="2笔" />
                <StatsItem label="发现风险" value="1个" />
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
        <div className="text-4xl mb-3 group-hover:scale-110 transition">{icon}</div>
        <h4 className="font-semibold text-foreground mb-2">{title}</h4>
        <p className="text-sm text-muted-foreground">{description}</p>
        <div className="mt-4 flex items-center gap-2 text-primary text-sm font-medium group-hover:gap-3 transition">
          立即开始
          <span>→</span>
        </div>
      </div>
    </Link>
  );
}

function StatusItem({ label, status }: any) {
  return (
    <div className="flex items-center justify-between p-3 bg-secondary/20 rounded-lg">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-green-400"></div>
        <span className="text-sm font-medium text-green-400">{status}</span>
      </div>
    </div>
  );
}

function StatsItem({ label, value }: any) {
  return (
    <div className="flex items-center justify-between p-3 bg-secondary/20 rounded-lg">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-semibold text-primary">{value}</span>
    </div>
  );
}
