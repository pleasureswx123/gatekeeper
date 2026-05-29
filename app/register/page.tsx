'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/api/config';

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    full_name: '',
    department: '',
    password: '',
    confirmPassword: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const updateField = (field: keyof typeof formData, value: string) => {
    setFormData((current) => ({ ...current, [field]: value }));
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }

    setIsLoading(true);
    try {
      await apiClient.post(API_ENDPOINTS.AUTH_REGISTER, {
        username: formData.username,
        email: formData.email,
        full_name: formData.full_name,
        department: formData.department,
        password: formData.password,
      });

      const data = await apiClient.post(API_ENDPOINTS.AUTH_LOGIN, {
        username: formData.username,
        password: formData.password,
      });

      apiClient.setToken(data.access_token);
      router.push('/');
    } catch (err: any) {
      setError(err.response?.data?.detail || '注册失败，请检查填写信息');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0e0c1f] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-md bg-[#c9b4fa] mb-4 shadow-sm">
            <span className="text-2xl font-semibold text-[#1b1938]">明</span>
          </div>
          <h1 className="text-3xl font-semibold text-[#f7f3ee] mb-2">创建账号</h1>
          <p className="text-[#c9c1bb]">加入明鉴财法风控系统</p>
        </div>

        <div className="bg-[#1b1938] border border-white/10 rounded-lg p-8 shadow-2xl shadow-black/20">
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#f7f3ee] mb-2">用户名</label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => updateField('username', e.target.value)}
                placeholder="至少 3 个字符"
                className="w-full px-4 py-2 bg-white/[0.07] border border-white/10 rounded-md text-[#f7f3ee] placeholder-[#8e8582] focus:outline-none focus:border-[#c9b4fa] focus:ring-1 focus:ring-[#c9b4fa] transition"
                minLength={3}
                maxLength={100}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#f7f3ee] mb-2">邮箱</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => updateField('email', e.target.value)}
                placeholder="name@example.com"
                className="w-full px-4 py-2 bg-white/[0.07] border border-white/10 rounded-md text-[#f7f3ee] placeholder-[#8e8582] focus:outline-none focus:border-[#c9b4fa] focus:ring-1 focus:ring-[#c9b4fa] transition"
                required
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-[#f7f3ee] mb-2">姓名</label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => updateField('full_name', e.target.value)}
                  placeholder="真实姓名"
                  className="w-full px-4 py-2 bg-white/[0.07] border border-white/10 rounded-md text-[#f7f3ee] placeholder-[#8e8582] focus:outline-none focus:border-[#c9b4fa] focus:ring-1 focus:ring-[#c9b4fa] transition"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#f7f3ee] mb-2">部门</label>
                <input
                  type="text"
                  value={formData.department}
                  onChange={(e) => updateField('department', e.target.value)}
                  placeholder="所属部门"
                  className="w-full px-4 py-2 bg-white/[0.07] border border-white/10 rounded-md text-[#f7f3ee] placeholder-[#8e8582] focus:outline-none focus:border-[#c9b4fa] focus:ring-1 focus:ring-[#c9b4fa] transition"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#f7f3ee] mb-2">密码</label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => updateField('password', e.target.value)}
                placeholder="至少 6 位"
                className="w-full px-4 py-2 bg-white/[0.07] border border-white/10 rounded-md text-[#f7f3ee] placeholder-[#8e8582] focus:outline-none focus:border-[#c9b4fa] focus:ring-1 focus:ring-[#c9b4fa] transition"
                minLength={6}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#f7f3ee] mb-2">确认密码</label>
              <input
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => updateField('confirmPassword', e.target.value)}
                placeholder="再次输入密码"
                className="w-full px-4 py-2 bg-white/[0.07] border border-white/10 rounded-md text-[#f7f3ee] placeholder-[#8e8582] focus:outline-none focus:border-[#c9b4fa] focus:ring-1 focus:ring-[#c9b4fa] transition"
                minLength={6}
                required
              />
            </div>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-400/30 rounded-md text-red-200 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2 px-4 bg-[#c9b4fa] hover:bg-[#d7c7ff] text-[#1b1938] font-medium rounded-md transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              {isLoading ? '注册中...' : '注册并进入系统'}
            </button>
          </form>

          <div className="mt-5 text-center text-sm text-[#c9c1bb]">
            已有账号？
            <Link href="/login" className="ml-1 text-[#c9b4fa] hover:text-[#d7c7ff] transition">
              返回登录
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
