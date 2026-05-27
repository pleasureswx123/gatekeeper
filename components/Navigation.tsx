import Link from 'next/link';
import { ChevronDown, FileText, Receipt, CreditCard, Home, LogOut, Activity, Settings } from 'lucide-react';

export function Navigation() {
  return (
    <div className="flex flex-col h-screen w-64 bg-sidebar border-r border-sidebar-border">
      {/* 头部 */}
      <div className="p-6 border-b border-sidebar-border">
        <h1 className="text-xl font-bold text-sidebar-primary flex items-center gap-2">
          <div className="w-8 h-8 rounded bg-sidebar-primary flex items-center justify-center">
            <span className="text-sidebar-primary-foreground font-bold text-sm">G</span>
          </div>
          守门人
        </h1>
        <p className="text-xs text-sidebar-foreground/60 mt-1">财法风控系统</p>
      </div>

      {/* 导航菜单 */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-1">
        <Link href="/" className="flex items-center gap-3 px-4 py-3 rounded-lg bg-sidebar-accent text-sidebar-accent-foreground hover:bg-sidebar-accent/80 transition">
          <Home className="w-5 h-5" />
          <span className="font-medium">仪表板</span>
        </Link>
        
        <div className="pt-4">
          <p className="text-xs font-semibold text-sidebar-foreground/50 px-4 py-2">核心模块</p>
        </div>

        <Link href="/contracts" className="flex items-center gap-3 px-4 py-3 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent/50 transition">
          <FileText className="w-5 h-5" />
          <span>合同管理</span>
        </Link>

        <Link href="/contracts/upload" className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sidebar-foreground/80 hover:bg-sidebar-accent/30 transition ml-4 text-sm">
          <span className="text-xs">→ 上传合同</span>
        </Link>

        <Link href="/invoices" className="flex items-center gap-3 px-4 py-3 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent/50 transition">
          <Receipt className="w-5 h-5" />
          <span>发票管理</span>
        </Link>

        <Link href="/invoices/upload" className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sidebar-foreground/80 hover:bg-sidebar-accent/30 transition ml-4 text-sm">
          <span className="text-xs">→ 上传发票</span>
        </Link>

        <Link href="/reimbursements" className="flex items-center gap-3 px-4 py-3 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent/50 transition">
          <CreditCard className="w-5 h-5" />
          <span>报销审批</span>
        </Link>

        <Link href="/reimbursements/create" className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sidebar-foreground/80 hover:bg-sidebar-accent/30 transition ml-4 text-sm">
          <span className="text-xs">→ 创建报销单</span>
        </Link>

        <div className="pt-4">
          <p className="text-xs font-semibold text-sidebar-foreground/50 px-4 py-2">系统</p>
        </div>

        <Link href="/activity" className="flex items-center gap-3 px-4 py-3 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent/50 transition">
          <Activity className="w-5 h-5" />
          <span>活动日志</span>
        </Link>

        <Link href="/settings" className="flex items-center gap-3 px-4 py-3 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent/50 transition">
          <Settings className="w-5 h-5" />
          <span>系统设置</span>
        </Link>
      </nav>

      {/* 底部用户菜单 */}
      <div className="p-4 border-t border-sidebar-border space-y-2">
        <div className="px-4 py-2">
          <p className="text-xs font-medium text-sidebar-foreground">当前用户</p>
          <p className="text-xs text-sidebar-foreground/60">张三 (财务经理)</p>
        </div>
        <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent/50 transition">
          <LogOut className="w-5 h-5" />
          <span className="text-sm">退出登录</span>
        </button>
      </div>
    </div>
  );
}
