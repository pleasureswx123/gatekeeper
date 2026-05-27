/**
 * 发票详情页面
 */
'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { Navigation } from '@/components/Navigation';
import { Receipt, CheckCircle2, AlertCircle, AlertTriangle, Download, Share2, Eye, EyeOff } from 'lucide-react';

export default function InvoiceDetailPage() {
  const params = useParams();
  const invoiceId = parseInt(params.id as string);
  const [showPreview, setShowPreview] = useState(true);

  // 模拟发票数据
  const invoice = {
    id: invoiceId,
    number: 'INV-2024-001',
    company: '北京科技有限公司',
    amount: 50000,
    taxAmount: 5000,
    totalAmount: 55000,
    date: '2024-05-18',
    dueDate: '2024-06-18',
    tax: '13%',
    status: 'verified',
    uploadedAt: '2024-05-19 10:30:00',
    ocrStatus: 'completed',
    verificationStatus: 'passed',
    duplicateStatus: 'not_duplicate',
    voidStatus: 'active'
  };

  const ocrData = {
    invoiceNumber: 'INV-2024-001',
    invoiceDate: '2024-05-18',
    sellerName: '北京科技有限公司',
    sellerTaxId: '110101012345678',
    buyerName: '我公司',
    buyerTaxId: '110102087654321',
    amount: 50000,
    tax: 5000,
    total: 55000,
    paymentTerms: '30天内付款',
    description: '技术服务费',
    confidence: 0.98
  };

  const verificationResults = [
    {
      title: '真伪验证',
      status: 'passed',
      result: '真实发票',
      message: '通过国家税务总局联网验证系统验证',
      details: [
        { label: '验证码', value: '1234567890' },
        { label: '验证时间', value: '2024-05-19 11:30' },
        { label: '验证系统', value: '国家税务总局' }
      ]
    },
    {
      title: '作废状态',
      status: 'passed',
      result: '发票未作废',
      message: '该发票未在税务系统中标记为作废',
      details: [
        { label: '作废标记', value: '无' },
        { label: '检查时间', value: '2024-05-19 11:32' }
      ]
    },
    {
      title: '重复检测',
      status: 'passed',
      result: '无重复报销',
      message: '该发票未在系统中出现过多次报销记录',
      details: [
        { label: '报销次数', value: '1' },
        { label: '检测范围', value: '过去12个月' },
        { label: '检测时间', value: '2024-05-19 11:33' }
      ]
    },
    {
      title: '信息一致性',
      status: 'passed',
      result: '信息完整一致',
      message: 'OCR识别结果与上传信息一致',
      details: [
        { label: '发票号匹配', value: '✓ 匹配' },
        { label: '金额匹配', value: '✓ 匹配' },
        { label: '日期匹配', value: '✓ 匹配' }
      ]
    }
  ];

  const auditLog = [
    { time: '2024-05-19 11:35', action: '发票验证完成', user: '系统', status: 'success' },
    { time: '2024-05-19 11:33', action: '重复发票检测完成', user: '系统', status: 'success' },
    { time: '2024-05-19 11:32', action: '作废状态检查完成', user: '系统', status: 'success' },
    { time: '2024-05-19 11:30', action: 'OCR识别完成', user: '系统', status: 'success' },
    { time: '2024-05-19 10:30', action: '发票上传', user: '张三', status: 'success' }
  ];

  const getStatusIcon = (status: string) => {
    if (status === 'passed' || status === 'success') {
      return <CheckCircle2 className="w-5 h-5 text-green-400" />;
    }
    if (status === 'warning') {
      return <AlertTriangle className="w-5 h-5 text-yellow-400" />;
    }
    return <AlertCircle className="w-5 h-5 text-red-400" />;
  };

  const getStatusColor = (status: string) => {
    if (status === 'passed' || status === 'success') {
      return 'bg-green-500/10 border-green-500/20 text-green-400';
    }
    if (status === 'warning') {
      return 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400';
    }
    return 'bg-red-500/10 border-red-500/20 text-red-400';
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
                <Receipt className="w-6 h-6 text-primary" />
                <div>
                  <h2 className="text-2xl font-bold text-foreground">{invoice.number}</h2>
                  <p className="text-sm text-muted-foreground">{invoice.company}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button className="p-2 hover:bg-secondary/50 rounded-lg transition">
                  <Download className="w-5 h-5 text-muted-foreground" />
                </button>
                <button className="p-2 hover:bg-secondary/50 rounded-lg transition">
                  <Share2 className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="p-8 space-y-6 max-w-6xl">
          {/* 基本信息概览 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-card border border-border rounded-lg p-4">
              <p className="text-sm text-muted-foreground">发票金额</p>
              <p className="text-2xl font-bold text-foreground mt-1">¥{invoice.amount.toLocaleString()}</p>
            </div>
            <div className="bg-card border border-border rounded-lg p-4">
              <p className="text-sm text-muted-foreground">税额</p>
              <p className="text-2xl font-bold text-foreground mt-1">¥{invoice.taxAmount.toLocaleString()}</p>
            </div>
            <div className="bg-card border border-border rounded-lg p-4">
              <p className="text-sm text-muted-foreground">合计金额</p>
              <p className="text-2xl font-bold text-primary mt-1">¥{invoice.totalAmount.toLocaleString()}</p>
            </div>
            <div className="bg-card border border-border rounded-lg p-4">
              <p className="text-sm text-muted-foreground">验证状态</p>
              <div className="flex items-center gap-2 mt-2">
                <CheckCircle2 className="w-5 h-5 text-green-400" />
                <p className="font-medium text-green-400">已验证</p>
              </div>
            </div>
          </div>

          {/* 发票预览 */}
          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground">发票预览</h3>
              <button 
                onClick={() => setShowPreview(!showPreview)}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition"
              >
                {showPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                {showPreview ? '隐藏' : '显示'}
              </button>
            </div>
            {showPreview && (
              <div className="bg-gray-800 rounded-lg p-8 text-gray-300 text-sm font-mono space-y-2">
                <div>============ 发票预览 ============</div>
                <div>发票号码: {ocrData.invoiceNumber}</div>
                <div>开票日期: {ocrData.invoiceDate}</div>
                <div>销售方: {ocrData.sellerName}</div>
                <div>购买方: {ocrData.buyerName}</div>
                <div>商品/服务: {ocrData.description}</div>
                <div>金额: ¥{ocrData.amount.toLocaleString()}</div>
                <div>税额: ¥{ocrData.tax.toLocaleString()}</div>
                <div>合计: ¥{ocrData.total.toLocaleString()}</div>
                <div>================================</div>
              </div>
            )}
          </div>

          {/* OCR识别结果 */}
          <div className="bg-card border border-border rounded-lg p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-400" />
              OCR识别结果 (可信度: {(ocrData.confidence * 100).toFixed(0)}%)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-secondary/20 rounded p-4">
                <p className="text-xs text-muted-foreground">销售方</p>
                <p className="font-medium text-foreground mt-1">{ocrData.sellerName}</p>
                <p className="text-xs text-muted-foreground mt-2">税号: {ocrData.sellerTaxId}</p>
              </div>
              <div className="bg-secondary/20 rounded p-4">
                <p className="text-xs text-muted-foreground">购买方</p>
                <p className="font-medium text-foreground mt-1">{ocrData.buyerName}</p>
                <p className="text-xs text-muted-foreground mt-2">税号: {ocrData.buyerTaxId}</p>
              </div>
              <div className="bg-secondary/20 rounded p-4">
                <p className="text-xs text-muted-foreground">商品/服务</p>
                <p className="font-medium text-foreground mt-1">{ocrData.description}</p>
              </div>
              <div className="bg-secondary/20 rounded p-4">
                <p className="text-xs text-muted-foreground">支付条款</p>
                <p className="font-medium text-foreground mt-1">{ocrData.paymentTerms}</p>
              </div>
            </div>
          </div>

          {/* 验证结果 */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">验证结果</h3>
            {verificationResults.map((result, index) => (
              <div key={index} className={`border rounded-lg p-6 ${getStatusColor(result.status)}`}>
                <div className="flex items-start gap-3 mb-4">
                  {getStatusIcon(result.status)}
                  <div>
                    <h4 className="font-semibold">{result.title}</h4>
                    <p className="text-sm mt-1 opacity-90">{result.result}</p>
                    <p className="text-xs mt-1 opacity-75">{result.message}</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 ml-8">
                  {result.details.map((detail, idx) => (
                    <div key={idx} className="text-sm">
                      <p className="opacity-75">{detail.label}</p>
                      <p className="font-medium mt-1">{detail.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* 审计日志 */}
          <div className="bg-card border border-border rounded-lg p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">审计日志</h3>
            <div className="space-y-3">
              {auditLog.map((log, index) => (
                <div key={index} className="flex items-start gap-4 pb-3 border-b last:border-b-0">
                  <div className="flex-shrink-0 mt-1">
                    {log.status === 'success' ? (
                      <CheckCircle2 className="w-5 h-5 text-green-400" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-yellow-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-foreground">{log.action}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {log.time} • {log.user}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="flex gap-3">
            <button className="flex-1 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition font-medium">
              确认无误
            </button>
            <button className="flex-1 px-6 py-3 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition font-medium">
              标记异常
            </button>
            <button className="px-6 py-3 bg-card border border-border rounded-lg hover:bg-secondary/10 transition font-medium">
              导出报告
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
