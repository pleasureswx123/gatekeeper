/**
 * 创建报销单页面
 */
'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Navigation } from '@/components/Navigation';
import { apiClient } from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/api/config';
import { useInvoices } from '@/hooks/useData';
import { ArrowLeft, CheckCircle2, Plus, Trash2 } from 'lucide-react';
import Link from 'next/link';

type FormItem = {
  category: string;
  description: string;
  amount: string;
  invoice_id: string;
};

const emptyItem: FormItem = { category: '', description: '', amount: '', invoice_id: '' };

export default function CreateReimbursementPage() {
  const router = useRouter();
  const { invoices = [] } = useInvoices(0, 100);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    description: '',
    items: [emptyItem],
  });

  const availableInvoices = useMemo(() => {
    return invoices.filter((invoice: any) => invoice.ocr_status === 'completed');
  }, [invoices]);

  const handleItemChange = (index: number, field: keyof FormItem, value: string) => {
    const newItems = [...formData.items];
    newItems[index] = {
      ...newItems[index],
      [field]: value,
    };
    setFormData((prev) => ({
      ...prev,
      items: newItems,
    }));
  };

  const addItem = () => {
    setFormData((prev) => ({
      ...prev,
      items: [...prev.items, { ...emptyItem }],
    }));
  };

  const removeItem = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const getTotalAmount = () => {
    return formData.items.reduce((sum, item) => sum + (Number.parseFloat(item.amount) || 0), 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const submitData = {
        description: formData.description,
        items: formData.items.map((item) => ({
          item_name: item.description || item.category,
          category: item.category,
          description: item.description,
          amount: Number.parseFloat(item.amount) || 0,
          invoice_id: item.invoice_id ? Number(item.invoice_id) : undefined,
        })),
      };

      const response = (await apiClient.post(API_ENDPOINTS.REIMBURSEMENTS_CREATE, submitData)) as any;
      setSuccess(true);

      setTimeout(() => {
        router.push(`/reimbursements/${response.id}`);
      }, 800);
    } catch (err: any) {
      setError(err.response?.data?.detail || '创建失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex h-screen bg-background">
        <Navigation />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <CheckCircle2 className="w-16 h-16 text-green-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-foreground mb-2">报销单创建成功</h2>
            <p className="text-muted-foreground">正在跳转到详情页面...</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      <Navigation />

      <main className="flex-1 overflow-auto">
        <div className="bg-card border-b border-border sticky top-0 z-10">
          <div className="px-8 py-4 flex items-center gap-4">
            <Link href="/reimbursements">
              <button className="text-muted-foreground hover:text-foreground" aria-label="返回">
                <ArrowLeft className="w-5 h-5" />
              </button>
            </Link>
            <div>
              <h2 className="text-2xl font-bold text-foreground">创建报销单</h2>
              <p className="text-sm text-muted-foreground mt-1">填写明细并关联已上传发票</p>
            </div>
          </div>
        </div>

        <div className="p-8 max-w-5xl space-y-6">
          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-card border border-border rounded-lg p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">基本信息</h3>
              <label className="block text-sm font-medium text-foreground mb-2">报销说明</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                rows={3}
                className="w-full px-4 py-2 bg-secondary/20 border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary resize-none"
                placeholder="请简要说明报销事由"
                required
              />
            </div>

            <div className="bg-card border border-border rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-foreground">报销明细</h3>
                <button
                  type="button"
                  onClick={addItem}
                  className="flex items-center gap-2 text-primary hover:text-primary/80 text-sm font-medium"
                >
                  <Plus className="w-4 h-4" />
                  添加项目
                </button>
              </div>

              <div className="space-y-4">
                {formData.items.map((item, index) => (
                  <div key={index} className="grid grid-cols-1 lg:grid-cols-[1fr_1.4fr_140px_1.4fr_40px] gap-4 items-end">
                    <FormInput
                      label={index === 0 ? '类别' : ''}
                      placeholder="差旅、办公用品等"
                      value={item.category}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleItemChange(index, 'category', e.target.value)}
                      required
                    />
                    <FormInput
                      label={index === 0 ? '描述' : ''}
                      placeholder="具体报销内容"
                      value={item.description}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleItemChange(index, 'description', e.target.value)}
                      required
                    />
                    <FormInput
                      label={index === 0 ? '金额' : ''}
                      type="number"
                      min="0.01"
                      step="0.01"
                      placeholder="0.00"
                      value={item.amount}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleItemChange(index, 'amount', e.target.value)}
                      required
                    />
                    <div>
                      {index === 0 && <label className="block text-sm font-medium text-foreground mb-2">关联发票</label>}
                      <select
                        value={item.invoice_id}
                        onChange={(e) => handleItemChange(index, 'invoice_id', e.target.value)}
                        className="w-full px-4 py-2 bg-secondary/20 border border-border rounded-lg text-foreground focus:outline-none focus:border-primary"
                      >
                        <option value="">不关联发票</option>
                        {availableInvoices.map((invoice: any) => (
                          <option key={invoice.id} value={invoice.id}>
                            #{invoice.id} {invoice.invoice_number || invoice.file_name || '未识别发票'} ¥{Number(invoice.total_amount || 0).toFixed(2)} · {getInvoiceStatusLabel(invoice.status)}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="h-10 flex items-center">
                      {formData.items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeItem(index)}
                          className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition"
                          aria-label="删除项目"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 p-4 bg-secondary/20 rounded-lg flex items-center justify-between border border-border">
                <p className="font-medium text-foreground">总金额</p>
                <p className="text-2xl font-bold text-primary">¥{getTotalAmount().toFixed(2)}</p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 bg-primary text-primary-foreground py-3 rounded-lg hover:bg-primary/90 transition font-medium disabled:opacity-50"
              >
                {isLoading ? '提交中...' : '提交报销单'}
              </button>
              <Link href="/reimbursements" className="flex-1">
                <button
                  type="button"
                  className="w-full bg-secondary/20 text-foreground py-3 rounded-lg hover:bg-secondary/30 transition font-medium border border-border"
                >
                  取消
                </button>
              </Link>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}

function getInvoiceStatusLabel(status: string) {
  switch (status) {
    case 'verified':
      return '已验证';
    case 'invalid':
      return '异常';
    case 'voided':
      return '已作废';
    case 'error':
      return '识别失败';
    default:
      return '待验';
  }
}

function FormInput({ label, ...props }: any) {
  return (
    <div>
      {label && (
        <label className="block text-sm font-medium text-foreground mb-2">
          {label}
          {props.required && <span className="text-red-400">*</span>}
        </label>
      )}
      <input
        {...props}
        className="w-full px-4 py-2 bg-secondary/20 border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
      />
    </div>
  );
}
