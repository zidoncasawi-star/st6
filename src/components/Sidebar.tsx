import React from 'react';
import { 
  ShieldAlert, 
  Server, 
  Network, 
  KeyRound, 
  Settings, 
  Activity, 
  Smartphone, 
  Terminal, 
  Flame, 
  LogOut, 
  LockKeyhole,
  Radio,
  Users,
  CreditCard,
  Cpu,
  Languages
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout?: () => void;
  adminUser?: { name?: string; username?: string; role?: string } | null;
  killSwitchActive?: boolean;
  onEmergencyKillClick?: () => void;
  onEmergencyKill?: () => void;
  serverCount?: number;
  profileCount?: number;
  activeLicenseCount?: number;
  subscriberCount?: number;
  pendingRechargeCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  onLogout,
  adminUser,
  killSwitchActive = false,
  onEmergencyKillClick,
  onEmergencyKill,
  serverCount,
  profileCount,
  activeLicenseCount,
  subscriberCount,
  pendingRechargeCount
}) => {
  const handleKill = onEmergencyKillClick || onEmergencyKill || (() => {});
  const { t, language, setLanguage } = useLanguage();

  const toggleLanguage = () => {
    setLanguage(language === 'ar' ? 'fr' : 'ar');
  };

  const menuItems = [
    { id: 'overview', label: t('nav', 'overview'), icon: Activity, badge: 'Live' },
    { 
      id: 'recharges', 
      label: t('nav', 'recharges'), 
      icon: CreditCard, 
      badge: pendingRechargeCount && pendingRechargeCount > 0 ? `${pendingRechargeCount} NEW` : '20-100 DH',
      badgeColor: pendingRechargeCount && pendingRechargeCount > 0 ? 'bg-amber-500 text-black font-bold animate-pulse' : undefined,
      sub: 'Inwi / Orange / IAM'
    },
    { id: 'subscribers', label: t('nav', 'subscribers'), icon: Users, badge: '2.0 GB', count: subscriberCount !== undefined ? String(subscriberCount) : undefined, sub: 'Inwi / Orange / IAM' },
    { id: 'servers', label: t('nav', 'servers'), icon: Server, count: serverCount !== undefined ? String(serverCount) : '0' },
    { id: 'vps-monitor', label: t('nav', 'vpsMonitor'), icon: Cpu, badge: 'System' },
    { id: 'profiles', label: t('nav', 'profiles'), icon: Network, sub: 'Inwi *6 / Orange' },
    { id: 'licenses', label: t('nav', 'licenses'), icon: KeyRound, badge: 'HWID' },
    { id: 'settings', label: t('nav', 'settings'), icon: Settings },
    { id: 'simulator', label: 'Android Client Tester', icon: Smartphone, badge: 'REST API' },
    { id: 'deployment', label: 'VPS Deployment Guide', icon: Terminal, sub: 'Nginx / Docker' },
  ];

  return (
    <aside className="w-64 bg-[#0d121d]/95 backdrop-blur border-e border-slate-800/80 flex flex-col justify-between shrink-0 h-screen sticky top-0 z-30 select-none">
      {/* Brand Header */}
      <div>
        <div className="p-5 border-b border-slate-800/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-violet-600 via-indigo-600 to-cyan-400 p-0.5 shadow-lg shadow-indigo-500/20">
              <div className="w-full h-full bg-[#0b0f17] rounded-[10px] flex items-center justify-center">
                <LockKeyhole className="w-5 h-5 text-cyan-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-base tracking-tight text-white font-sans">NEXUS</span>
                <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">CORE</span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono tracking-tight">VPN & Tunnel Gateway</p>
            </div>
          </div>
        </div>

        {/* Emergency Kill Switch Alert if active */}
        {killSwitchActive && (
          <div className="mx-3 mt-3 p-2.5 rounded-lg bg-red-950/70 border border-red-500/50 flex items-center gap-2 text-xs text-red-300 animate-pulse">
            <Flame className="w-4 h-4 text-red-400 shrink-0" />
            <span className="font-medium">KILL-SWITCH ACTIVE</span>
          </div>
        )}

        {/* Navigation items */}
        <div className="p-3 space-y-1">
          <div className="px-3 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">
            {t('nav', 'controlModules')}
          </div>

          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                id={`nav-${item.id}`}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all group relative ${
                  isActive
                    ? 'bg-gradient-to-r from-violet-600/20 via-indigo-600/15 to-transparent text-cyan-300 border-s-2 border-cyan-400 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 transition-colors ${
                      isActive ? 'text-cyan-400' : 'text-slate-400 group-hover:text-slate-300'
                    }`}
                  />
                  <div className="text-start">
                    <span className="block leading-tight">{item.label}</span>
                    {item.sub && (
                      <span className="text-[10px] text-slate-500 font-mono block">{item.sub}</span>
                    )}
                  </div>
                </div>

                {item.badge && (
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                      item.badgeColor
                        ? item.badgeColor
                        : item.badge === 'Live'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-slate-800 text-slate-400 border border-slate-700/60'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Footer / User Profile & Emergency Actions */}
      <div className="p-3 border-t border-slate-800/60 space-y-2">
        {/* Language Toggle */}
        <button
          onClick={toggleLanguage}
          className="w-full py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 border transition-all bg-slate-900/60 text-slate-300 border-slate-800 hover:bg-slate-800 hover:text-white"
        >
          <Languages className="w-3.5 h-3.5" />
          {t('common', 'language')} ({language.toUpperCase()})
        </button>

        {/* Quick Kill Switch Trigger */}
        <button
          onClick={handleKill}
          className={`w-full py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 border transition-all ${
            killSwitchActive
              ? 'bg-red-500 text-white border-red-400 shadow-lg shadow-red-500/30 hover:bg-red-600'
              : 'bg-red-950/30 text-red-400 border-red-900/50 hover:bg-red-900/40 hover:text-red-300'
          }`}
        >
          <ShieldAlert className="w-3.5 h-3.5" />
          {killSwitchActive ? 'Deactivate Kill-Switch' : 'Emergency Kill-Switch'}
        </button>

        {/* User Card */}
        <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-violet-600/30 border border-violet-500/40 flex items-center justify-center text-xs font-bold text-violet-300">
              {adminUser?.username?.substring(0, 2).toUpperCase() || 'AD'}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-200 truncate">{adminUser?.name || 'Admin'}</p>
              <p className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping inline-block" />
                <span>SUPERADMIN</span>
              </p>
            </div>
          </div>

          <button
            onClick={onLogout}
            title="Logout"
            className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-950/30 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
