import fs from 'fs';
import path from 'path';
import { VpnServer, NetworkProfile, LicenseKey, AppSettings, LiveConnection, TelemetryStats, Subscriber, SubscriptionPlan, RechargeRequest } from '../src/types/vpn.js';
import { hashPassword } from './crypto.js';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'vpn_store.json');

export interface AdminAccount {
  username: string;
  passwordHash: string;
  name: string;
  role: string;
}

interface DatabaseSchema {
  admin: AdminAccount;
  admins?: AdminAccount[];
  servers: VpnServer[];
  profiles: NetworkProfile[];
  licenses: LicenseKey[];
  subscribers: Subscriber[];
  plans?: SubscriptionPlan[];
  recharges?: RechargeRequest[];
  settings: AppSettings;
  liveConnections: LiveConnection[];
  forceDisconnectedHwids?: string[];
  bandwidthHistory: {
    timestamp: string;
    trafficMb: number;
    connections: number;
  }[];
}

let dbInstance: DatabaseSchema | null = null;

const INITIAL_SERVERS: VpnServer[] = [];

const INITIAL_PROFILES: NetworkProfile[] = [
  {
    id: 'prof_inwi_01',
    name: 'Inwi Social Unlimited *6',
    operator: 'Inwi',
    bugHost: 'web.facebook.com',
    sni: 'm.facebook.com',
    payloadTemplate: 'GET / HTTP/1.1[crlf]Host: [host][crlf]X-Forward-For: [host][crlf]Upgrade: websocket[crlf]Connection: Upgrade[crlf]User-Agent: [ua][crlf][crlf]',
    sslEnabled: true,
    heartbeatInterval: 20,
    keepAlive: true,
    status: 'active',
    targetProtocol: 'WebSocket TUN',
    description: 'Bypasses Inwi social pass *6 limits with ultra-low ping for TikTok, FB & WhatsApp.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'prof_orange_02',
    name: 'Orange Chat & Social *6',
    operator: 'Orange',
    bugHost: 'v.whatsapp.net',
    sni: 'web.whatsapp.com',
    payloadTemplate: 'CONNECT [host_port] HTTP/1.1[crlf]Host: [host][crlf]X-Online-Host: [host][crlf]Connection: Keep-Alive[crlf]Proxy-Connection: Keep-Alive[crlf][crlf]',
    sslEnabled: true,
    heartbeatInterval: 30,
    keepAlive: true,
    status: 'active',
    targetProtocol: 'HTTP Custom',
    description: 'High stability tunnel for Orange Morocco *6 social bundle.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'prof_iam_03',
    name: 'Maroc Telecom *6 Fast CDN',
    operator: 'Maroc Telecom',
    bugHost: 'graph.instagram.com',
    sni: 'static.cdn.instagram.com',
    payloadTemplate: 'GET / HTTP/1.1[crlf]Host: [host][crlf]Upgrade: websocket[crlf]Sec-WebSocket-Key: [random][crlf]Sec-WebSocket-Version: 13[crlf][crlf]',
    sslEnabled: true,
    heartbeatInterval: 25,
    keepAlive: true,
    status: 'active',
    targetProtocol: 'WebSocket TUN',
    description: 'Direct CDN injection for IAM (Maroc Telecom) *6 recharge.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'prof_direct_04',
    name: 'Direct VIP (Fast Gaming & DNS)',
    operator: 'All / Generic',
    bugHost: 'speedtest.net',
    sni: 'speedtest.net',
    payloadTemplate: 'GET / HTTP/1.1[crlf]Host: [host][crlf]Connection: Upgrade[crlf][crlf]',
    sslEnabled: false,
    heartbeatInterval: 45,
    keepAlive: true,
    status: 'active',
    targetProtocol: 'Any',
    description: 'Direct unthrottled connection for Wi-Fi, ADSL, 4G/5G fiber users.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'prof_inwi_yt_05',
    name: 'Inwi YouTube Pass *3 Bypass',
    operator: 'Inwi',
    bugHost: 'i.ytimg.com',
    sni: 'm.youtube.com',
    payloadTemplate: 'GET / HTTP/1.1[crlf]Host: [host][crlf]Upgrade: websocket[crlf]Connection: Upgrade[crlf][crlf]',
    sslEnabled: true,
    heartbeatInterval: 15,
    keepAlive: true,
    status: 'active',
    targetProtocol: 'WebSocket TUN',
    description: 'Tunnel tailored for Inwi YouTube/Streaming passes with 1080p 60fps streaming.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
];

const INITIAL_LICENSES: LicenseKey[] = [];

export const INITIAL_PLANS: SubscriptionPlan[] = [
  {
    id: 'plan_20dh_3d',
    name: 'باقة 20 درهم (3 أيام / 20GB)',
    priceDhs: 20,
    dataGb: 20,
    durationDays: 3,
    extraInfo: '20 GB إنترنت فائق السرعة لتطبيقات التواصل واليوتيوب والألعاب',
    badge: 'باقة سريعة',
    operator: 'ALL',
    is_active: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'plan_50dh_15d',
    name: 'باقة 50 درهم (15 يوم / 50GB)',
    priceDhs: 50,
    dataGb: 50,
    durationDays: 15,
    extraInfo: '50 GB إنترنت + 1h مكالمات + سرعة مضاعفة وبلا تقطيع',
    badge: 'الأكثر طلباً',
    operator: 'ALL',
    is_active: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'plan_100dh_30d',
    name: 'باقة 100 درهم (30 يوم / 100GB VIP)',
    priceDhs: 100,
    dataGb: 100,
    durationDays: 30,
    extraInfo: '100 GB إنترنت VIP + أولوية قصوى على السيرفرات + 2h مكالمات',
    badge: 'VIP غير محدود',
    operator: 'ALL',
    is_active: true,
    createdAt: new Date().toISOString()
  }
];

const INITIAL_SETTINGS: AppSettings = {
  appName: 'Nexus Tunnel Pro',
  minAppVersion: '1.4.0',
  currentVersion: '1.5.2',
  forceUpdate: false,
  updateUrl: 'https://github.com/nexusvpn/android/releases/download/v1.5.2/NexusTunnel-v1.5.2-release.apk',
  maintenanceMode: false,
  maintenanceMessage: 'Scheduled server maintenance in progress. High-speed tunnels will be back online shortly.',
  announcementEnabled: true,
  announcementMessage: '⚡ Inwi *6 and Orange *6 payload algorithms updated! Ultra-fast tunnels active.',
  enabledOperators: {
    inwi: true,
    orange: true,
    iam: true,
    generic: true
  },
  clientAppSecret: process.env.CLIENT_APP_SECRET || 'nexus_client_sec_2026_x791a8c',
  payloadEncryptionKey: process.env.PAYLOAD_ENCRYPTION_KEY || 'nexus-32-byte-secret-encryption-key-!',
  killSwitchActivated: false,
  telegramSupport: '@NexusTunnelSupport',
  supportEmail: 'support@nexusvpn.net'
};

const INITIAL_CONNECTIONS: LiveConnection[] = [];

function generateBandwidthHistory() {
  return [];
}

export async function getDb(): Promise<DatabaseSchema> {
  if (dbInstance) {
    return dbInstance;
  }

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (fs.existsSync(DB_FILE)) {
    try {
      const data = fs.readFileSync(DB_FILE, 'utf8');
      dbInstance = JSON.parse(data);
      if (dbInstance) {
        if (!dbInstance.admins) {
          dbInstance.admins = [dbInstance.admin];
        }
        // Ensure RODIXSTAR6 is present in admins
        if (!dbInstance.admins.some((a) => a.username.toUpperCase() === 'RODIXSTAR6')) {
          const defaultPassword = process.env.ADMIN_PASSWORD || 'admin_password_123';
          const defaultHash = await hashPassword(defaultPassword);
          dbInstance.admins.push({
            username: 'RODIXSTAR6',
            passwordHash: defaultHash,
            name: 'RODIXSTAR6 (Master Admin)',
            role: 'SUPERADMIN'
          });
          saveDb();
        }
        if (!dbInstance.forceDisconnectedHwids) {
          dbInstance.forceDisconnectedHwids = [];
        }
        if (!dbInstance.subscribers) {
          dbInstance.subscribers = [];
        }
        if (!dbInstance.plans || dbInstance.plans.length === 0) {
          dbInstance.plans = [...INITIAL_PLANS];
          saveDb();
        }
        if (!dbInstance.recharges) {
          dbInstance.recharges = [];
          saveDb();
        }
        return dbInstance;
      }
    } catch (e) {
      console.error('Failed reading DB file, recreating store...', e);
    }
  }

  // Initial seed
  const defaultPassword = process.env.ADMIN_PASSWORD || 'admin_password_123';
  const passwordHash = await hashPassword(defaultPassword);

  const defaultAdmin = {
    username: 'RODIXSTAR6',
    passwordHash,
    name: 'RODIXSTAR6 (Master Admin)',
    role: 'SUPERADMIN',
  };

  const secondaryAdmin = {
    username: 'admin',
    passwordHash,
    name: 'Super Administrator',
    role: 'SUPERADMIN',
  };

  dbInstance = {
    admin: defaultAdmin,
    admins: [defaultAdmin, secondaryAdmin],
    servers: INITIAL_SERVERS,
    profiles: INITIAL_PROFILES,
    licenses: INITIAL_LICENSES,
    subscribers: [],
    plans: [...INITIAL_PLANS],
    recharges: [],
    settings: INITIAL_SETTINGS,
    liveConnections: INITIAL_CONNECTIONS,
    bandwidthHistory: [],
  };

  saveDb();
  return dbInstance;
}

export function saveDb(): void {
  if (!dbInstance) return;
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(dbInstance, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed writing DB file:', err);
  }
}

export async function calculateStats(): Promise<TelemetryStats> {
  const db = await getDb();
  const onlineServers = db.servers.filter(s => s.status === 'active');
  const activeLicenses = db.licenses.filter(l => l.status === 'active');

  const protocolStats: Record<string, number> = {};
  for (const s of db.servers) {
    protocolStats[s.protocol] = (protocolStats[s.protocol] || 0) + (s.currentConnections || 0);
  }

  const operatorStats: Record<string, number> = {
    Inwi: 0,
    Orange: 0,
    'Maroc Telecom': 0,
    'All / Generic': 0
  };

  for (const conn of db.liveConnections) {
    const op = conn.operator || 'All / Generic';
    if (operatorStats[op] !== undefined) {
      operatorStats[op] += 1;
    } else {
      operatorStats[op] = 1;
    }
  }

  const totalActiveUsers = db.liveConnections.length;
  const totalBytes = db.liveConnections.reduce((sum, c) => sum + (c.bytesUp || 0) + (c.bytesDown || 0), 0);
  const totalBandwidthGb = totalBytes > 0 ? parseFloat((totalBytes / (1024 * 1024 * 1024)).toFixed(2)) : 0;

  const totalPing = onlineServers.reduce((sum, s) => sum + (s.pingMs || 0), 0);
  const avgPing = onlineServers.length ? Math.round(totalPing / onlineServers.length) : 0;

  return {
    activeUsers: totalActiveUsers,
    totalServersOnline: onlineServers.length,
    totalServers: db.servers.length,
    activeLicenses: activeLicenses.length,
    totalLicenses: db.licenses.length,
    bandwidth24hGb: totalBandwidthGb,
    avgLatencyMs: avgPing,
    protocolStats,
    operatorStats,
    bandwidthHistory: db.bandwidthHistory || []
  };
}
