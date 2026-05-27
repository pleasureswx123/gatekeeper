/**
 * 创建报销单页面
 */
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Navigation } from '@/components/Navigation';
import { apiClient } from '@/lib/api/client';
import { ArrowLeft, Plus, Trash2, Upload, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

export default function CreateReimbursementPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    employee_name: '',
    department: '',
    description: '',
    items: [{ category: '', description: '', amount: '' }],
    invoice_ids: [] as string[]
  });

  const handleInputChange = (e: any) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const newItems = [...formData.items];
    newItems[index] = {
      ...newItems[index],
      [field]: value
    };
    setFormData(prev => ({
      ...prev,
      items: newItems
    }));
  };

  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { category: '', description: '', amount: '' }]
    }));
  };

  const removeItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const getTotalAmount = () => {
    return formData.items.reduce((sum, item) => {
      const amount = parseFloat(item.amount) || 0;
      return sum + amount;
    }, 0);
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const submitData = {
        ...formData,
        items: formData.items.map(item => ({
          ...item,
          amount: parseFloat(item.amount) || 0
        })),
        total_amount: getTotalAmount()
      };

      const response = await apiClient.post('/reimbursements', submitData);
      setSuccess(true);
      
      setTimeout(() => {
        router.push(`/reimbursements/${response.data.id}`);
      }, 1500);
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
            <h2 className="text-2xl font-bold text-foreground mb-2">报销单创建成功！</h2>
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
        {/* 顶部栏 */}
        <div className="bg-card border-b border-border sticky top-0 z-10">
          <div className="px-8 py-4 flex items-center gap-4">
            <Link href="/reimbursements">
              <button className="text-muted-foreground hover:text-foreground">
                <ArrowLeft className="w-5 h-5" />
              </button>
            </Link>
            <div>
              <h2 className="text-2xl font-bold text-foreground">创建报销单</h2>
              <p className="text-sm text-muted-foreground mt-1">填写表单并提交审批</p>
            </div>
          </div>
        </div>

        <div className="p-8 max-w-4xl space-y-6">
          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 基本信息 */}
            <div className="bg-card border border-border rounded-lg p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">基本信息</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormInput
                  label="申请人姓名"
                  name="employee_name"
                  value={formData.employee_name}
                  onChange={handleInputChange}
                  required
                />
                <FormInput
                  label="部门"
                  name="department"
                  value={formData.department}
                  onChange={handleInputChange}
                  required
                />
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-foreground mb-2">
                    报销说明
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full px-4 py-2 bg-secondary/20 border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary resize-none"
                    placeholder="请简要说明报销事由"
                  />
                </div>
              </div>
            </div>

            {/* 报销明细 */}
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
                  <div key={index} className="flex gap-4 items-end">
                    <FormInput
                      label={index === 0 ? "类别" : ""}
                      placeholder="如：差旅、办公用品等"
                      value={item.category}
                      onChange={(e) => handleItemChange(index, 'category', e.target.value)}
                      className="flex-1"
                      required
                    />
                    <FormInput
                      label={index === 0 ? "描述" : ""}
                      placeholder="具体描述"
                      value={item.description}
                      onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                      className="flex-1"
                      required
                    />
                    <FormInput
                      label={index === 0 ? "金额(¥)" : ""}
                      type="number"
                      placeholder="0.00"
                      value={item.amount}
                      onChange={(e) => handleItemChange(index, 'amount', e.target.value)}
                      className="w-32"
                      required
                    />
                    {formData.items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition mb-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* 合计 */}
              <div className="mt-6 p-4 bg-secondary/20 rounded-lg flex items-center justify-between border border-border">
                <p className="font-medium text-foreground">总金额</p>
                <p className="text-2xl font-bold text-primary">¥{getTotalAmount().toFixed(2)}</p>
              </div>
            </div>

            {/* 关联发票 */}
            <div className="bg-card border border-border rounded-lg p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">关联发票</h3>
              <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition cursor-pointer">
                <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground mb-1">上传关联的发票</p>
                <p className="text-xs text-muted-foreground">支持 PDF、图片格式</p>
                <input type="file" multiple className="hidden" />
              </div>
            </div>

            {/* 提交按钮 */}
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

function FormInput({ label, ...props }: any) {
  return (
    <div className={props.className}>
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
