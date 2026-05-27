/**
 * 设置页面
 */
'use client';

import { useState } from 'react';
import { Navigation } from '@/components/Navigation';
import { Settings, Bell, Lock, Palette, Database, Shield } from 'lucide-react';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'account' | 'notifications' | 'security' | 'system'>('account');
  const [settings, setSettings] = useState({
    accountName: '张三',
    accountEmail: 'zhangsan@company.com',
    department: '财务部',
    role: '财务经理',
    notificationsEmail: true,
    notificationsRisk: true,
    notificationsApproval: true,
    twoFactorAuth: false,
    sessionTimeout: 30,
    dataRetention: 90,
    theme: 'dark'
  });

  const handleSave = () => {
    alert('设置已保存');
  };

  return (
    <div className="flex h-screen bg-background">
      <Navigation />
      
      <main className="flex-1 overflow-auto">
        {/* 顶部栏 */}
        <div className="bg-card border-b border-border sticky top-0 z-10">
          <div className="px-8 py-6">
            <div className="flex items-center gap-3">
              <Settings className="w-6 h-6 text-primary" />
              <div>
                <h2 className="text-2xl font-bold text-foreground">设置</h2>
                <p className="text-sm text-muted-foreground mt-1">管理账户和系统设置</p>
              </div>
            </div>
          </div>
        </div>

        <div className="p-8">
          {/* 导航标签 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            {[
              { id: 'account', label: '账户信息', icon: Shield },
              { id: 'notifications', label: '通知设置', icon: Bell },
              { id: 'security', label: '安全设置', icon: Lock },
              { id: 'system', label: '系统设置', icon: Database }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`p-4 rounded-lg border transition ${
                  activeTab === tab.id
                    ? 'bg-primary/10 border-primary text-foreground'
                    : 'bg-card border-border text-muted-foreground hover:border-primary/50'
                }`}
              >
                <tab.icon className="w-6 h-6 mx-auto mb-2" />
                <p className="text-sm font-medium">{tab.label}</p>
              </button>
            ))}
          </div>

          {/* 内容区域 */}
          <div className="bg-card border border-border rounded-lg p-8 max-w-2xl">
            {activeTab === 'account' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-6">账户信息</h3>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">名称</label>
                  <input
                    type="text"
                    value={settings.accountName}
                    onChange={(e) => setSettings({ ...settings, accountName: e.target.value })}
                    className="w-full px-4 py-2 bg-secondary/30 border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">邮箱地址</label>
                  <input
                    type="email"
                    value={settings.accountEmail}
                    onChange={(e) => setSettings({ ...settings, accountEmail: e.target.value })}
                    className="w-full px-4 py-2 bg-secondary/30 border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">所属部门</label>
                  <input
                    type="text"
                    value={settings.department}
                    disabled
                    className="w-full px-4 py-2 bg-secondary/50 border border-border rounded-lg text-muted-foreground opacity-50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">职位</label>
                  <input
                    type="text"
                    value={settings.role}
                    disabled
                    className="w-full px-4 py-2 bg-secondary/50 border border-border rounded-lg text-muted-foreground opacity-50"
                  />
                </div>

                <button
                  onClick={handleSave}
                  className="w-full px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition font-medium"
                >
                  保存更改
                </button>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-6">通知设置</h3>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-secondary/10 rounded-lg">
                    <div>
                      <p className="font-medium text-foreground">邮件通知</p>
                      <p className="text-sm text-muted-foreground">接收重要通知的邮件</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.notificationsEmail}
                      onChange={(e) => setSettings({ ...settings, notificationsEmail: e.target.checked })}
                      className="w-5 h-5"
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 bg-secondary/10 rounded-lg">
                    <div>
                      <p className="font-medium text-foreground">风险警告</p>
                      <p className="text-sm text-muted-foreground">收到新的风险检测通知</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.notificationsRisk}
                      onChange={(e) => setSettings({ ...settings, notificationsRisk: e.target.checked })}
                      className="w-5 h-5"
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 bg-secondary/10 rounded-lg">
                    <div>
                      <p className="font-medium text-foreground">审批通知</p>
                      <p className="text-sm text-muted-foreground">报销单获得批准或拒绝时通知</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.notificationsApproval}
                      onChange={(e) => setSettings({ ...settings, notificationsApproval: e.target.checked })}
                      className="w-5 h-5"
                    />
                  </div>
                </div>

                <button
                  onClick={handleSave}
                  className="w-full px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition font-medium"
                >
                  保存设置
                </button>
              </div>
            )}

            {activeTab === 'security' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-6">安全设置</h3>
                </div>

                <div className="space-y-4">
                  <div className="p-4 bg-secondary/10 rounded-lg">
                    <p className="font-medium text-foreground mb-2">双因素认证</p>
                    <p className="text-sm text-muted-foreground mb-4">增强账户安全性</p>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={settings.twoFactorAuth}
                        onChange={(e) => setSettings({ ...settings, twoFactorAuth: e.target.checked })}
                        className="w-5 h-5"
                      />
                      <span className="text-sm">启用双因素认证</span>
                    </label>
                  </div>

                  <div className="p-4 bg-secondary/10 rounded-lg">
                    <label className="block text-sm font-medium text-foreground mb-2">
                      会话超时时间（分钟）
                    </label>
                    <input
                      type="number"
                      value={settings.sessionTimeout}
                      onChange={(e) => setSettings({ ...settings, sessionTimeout: parseInt(e.target.value) })}
                      className="w-full px-4 py-2 bg-secondary/30 border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <p className="text-xs text-muted-foreground mt-2">无活动超过此时间后自动登出</p>
                  </div>
                </div>

                <div>
                  <button className="w-full px-6 py-3 bg-destructive/20 text-destructive rounded-lg hover:bg-destructive/30 transition font-medium">
                    修改密码
                  </button>
                </div>

                <button
                  onClick={handleSave}
                  className="w-full px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition font-medium"
                >
                  保存设置
                </button>
              </div>
            )}

            {activeTab === 'system' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-6">系统设置</h3>
                </div>

                <div className="p-4 bg-secondary/10 rounded-lg">
                  <label className="block text-sm font-medium text-foreground mb-2">
                    主题设置
                  </label>
                  <select
                    value={settings.theme}
                    onChange={(e) => setSettings({ ...settings, theme: e.target.value })}
                    className="w-full px-4 py-2 bg-secondary/30 border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="light">浅色</option>
                    <option value="dark">深色</option>
                    <option value="auto">自动</option>
                  </select>
                </div>

                <div className="p-4 bg-secondary/10 rounded-lg">
                  <label className="block text-sm font-medium text-foreground mb-2">
                    数据保留期（天）
                  </label>
                  <input
                    type="number"
                    value={settings.dataRetention}
                    onChange={(e) => setSettings({ ...settings, dataRetention: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 bg-secondary/30 border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <p className="text-xs text-muted-foreground mt-2">超过此时间的日志数据将被自动删除</p>
                </div>

                <div className="p-4 bg-secondary/10 rounded-lg">
                  <h4 className="font-medium text-foreground mb-3">系统信息</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">版本</span>
                      <span className="text-foreground">v1.0.0</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">最后更新</span>
                      <span className="text-foreground">2024-05-19</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">数据库</span>
                      <span className="text-foreground">PostgreSQL 16</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleSave}
                  className="w-full px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition font-medium"
                >
                  保存设置
                </button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
