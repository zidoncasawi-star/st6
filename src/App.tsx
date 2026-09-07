import React, { useState, useEffect, useCallback } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { DashboardOverview } from './components/DashboardOverview';
import { ServerManager } from './components/ServerManager';
import { PayloadManager } from './components/PayloadManager';
import { LicenseManager } from './components/LicenseManager';
import { SubscribersManager } from './components/SubscribersManager';
import { RechargeManager } from './components/RechargeManager';
import { AppSettingsView } from './components/AppSettingsView';
import { AndroidSimulator } from './components/AndroidSimulator';
import { VpsDeployGuide } from './components/VpsDeployGuide';
import { VpsResourceMonitor } from './components/VpsResourceMonitor';
import { LoginModal } from './components/LoginModal';
import { 
  VpnServer, 
  NetworkProfile, 
  LicenseKey, 
  AppSettings, 
  ActiveConnection,
  BandwidthMetric,
  Subscriber
} from './types/vpn';
import { api } from './services/api';
import { Flame, AlertTriangle } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [adminUser, setAdminUser] = useState<any>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState<boolean>(true);

  // Core Data Stores
  const [servers, setServers] = useState<VpnServer[]>([]);
  const [profiles, setProfiles] = useState<NetworkProfile[]>([]);
  const [licenses, setLicenses] = useState<LicenseKey[]>([]);
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [pendingRechargeCount, setPendingRechargeCount] = useState<number>(0);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [activeConnections, setActiveConnections] = useState<ActiveConnection[]>([]);
  const [bandwidthHistory, setBandwidthHistory] = useState<BandwidthMetric[]>([]);
  const [isLoadingData, setIsLoadingData] = useState<boolean>(false);

  // Kill Switch Modal
  const [isKillModalOpen, setIsKillModalOpen] = useState<boolean>(false);

  // 1. Check Auth on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const data = await api.getMe();
        setIsAuthenticated(true);
        setAdminUser(data.admin);
      } catch {
        setIsAuthenticated(false);
      } finally {
        setIsLoadingAuth(false);
      }
    };
    checkAuth();
  }, []);

  // 2. Fetch all app data when authenticated
  const loadDashboardData = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      setIsLoadingData(true);
      const [
        serversRes,
        profilesRes,
        licensesRes,
        settingsRes,
        connectionsRes,
        bandwidthRes,
        subsRes,
        rechargesRes
      ] = await Promise.all([
        api.getServers(),
        api.getProfiles(),
        api.getLicenses(),
        api.getSettings(),
        api.getActiveConnections(),
        api.getBandwidthHistory(),
        api.getSubscribers().catch(() => ({ success: false, subscribers: [] })),
        api.getRecharges().catch(() => ({ success: false, counts: { pending: 0 } }))
      ]);

      setServers(serversRes);
      setProfiles(profilesRes);
      setLicenses(licensesRes);
      setSettings(settingsRes);
      setActiveConnections(connectionsRes);
      setBandwidthHistory(bandwidthRes);
      if (subsRes?.subscribers) {
        setSubscribers(subsRes.subscribers);
      }
      if (rechargesRes?.counts?.pending !== undefined) {
        setPendingRechargeCount(rechargesRes.counts.pending);
      }
    } catch (err: any) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setIsLoadingData(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    loadDashboardData();
    // Refresh telemetry every 20 seconds
    const interval = setInterval(loadDashboardData, 20000);
    return () => clearInterval(interval);
  }, [loadDashboardData]);

  // Auth Handlers
  const handleLoginSuccess = (admin: any) => {
    setIsAuthenticated(true);
    setAdminUser(admin);
    loadDashboardData();
  };

  const handleLogout = () => {
    api.logout();
    setIsAuthenticated(false);
    setAdminUser(null);
  };

  // Killswitch Toggle
  const handleToggleEmergencyKill = async () => {
    if (!settings) return;
    try {
      const updated = await api.toggleEmergencyKill();
      setSettings(updated.settings);
      setIsKillModalOpen(false);
      loadDashboardData();
    } catch (err: any) {
      alert('Failed to toggle kill switch: ' + err.message);
    }
  };

  // Server Handlers
  const handleServerCreated = (server: VpnServer) => setServers((prev) => [server, ...prev]);
  const handleServerUpdated = (server: VpnServer) =>
    setServers((prev) => prev.map((s) => (s.id === server.id ? server : s)));
  const handleServerDeleted = (id: string) =>
    setServers((prev) => prev.filter((s) => s.id !== id));

  // Profile Handlers
  const handleProfileCreated = (profile: NetworkProfile) =>
    setProfiles((prev) => [profile, ...prev]);
  const handleProfileUpdated = (profile: NetworkProfile) =>
    setProfiles((prev) => prev.map((p) => (p.id === profile.id ? profile : p)));
  const handleProfileDeleted = (id: string) =>
    setProfiles((prev) => prev.filter((p) => p.id !== id));

  // License Handlers
  const handleLicenseCreated = (lic: LicenseKey) => setLicenses((prev) => [lic, ...prev]);
  const handleLicensesBatchCreated = (newKeys: LicenseKey[]) =>
    setLicenses((prev) => [...newKeys, ...prev]);
  const handleLicenseUpdated = (lic: LicenseKey) =>
    setLicenses((prev) => prev.map((l) => (l.id === lic.id ? lic : l)));
  const handleLicenseDeleted = (id: string) =>
    setLicenses((prev) => prev.filter((l) => l.id !== id));

  // Settings Handler
  const handleSettingsUpdated = (newSettings: AppSettings) => setSettings(newSettings);

  if (isLoadingAuth) {
    return (
      <div className="min-h-screen bg-[#070b12] flex items-center justify-center font-mono text-cyan-400 text-sm">
        <div className="flex items-center gap-3">
          <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
          <span>INITIALIZING NEXUS CRYPTOGRAPHIC GATEWAY...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginModal onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-[#070b12] text-slate-100 flex flex-col antialiased selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Top App Header */}
      <Header
        settings={settings}
        adminUser={adminUser}
        totalActiveUsers={activeConnections?.length || 0}
        totalServersOnline={(servers || []).filter((s) => s.status === 'active').length}
        onEmergencyKillToggle={() => setIsKillModalOpen(true)}
        onLogout={handleLogout}
        onRefreshAll={loadDashboardData}
        isRefreshing={isLoadingData}
      />

      <div className="flex-1 flex overflow-hidden">
        {/* Left Cyberpunk Sidebar */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          serverCount={servers?.length || 0}
          profileCount={profiles?.length || 0}
          activeLicenseCount={(licenses || []).filter((l) => l.status === 'active').length}
          subscriberCount={subscribers?.length || 0}
          pendingRechargeCount={pendingRechargeCount}
          onEmergencyKill={() => setIsKillModalOpen(true)}
          adminUser={adminUser}
          onLogout={handleLogout}
          killSwitchActive={settings?.killSwitchActivated || false}
        />

        {/* Main Content Viewport */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
          {activeTab === 'overview' && (
            <DashboardOverview
              servers={servers}
              profiles={profiles}
              licenses={licenses}
              settings={settings}
              liveConnections={activeConnections}
              activeConnections={activeConnections}
              bandwidthHistory={bandwidthHistory}
              onNavigate={setActiveTab}
              onNavigateTab={setActiveTab}
              onRefresh={loadDashboardData}
            />
          )}

          {activeTab === 'recharges' && (
            <RechargeManager />
          )}

          {activeTab === 'subscribers' && (
            <SubscribersManager profiles={profiles} />
          )}

          {activeTab === 'servers' && (
            <ServerManager
              servers={servers}
              onServerCreated={handleServerCreated}
              onServerUpdated={handleServerUpdated}
              onServerDeleted={handleServerDeleted}
              onRefresh={loadDashboardData}
            />
          )}

          {activeTab === 'vps-monitor' && (
            <VpsResourceMonitor servers={servers} />
          )}

          {activeTab === 'profiles' && (
            <PayloadManager
              profiles={profiles}
              onProfileCreated={handleProfileCreated}
              onProfileUpdated={handleProfileUpdated}
              onProfileDeleted={handleProfileDeleted}
              onRefresh={loadDashboardData}
            />
          )}

          {activeTab === 'licenses' && (
            <LicenseManager
              licenses={licenses}
              onLicenseCreated={handleLicenseCreated}
              onLicensesBatchCreated={handleLicensesBatchCreated}
              onLicenseUpdated={handleLicenseUpdated}
              onLicenseDeleted={handleLicenseDeleted}
              onRefresh={loadDashboardData}
            />
          )}

          {activeTab === 'settings' && (
            <AppSettingsView
              settings={settings}
              onSettingsUpdated={handleSettingsUpdated}
              onEmergencyKillToggle={() => setIsKillModalOpen(true)}
            />
          )}

          {activeTab === 'simulator' && (
            <AndroidSimulator
              servers={servers}
              profiles={profiles}
              licenses={licenses}
            />
          )}

          {activeTab === 'deployment' && <VpsDeployGuide />}
        </main>
      </div>

      {/* Emergency Kill-Switch Confirmation Modal */}
      {isKillModalOpen && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#0e1422] border-2 border-red-500/80 rounded-3xl w-full max-w-md shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-red-600 flex items-center justify-center text-white shrink-0 shadow-lg shadow-red-600/40 animate-pulse">
                <Flame className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white font-mono">
                  {settings?.killSwitchActivated
                    ? 'Deactivate Global Kill-Switch'
                    : 'TRIGGER EMERGENCY KILL-SWITCH'}
                </h3>
                <span className="text-[11px] text-red-400 font-mono">
                  ACTION: {settings?.killSwitchActivated ? 'RESUME ALL' : 'IMMEDIATE DISCONNECT'}
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              {settings?.killSwitchActivated
                ? 'Deactivating will re-enable all server clusters, config sync endpoints, and allow Android clients to reconnect normally.'
                : 'Warning: Activating the Kill-Switch will instantly disconnect all live Android tunnels, lock config synchronization, and activate emergency maintenance mode across all telecom profiles.'}
            </p>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsKillModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleToggleEmergencyKill}
                className={`px-5 py-2 rounded-xl text-xs font-bold text-white shadow-lg transition-all ${
                  settings?.killSwitchActivated
                    ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30'
                    : 'bg-red-600 hover:bg-red-500 shadow-red-600/40'
                }`}
              >
                {settings?.killSwitchActivated ? 'Deactivate Kill-Switch' : 'CONFIRM EMERGENCY SHUTDOWN'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

