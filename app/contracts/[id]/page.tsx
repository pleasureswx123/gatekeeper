/**
 * 合同详情页面 - 增强版
 * 包含PDF预览、风险高亮、导出功能
 */
'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { Navigation } from '@/components/Navigation';
import { FileText, AlertCircle, CheckCircle, AlertTriangle, Zap, Download, Eye, Share2, Copy } from 'lucide-react';

export default function ContractDetailPage() {
  const params = useParams();
  const contractId = parseInt(params.id as string);
  const [showPreview, setShowPreview] = useState(true);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'risks' | 'clauses' | 'analysis'>('overview');

  // 模拟合同数据
  const contract = {
    id: contractId,
    contract_name: '服务采购协议',
    contract_number: 'CTR-2024-001',
    supplier_name: '阿里云计算',
    amount: 500000,
    status: 'completed',
    risk_level: 'high',
    risk_score: 72.5,
    created_at: new Date('2024-05-18'),
    analysis_completed_at: new Date('2024-05-19'),
    risks: [
      {
        id: 1,
        risk_type: '付款条件风险',
        description: '合同中要求预付款比例过高',
        severity: 'high',
        highlighted_text: '预付款不少于合同总额的50%',
        remediation_suggestion: '建议调整预付款比例至30%以下'
      },
      {
        id: 2,
        risk_type: '违约责任风险',
        description: '违约金条款不够明确，倍数未具体说明',
        severity: 'medium',
        highlighted_text: '违约方应支付相应违约金',
        remediation_suggestion: '建议明确违约金为日均金额的1%'
      },
      {
        id: 3,
        risk_type: '知识产权风险',
        description: '未明确知识产权的所有权归属',
        severity: 'high',
        highlighted_text: '所产生的知识产权由双方共同享有',
        remediation_suggestion: '建议明确知识产权归我方所有'
      }
    ],
    clauses: [
      {
        id: 1,
        clause_type: '生效条款',
        clause_text: '本协议自双方签署之日起生效，有效期为1年'
      },
      {
        id: 2,
        clause_type: '付款条款',
        clause_text: '合同价格为人民币500万元，预付款不少于合同总额的50%'
      },
      {
        id: 3,
        clause_type: '违约责任',
        clause_text: '违约方应支付相应违约金'
      },
      {
        id: 4,
        clause_type: '知识产权',
        clause_text: '所产生的知识产权由双方共同享有'
      },
      {
        id: 5,
        clause_type: '保密条款',
        clause_text: '双方应对对方的商业秘密保密'
      }
    ]
  };

  const getRiskIcon = (level?: string) => {
    switch (level) {
      case 'critical':
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      case 'high':
        return <AlertTriangle className="w-5 h-5 text-orange-600" />;
      case 'medium':
        return <Zap className="w-5 h-5 text-yellow-600" />;
      default:
        return <CheckCircle className="w-5 h-5 text-green-600" />;
    }
  };

  const getRiskBadge = (level?: string) => {
    switch (level) {
      case 'critical':
        return 'bg-red-500/20 border-red-500/40 text-red-400';
      case 'high':
        return 'bg-orange-500/20 border-orange-500/40 text-orange-400';
      case 'medium':
        return 'bg-yellow-500/20 border-yellow-500/40 text-yellow-400';
      default:
        return 'bg-green-500/20 border-green-500/40 text-green-400';
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
              <div className="flex items-center gap-3">
                <FileText className="w-6 h-6 text-primary" />
                <div>
                  <h2 className="text-2xl font-bold text-foreground">{contract.contract_name}</h2>
                  <p className="text-sm text-muted-foreground">{contract.contract_number}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button className="p-2 hover:bg-secondary/50 rounded-lg transition" title="下载">
                  <Download className="w-5 h-5 text-muted-foreground" />
                </button>
                <button className="p-2 hover:bg-secondary/50 rounded-lg transition" title="分享">
                  <Share2 className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="p-8">
          {/* 基本信息卡片 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-card border border-border rounded-lg p-4">
              <p className="text-sm text-muted-foreground">供应商</p>
              <p className="text-lg font-semibold text-foreground mt-2">{contract.supplier_name}</p>
            </div>
            <div className="bg-card border border-border rounded-lg p-4">
              <p className="text-sm text-muted-foreground">合同金额</p>
              <p className="text-lg font-semibold text-foreground mt-2">¥{(contract.amount / 10000).toFixed(1)}万</p>
            </div>
            <div className="bg-card border border-border rounded-lg p-4">
              <p className="text-sm text-muted-foreground">风险等级</p>
              <div className="flex items-center gap-2 mt-2">
                <AlertTriangle className="w-5 h-5 text-orange-500" />
                <span className="font-semibold text-orange-400">高风险</span>
              </div>
            </div>
            <div className="bg-card border border-border rounded-lg p-4">
              <p className="text-sm text-muted-foreground">风险分数</p>
              <p className="text-lg font-semibold text-primary mt-2">{contract.risk_score}</p>
            </div>
          </div>

          {/* 标签页 */}
          <div className="bg-card border border-border rounded-lg mb-8">
            <div className="flex border-b border-border">
              {['overview', 'risks', 'clauses', 'analysis'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setSelectedTab(tab as any)}
                  className={`px-6 py-3 font-medium border-b-2 transition ${
                    selectedTab === tab
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {tab === 'overview' && '概览'}
                  {tab === 'risks' && '风险详情'}
                  {tab === 'clauses' && '条款提取'}
                  {tab === 'analysis' && '分析报告'}
                </button>
              ))}
            </div>

            <div className="p-6">
              {selectedTab === 'overview' && (
                <div className="space-y-6">
                  {/* 文档预览 */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-foreground">文档预览</h3>
                      <button
                        onClick={() => setShowPreview(!showPreview)}
                        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition"
                      >
                        {showPreview ? <Eye className="w-4 h-4" /> : <Eye className="w-4 h-4 opacity-50" />}
                      </button>
                    </div>
                    {showPreview && (
                      <div className="bg-gray-900 rounded-lg p-6 text-gray-300 text-sm font-mono space-y-1 h-64 overflow-y-auto">
                        <div className="text-yellow-400">=============== 文档内容预览 ===============</div>
                        <div>【服务采购协议】</div>
                        <div className="mt-2">第一条 生效条款</div>
                        <div>本协议自双方签署之日起生效，有效期为1年。</div>
                        <div className="mt-2">第二条 付款条款</div>
                        <div><span className="bg-yellow-400 text-gray-900 px-1">合同价格为人民币500万元，预付款不少于合同总额的50%</span></div>
                        <div className="mt-2">第三条 违约责任</div>
                        <div><span className="bg-orange-400 text-gray-900 px-1">违约方应支付相应违约金</span></div>
                        <div>=======================================</div>
                      </div>
                    )}
                  </div>

                  {/* 快速统计 */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-secondary/20 rounded-lg p-4">
                      <p className="text-sm text-muted-foreground">识别的风险</p>
                      <p className="text-2xl font-bold text-orange-400 mt-2">{contract.risks.length}</p>
                    </div>
                    <div className="bg-secondary/20 rounded-lg p-4">
                      <p className="text-sm text-muted-foreground">提取的条款</p>
                      <p className="text-2xl font-bold text-primary mt-2">{contract.clauses.length}</p>
                    </div>
                    <div className="bg-secondary/20 rounded-lg p-4">
                      <p className="text-sm text-muted-foreground">分析完成度</p>
                      <p className="text-2xl font-bold text-green-400 mt-2">100%</p>
                    </div>
                  </div>
                </div>
              )}

              {selectedTab === 'risks' && (
                <div className="space-y-4">
                  {contract.risks.map((risk) => (
                    <div key={risk.id} className={`border rounded-lg p-4 ${getRiskBadge(risk.severity)}`}>
                      <div className="flex items-start gap-3 mb-3">
                        {getRiskIcon(risk.severity)}
                        <div className="flex-1">
                          <h4 className="font-semibold">{risk.risk_type}</h4>
                          <p className="text-sm mt-1 opacity-90">{risk.description}</p>
                        </div>
                        <span className="text-xs font-semibold">
                          {risk.severity === 'high' ? '高' : risk.severity === 'medium' ? '中' : '低'}
                        </span>
                      </div>
                      {risk.highlighted_text && (
                        <div className="bg-gray-800 border-l-4 border-current p-3 my-3 text-xs font-mono opacity-90">
                          "{risk.highlighted_text}"
                        </div>
                      )}
                      {risk.remediation_suggestion && (
                        <div className="bg-blue-500/20 border-l-4 border-blue-400 p-3 text-sm">
                          <p className="font-semibold text-blue-300 mb-1">建议:</p>
                          <p className="text-blue-200">{risk.remediation_suggestion}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {selectedTab === 'clauses' && (
                <div className="space-y-3">
                  {contract.clauses.map((clause) => (
                    <div key={clause.id} className="border border-border rounded-lg p-4 hover:bg-secondary/10 transition">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-semibold text-foreground text-sm">{clause.clause_type}</p>
                          <p className="text-sm text-muted-foreground mt-2">{clause.clause_text}</p>
                        </div>
                        <button className="p-2 hover:bg-secondary/50 rounded transition">
                          <Copy className="w-4 h-4 text-muted-foreground" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {selectedTab === 'analysis' && (
                <div className="space-y-6">
                  <div className="bg-secondary/20 rounded-lg p-6">
                    <h4 className="font-semibold text-foreground mb-4">分析报告摘要</h4>
                    <div className="space-y-3 text-sm text-muted-foreground">
                      <p>本合同已通过AI智能分析，共识别出 {contract.risks.length} 个潜在风险。</p>
                      <p>其中高风险 {contract.risks.filter(r => r.severity === 'high').length} 个，中风险 {contract.risks.filter(r => r.severity === 'medium').length} 个。</p>
                      <p>建议在签署前与对方沟通解决这些风险问题，特别是付款条件和知识产权条款。</p>
                    </div>
                  </div>
                  <button className="w-full px-4 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition font-medium">
                    生成PDF报告
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="flex gap-3">
            <button className="flex-1 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition font-medium">
              确认无误
            </button>
            <button className="flex-1 px-6 py-3 bg-secondary/50 text-foreground rounded-lg hover:bg-secondary/70 transition font-medium">
              需要修改
            </button>
            <button className="px-6 py-3 bg-card border border-border rounded-lg hover:bg-secondary/10 transition font-medium">
              导出分析
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
