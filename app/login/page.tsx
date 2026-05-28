'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/api/config';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const data = await apiClient.post(API_ENDPOINTS.AUTH_LOGIN, {
        username,
        password,
      });

      apiClient.setToken(data.access_token);
      router.push(searchParams.get('redirect') || '/');
    } catch (err: any) {
      setError(err.response?.data?.detail || '登录失败，请检查账号和密码');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setIsLoading(true);
    try {
      const data = await apiClient.post(API_ENDPOINTS.AUTH_LOGIN, {
        username: 'demo',
        password: 'demo123',
      });

      apiClient.setToken(data.access_token);
      router.push(searchParams.get('redirect') || '/');
    } catch (err) {
      setError('演示账号登录失败，请稍后重试');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0e0c1f] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* 品牌区域 */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-md bg-[#c9b4fa] mb-4 shadow-sm">
            <span className="text-2xl font-semibold text-[#1b1938]">G</span>
          </div>
          <h1 className="text-3xl font-semibold text-[#f7f3ee] mb-2">守门人</h1>
          <p className="text-[#c9c1bb]">财法风控系统</p>
          <p className="text-[#8e8582] text-sm mt-2">智能合同审核 · 发票验证 · 报销审批</p>
        </div>

        {/* 登录卡片 */}
        <div className="bg-[#1b1938] border border-white/10 rounded-lg p-8 shadow-2xl shadow-black/20">
          <form onSubmit={handleLogin} className="space-y-5">
            {/* 邮箱输入 */}
            <div>
              <label className="block text-sm font-medium text-[#f7f3ee] mb-2">
                用户名
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="demo"
                className="w-full px-4 py-2 bg-white/[0.07] border border-white/10 rounded-md text-[#f7f3ee] placeholder-[#8e8582] focus:outline-none focus:border-[#c9b4fa] focus:ring-1 focus:ring-[#c9b4fa] transition"
                required
              />
            </div>

            {/* 密码输入 */}
            <div>
              <label className="block text-sm font-medium text-[#f7f3ee] mb-2">
                密码
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2 bg-white/[0.07] border border-white/10 rounded-md text-[#f7f3ee] placeholder-[#8e8582] focus:outline-none focus:border-[#c9b4fa] focus:ring-1 focus:ring-[#c9b4fa] transition"
                required
              />
            </div>

            {/* 错误提示 */}
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-400/30 rounded-md text-red-200 text-sm">
                {error}
              </div>
            )}

            {/* 登录按钮 */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2 px-4 bg-[#c9b4fa] hover:bg-[#d7c7ff] text-[#1b1938] font-medium rounded-md transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              {isLoading ? '登录中...' : '登录'}
            </button>
          </form>

          {/* 分隔线 */}
          <div className="my-5 flex items-center gap-3">
            <div className="flex-1 h-px bg-white/10"></div>
            <span className="text-xs text-[#8e8582]">或</span>
            <div className="flex-1 h-px bg-white/10"></div>
          </div>

          {/* 演示登录 */}
          <button
            onClick={handleDemoLogin}
            disabled={isLoading}
            className="w-full py-2 px-4 bg-white/[0.07] hover:bg-white/[0.11] border border-white/10 text-[#f7f3ee] font-medium rounded-md transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? '加载中...' : '使用演示账号登录'}
          </button>
        </div>

        {/* 信息提示 */}
        <div className="mt-6 p-4 bg-[#1b1938] border border-white/10 rounded-lg">
          <p className="text-xs text-[#c9c1bb]">
            <span className="font-semibold text-[#f7f3ee]">演示账号：</span><br/>
            用户名：demo<br/>
            密码：demo123
          </p>
        </div>

        {/* 底部链接 */}
        <div className="mt-6 text-center text-sm text-[#8e8582]">
          <p>
            © 2024 守门人财法风控系统<br/>
            <a href="#" className="text-[#c9b4fa] hover:text-[#d7c7ff] transition">隐私政策</a> · 
            <a href="#" className="text-[#c9b4fa] hover:text-[#d7c7ff] transition"> 服务条款</a>
          </p>
        </div>
      </div>
    </div>
  );
}
