import React, { useState } from 'react';
import { 
  Network, 
  Plus, 
  Trash2, 
  Edit3, 
  Lock, 
  Unlock, 
  Key, 
  ShieldCheck, 
  Code, 
  Copy, 
  Eye, 
  EyeOff, 
  Zap,
  Sliders,
  CheckCircle2,
  X,
  Radio
} from 'lucide-react';
import { NetworkProfile } from '../types/vpn';
import { api } from '../services/api';

interface PayloadManagerProps {
  profiles: NetworkProfile[];
  onProfileCreated: (profile: NetworkProfile) => void;
  onProfileUpdated: (profile: NetworkProfile) => void;
  onProfileDeleted: (id: string) => void;
  onRefresh: () => void;
}

const TEMPLATE_PRESETS = [
  {
    name: 'WebSocket HTTP Upgrade (Inwi *6)',
    operator: 'Inwi' as const,
    bugHost: 'web.facebook.com',
    sni: 'm.facebook.com',
    template: 'GET / HTTP/1.1[crlf]Host: [host][crlf]X-Forward-For: [host][crlf]Upgrade: websocket[crlf]Connection: Upgrade[crlf]User-Agent: [ua][crlf][crlf]',
    ssl: true,
    proto: 'WebSocket TUN' as const,
  },
  {
    name: 'CONNECT Proxy Tunnel (Orange *6)',
    operator: 'Orange' as const,
    bugHost: 'v.whatsapp.net',
    sni: 'web.whatsapp.com',
    template: 'CONNECT [host_port] HTTP/1.1[crlf]Host: [host][crlf]X-Online-Host: [host][crlf]Connection: Keep-Alive[crlf]Proxy-Connection: Keep-Alive[crlf][crlf]',
    ssl: true,
    proto: 'HTTP Custom' as const,
  },
  {
    name: 'Instagram CDN Handshake (IAM *6)',
    operator: 'Maroc Telecom' as const,
    bugHost: 'graph.instagram.com',
    sni: 'static.cdn.instagram.com',
    template: 'GET / HTTP/1.1[crlf]Host: [host][crlf]Upgrade: websocket[crlf]Sec-WebSocket-Key: [random][crlf]Sec-WebSocket-Version: 13[crlf][crlf]',
    ssl: true,
    proto: 'WebSocket TUN' as const,
  },
  {
    name: 'Direct VIP Direct Raw',
    operator: 'All / Generic' as const,
    bugHost: 'speedtest.net',
    sni: 'speedtest.net',
    template: 'GET / HTTP/1.1[crlf]Host: [host][crlf]Connection: Upgrade[crlf][crlf]',
    ssl: false,
    proto: 'Any' as const,
  }
];

export const PayloadManager: React.FC<PayloadManagerProps> = ({
  profiles = [],
  onProfileCreated,
  onProfileUpdated,
  onProfileDeleted,
  onRefresh,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<NetworkProfile | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedProfileForPreview, setSelectedProfileForPreview] = useState<NetworkProfile | null>(null);
  const [encryptedPreview, setEncryptedPreview] = useState<string | null>(null);
  const [isEncrypting, setIsEncrypting] = useState(false);
  const [copySuccess, setCopySuccess] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    operator: 'Inwi' as NetworkProfile['operator'],
    bugHost: 'web.facebook.com',
    sni: 'm.facebook.com',
    payloadTemplate: 'GET / HTTP/1.1[crlf]Host: [host][crlf]Upgrade: websocket[crlf]Connection: Upgrade[crlf][crlf]',
    sslEnabled: true,
    heartbeatInterval: 20,
    keepAlive: true,
    status: 'active' as NetworkProfile['status'],
    targetProtocol: 'WebSocket TUN' as NetworkProfile['targetProtocol'],
    description: ''
  });

  const openAddModal = () => {
    setEditingProfile(null);
    setFormData({
      name: 'Inwi Social 100% *6 Bypass',
      operator: 'Inwi',
      bugHost: 'web.facebook.com',
      sni: 'm.facebook.com',
      payloadTemplate: 'GET / HTTP/1.1[crlf]Host: [host][crlf]X-Forward-For: [host][crlf]Upgrade: websocket[crlf]Connection: Upgrade[crlf]User-Agent: [ua][crlf][crlf]',
      sslEnabled: true,
      heartbeatInterval: 20,
      keepAlive: true,
      status: 'active',
      targetProtocol: 'WebSocket TUN',
      description: 'Ultra fast unthrottled Inwi *6 injection'
    });
    setIsModalOpen(true);
  };

  const openEditModal = (p: NetworkProfile) => {
    setEditingProfile(p);
    setFormData({
      name: p.name,
      operator: p.operator,
      bugHost: p.bugHost,
      sni: p.sni,
      payloadTemplate: p.payloadTemplate,
      sslEnabled: p.sslEnabled,
      heartbeatInterval: p.heartbeatInterval,
      keepAlive: p.keepAlive,
      status: p.status,
      targetProtocol: p.targetProtocol,
      description: p.description || ''
    });
    setIsModalOpen(true);
  };

  const applyPreset = (preset: typeof TEMPLATE_PRESETS[0]) => {
    setFormData(prev => ({
      ...prev,
      name: preset.name,
      operator: preset.operator,
      bugHost: preset.bugHost,
      sni: preset.sni,
      payloadTemplate: preset.template,
      sslEnabled: preset.ssl,
      targetProtocol: preset.proto
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editingProfile) {
        const updated = await api.updateProfile(editingProfile.id, formData);
        onProfileUpdated(updated);
      } else {
        const created = await api.createProfile(formData);
        onProfileCreated(created);
      }
      setIsModalOpen(false);
    } catch (err: any) {
      alert(err.message || 'Failed to save profile');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Delete network profile "${name}"?`)) return;
    try {
      await api.deleteProfile(id);
      onProfileDeleted(id);
    } catch (err: any) {
      alert(err.message || 'Failed to delete profile');
    }
  };

  const handleTestEncryption = async (profile: NetworkProfile) => {
    setSelectedProfileForPreview(profile);
    setIsEncrypting(true);
    try {
      const demoData = {
        profileId: profile.id,
        operator: profile.operator,
        sni: profile.sni,
        bugHost: profile.bugHost,
        payload: profile.payloadTemplate.replace(/\[host\]/g, 'fr-vip01.nexusvpn.net'),
        ssl: profile.sslEnabled,
        heartbeat: profile.heartbeatInterval,
        antiSniff: 'AES-256-CBC-HMAC'
      };
      const res = await api.testCrypto(JSON.stringify(demoData), 'encrypt');
      setEncryptedPreview(res.result);
    } catch (err: any) {
      alert('Encryption test error: ' + err.message);
    } finally {
      setIsEncrypting(false);
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopySuccess(key);
    setTimeout(() => setCopySuccess(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Network className="w-5 h-5 text-violet-400" />
            Paywall, SNI & Inwi *6 Payload Management
          </h2>
          <p className="text-xs text-slate-400">
            Define dynamic bug hosts, WebSocket headers, and anti-sniff AES-256 obfuscated profiles.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={openAddModal}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-violet-500/20 hover:scale-[1.02] transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Create Payload Preset</span>
          </button>
        </div>
      </div>

      {/* Security notice banner */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-violet-950/40 via-indigo-950/30 to-slate-900 border border-violet-500/30 flex items-start gap-3 text-xs text-slate-300">
        <ShieldCheck className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold text-white">Dynamic Anti-Reverse Engineering & Packet Obfuscation Active</p>
          <p className="text-slate-400 text-[11px] leading-relaxed">
            All Bug Hosts and SNIs are encrypted using AES-256-CBC with dynamic HMAC hashing before transmission to the Android APK. Reverse engineers and packet sniffers (Wireshark/HTTP Canary) cannot extract raw host bugs without the client app secret key.
          </p>
        </div>
      </div>

      {/* Profile Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {(profiles || []).map((p) => {
          if (!p) return null;
          const operatorColors: Record<string, string> = {
            Inwi: 'bg-purple-950/60 border-purple-500/40 text-purple-300',
            Orange: 'bg-orange-950/60 border-orange-500/40 text-orange-300',
            'Maroc Telecom': 'bg-blue-950/60 border-blue-500/40 text-cyan-300',
            'All / Generic': 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300',
          };
          const badgeClass = operatorColors[p.operator] || 'bg-slate-800 text-slate-300';

          return (
            <div
              key={p.id}
              className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-violet-500/40 transition-all flex flex-col justify-between space-y-4 relative group"
            >
              <div>
                {/* Header: Name, Operator Badge, Status */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${badgeClass}`}>
                      {p.operator}
                    </span>
                    <h3 className="text-sm font-bold text-white mt-1.5 group-hover:text-cyan-300 transition-colors">
                      {p.name}
                    </h3>
                  </div>

                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                      p.status === 'active'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {p.status.toUpperCase()}
                  </span>
                </div>

                {p.description && (
                  <p className="text-xs text-slate-400 mt-2">{p.description}</p>
                )}

                {/* Bug Host & SNI Badges */}
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-mono">
                  <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
                    <span className="text-[10px] text-slate-500 block">SNI (Server Name):</span>
                    <span className="text-cyan-300 font-bold truncate block">{p.sni}</span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
                    <span className="text-[10px] text-slate-500 block">Bug Host:</span>
                    <span className="text-violet-300 font-bold truncate block">{p.bugHost}</span>
                  </div>
                </div>

                {/* Payload Template Code Box */}
                <div className="mt-3">
                  <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono mb-1">
                    <span>HTTP Payload Template</span>
                    <span className="text-emerald-400 font-semibold">{p.sslEnabled ? 'SSL/TLS: ON' : 'SSL/TLS: OFF'}</span>
                  </div>
                  <pre className="p-2.5 rounded-lg bg-[#070b12] border border-slate-800/80 text-[11px] font-mono text-slate-300 overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-24">
                    {p.payloadTemplate}
                  </pre>
                </div>

                {/* Meta details: Heartbeat, Keep-Alive, Target Protocol */}
                <div className="mt-3 flex items-center gap-3 text-[11px] font-mono text-slate-400">
                  <span>Ping Interval: <strong className="text-slate-200">{p.heartbeatInterval}s</strong></span>
                  <span>•</span>
                  <span>KeepAlive: <strong className="text-slate-200">{p.keepAlive ? 'Yes' : 'No'}</strong></span>
                  <span>•</span>
                  <span>Protocol: <strong className="text-cyan-400">{p.targetProtocol}</strong></span>
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                <button
                  onClick={() => handleTestEncryption(p)}
                  className="px-3 py-1.5 rounded-lg bg-violet-950/50 hover:bg-violet-900/60 border border-violet-500/30 text-violet-300 text-xs font-mono flex items-center gap-1.5 transition-colors"
                >
                  <Lock className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Inspect AES Encrypted Output</span>
                </button>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => openEditModal(p)}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-cyan-300 transition-colors"
                    title="Edit Profile"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => handleDelete(p.id, p.name)}
                    className="p-1.5 rounded-lg bg-red-950/40 hover:bg-red-900/60 text-red-400 hover:text-red-300 transition-colors"
                    title="Delete Profile"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Live Encrypted Payload Inspector Drawer / Modal */}
      {selectedProfileForPreview && (
        <div className="p-5 rounded-2xl bg-[#090d16] border border-cyan-500/40 shadow-2xl space-y-4 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-bold text-white font-mono">
                Real-Time Obfuscation Preview: {selectedProfileForPreview.name}
              </h3>
            </div>
            <button
              onClick={() => {
                setSelectedProfileForPreview(null);
                setEncryptedPreview(null);
              }}
              className="p-1 rounded-lg text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Plaintext representation */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
                <Unlock className="w-3 h-3 text-amber-400" />
                Raw Server Payload (Plaintext):
              </span>
              <pre className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-slate-300 overflow-x-auto h-40">
                {JSON.stringify(
                  {
                    profileId: selectedProfileForPreview.id,
                    operator: selectedProfileForPreview.operator,
                    sni: selectedProfileForPreview.sni,
                    bugHost: selectedProfileForPreview.bugHost,
                    payload: selectedProfileForPreview.payloadTemplate,
                    ssl: selectedProfileForPreview.sslEnabled,
                    heartbeat: selectedProfileForPreview.heartbeatInterval,
                  },
                  null,
                  2
                )}
              </pre>
            </div>

            {/* Encrypted Base64 Payload */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono text-cyan-400 flex items-center gap-1">
                  <Lock className="w-3 h-3 text-cyan-400" />
                  What the Android Client Receives (AES-256-CBC Base64):
                </span>
                {encryptedPreview && (
                  <button
                    onClick={() => copyToClipboard(encryptedPreview, 'preview')}
                    className="text-[10px] text-cyan-400 hover:text-cyan-300 font-mono flex items-center gap-1"
                  >
                    <Copy className="w-3 h-3" />
                    {copySuccess === 'preview' ? 'Copied!' : 'Copy String'}
                  </button>
                )}
              </div>

              <div className="p-3 rounded-xl bg-[#060a12] border border-cyan-500/30 text-xs font-mono text-cyan-300/90 break-all overflow-y-auto h-40 leading-relaxed">
                {isEncrypting ? 'Encrypting via cryptographic engine...' : encryptedPreview}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Profile Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0f172a] border border-slate-700/80 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white font-mono flex items-center gap-2">
                <Network className="w-4 h-4 text-violet-400" />
                {editingProfile ? 'Edit Network Profile & SNI' : 'Create Network Profile & SNI'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Presets Picker */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Quick Bug Host Templates & Presets
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {TEMPLATE_PRESETS.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => applyPreset(p)}
                    className="p-2 rounded-lg bg-slate-950 border border-slate-800 hover:border-violet-500 text-left text-xs transition-colors group"
                  >
                    <div className="font-semibold text-slate-200 group-hover:text-cyan-300">{p.name}</div>
                    <div className="text-[10px] text-slate-500 font-mono truncate">SNI: {p.sni}</div>
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Profile Name
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-violet-400"
                    placeholder="e.g. Inwi Social Unlimited *6"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Telecom Operator
                  </label>
                  <select
                    value={formData.operator}
                    onChange={(e) => setFormData({ ...formData, operator: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-violet-400"
                  >
                    <option value="Inwi">Inwi (*6 Social / *3 YouTube)</option>
                    <option value="Orange">Orange Morocco (*6 Pass)</option>
                    <option value="Maroc Telecom">Maroc Telecom (IAM *6)</option>
                    <option value="All / Generic">All Operators / Direct Wi-Fi</option>
                    <option value="International">International Roaming</option>
                  </select>
                </div>
              </div>

              {/* Bug Host and SNI */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    SNI (Server Name Indication)
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.sni}
                    onChange={(e) => setFormData({ ...formData, sni: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-cyan-300 font-mono focus:outline-none focus:border-cyan-400"
                    placeholder="m.facebook.com"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Bug Host / CDN Injection Endpoint
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.bugHost}
                    onChange={(e) => setFormData({ ...formData, bugHost: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-violet-300 font-mono focus:outline-none focus:border-violet-400"
                    placeholder="web.facebook.com"
                  />
                </div>
              </div>

              {/* HTTP Payload Template Textarea */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-300">
                    HTTP Payload Template
                  </label>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Supported tags: <code className="text-cyan-400">[host]</code>, <code className="text-cyan-400">[crlf]</code>, <code className="text-cyan-400">[ua]</code>
                  </span>
                </div>
                <textarea
                  rows={4}
                  required
                  value={formData.payloadTemplate}
                  onChange={(e) => setFormData({ ...formData, payloadTemplate: e.target.value })}
                  className="w-full p-3 rounded-xl bg-[#070b12] border border-slate-700 text-xs text-white font-mono focus:outline-none focus:border-cyan-400 leading-relaxed"
                />
              </div>

              {/* SSL, KeepAlive, Heartbeat */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <label className="text-xs font-medium text-slate-300">SSL/TLS Enabled</label>
                  <input
                    type="checkbox"
                    checked={formData.sslEnabled}
                    onChange={(e) => setFormData({ ...formData, sslEnabled: e.target.checked })}
                    className="w-4 h-4 rounded text-cyan-500 focus:ring-0 bg-slate-900 border-slate-700"
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <label className="text-xs font-medium text-slate-300">Keep-Alive</label>
                  <input
                    type="checkbox"
                    checked={formData.keepAlive}
                    onChange={(e) => setFormData({ ...formData, keepAlive: e.target.checked })}
                    className="w-4 h-4 rounded text-cyan-500 focus:ring-0 bg-slate-900 border-slate-700"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Heartbeat (Seconds)
                  </label>
                  <input
                    type="number"
                    value={formData.heartbeatInterval}
                    onChange={(e) => setFormData({ ...formData, heartbeatInterval: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              {/* Target Protocol & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Target Protocol
                  </label>
                  <select
                    value={formData.targetProtocol}
                    onChange={(e) => setFormData({ ...formData, targetProtocol: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-cyan-400"
                  >
                    <option value="WebSocket TUN">WebSocket TUN</option>
                    <option value="HTTP Custom">HTTP Custom</option>
                    <option value="SSH + WS">SSH + WebSocket</option>
                    <option value="V2Ray VMess">V2Ray VMess</option>
                    <option value="Any">Any Protocol</option>
                  </select>
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
                    <option value="active">Active (Synced to clients)</option>
                    <option value="disabled">Disabled</option>
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
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-500 text-white text-xs font-bold shadow-lg shadow-violet-500/20 hover:opacity-90 disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : editingProfile ? 'Update Preset' : 'Create Preset'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
