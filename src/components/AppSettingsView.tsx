import React, { useState } from 'react';
import { 
  Settings, 
  ShieldAlert, 
  Flame, 
  Radio, 
  Key, 
  Smartphone, 
  Save, 
  CheckCircle2, 
  AlertTriangle,
  RefreshCw,
  Bell,
  Lock,
  ExternalLink
} from 'lucide-react';
import { AppSettings } from '../types/vpn';
import { api } from '../services/api';

interface AppSettingsViewProps {
  settings: AppSettings | null;
  onSettingsUpdated: (settings: AppSettings) => void;
  onEmergencyKillToggle: () => void;
}

export const AppSettingsView: React.FC<AppSettingsViewProps> = ({
  settings,
  onSettingsUpdated,
  onEmergencyKillToggle,
}) => {
  if (!settings) {
    return (
      <div className="p-8 text-center text-slate-400 font-mono">
        Loading App Settings...
      </div>
    );
  }

  const [formData, setFormData] = useState<AppSettings>({ ...settings });
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveMessage(null);
    try {
      const updated = await api.updateSettings(formData);
      onSettingsUpdated(updated);
      setSaveMessage('App configuration saved and pushed to client gateway!');
      setTimeout(() => setSaveMessage(null), 3500);
    } catch (err: any) {
      alert('Failed to update settings: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Settings className="w-5 h-5 text-indigo-400" />
            Android Client Remote Config & Kill-Switch
          </h2>
          <p className="text-xs text-slate-400">
            Control version enforcement, force-update APK link, maintenance mode, and operator kill-switches.
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-500/20 hover:scale-[1.02] transition-all disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          <span>{isSaving ? 'Saving Changes...' : 'Save All Settings'}</span>
        </button>
      </div>

      {saveMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{saveMessage}</span>
        </div>
      )}

      {/* Emergency Remote Kill-Switch Banner */}
      <div className={`p-5 rounded-2xl border transition-all ${
        formData.killSwitchActivated
          ? 'bg-red-950/70 border-red-500 shadow-2xl shadow-red-500/30'
          : 'bg-slate-900/80 border-slate-800'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              formData.killSwitchActivated ? 'bg-red-500 text-white animate-bounce' : 'bg-red-950/60 text-red-400 border border-red-900'
            }`}>
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white font-mono">
                  Global Emergency Kill-Switch (All Nodes & Clients)
                </h3>
                {formData.killSwitchActivated && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-500 text-white animate-pulse">
                    ACTIVATED
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Instantly disconnects all live Android tunnels, forces app maintenance mode, and revokes configuration sync.
              </p>
            </div>
          </div>

          <button
            onClick={onEmergencyKillToggle}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold border transition-all shrink-0 ${
              formData.killSwitchActivated
                ? 'bg-red-600 text-white border-red-400 shadow-lg shadow-red-600/40 hover:bg-red-700'
                : 'bg-red-950/40 text-red-400 border-red-900/60 hover:bg-red-900/50 hover:text-red-300'
            }`}
          >
            {formData.killSwitchActivated ? 'Deactivate Kill-Switch' : 'Trigger Emergency Kill-Switch'}
          </button>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Section 1: Version Control & Force Update */}
          <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-4">
            <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-wider font-mono flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-cyan-400" />
              Android Version Enforcement & OTA
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Min App Version Required
                </label>
                <input
                  type="text"
                  value={formData.minAppVersion}
                  onChange={(e) => setFormData({ ...formData, minAppVersion: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white font-mono focus:outline-none focus:border-cyan-400"
                  placeholder="1.4.0"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Current Latest Version
                </label>
                <input
                  type="text"
                  value={formData.currentVersion}
                  onChange={(e) => setFormData({ ...formData, currentVersion: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white font-mono focus:outline-none focus:border-cyan-400"
                  placeholder="1.5.2"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Force Update Direct APK / Play Store Link
              </label>
              <input
                type="text"
                value={formData.updateUrl}
                onChange={(e) => setFormData({ ...formData, updateUrl: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-cyan-300 font-mono focus:outline-none focus:border-cyan-400"
                placeholder="https://..."
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
              <div>
                <label className="text-xs font-semibold text-slate-200 block">
                  Force Update Modal Popup
                </label>
                <span className="text-[11px] text-slate-400">
                  Blocks older app versions from opening the connect button.
                </span>
              </div>
              <input
                type="checkbox"
                checked={formData.forceUpdate}
                onChange={(e) => setFormData({ ...formData, forceUpdate: e.target.checked })}
                className="w-4 h-4 rounded text-cyan-500 bg-slate-900 border-slate-700"
              />
            </div>
          </div>

          {/* Section 2: Maintenance Mode & Custom Message */}
          <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-4">
            <h3 className="text-xs font-bold text-violet-400 uppercase tracking-wider font-mono flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-violet-400" />
              Maintenance Mode & User Broadcast
            </h3>

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
              <div>
                <label className="text-xs font-semibold text-slate-200 block">
                  Maintenance Mode Toggle
                </label>
                <span className="text-[11px] text-slate-400">
                  Temporarily pause server handshakes with custom notice.
                </span>
              </div>
              <input
                type="checkbox"
                checked={formData.maintenanceMode}
                onChange={(e) => setFormData({ ...formData, maintenanceMode: e.target.checked })}
                className="w-4 h-4 rounded text-violet-500 bg-slate-900 border-slate-700"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Maintenance Message (Shown on Android UI)
              </label>
              <textarea
                rows={2}
                value={formData.maintenanceMessage}
                onChange={(e) => setFormData({ ...formData, maintenanceMessage: e.target.value })}
                className="w-full p-3 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-violet-400"
              />
            </div>
          </div>
        </div>

        {/* Section 3: In-App Announcement Banner & Operators Switch */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Announcement Banner */}
          <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-4">
            <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider font-mono flex items-center gap-2">
              <Bell className="w-4 h-4 text-amber-400" />
              In-App Announcement Banner
            </h3>

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
              <label className="text-xs font-semibold text-slate-200">
                Display Announcement Banner in App
              </label>
              <input
                type="checkbox"
                checked={formData.announcementEnabled}
                onChange={(e) => setFormData({ ...formData, announcementEnabled: e.target.checked })}
                className="w-4 h-4 rounded text-amber-500 bg-slate-900 border-slate-700"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Announcement Text
              </label>
              <input
                type="text"
                value={formData.announcementMessage}
                onChange={(e) => setFormData({ ...formData, announcementMessage: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-amber-400"
                placeholder="⚡ France & Germany 1Gbps WebSocket clusters live!"
              />
            </div>

            {formData.announcementEnabled && (
              <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-500/30 text-[11px] text-amber-300 flex items-center gap-2">
                <Bell className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="truncate">Preview: {formData.announcementMessage}</span>
              </div>
            )}
          </div>

          {/* Operator Remote Kill-Switches */}
          <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-4">
            <h3 className="text-xs font-bold text-purple-400 uppercase tracking-wider font-mono flex items-center gap-2">
              <Radio className="w-4 h-4 text-purple-400" />
              Telecom Operator Remote Kill-Switches
            </h3>

            <div className="space-y-2.5">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-xs text-purple-300 font-semibold flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-purple-400" />
                  Inwi (*6 Social / *3 YouTube)
                </span>
                <input
                  type="checkbox"
                  checked={formData.enabledOperators.inwi}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      enabledOperators: { ...formData.enabledOperators, inwi: e.target.checked }
                    })
                  }
                  className="w-4 h-4 rounded text-purple-500 bg-slate-900 border-slate-700"
                />
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-xs text-orange-300 font-semibold flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-orange-400" />
                  Orange Morocco (*6 Pass)
                </span>
                <input
                  type="checkbox"
                  checked={formData.enabledOperators.orange}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      enabledOperators: { ...formData.enabledOperators, orange: e.target.checked }
                    })
                  }
                  className="w-4 h-4 rounded text-orange-500 bg-slate-900 border-slate-700"
                />
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-xs text-blue-300 font-semibold flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-400" />
                  Maroc Telecom (IAM *6)
                </span>
                <input
                  type="checkbox"
                  checked={formData.enabledOperators.iam}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      enabledOperators: { ...formData.enabledOperators, iam: e.target.checked }
                    })
                  }
                  className="w-4 h-4 rounded text-blue-500 bg-slate-900 border-slate-700"
                />
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-xs text-emerald-300 font-semibold flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  Direct / Wi-Fi / Generic
                </span>
                <input
                  type="checkbox"
                  checked={formData.enabledOperators.generic}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      enabledOperators: { ...formData.enabledOperators, generic: e.target.checked }
                    })
                  }
                  className="w-4 h-4 rounded text-emerald-500 bg-slate-900 border-slate-700"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 4: Security Secrets & Cryptography Keys */}
        <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-4">
          <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider font-mono flex items-center gap-2">
            <Lock className="w-4 h-4 text-emerald-400" />
            Client APK Authentication & AES-256 Secret Keys
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Client App Secret Key (Hardcoded in APK)
              </label>
              <input
                type="text"
                value={formData.clientAppSecret}
                onChange={(e) => setFormData({ ...formData, clientAppSecret: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-cyan-300 font-mono focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Payload AES-256 Encryption Key
              </label>
              <input
                type="text"
                value={formData.payloadEncryptionKey}
                onChange={(e) => setFormData({ ...formData, payloadEncryptionKey: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-violet-300 font-mono focus:outline-none focus:border-violet-400"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Telegram Support Handle
              </label>
              <input
                type="text"
                value={formData.telegramSupport}
                onChange={(e) => setFormData({ ...formData, telegramSupport: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-cyan-400"
                placeholder="@NexusTunnelSupport"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Support Email
              </label>
              <input
                type="email"
                value={formData.supportEmail}
                onChange={(e) => setFormData({ ...formData, supportEmail: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-cyan-400"
                placeholder="support@nexusvpn.net"
              />
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};
