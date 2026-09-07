import React, { useState } from 'react';
import { 
  Users, 
  Server, 
  Key, 
  Activity, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Globe, 
  Zap, 
  ShieldCheck, 
  AlertTriangle,
  Smartphone,
  Radio,
  Clock,
  Trash2,
  Lock,
  RefreshCw,
  Cpu
} from 'lucide-react';
import { TelemetryStats, VpnServer, LiveConnection, NetworkProfile, LicenseKey, AppSettings, BandwidthMetric } from '../types/vpn';
import { useLanguage } from '../contexts/LanguageContext';

interface DashboardOverviewProps {
  stats?: TelemetryStats | null;
  servers?: VpnServer[];
  profiles?: NetworkProfile[];
  licenses?: LicenseKey[];
  settings?: AppSettings | null;
  liveConnections?: LiveConnection[];
  activeConnections?: LiveConnection[];
  bandwidthHistory?: BandwidthMetric[];
  onDisconnectDevice?: (id: string) => Promise<void>;
  onNavigateTab?: (tab: string) => void;
  onNavigate?: (tab: string) => void;
  onRefresh?: () => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  stats,
  servers = [],
  profiles = [],
  licenses = [],
  settings,
  liveConnections,
  activeConnections,
  bandwidthHistory,
  onDisconnectDevice,
  onNavigateTab,
  onNavigate,
  onRefresh
}) => {
  const [disconnectingId, setDisconnectingId] = useState<string | null>(null);
  const { t } = useLanguage();

  const safeServers = servers || [];
  const safeProfiles = profiles || [];
  const safeConnections = liveConnections || activeConnections || [];
  const safeBandwidth = stats?.bandwidthHistory || bandwidthHistory || [];
  const handleNav = onNavigateTab || onNavigate || (() => {});

  const formatBytes = (bytes: number) => {
    if (!bytes) return '0 B';
    if (bytes >= 1073741824) return (bytes / 1073741824).toFixed(2) + ' GB';
    if (bytes >= 1048576) return (bytes / 1048576).toFixed(1) + ' MB';
    if (bytes >= 1024) return (bytes / 1024).toFixed(0) + ' KB';
    return bytes + ' B';
  };

  const handleDisconnect = async (id: string) => {
    if (!onDisconnectDevice) return;
    setDisconnectingId(id);
    try {
      await onDisconnectDevice(id);
    } finally {
      setDisconnectingId(null);
    }
  };

  const activeServers = safeServers.filter(s => s && s.status === 'active');
  const activeTunnels = safeConnections.length;
  const totalConns = safeConnections.length;
  const inwiCount = safeConnections.filter(c => c.operator?.toLowerCase().includes('inwi')).length;
  const orangeCount = safeConnections.filter(c => c.operator?.toLowerCase().includes('orange')).length;
  const iamCount = safeConnections.filter(c => c.operator?.toLowerCase().includes('maroc') || c.operator?.toLowerCase().includes('iam')).length;
  const genericCount = safeConnections.filter(c => !c.operator?.toLowerCase().includes('inwi') && !c.operator?.toLowerCase().includes('orange') && !c.operator?.toLowerCase().includes('maroc') && !c.operator?.toLowerCase().includes('iam')).length;

  const inwiPct = totalConns > 0 ? Math.round((inwiCount / totalConns) * 100) : 0;
  const orangePct = totalConns > 0 ? Math.round((orangeCount / totalConns) * 100) : 0;
  const iamPct = totalConns > 0 ? Math.round((iamCount / totalConns) * 100) : 0;
  const genericPct = totalConns > 0 ? Math.round((genericCount / totalConns) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Top Welcome & Quick Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-900/90 via-[#0d1527] to-[#121029] p-5 rounded-2xl border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-full bg-gradient-to-l from-violet-600/10 via-cyan-500/5 to-transparent pointer-events-none" />
        
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl font-bold text-white font-sans tracking-tight">
              {t('dashboard', 'title')}
            </h1>
            <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              v1.5 LIVE
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Real-time Android tunnel orchestration, Inwi *6 payload injection, and hardware-bound license verification.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => handleNav('simulator')}
            className="px-3.5 py-2 rounded-xl bg-violet-600/30 hover:bg-violet-600/50 border border-violet-500/40 text-violet-200 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
          >
            <Smartphone className="w-3.5 h-3.5 text-violet-400" />
            <span>Test Android Client</span>
          </button>

          <button
            onClick={() => handleNav('licenses')}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-white text-xs font-semibold flex items-center gap-1.5 hover:shadow-lg hover:shadow-cyan-500/20 transition-all"
          >
            <Key className="w-3.5 h-3.5" />
            <span>{t('dashboard', 'generateCards')}</span>
          </button>
        </div>
      </div>

      {/* 4 Core Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Active Tunnels */}
        <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-cyan-500/40 transition-all relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 font-mono uppercase tracking-wider">
              {t('dashboard', 'liveConnections')}
            </span>
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 group-hover:scale-110 transition-transform">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-white font-mono">{stats?.activeUsers ?? safeConnections.length}</span>
            <span className="text-xs text-emerald-400 font-mono flex items-center">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping mr-1 inline-block" />
              Live Online
            </span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400 flex items-center justify-between">
            <span>WebSocket TUN / SSH</span>
            <span className="text-cyan-400 font-mono">100% Operational</span>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-cyan-500 to-transparent" />
        </div>

        {/* Server Fleet Status */}
        <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-emerald-500/40 transition-all relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 font-mono uppercase tracking-wider">
              {t('dashboard', 'activeServers')}
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
              <Server className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-white font-mono">
              {stats?.totalServersOnline ?? activeServers.length} <span className="text-xs font-normal text-slate-400">/ {stats?.totalServers ?? safeServers.length}</span>
            </span>
            <span className="text-xs text-emerald-400 font-mono">Nodes Active</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Avg Latency: <strong className="text-slate-200 font-mono">{stats?.avgLatencyMs ?? (activeServers.length > 0 ? Math.round(activeServers.reduce((a, b) => a + (b.pingMs || 0), 0) / activeServers.length) : 0)}ms</strong></span>
            <span className="text-emerald-400 font-mono">{activeServers.length} Online</span>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-500 to-transparent" />
        </div>

        {/* Active Licenses */}
        <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-violet-500/40 transition-all relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 font-mono uppercase tracking-wider">
              {t('dashboard', 'activeLicenses')}
            </span>
            <div className="w-9 h-9 rounded-xl bg-violet-500/10 border border-violet-500/30 flex items-center justify-center text-violet-400 group-hover:scale-110 transition-transform">
              <Key className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-white font-mono">
              {stats?.activeLicenses ?? licenses.filter(l => l.status === 'active').length} <span className="text-xs font-normal text-slate-400">/ {stats?.totalLicenses ?? licenses.length}</span>
            </span>
            <span className="text-xs text-violet-300 font-mono">HWID-Bound</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Anti-sharing engine</span>
            <span className="text-violet-400 font-mono">100% Enforced</span>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-violet-500 to-transparent" />
        </div>

        {/* 24h Bandwidth */}
        <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-indigo-500/40 transition-all relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 font-mono uppercase tracking-wider">
              {t('dashboard', 'networkTraffic')}
            </span>
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-white font-mono">{stats?.bandwidth24hGb ?? 0}</span>
            <span className="text-xs text-indigo-300 font-mono">GB Transferred</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400 flex items-center justify-between">
            <span className="flex items-center gap-1 text-emerald-400">
              <ArrowDownLeft className="w-3 h-3" /> Real-time
            </span>
            <span className="flex items-center gap-1 text-cyan-400">
              <ArrowUpRight className="w-3 h-3" /> Live Metric
            </span>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-indigo-500 to-transparent" />
        </div>
      </div>

      {/* Middle Section: Traffic Throughput Visualizer & Operator Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 24h Traffic Chart Visualizer */}
        <div className="lg:col-span-2 p-5 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                <Zap className="w-4 h-4 text-cyan-400" />
                Live Network Throughput & Concurrent Sessions
              </h2>
              <p className="text-xs text-slate-400">Bandwidth load across WebSocket, SSH and HTTP Custom tunnels</p>
            </div>
            <span className="text-xs font-mono text-cyan-400 bg-cyan-950/40 border border-cyan-500/30 px-2.5 py-1 rounded-lg">
              {safeBandwidth.length > 0 ? `${safeBandwidth[safeBandwidth.length - 1].trafficMb} MB/s` : 'Real-time Telemetry'}
            </span>
          </div>

          {/* Graphical Bars representation */}
          {safeBandwidth.length === 0 ? (
            <div className="h-44 flex flex-col items-center justify-center border-b border-slate-800 pb-2 text-center text-slate-500 font-mono text-xs">
              <Activity className="w-8 h-8 text-slate-700 mb-2" />
              <p>No active network traffic recorded yet.</p>
              <p className="text-[10px] text-slate-600 mt-1">Live data throughput will plot here automatically when Android tunnels connect.</p>
            </div>
          ) : (
            <div className="h-44 pt-6 flex items-end justify-between gap-1.5 border-b border-slate-800 pb-2">
              {safeBandwidth.map((item, idx) => {
                const heightPercent = Math.min(100, Math.max(15, (item.trafficMb / 650) * 100));
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 group relative">
                    {/* Tooltip */}
                    <div className="absolute -top-12 bg-slate-950 border border-slate-700 px-2 py-1 rounded text-[10px] text-slate-200 font-mono opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 whitespace-nowrap shadow-xl">
                      <p className="font-bold text-cyan-300">{item.trafficMb} MB/s</p>
                      <p className="text-slate-400">{item.connections} Tunnels @ {item.timestamp}</p>
                    </div>

                    <div className="w-full rounded-t-md bg-gradient-to-t from-indigo-600/30 via-violet-500/60 to-cyan-400 group-hover:to-cyan-300 transition-all relative overflow-hidden"
                      style={{ height: `${heightPercent}%` }}
                    >
                      <div className="absolute inset-x-0 top-0 h-1 bg-cyan-300 opacity-80" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 px-1">
            <span>24h ago</span>
            <span>18h ago</span>
            <span>12h ago</span>
            <span>6h ago</span>
            <span className="text-cyan-400 font-bold">Now</span>
          </div>
        </div>

        {/* Operator & Protocol Distribution */}
        <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-4">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
            <Radio className="w-4 h-4 text-violet-400" />
            Telecom Operator Breakdown
          </h2>

          <div className="space-y-3 pt-1">
            {/* Inwi */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-200 font-semibold flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                  Inwi Morocco (*6 Social Pass)
                </span>
                <span className="font-mono text-purple-400 font-bold">{inwiPct}% ({inwiCount} clients)</span>
              </div>
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-purple-600 to-purple-400 rounded-full transition-all" style={{ width: `${inwiPct}%` }} />
              </div>
            </div>

            {/* Orange */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-200 font-semibold flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                  Orange Morocco (*6 Social Pass)
                </span>
                <span className="font-mono text-orange-400 font-bold">{orangePct}% ({orangeCount} clients)</span>
              </div>
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-orange-600 to-orange-400 rounded-full transition-all" style={{ width: `${orangePct}%` }} />
              </div>
            </div>

            {/* IAM */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-200 font-semibold flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                  Maroc Telecom (IAM *6)
                </span>
                <span className="font-mono text-blue-400 font-bold">{iamPct}% ({iamCount} clients)</span>
              </div>
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-blue-600 to-cyan-400 rounded-full transition-all" style={{ width: `${iamPct}%` }} />
              </div>
            </div>

            {/* Generic */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-200 font-semibold flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  Direct / Wi-Fi / Other
                </span>
                <span className="font-mono text-emerald-400 font-bold">{genericPct}% ({genericCount} clients)</span>
              </div>
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${genericPct}%` }} />
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Payload Algorithm:</span>
            <span className="text-cyan-400 font-mono">Dynamic AES-256</span>
          </div>
        </div>
      </div>

      {/* Server Health Matrix Quick Glance */}
      <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
              <Server className="w-4 h-4 text-emerald-400" />
              Active Server Fleet Latency Matrix
            </h2>
            <p className="text-xs text-slate-400">Live operational status and capacity allocation</p>
          </div>

          <button
            onClick={() => handleNav('servers')}
            className="text-xs font-medium text-cyan-400 hover:text-cyan-300 font-mono flex items-center gap-1"
          >
            <span>Manage All Servers</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {safeServers.map((srv) => {
            const isFull = srv.currentConnections >= srv.capacity;
            const loadPercent = Math.min(100, Math.round((srv.currentConnections / srv.capacity) * 100));

            return (
              <div
                key={srv.id}
                className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700 transition-all flex flex-col justify-between space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="text-2xl">{srv.flag}</span>
                    <div>
                      <h4 className="text-xs font-bold text-white leading-tight">{srv.name}</h4>
                      <p className="text-[10px] text-slate-400 font-mono">{srv.ip} • {srv.protocol}</p>
                    </div>
                  </div>

                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                      srv.status === 'active'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    }`}
                  >
                    {srv.status.toUpperCase()}
                  </span>
                </div>

                <div>
                  <div className="flex justify-between text-[11px] font-mono text-slate-400 mb-1">
                    <span>Load: <strong className="text-slate-200">{srv.currentConnections}/{srv.capacity}</strong></span>
                    <span className={srv.pingMs < 30 ? 'text-emerald-400' : 'text-cyan-400'}>{srv.pingMs}ms</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        loadPercent > 80 ? 'bg-amber-500' : 'bg-gradient-to-r from-cyan-500 to-emerald-400'
                      }`}
                      style={{ width: `${loadPercent}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Live Active Connections Table */}
      <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-cyan-400" />
              Live Connected Android Devices ({safeConnections.length})
            </h2>
            <p className="text-xs text-slate-400">
              Hardware-bound sessions authenticated with valid vouchers and payload sessions
            </p>
          </div>

          {onRefresh && (
            <button
              onClick={onRefresh}
              className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white transition-colors"
              title="Refresh Connections"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          {safeConnections.length === 0 ? (
            <div className="py-8 text-center text-slate-500 font-mono text-xs">
              No live connections currently active. Android clients will appear here once connected.
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-mono uppercase text-[10px]">
                  <th className="pb-3 font-semibold">Device & HWID</th>
                  <th className="pb-3 font-semibold">License Key</th>
                  <th className="pb-3 font-semibold">Connected Server</th>
                  <th className="pb-3 font-semibold">Payload Profile</th>
                  <th className="pb-3 font-semibold">Bandwidth (Up / Down)</th>
                  <th className="pb-3 font-semibold">Latency</th>
                  <th className="pb-3 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {safeConnections.map((conn) => (
                  <tr key={conn.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3">
                      <div className="font-sans font-bold text-slate-200">{conn.deviceName}</div>
                      <div className="text-[10px] text-slate-400">{conn.hwid} • {conn.clientIp}</div>
                    </td>
                    <td className="py-3">
                      <span className="px-2 py-0.5 rounded bg-violet-950/60 border border-violet-500/30 text-violet-300 font-bold">
                        {conn.licenseKey}
                      </span>
                    </td>
                    <td className="py-3 text-slate-300">{conn.serverName}</td>
                    <td className="py-3">
                      <span className="px-2 py-0.5 rounded bg-purple-950/50 border border-purple-500/30 text-purple-300 text-[11px]">
                        {conn.profileName}
                      </span>
                    </td>
                    <td className="py-3 text-slate-300">
                      <div className="flex items-center gap-2">
                        <span className="text-cyan-400">↑ {formatBytes(conn.bytesUp)}</span>
                        <span className="text-emerald-400">↓ {formatBytes(conn.bytesDown)}</span>
                      </div>
                    </td>
                    <td className="py-3">
                      <span className="text-emerald-400 font-bold">{conn.pingMs}ms</span>
                    </td>
                    <td className="py-3 text-right">
                      <button
                        onClick={() => handleDisconnect(conn.id)}
                        disabled={disconnectingId === conn.id}
                        className="px-2.5 py-1 rounded-lg bg-red-950/40 hover:bg-red-900/60 border border-red-500/30 text-red-400 hover:text-red-300 text-[11px] font-sans font-semibold transition-all disabled:opacity-50"
                      >
                        {disconnectingId === conn.id ? 'Disconnecting...' : 'Kill Session'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
