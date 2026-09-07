export interface VpnServer {
  id: string;
  name: string;
  ip: string;
  domain?: string;
  ports: number[];
  protocol: 'WebSocket TUN' | 'SSH + WS' | 'BadVPN UDP' | 'V2Ray VMess' | 'HTTP Custom';
  countryCode: string;
  countryName: string;
  flag: string;
  status: 'active' | 'maintenance' | 'full';
  capacity: number;
  currentConnections: number;
  pingMs: number;
  speedMbps: number;
  sshPort?: number;
  wsPath?: string;
  authUsername?: string;
  authPassword?: string;
  publicKey?: string;
  createdAt: string;
  updatedAt: string;
}

export interface NetworkProfile {
  id: string;
  name: string;
  operator: 'Inwi' | 'Orange' | 'Maroc Telecom' | 'All / Generic' | 'International';
  bugHost: string;
  sni: string;
  payloadTemplate: string;
  sslEnabled: boolean;
  heartbeatInterval: number; // in seconds
  keepAlive: boolean;
  status: 'active' | 'disabled';
  targetProtocol: 'WebSocket TUN' | 'SSH + WS' | 'HTTP Custom' | 'V2Ray VMess' | 'Any';
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LicenseKey {
  id: string;
  key: string;
  duration: '1 Day Trial' | '7 Days' | '30 Days' | '3 Months' | '6 Months' | '1 Year' | 'Unlimited';
  maxDevices: number;
  boundHwids: string[];
  status: 'active' | 'expired' | 'suspended';
  ownerName: string;
  ownerContact?: string;
  createdAt: string;
  activatedAt?: string;
  expiresAt?: string | null;
  notes?: string;
}

export interface AppSettings {
  appName: string;
  minAppVersion: string;
  currentVersion: string;
  forceUpdate: boolean;
  updateUrl: string;
  maintenanceMode: boolean;
  maintenanceMessage: string;
  announcementEnabled: boolean;
  announcementMessage: string;
  enabledOperators: {
    inwi: boolean;
    orange: boolean;
    iam: boolean;
    generic: boolean;
  };
  clientAppSecret: string;
  payloadEncryptionKey: string;
  killSwitchActivated: boolean;
  telegramSupport: string;
  supportEmail: string;
}

export interface LiveConnection {
  id: string;
  hwid: string;
  licenseKey: string;
  deviceName: string;
  clientIp: string;
  serverId: string;
  serverName: string;
  profileId: string;
  profileName: string;
  operator: string;
  bytesUp: number;
  bytesDown: number;
  connectedAt: string;
  pingMs: number;
  appVersion: string;
}

export interface Subscriber {
  id: string;
  phone_number: string;
  operator: 'INWI' | 'ORANGE' | 'MAROC_TELECOM' | 'GENERIC';
  trial_total_bytes: number; // e.g., 2147483648 (2.0 GB)
  trial_used_bytes: number; // e.g., 157286400 (150 MB)
  is_vip: boolean;
  vip_plan?: string;
  status: 'active' | 'suspended' | 'trial_expired';
  device_id: string;
  registered_at: number; // timestamp ms
  expires_at: number; // timestamp ms
  notes?: string;
  last_sync_at?: number;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  priceDhs: number; // e.g. 20, 50, 100
  dataGb: number; // e.g. 20, 50, 100
  durationDays: number; // e.g. 3, 15, 30
  extraInfo?: string; // e.g. "1h مكالمة", "أولوية VIP وسرعة مضاعفة"
  badge?: string;
  operator: 'INWI' | 'ORANGE' | 'MAROC_TELECOM' | 'ALL';
  is_active: boolean;
  createdAt: string;
}

export interface RechargeRequest {
  id: string;
  phone_number: string;
  operator: 'INWI' | 'ORANGE' | 'MAROC_TELECOM' | 'GENERIC';
  plan_id: string;
  plan_name?: string;
  priceDhs: number;
  dataGb: number;
  durationDays: number;
  recharge_code: string; // رمز التعبئة المدخل
  device_id: string;
  status: 'pending' | 'approved' | 'rejected';
  rejection_reason?: string;
  submitted_at: number; // timestamp ms
  processed_at?: number;
  processed_by?: string;
  notes?: string;
}

export type PendingRecharge = RechargeRequest;

export type ActiveConnection = LiveConnection;

export interface BandwidthMetric {
  timestamp: string;
  trafficMb: number;
  connections: number;
}

export interface TelemetryStats {
  activeUsers: number;
  totalServersOnline: number;
  totalServers: number;
  activeLicenses: number;
  totalLicenses: number;
  bandwidth24hGb: number;
  avgLatencyMs: number;
  protocolStats: Record<string, number>;
  operatorStats: Record<string, number>;
  bandwidthHistory: BandwidthMetric[];
}
