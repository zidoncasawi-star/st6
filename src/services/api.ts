import { VpnServer, NetworkProfile, LicenseKey, AppSettings, LiveConnection, TelemetryStats, BandwidthMetric, Subscriber, SubscriptionPlan, RechargeRequest } from '../types/vpn';

const API_BASE = '/api/v1';

class ApiService {
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem('nexus_admin_token');
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('nexus_admin_token', token);
    } else {
      localStorage.removeItem('nexus_admin_token');
    }
  }

  logout() {
    this.setToken(null);
  }

  getToken(): string | null {
    return this.token;
  }

  private getHeaders(extraHeaders: Record<string, string> = {}) {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...extraHeaders,
    };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    return headers;
  }

  private async handleResponse<T>(res: Response): Promise<T> {
    if (res.status === 401) {
      this.setToken(null);
      window.dispatchEvent(new Event('nexus_auth_expired'));
    }
    const data = await res.json().catch(() => ({ error: res.statusText }));
    if (!res.ok) {
      throw new Error(data.error || `HTTP error ${res.status}`);
    }
    return data;
  }

  // Auth
  async login(username: string, password: string) {
    const res = await fetch(`${API_BASE}/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await this.handleResponse<{ token: string; admin: any }>(res);
    this.setToken(data.token);
    return data;
  }

  async getMe() {
    const res = await fetch(`${API_BASE}/admin/me`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse<any>(res);
  }

  async changePassword(currentPassword: string, newPassword: string) {
    const res = await fetch(`${API_BASE}/admin/change-password`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    return this.handleResponse<{ success: boolean; message: string }>(res);
  }

  // Stats
  async getStats(): Promise<TelemetryStats> {
    const res = await fetch(`${API_BASE}/admin/stats`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse<TelemetryStats>(res);
  }

  // Servers
  async getServers(): Promise<VpnServer[]> {
    const res = await fetch(`${API_BASE}/admin/servers`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse<VpnServer[]>(res);
  }

  async createServer(server: Partial<VpnServer>): Promise<VpnServer> {
    const res = await fetch(`${API_BASE}/admin/servers`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(server),
    });
    return this.handleResponse<VpnServer>(res);
  }

  async updateServer(id: string, server: Partial<VpnServer>): Promise<VpnServer> {
    const res = await fetch(`${API_BASE}/admin/servers/${id}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(server),
    });
    return this.handleResponse<VpnServer>(res);
  }

  async deleteServer(id: string): Promise<{ success: boolean }> {
    const res = await fetch(`${API_BASE}/admin/servers/${id}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    return this.handleResponse<{ success: boolean }>(res);
  }

  async pingServer(id: string): Promise<{ pingMs: number; status: string }> {
    const res = await fetch(`${API_BASE}/admin/servers/${id}/ping`, {
      method: 'POST',
      headers: this.getHeaders(),
    });
    return this.handleResponse<{ pingMs: number; status: string }>(res);
  }

  // Profiles
  async getProfiles(): Promise<NetworkProfile[]> {
    const res = await fetch(`${API_BASE}/admin/profiles`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse<NetworkProfile[]>(res);
  }

  async createProfile(profile: Partial<NetworkProfile>): Promise<NetworkProfile> {
    const res = await fetch(`${API_BASE}/admin/profiles`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(profile),
    });
    return this.handleResponse<NetworkProfile>(res);
  }

  async updateProfile(id: string, profile: Partial<NetworkProfile>): Promise<NetworkProfile> {
    const res = await fetch(`${API_BASE}/admin/profiles/${id}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(profile),
    });
    return this.handleResponse<NetworkProfile>(res);
  }

  async deleteProfile(id: string): Promise<{ success: boolean }> {
    const res = await fetch(`${API_BASE}/admin/profiles/${id}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    return this.handleResponse<{ success: boolean }>(res);
  }

  // Licenses
  async getLicenses(): Promise<LicenseKey[]> {
    const res = await fetch(`${API_BASE}/admin/licenses`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse<LicenseKey[]>(res);
  }

  async createLicense(license: Partial<LicenseKey> & { customKey?: string }): Promise<LicenseKey> {
    const res = await fetch(`${API_BASE}/admin/licenses`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(license),
    });
    return this.handleResponse<LicenseKey>(res);
  }

  async batchGenerateLicenses(params: {
    count: number;
    duration: string;
    maxDevices: number;
    prefix: string;
    batchTag?: string;
  }): Promise<{ success: boolean; count: number; keys: LicenseKey[] }> {
    const res = await fetch(`${API_BASE}/admin/licenses/batch-generate`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(params),
    });
    return this.handleResponse<{ success: boolean; count: number; keys: LicenseKey[] }>(res);
  }

  async updateLicense(id: string, license: Partial<LicenseKey>): Promise<LicenseKey> {
    const res = await fetch(`${API_BASE}/admin/licenses/${id}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(license),
    });
    return this.handleResponse<LicenseKey>(res);
  }

  async resetHwid(id: string): Promise<{ success: boolean; license: LicenseKey }> {
    const res = await fetch(`${API_BASE}/admin/licenses/${id}/reset-hwid`, {
      method: 'POST',
      headers: this.getHeaders(),
    });
    return this.handleResponse<{ success: boolean; license: LicenseKey }>(res);
  }

  async deleteLicense(id: string): Promise<{ success: boolean }> {
    const res = await fetch(`${API_BASE}/admin/licenses/${id}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    return this.handleResponse<{ success: boolean }>(res);
  }

  // Settings & Kill Switch
  async getSettings(): Promise<AppSettings> {
    const res = await fetch(`${API_BASE}/admin/settings`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse<AppSettings>(res);
  }

  async updateSettings(settings: Partial<AppSettings>): Promise<AppSettings> {
    const res = await fetch(`${API_BASE}/admin/settings`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(settings),
    });
    return this.handleResponse<AppSettings>(res);
  }

  async emergencyKillSwitch(activate: boolean): Promise<{ success: boolean; killSwitchActivated: boolean }> {
    const res = await fetch(`${API_BASE}/admin/settings/emergency-kill`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ activate }),
    });
    return this.handleResponse<{ success: boolean; killSwitchActivated: boolean }>(res);
  }

  async toggleEmergencyKill(): Promise<{ success: boolean; settings: AppSettings }> {
    const current = await this.getSettings();
    const killResult = await this.emergencyKillSwitch(!current.killSwitchActivated);
    const updatedSettings = await this.getSettings();
    return { success: killResult.success, settings: updatedSettings };
  }

  // Live Telemetry
  async getLiveConnections(): Promise<LiveConnection[]> {
    const res = await fetch(`${API_BASE}/admin/telemetry/live-connections`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse<LiveConnection[]>(res);
  }

  async getActiveConnections(): Promise<LiveConnection[]> {
    return this.getLiveConnections();
  }

  async getBandwidthHistory(): Promise<BandwidthMetric[]> {
    const stats = await this.getStats();
    return stats.bandwidthHistory || [];
  }

  async disconnectDevice(id: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE}/admin/telemetry/disconnect/${id}`, {
      method: 'POST',
      headers: this.getHeaders(),
    });
    return this.handleResponse<{ success: boolean; message: string }>(res);
  }

  // Encryption tool
  async testCrypto(text: string, mode: 'encrypt' | 'decrypt', customKey?: string) {
    const res = await fetch(`${API_BASE}/admin/tools/encrypt-tester`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ text, mode, customKey }),
    });
    return this.handleResponse<{ result: string; mode: string }>(res);
  }

  // Client API simulation endpoints
  async clientInit(body: { hwid?: string; appVersion?: string; platform?: string } = {}) {
    const res = await fetch('/api/client/init', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Client-Secret': 'nexus_client_sec_2026_x791a8c',
        'X-Hwid': body.hwid || 'HWID-SIMULATOR'
      },
      body: JSON.stringify({
        hwid: body.hwid || 'HWID-SIMULATOR',
        appVersion: body.appVersion || '1.0.0',
        platform: body.platform || 'android'
      })
    });
    return this.handleResponse<any>(res);
  }

  async clientVerifyLicense(hwid: string, licenseKey: string) {
    const res = await fetch('/api/client/verify-license', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Client-Secret': 'nexus_client_sec_2026_x791a8c',
        'X-Hwid': hwid
      },
      body: JSON.stringify({ hwid, licenseKey })
    });
    return this.handleResponse<any>(res);
  }

  async clientConnect(payload: {
    hwid: string;
    licenseKey: string;
    serverId: string;
    profileId?: string;
    deviceName?: string;
    appVersion?: string;
  }) {
    const res = await fetch('/api/client/connect', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Client-Secret': 'nexus_client_sec_2026_x791a8c',
        'X-Hwid': payload.hwid
      },
      body: JSON.stringify(payload)
    });
    return this.handleResponse<any>(res);
  }

  async clientPing(payload: {
    hwid: string;
    sessionId?: string;
    bytesTx?: number;
    bytesRx?: number;
    bytesUp?: number;
    bytesDown?: number;
    pingMs?: number;
    durationSeconds?: number;
  }) {
    const res = await fetch('/api/client/ping', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Client-Secret': 'nexus_client_sec_2026_x791a8c',
        'X-Hwid': payload.hwid
      },
      body: JSON.stringify(payload)
    });
    return this.handleResponse<any>(res);
  }

  async clientDisconnect(payload: {
    hwid: string;
    sessionId?: string;
    bytesTx?: number;
    bytesRx?: number;
  }) {
    const res = await fetch('/api/client/disconnect', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Client-Secret': 'nexus_client_sec_2026_x791a8c',
        'X-Hwid': payload.hwid
      },
      body: JSON.stringify(payload)
    });
    return this.handleResponse<any>(res);
  }

  async clientAppInit(version = '1.5.2') {
    const res = await fetch(`${API_BASE}/app/init?version=${version}`);
    return this.handleResponse<any>(res);
  }

  async clientAppAuth(hwid: string, licenseKey: string, deviceName = 'Android Pixel') {
    const res = await fetch(`${API_BASE}/app/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hwid, licenseKey, deviceName }),
    });
    return this.handleResponse<any>(res);
  }

  async clientGetServers() {
    const res = await fetch(`${API_BASE}/app/servers`);
    return this.handleResponse<any>(res);
  }

  async clientGetConfig(serverId: string, profileId?: string, hwid?: string, licenseKey?: string) {
    const query = new URLSearchParams();
    if (profileId) query.set('profileId', profileId);
    if (hwid) query.set('hwid', hwid);
    if (licenseKey) query.set('licenseKey', licenseKey);

    const res = await fetch(`${API_BASE}/app/config/${serverId}?${query.toString()}`);
    return this.handleResponse<any>(res);
  }

  async clientConfigSync(secret: string, hwid = 'SIMULATED-HWID-01') {
    const res = await fetch(`${API_BASE}/config/sync`, {
      headers: {
        'X-Client-Secret': secret,
        'X-Hwid': hwid,
        'X-Timestamp': Date.now().toString(),
      },
    });
    return this.handleResponse<any>(res);
  }

  // ==========================================
  // SUBSCRIBERS & 1GB TRIAL USER MANAGEMENT
  // ==========================================
  async getSubscribers(params?: { search?: string; operator?: string; status?: string }): Promise<{
    success: boolean;
    total: number;
    count: number;
    subscribers: Subscriber[];
  }> {
    const query = new URLSearchParams();
    if (params?.search) query.set('search', params.search);
    if (params?.operator) query.set('operator', params.operator);
    if (params?.status) query.set('status', params.status);

    const res = await fetch(`/api/admin/subscribers?${query.toString()}`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse(res);
  }

  async getSubscriberStats(): Promise<{
    success: boolean;
    total: number;
    active: number;
    expired: number;
    suspended: number;
    vipCount: number;
    operatorCounts: Record<string, number>;
    totalAllocatedGb: number;
    totalConsumedGb: number;
  }> {
    const res = await fetch('/api/admin/subscribers/stats', {
      headers: this.getHeaders(),
    });
    return this.handleResponse(res);
  }

  async createSubscriber(data: {
    phone_number: string;
    operator: 'INWI' | 'ORANGE' | 'MAROC_TELECOM' | 'GENERIC';
    trial_total_bytes?: number;
    is_vip?: boolean;
    device_id?: string;
    durationDays?: number;
    notes?: string;
  }): Promise<{ success: boolean; subscriber: Subscriber; message: string }> {
    const res = await fetch('/api/admin/subscribers', {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    return this.handleResponse(res);
  }

  async updateSubscriber(id: string, data: Partial<Subscriber>): Promise<{ success: boolean; subscriber: Subscriber; message: string }> {
    const res = await fetch(`/api/admin/subscribers/${id}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    return this.handleResponse(res);
  }

  async extendSubscriberQuota(id: string, addBytes: number): Promise<{ success: boolean; subscriber: Subscriber; message: string }> {
    const res = await fetch(`/api/admin/subscribers/${id}/extend-quota`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ addBytes }),
    });
    return this.handleResponse(res);
  }

  async toggleSubscriberVip(id: string): Promise<{ success: boolean; subscriber: Subscriber; message: string }> {
    const res = await fetch(`/api/admin/subscribers/${id}/toggle-vip`, {
      method: 'POST',
      headers: this.getHeaders(),
    });
    return this.handleResponse(res);
  }

  async toggleSubscriberStatus(id: string): Promise<{ success: boolean; subscriber: Subscriber; message: string }> {
    const res = await fetch(`/api/admin/subscribers/${id}/toggle-status`, {
      method: 'POST',
      headers: this.getHeaders(),
    });
    return this.handleResponse(res);
  }

  async deleteSubscriber(id: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`/api/admin/subscribers/${id}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    return this.handleResponse(res);
  }

  // Plans CRUD (لوحة الإدارة)
  async getPlans(): Promise<SubscriptionPlan[]> {
    const res = await fetch(`${API_BASE}/admin/plans`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse<SubscriptionPlan[]>(res);
  }

  async createPlan(plan: Partial<SubscriptionPlan>): Promise<{ success: boolean; plan: SubscriptionPlan; message: string }> {
    const res = await fetch(`${API_BASE}/admin/plans`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(plan),
    });
    return this.handleResponse(res);
  }

  async updatePlan(id: string, plan: Partial<SubscriptionPlan>): Promise<{ success: boolean; plan: SubscriptionPlan; message: string }> {
    const res = await fetch(`${API_BASE}/admin/plans/${id}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(plan),
    });
    return this.handleResponse(res);
  }

  async deletePlan(id: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE}/admin/plans/${id}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    return this.handleResponse(res);
  }

  // Recharge Requests Management (مراجعة التعبئات في لوحة الأدمن)
  async getRecharges(params?: { status?: string; operator?: string; search?: string }): Promise<{
    success: boolean;
    recharges: RechargeRequest[];
    counts: {
      total: number;
      pending: number;
      approved: number;
      rejected: number;
      totalRevenueDhs: number;
    };
  }> {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.operator) query.set('operator', params.operator);
    if (params?.search) query.set('search', params.search);

    const res = await fetch(`${API_BASE}/admin/recharges?${query.toString()}`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse(res);
  }

  async approveRecharge(id: string): Promise<{ success: boolean; message: string; request: RechargeRequest; subscriber: Subscriber }> {
    const res = await fetch(`${API_BASE}/admin/recharges/${id}/approve`, {
      method: 'POST',
      headers: this.getHeaders(),
    });
    return this.handleResponse(res);
  }

  async rejectRecharge(id: string, reason?: string): Promise<{ success: boolean; message: string; request: RechargeRequest }> {
    const res = await fetch(`${API_BASE}/admin/recharges/${id}/reject`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ reason }),
    });
    return this.handleResponse(res);
  }

  async deleteRecharge(id: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE}/admin/recharges/${id}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    return this.handleResponse(res);
  }

  async createManualRecharge(data: { phone_number: string; operator: string; plan_id: string; notes?: string }): Promise<{ success: boolean; message: string; request: RechargeRequest; subscriber: Subscriber }> {
    const res = await fetch(`${API_BASE}/admin/recharges/manual`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    return this.handleResponse(res);
  }

  // Client User API endpoints
  async registerUser(data: { phone_number: string; operator: string; device_id?: string }) {
    const res = await fetch('/api/user/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Client-Secret': 'nexus_client_sec_2026_x791a8c'
      },
      body: JSON.stringify(data)
    });
    return this.handleResponse<any>(res);
  }

  async submitRecharge(data: { phone_number: string; operator: string; plan_id: string; recharge_code: string; device_id: string }) {
    const res = await fetch('/api/recharge/submit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Client-Secret': 'nexus_client_sec_2026_x791a8c'
      },
      body: JSON.stringify(data)
    });
    return this.handleResponse<any>(res);
  }

  async getPublicPlans(): Promise<{ status: string; success: boolean; plans: SubscriptionPlan[] }> {
    const res = await fetch('/api/recharge/plans', {
      headers: {
        'X-Client-Secret': 'nexus_client_sec_2026_x791a8c'
      }
    });
    return this.handleResponse<any>(res);
  }

  async getRechargeStatus(params: { phone_number?: string; device_id?: string }) {
    const query = new URLSearchParams();
    if (params.phone_number) query.set('phone_number', params.phone_number);
    if (params.device_id) query.set('device_id', params.device_id);

    const res = await fetch(`/api/recharge/status?${query.toString()}`, {
      headers: {
        'X-Client-Secret': 'nexus_client_sec_2026_x791a8c'
      }
    });
    return this.handleResponse<any>(res);
  }

  async syncUserUsage(data: { phone_number: string; device_id?: string; used_bytes?: number; bytesTx?: number; bytesRx?: number }) {
    const res = await fetch('/api/user/sync-usage', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Client-Secret': 'nexus_client_sec_2026_x791a8c'
      },
      body: JSON.stringify(data)
    });
    return this.handleResponse<any>(res);
  }

  async getUserProfile(params: { phone_number?: string; device_id?: string }) {
    const query = new URLSearchParams();
    if (params.phone_number) query.set('phone_number', params.phone_number);
    if (params.device_id) query.set('device_id', params.device_id);

    const res = await fetch(`/api/user/profile?${query.toString()}`, {
      headers: {
        'X-Client-Secret': 'nexus_client_sec_2026_x791a8c'
      }
    });
    return this.handleResponse<any>(res);
  }

  async getConfigByOperator(operator: string) {
    const res = await fetch(`/api/config?operator=${encodeURIComponent(operator)}`, {
      headers: {
        'X-Client-Secret': 'nexus_client_sec_2026_x791a8c'
      }
    });
    return this.handleResponse<any>(res);
  }
}

export const api = new ApiService();
