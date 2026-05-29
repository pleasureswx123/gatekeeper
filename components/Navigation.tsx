'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Activity, ChevronRight, CreditCard, FileText, Home, LogOut, Receipt, Settings } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { useCurrentUser } from '@/hooks/useData';
import type { User } from '@/types';
import Image from "next/image"

export function Navigation() {
  const router = useRouter();
  const pathname = usePathname();
  const { currentUser } = useCurrentUser();

  const handleLogout = () => {
    apiClient.clearToken();
    router.replace('/login');
  };

  const navItems = [
    { href: '/', label: '仪表板', icon: Home },
    { href: '/contracts', label: '合同管理', icon: FileText },
    { href: '/invoices', label: '发票管理', icon: Receipt },
    { href: '/reimbursements', label: '报销审批', icon: CreditCard },
  ];

  const subItems = [
    { href: '/contracts/upload', label: '上传合同' },
    { href: '/invoices/upload', label: '上传发票' },
    { href: '/reimbursements/create', label: '创建报销单' },
  ];

  const systemItems = [
    { href: '/activity', label: '活动日志', icon: Activity },
    { href: '/settings', label: '系统设置', icon: Settings },
  ];

  const isActive = (href: string) => (href === '/' ? pathname === href : pathname.startsWith(href));
  const itemClass = (active: boolean) =>
    [
      'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition',
      active
        ? 'bg-sidebar-accent text-sidebar-accent-foreground shadow-sm'
        : 'text-sidebar-foreground/80 hover:bg-white/10 hover:text-sidebar-foreground',
    ].join(' ');

  return (
    <div className="flex h-screen w-64 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
      <div className="flex h-14 shrink-0 items-center justify-center px-4 py-2 border-b border-sidebar-border">
        <div className="relative w-[80%]" style={{ aspectRatio: '120/26' }}>
          <Image
              src="/logo.svg"
              alt="莱博塔Logo"
              fill
              className="object-contain"
              priority
          />
        </div>
      </div>
      {/* 头部 */}
      <div className="p-5 border-b border-sidebar-border">
        <h1 className="text-lg font-semibold text-sidebar-foreground flex items-center gap-3">
          <div className="w-8 h-8 rounded-md bg-sidebar-primary flex items-center justify-center shadow-sm">
            <span className="text-sidebar-primary-foreground font-semibold text-sm">明</span>
          </div>
          明鉴
        </h1>
        <p className="text-xs text-sidebar-foreground/58 mt-2 pl-11">财法风控系统</p>
      </div>

      {/* 导航菜单 */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link key={item.href} href={item.href} className={itemClass(active)}>
              <Icon className="w-4 h-4" />
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}

        <div className="pt-4">
          <p className="text-xs font-medium text-sidebar-foreground/48 px-3 py-2">快捷操作</p>
        </div>

        {subItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={itemClass(pathname === item.href).replace('py-2.5', 'py-2')}
          >
            <ChevronRight className="w-3.5 h-3.5" />
            <span>{item.label}</span>
          </Link>
        ))}

        {false && (
          <>
            <div className="pt-4">
              <p className="text-xs font-medium text-sidebar-foreground/48 px-3 py-2">系统</p>
            </div>

            {systemItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link key={item.href} href={item.href} className={itemClass(isActive(item.href))}>
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </>
        )}
      </nav>

      {/* 底部用户菜单 */}
      <div className="p-3 border-t border-sidebar-border space-y-2">
        <div className="px-3 py-2 rounded-md bg-white/[0.06] border border-white/10">
          <p className="text-xs font-medium text-sidebar-foreground/80">当前用户</p>
          <p className="text-xs text-sidebar-foreground/56 mt-1 truncate">
            {currentUser ? `${currentUser.full_name || currentUser.username} (${getRoleLabel(currentUser.role)})` : '未加载'}
          </p>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-sidebar-foreground/80 hover:bg-white/10 hover:text-sidebar-foreground transition"
        >
          <LogOut className="w-4 h-4" />
          <span>退出登录</span>
        </button>
      </div>
    </div>
  );
}

function getRoleLabel(role: User['role']) {
  switch (role) {
    case 'admin':
      return '管理员';
    case 'reviewer':
      return '审批人';
    default:
      return '员工';
  }
}

