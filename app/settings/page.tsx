/**
 * 设置页面
 */
'use client';

import { useEffect, useState } from 'react';
import { Navigation } from '@/components/Navigation';
import { apiClient } from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/api/config';
import { useSystemInfo } from '@/hooks/useData';
import type { User } from '@/types';
import { Bell, Database, Lock, Settings, Shield } from 'lucide-react';

type TabId = 'account' | 'notifications' | 'security' | 'system';

const localPreferenceKey = 'gatekeeper-settings';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabId>('account');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');
  const { systemInfo } = useSystemInfo();
  const [settings, setSettings] = useState({
    accountName: '',
    accountEmail: '',
    department: '',
    notificationsEmail: true,
    notificationsRisk: true,
    notificationsApproval: true,
    twoFactorAuth: false,
    sessionTimeout: 30,
    dataRetention: 90,
    theme: 'dark',
  });

  useEffect(() => {
    const load = async () => {
      const storedPreferences = localStorage.getItem(localPreferenceKey);
      if (storedPreferences) {
        setSettings((prev) => ({ ...prev, ...JSON.parse(storedPreferences) }));
      }

      const user = (await apiClient.get(API_ENDPOINTS.AUTH_ME)) as User;
      setCurrentUser(user);
      setSettings((prev) => ({
        ...prev,
        accountName: user.full_name || user.username,
        accountEmail: user.email,
        department: user.department || '',
      }));
    };

    load();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    setMessage('');

    try {
      if (activeTab === 'account') {
        const updatedUser = (await apiClient.put(API_ENDPOINTS.AUTH_ME, {
          full_name: settings.accountName,
          email: settings.accountEmail,
          department: settings.department,
        })) as User;

        setCurrentUser(updatedUser);
      } else {
        localStorage.setItem(localPreferenceKey, JSON.stringify({
          notificationsEmail: settings.notificationsEmail,
          notificationsRisk: settings.notificationsRisk,
          notificationsApproval: settings.notificationsApproval,
          twoFactorAuth: settings.twoFactorAuth,
          sessionTimeout: settings.sessionTimeout,
          dataRetention: settings.dataRetention,
          theme: settings.theme,
        }));
      }

      setMessage(activeTab === 'account' ? '账户信息已保存' : '本地偏好已保存');
    } catch (err: any) {
      setMessage(err.response?.data?.detail || '保存失败，请稍后重试');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex h-screen bg-background">
      <Navigation />

      <main className="flex-1 overflow-auto">
        <div className="bg-card border-b border-border sticky top-0 z-10">
          <div className="px-8 py-6">
            <div className="flex items-center gap-3">
              <Settings className="w-6 h-6 text-primary" />
              <div>
                <h2 className="text-2xl font-bold text-foreground">设置</h2>
                <p className="text-sm text-muted-foreground mt-1">管理账户信息、本地偏好和系统信息</p>
              </div>
            </div>
          </div>
        </div>

        <div className="p-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            {[
              { id: 'account', label: '账户信息', icon: Shield },
              { id: 'notifications', label: '通知设置', icon: Bell },
              { id: 'security', label: '安全设置', icon: Lock },
              { id: 'system', label: '系统信息', icon: Database },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as TabId);
                  setMessage('');
                }}
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

          <div className="bg-card border border-border rounded-lg p-8 max-w-2xl">
            {message && (
              <div className="mb-6 p-3 bg-secondary/20 border border-border rounded-lg text-sm text-foreground">
                {message}
              </div>
            )}

            {activeTab === 'account' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-foreground">账户信息</h3>
                <FormInput label="名称" value={settings.accountName} onChange={(value) => setSettings({ ...settings, accountName: value })} />
                <FormInput label="邮箱地址" type="email" value={settings.accountEmail} onChange={(value) => setSettings({ ...settings, accountEmail: value })} />
                <FormInput label="所属部门" value={settings.department} onChange={(value) => setSettings({ ...settings, department: value })} />
                <ReadonlyItem label="角色" value={getRoleLabel(currentUser?.role)} />
                <SaveButton isSaving={isSaving} onClick={handleSave} label="保存账户信息" />
              </div>
            )}

            {activeTab === 'notifications' && (
              <div className="space-y-6">
                <HeaderWithHint title="通知设置" hint="当前为本地偏好，后续可接入企业通知服务。" />
                <ToggleRow label="邮件通知" description="接收重要通知的邮件" checked={settings.notificationsEmail} onChange={(value) => setSettings({ ...settings, notificationsEmail: value })} />
                <ToggleRow label="风险警告" description="收到新的风险检测通知" checked={settings.notificationsRisk} onChange={(value) => setSettings({ ...settings, notificationsRisk: value })} />
                <ToggleRow label="审批通知" description="报销单获得批准或拒绝时通知" checked={settings.notificationsApproval} onChange={(value) => setSettings({ ...settings, notificationsApproval: value })} />
                <SaveButton isSaving={isSaving} onClick={handleSave} label="保存本地偏好" />
              </div>
            )}

            {activeTab === 'security' && (
              <div className="space-y-6">
                <HeaderWithHint title="安全设置" hint="当前为前端偏好展示，正式安全策略后续接入后端。" />
                <ToggleRow label="双因素认证" description="增强账户安全性" checked={settings.twoFactorAuth} onChange={(value) => setSettings({ ...settings, twoFactorAuth: value })} />
                <FormInput label="会话超时时间（分钟）" type="number" value={String(settings.sessionTimeout)} onChange={(value) => setSettings({ ...settings, sessionTimeout: Number(value) || 30 })} />
                <button disabled className="w-full px-6 py-3 bg-destructive/10 text-muted-foreground rounded-lg cursor-not-allowed font-medium">
                  修改密码即将接入
                </button>
                <SaveButton isSaving={isSaving} onClick={handleSave} label="保存本地偏好" />
              </div>
            )}

            {activeTab === 'system' && (
              <div className="space-y-6">
                <HeaderWithHint title="系统信息" hint="以下信息来自后端运行配置，不包含密钥。" />
                <div className="p-4 bg-secondary/10 rounded-lg">
                  <label className="block text-sm font-medium text-foreground mb-2">主题设置</label>
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
                <FormInput label="数据保留期（天）" type="number" value={String(settings.dataRetention)} onChange={(value) => setSettings({ ...settings, dataRetention: Number(value) || 90 })} />
                <SystemInfo info={systemInfo} />
                <SaveButton isSaving={isSaving} onClick={handleSave} label="保存本地偏好" />
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function FormInput({ label, value, onChange, type = 'text' }: any) {
  return (
    <div>
      <label className="block text-sm font-medium text-foreground mb-2">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-2 bg-secondary/30 border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
      />
    </div>
  );
}

function ReadonlyItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="block text-sm font-medium text-foreground mb-2">{label}</p>
      <div className="w-full px-4 py-2 bg-secondary/50 border border-border rounded-lg text-muted-foreground">{value}</div>
    </div>
  );
}

function ToggleRow({ label, description, checked, onChange }: any) {
  return (
    <div className="flex items-center justify-between p-4 bg-secondary/10 rounded-lg">
      <div>
        <p className="font-medium text-foreground">{label}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="w-5 h-5" />
    </div>
  );
}

function HeaderWithHint({ title, hint }: { title: string; hint: string }) {
  return (
    <div>
      <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      <p className="text-sm text-muted-foreground mt-1">{hint}</p>
    </div>
  );
}

function SaveButton({ isSaving, onClick, label }: any) {
  return (
    <button
      onClick={onClick}
      disabled={isSaving}
      className="w-full px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition font-medium disabled:opacity-50"
    >
      {isSaving ? '保存中...' : label}
    </button>
  );
}

function SystemInfo({ info }: { info?: Record<string, any> }) {
  const rows = [
    ['系统名称', info?.name || '-'],
    ['版本', info?.version || '-'],
    ['运行状态', info?.status || '-'],
    ['数据库', info?.database || '-'],
    ['任务模式', info?.background_task_mode || '-'],
    ['发票验真模式', info?.invoice_verification_mode || '-'],
    ['方舟模型', info?.ark_chat_model || '-'],
    ['方舟地址', info?.ark_base_url || '-'],
  ];

  return (
    <div className="p-4 bg-secondary/10 rounded-lg">
      <h4 className="font-medium text-foreground mb-3">后端运行信息</h4>
      <div className="space-y-2 text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-4">
            <span className="text-muted-foreground">{label}</span>
            <span className="text-foreground text-right break-all">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function getRoleLabel(role?: User['role']) {
  if (role === 'admin') return '管理员';
  if (role === 'reviewer') return '审批人';
  return '员工';
}
