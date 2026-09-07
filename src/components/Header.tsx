import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  RefreshCw, 
  Activity, 
  Wifi, 
  ShieldCheck, 
  Terminal, 
  Search, 
  Zap, 
  Globe2, 
  CheckCircle2,
  ShieldAlert,
  LogOut,
  Flame
} from 'lucide-react';
import { AppSettings } from '../types/vpn';

interface HeaderProps {
  settings?: AppSettings | null;
  adminUser?: { name?: string; username?: string; role?: string } | null;
  onEmergencyKillToggle?: () => void;
  onLogout?: () => void;
  onRefreshAll?: () => void;
  isRefreshing?: boolean;
  totalActiveUsers?: number;
  totalServersOnline?: number;
  onOpenQuickSync?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  settings,
  adminUser,
  onEmergencyKillToggle,
  onLogout,
  onRefreshAll,
  isRefreshing = false,
  totalActiveUsers = 0,
  totalServersOnline = 0,
  onOpenQuickSync
}) => {
  const [timeStr, setTimeStr] = useState<string>('');
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) +
        ' UTC'
      );
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  const notifications = [
    {
      id: '1',
      title: settings?.killSwitchActivated ? 'Kill Switch Active' : 'Gateway Status',
      desc: settings?.killSwitchActivated
        ? 'Global kill-switch is active. Client tunnels are disconnected.'
        : `Gateway is operational with ${totalServersOnline} server(s) and ${totalActiveUsers} live tunnel(s).`,
      time: 'Real-time',
      type: settings?.killSwitchActivated ? 'warning' : 'success'
    },
    {
      id: '2',
      title: 'Cryptographic Core',
      desc: 'AES-256 payload encryption & HWID security active.',
      time: 'Real-time',
      type: 'info'
    }
  ];

  return (
    <header className="h-16 bg-[#0d121d]/80 backdrop-blur border-b border-slate-800/80 px-6 flex items-center justify-between sticky top-0 z-20">
      {/* Left side: System status pills */}
      <div className="flex items-center gap-4">
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-mono ${
          settings?.killSwitchActivated
            ? 'bg-red-950/40 border-red-500/40 text-red-400'
            : 'bg-emerald-950/40 border-emerald-500/30 text-emerald-400'
        }`}>
          <span className={`w-2 h-2 rounded-full ${
            settings?.killSwitchActivated ? 'bg-red-400 animate-ping' : 'bg-emerald-400 animate-pulse'
          }`} />
          <span className="font-semibold">
            {settings?.killSwitchActivated ? 'KILL-SWITCH ENGAGED' : 'GATEWAY OPERATIONAL'}
          </span>
        </div>

        <div className="hidden lg:flex items-center gap-3 text-xs font-mono text-slate-400 border-l border-slate-800 pl-4">
          <div className="flex items-center gap-1.5">
            <Globe2 className="w-3.5 h-3.5 text-cyan-400" />
            <span>Servers:</span>
            <span className="text-white font-bold">{totalServersOnline} Online</span>
          </div>

          <span className="text-slate-700">•</span>

          <div className="flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-violet-400" />
            <span>Active Tunnels:</span>
            <span className="text-emerald-400 font-bold">{totalActiveUsers}</span>
          </div>
        </div>
      </div>

      {/* Right side: Quick Sync, Clock, Refresh & Notifications */}
      <div className="flex items-center gap-3">
        {/* Emergency Kill Button (if prop provided) */}
        {onEmergencyKillToggle && (
          <button
            onClick={onEmergencyKillToggle}
            className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
              settings?.killSwitchActivated
                ? 'bg-red-600 hover:bg-red-500 border-red-400 text-white shadow-lg shadow-red-600/30 animate-pulse'
                : 'bg-red-950/40 hover:bg-red-900/60 border-red-800/60 text-red-300'
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-red-400" />
            <span>{settings?.killSwitchActivated ? 'Resume System' : 'Kill-Switch'}</span>
          </button>
        )}

        {/* Sync Button */}
        {onOpenQuickSync && (
          <button
            onClick={onOpenQuickSync}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-violet-600/30 to-cyan-500/30 border border-cyan-500/40 text-cyan-300 hover:text-white text-xs font-semibold hover:border-cyan-400 transition-all shadow-sm"
          >
            <Zap className="w-3.5 h-3.5 text-cyan-400" />
            <span>Sync Config</span>
          </button>
        )}

        {/* Live Clock */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/60 border border-slate-800 text-xs font-mono text-slate-300">
          <Wifi className="w-3.5 h-3.5 text-cyan-400" />
          <span>{timeStr || '00:00:00 UTC'}</span>
        </div>

        {/* Refresh Button */}
        {onRefreshAll && (
          <button
            onClick={onRefreshAll}
            disabled={isRefreshing}
            title="Refresh Telemetry Data"
            className="p-2 rounded-xl bg-slate-900/60 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-cyan-300 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-cyan-400' : ''}`} />
          </button>
        )}

        {/* Notifications Popover */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 rounded-xl bg-slate-900/60 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-colors relative"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-cyan-400 ring-2 ring-[#0d121d]" />
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 rounded-2xl bg-[#0f172a] border border-slate-700/80 shadow-2xl p-4 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                  Gateway Audit Events
                </span>
                <span className="text-[10px] bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded-full font-mono">
                  3 New
                </span>
              </div>

              <div className="mt-3 space-y-2.5 max-h-72 overflow-y-auto pr-1">
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    className="p-2.5 rounded-xl bg-slate-800/50 border border-slate-700/40 text-xs hover:border-slate-600 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-slate-200">{n.title}</span>
                      <span className="text-[10px] text-slate-500 font-mono">{n.time}</span>
                    </div>
                    <p className="text-slate-400 text-[11px] leading-relaxed">{n.desc}</p>
                  </div>
                ))}
              </div>

              <div className="mt-3 pt-2 border-t border-slate-800 text-center">
                <button
                  onClick={() => setShowNotifications(false)}
                  className="text-xs text-cyan-400 hover:text-cyan-300 font-medium"
                >
                  Dismiss all
                </button>
              </div>
            </div>
          )}
        </div>

        {/* User Logout Button */}
        {onLogout && (
          <button
            onClick={onLogout}
            title="Sign Out"
            className="p-2 rounded-xl bg-slate-900/60 hover:bg-red-950/40 border border-slate-800 hover:border-red-500/30 text-slate-400 hover:text-red-400 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        )}
      </div>
    </header>
  );
};
