import React, { useState } from 'react';
import { 
  Server, 
  Plus, 
  Trash2, 
  Edit3, 
  Activity, 
  Globe, 
  Wifi, 
  CheckCircle, 
  AlertCircle, 
  RefreshCw,
  Copy,
  ExternalLink,
  Shield,
  Zap,
  Sliders,
  X
} from 'lucide-react';
import { VpnServer } from '../types/vpn';
import { api } from '../services/api';

interface ServerManagerProps {
  servers: VpnServer[];
  onServerCreated: (server: VpnServer) => void;
  onServerUpdated: (server: VpnServer) => void;
  onServerDeleted: (id: string) => void;
  onRefresh: () => void;
}

const COUNTRY_PRESETS = [
  { code: 'FR', name: 'France', flag: '🇫🇷' },
  { code: 'DE', name: 'Germany', flag: '🇩🇪' },
  { code: 'MA', name: 'Morocco', flag: '🇲🇦' },
  { code: 'NL', name: 'Netherlands', flag: '🇳🇱' },
  { code: 'ES', name: 'Spain', flag: '🇪🇸' },
  { code: 'US', name: 'United States', flag: '🇺🇸' },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧' },
  { code: 'TR', name: 'Turkey', flag: '🇹🇷' },
];

export const ServerManager: React.FC<ServerManagerProps> = ({
  servers = [],
  onServerCreated,
  onServerUpdated,
  onServerDeleted,
  onRefresh,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingServer, setEditingServer] = useState<VpnServer | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pingingId, setPingingId] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterProtocol, setFilterProtocol] = useState<string>('ALL');

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    ip: '',
    domain: '',
    ports: '80, 443, 8080',
    protocol: 'WebSocket TUN' as VpnServer['protocol'],
    countryCode: 'FR',
    countryName: 'France',
    flag: '🇫🇷',
    status: 'active' as VpnServer['status'],
    capacity: 500,
    pingMs: 40,
    speedMbps: 1000,
    wsPath: '/nexus-ws-tun',
    sshPort: 22,
    authUsername: 'nexus_user',
    authPassword: 'ws_tun_password_99x',
    publicKey: ''
  });

  const openAddModal = () => {
    setEditingServer(null);
    setFormData({
      name: 'France VIP Ultra 🇫🇷',
      ip: '51.15.89.201',
      domain: 'fr-vip01.nexusvpn.net',
      ports: '80, 443, 8080',
      protocol: 'WebSocket TUN',
      countryCode: 'FR',
      countryName: 'France',
      flag: '🇫🇷',
      status: 'active',
      capacity: 500,
      pingMs: 38,
      speedMbps: 1000,
      wsPath: '/nexus-ws-tun',
      sshPort: 22,
      authUsername: 'nexus_user',
      authPassword: 'ws_tun_password_99x',
      publicKey: ''
    });
    setIsModalOpen(true);
  };

  const openEditModal = (srv: VpnServer) => {
    setEditingServer(srv);
    setFormData({
      name: srv.name,
      ip: srv.ip,
      domain: srv.domain || '',
      ports: srv.ports.join(', '),
      protocol: srv.protocol,
      countryCode: srv.countryCode,
      countryName: srv.countryName,
      flag: srv.flag,
      status: srv.status,
      capacity: srv.capacity,
      pingMs: srv.pingMs,
      speedMbps: srv.speedMbps,
      wsPath: srv.wsPath || '/ws-tunnel',
      sshPort: srv.sshPort || 22,
      authUsername: srv.authUsername || '',
      authPassword: srv.authPassword || '',
      publicKey: srv.publicKey || ''
    });
    setIsModalOpen(true);
  };

  const handleCountryPresetChange = (code: string) => {
    const preset = COUNTRY_PRESETS.find(p => p.code === code);
    if (preset) {
      setFormData(prev => ({
        ...prev,
        countryCode: preset.code,
        countryName: preset.name,
        flag: preset.flag
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const parsedPorts = formData.ports
        .split(',')
        .map(p => parseInt(p.trim(), 10))
        .filter(p => !isNaN(p));

      const payload: Partial<VpnServer> = {
        name: formData.name,
        ip: formData.ip,
        domain: formData.domain,
        ports: parsedPorts.length ? parsedPorts : [80, 443],
        protocol: formData.protocol,
        countryCode: formData.countryCode,
        countryName: formData.countryName,
        flag: formData.flag,
        status: formData.status,
        capacity: Number(formData.capacity),
        pingMs: Number(formData.pingMs),
        speedMbps: Number(formData.speedMbps),
        wsPath: formData.wsPath,
        sshPort: Number(formData.sshPort),
        authUsername: formData.authUsername,
        authPassword: formData.authPassword,
        publicKey: formData.publicKey
      };

      if (editingServer) {
        const updated = await api.updateServer(editingServer.id, payload);
        onServerUpdated(updated);
      } else {
        const created = await api.createServer(payload);
        onServerCreated(created);
      }
      setIsModalOpen(false);
    } catch (err: any) {
      alert(err.message || 'Failed to save server');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete server "${name}"? Android clients will stop connecting to this node.`)) {
      return;
    }
    try {
      await api.deleteServer(id);
      onServerDeleted(id);
    } catch (err: any) {
      alert(err.message || 'Failed to delete server');
    }
  };

  const handlePingTest = async (id: string) => {
    setPingingId(id);
    try {
      const res = await api.pingServer(id);
      const updated = servers.find(s => s.id === id);
      if (updated) {
        onServerUpdated({ ...updated, pingMs: res.pingMs });
      }
    } catch (err: any) {
      alert('Ping test failed: ' + err.message);
    } finally {
      setPingingId(null);
    }
  };

  const copyConfigUrl = (srv: VpnServer) => {
    const configUrl = `${window.location.origin}/api/v1/app/config/${srv.id}`;
    navigator.clipboard.writeText(configUrl);
    setCopySuccess(srv.id);
    setTimeout(() => setCopySuccess(null), 2000);
  };

  const filteredServers = (servers || []).filter(srv => {
    if (!srv) return false;
    const matchSearch = (srv.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (srv.ip || '').includes(searchTerm) ||
      (srv.countryName || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchProto = filterProtocol === 'ALL' || srv.protocol === filterProtocol;
    return matchSearch && matchProto;
  });

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Server className="w-5 h-5 text-cyan-400" />
            VPN Node Fleet & Gateway Management
          </h2>
          <p className="text-xs text-slate-400">
            Configure WebSocket TUN, SSH, BadVPN UDP & V2Ray exit nodes for Android clients.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={onRefresh}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white transition-colors"
            title="Refresh Servers"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            onClick={openAddModal}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 via-indigo-600 to-violet-600 text-white text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-cyan-500/20 hover:scale-[1.02] transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Deploy New Server</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800">
        <input
          type="text"
          placeholder="Search by server name, IP or country..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-400 w-full sm:w-72"
        />

        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400 font-mono text-[11px]">Protocol:</span>
          {['ALL', 'WebSocket TUN', 'SSH + WS', 'HTTP Custom', 'V2Ray VMess', 'BadVPN UDP'].map((p) => (
            <button
              key={p}
              onClick={() => setFilterProtocol(p)}
              className={`px-2.5 py-1 rounded-lg font-mono text-[11px] transition-colors ${
                filterProtocol === p
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Server Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredServers.map((srv) => {
          const loadPercent = Math.min(100, Math.round((srv.currentConnections / srv.capacity) * 100));
          return (
            <div
              key={srv.id}
              className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800/90 hover:border-slate-700 transition-all flex flex-col justify-between space-y-4 relative group"
            >
              <div>
                {/* Card Top: Flag, Name, Status */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl filter drop-shadow">{srv.flag}</span>
                    <div>
                      <h3 className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors">
                        {srv.name}
                      </h3>
                      <p className="text-[11px] text-slate-400 font-mono">
                        {srv.ip} {srv.domain && `(${srv.domain})`}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                      srv.status === 'active'
                        ? 'bg-emerald-950/60 text-emerald-400 border-emerald-500/30'
                        : 'bg-amber-950/60 text-amber-400 border-amber-500/30'
                    }`}
                  >
                    {srv.status.toUpperCase()}
                  </span>
                </div>

                {/* Tags / Ports & Protocol */}
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <span className="px-2 py-0.5 rounded bg-violet-950/60 border border-violet-500/30 text-violet-300 text-[10px] font-mono font-semibold">
                    {srv.protocol}
                  </span>
                  {srv.ports.map((port) => (
                    <span
                      key={port}
                      className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] font-mono"
                    >
                      Port:{port}
                    </span>
                  ))}
                  {srv.wsPath && (
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-cyan-300 text-[10px] font-mono">
                      Path:{srv.wsPath}
                    </span>
                  )}
                </div>

                {/* Capacity & Live Latency */}
                <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-2">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-slate-400">
                      Load:{' '}
                      <strong className="text-white">
                        {srv.currentConnections} / {srv.capacity} clients
                      </strong>
                    </span>
                    <span className="text-slate-400">{srv.speedMbps} Mbps</span>
                  </div>

                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        loadPercent > 80 ? 'bg-amber-500' : 'bg-gradient-to-r from-cyan-500 to-indigo-500'
                      }`}
                      style={{ width: `${loadPercent}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs font-mono pt-1">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="text-slate-300">Ping:</span>
                      <span
                        className={`font-bold ${
                          srv.pingMs < 30 ? 'text-emerald-400' : 'text-cyan-400'
                        }`}
                      >
                        {srv.pingMs}ms
                      </span>
                    </div>

                    <button
                      onClick={() => handlePingTest(srv.id)}
                      disabled={pingingId === srv.id}
                      className="text-[11px] text-cyan-400 hover:text-cyan-300 font-medium flex items-center gap-1 hover:underline disabled:opacity-50"
                    >
                      <Activity className={`w-3 h-3 ${pingingId === srv.id ? 'animate-spin' : ''}`} />
                      <span>{pingingId === srv.id ? 'Pinging...' : 'Test Ping'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                <button
                  onClick={() => copyConfigUrl(srv)}
                  className="px-2.5 py-1 rounded-lg bg-slate-800/60 hover:bg-slate-700 text-slate-300 text-[11px] font-mono flex items-center gap-1.5 transition-colors"
                  title="Copy REST API config link"
                >
                  <Copy className="w-3 h-3 text-cyan-400" />
                  <span>{copySuccess === srv.id ? 'Copied!' : 'Config URL'}</span>
                </button>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => openEditModal(srv)}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-cyan-300 transition-colors"
                    title="Edit Node"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => handleDelete(srv.id, srv.name)}
                    className="p-1.5 rounded-lg bg-red-950/40 hover:bg-red-900/60 text-red-400 hover:text-red-300 transition-colors"
                    title="Delete Node"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add / Edit Server Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0f172a] border border-slate-700/80 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white font-mono flex items-center gap-2">
                <Server className="w-4 h-4 text-cyan-400" />
                {editingServer ? 'Edit VPN Server' : 'Deploy New VPN Server'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Quick Country Preset Picker */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Country Preset & Flag
                </label>
                <div className="flex flex-wrap gap-2">
                  {COUNTRY_PRESETS.map((p) => (
                    <button
                      key={p.code}
                      type="button"
                      onClick={() => handleCountryPresetChange(p.code)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono flex items-center gap-1.5 transition-all ${
                        formData.countryCode === p.code
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400 font-bold'
                          : 'bg-slate-800 text-slate-300 border border-slate-700 hover:border-slate-500'
                      }`}
                    >
                      <span>{p.flag}</span>
                      <span>{p.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Server Name & Protocol */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Server Display Name
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-cyan-400"
                    placeholder="e.g. France High-Speed VIP 🇫🇷"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    VPN Protocol
                  </label>
                  <select
                    value={formData.protocol}
                    onChange={(e) => setFormData({ ...formData, protocol: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-cyan-400"
                  >
                    <option value="WebSocket TUN">WebSocket TUN (High Speed *6)</option>
                    <option value="SSH + WS">SSH + WebSocket Proxy</option>
                    <option value="HTTP Custom">HTTP Custom Payload Injector</option>
                    <option value="V2Ray VMess">V2Ray VMess (TLS / gRPC)</option>
                    <option value="BadVPN UDP">BadVPN UDP Tunnel (Gaming)</option>
                  </select>
                </div>
              </div>

              {/* IP, Domain & Ports */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Server IPv4 / IPv6
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.ip}
                    onChange={(e) => setFormData({ ...formData, ip: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white font-mono focus:outline-none focus:border-cyan-400"
                    placeholder="51.15.89.201"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Domain / Hostname (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.domain}
                    onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white font-mono focus:outline-none focus:border-cyan-400"
                    placeholder="fr-vip01.nexusvpn.net"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Listening Ports (comma-separated)
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.ports}
                    onChange={(e) => setFormData({ ...formData, ports: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white font-mono focus:outline-none focus:border-cyan-400"
                    placeholder="80, 443, 8080"
                  />
                </div>
              </div>

              {/* WS Path, SSH Auth & Tunnel Credentials */}
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
                <h4 className="text-xs font-bold text-cyan-400 font-mono">
                  Tunnel & WebSocket Parameters
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">WS Path</label>
                    <input
                      type="text"
                      value={formData.wsPath}
                      onChange={(e) => setFormData({ ...formData, wsPath: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-200 font-mono"
                      placeholder="/nexus-ws-tun"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Auth Username</label>
                    <input
                      type="text"
                      value={formData.authUsername}
                      onChange={(e) => setFormData({ ...formData, authUsername: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-200 font-mono"
                      placeholder="nexus_user"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Auth Password / Key</label>
                    <input
                      type="text"
                      value={formData.authPassword}
                      onChange={(e) => setFormData({ ...formData, authPassword: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-200 font-mono"
                      placeholder="ws_pass_secret"
                    />
                  </div>
                </div>
              </div>

              {/* Capacity, Status & Speed */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Max Capacity (Clients)
                  </label>
                  <input
                    type="number"
                    value={formData.capacity}
                    onChange={(e) => setFormData({ ...formData, capacity: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Speed Rating (Mbps)
                  </label>
                  <input
                    type="number"
                    value={formData.speedMbps}
                    onChange={(e) => setFormData({ ...formData, speedMbps: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-cyan-400"
                  >
                    <option value="active">Active (Available to Clients)</option>
                    <option value="maintenance">Maintenance (Hidden / Blocked)</option>
                    <option value="full">Full (Capacity Reached)</option>
                  </select>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-600 text-white text-xs font-bold shadow-lg shadow-cyan-500/20 hover:opacity-90 disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : editingServer ? 'Update Server' : 'Deploy Server'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
