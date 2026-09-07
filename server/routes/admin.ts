import { Router, Response } from 'express';
import { getDb, saveDb, calculateStats, INITIAL_PLANS } from '../db.js';
import { requireAdminAuth, AdminAuthRequest } from './auth.js';
import { encryptPayload, decryptPayload, generateVpnLicenseKey } from '../crypto.js';
import { VpnServer, NetworkProfile, LicenseKey, AppSettings, Subscriber, SubscriptionPlan, RechargeRequest } from '../../src/types/vpn.js';

const router = Router();

// Apply admin auth protection to all admin routes
router.use(requireAdminAuth);

// GET /api/v1/admin/stats
router.get('/stats', async (req: AdminAuthRequest, res: Response) => {
  try {
    const stats = await calculateStats();
    return res.json(stats);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to calculate stats' });
  }
});

// ==========================================
// SERVERS CRUD
// ==========================================

// GET /api/v1/admin/servers
router.get('/servers', async (req: AdminAuthRequest, res: Response) => {
  const db = await getDb();
  return res.json(db.servers);
});

// POST /api/v1/admin/servers
router.post('/servers', async (req: AdminAuthRequest, res: Response) => {
  try {
    const db = await getDb();
    const serverData = req.body as Partial<VpnServer>;

    if (!serverData.name || !serverData.ip || !serverData.protocol) {
      return res.status(400).json({ error: 'Server name, IP, and protocol are required' });
    }

    const newServer: VpnServer = {
      id: 'srv_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 5),
      name: serverData.name,
      ip: serverData.ip,
      domain: serverData.domain || '',
      ports: serverData.ports && serverData.ports.length ? serverData.ports : [80, 443],
      protocol: serverData.protocol || 'WebSocket TUN',
      countryCode: (serverData.countryCode || 'FR').toUpperCase(),
      countryName: serverData.countryName || 'France',
      flag: serverData.flag || '🌐',
      status: serverData.status || 'active',
      capacity: Number(serverData.capacity) || 500,
      currentConnections: 0,
      pingMs: Number(serverData.pingMs) || 45,
      speedMbps: Number(serverData.speedMbps) || 1000,
      wsPath: serverData.wsPath || '/ws-tunnel',
      sshPort: Number(serverData.sshPort) || 22,
      authUsername: serverData.authUsername || 'nexus_vpn',
      authPassword: serverData.authPassword || 'vpn_tunnel_secret',
      publicKey: serverData.publicKey || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    db.servers.unshift(newServer);
    saveDb();

    return res.status(201).json(newServer);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to create server' });
  }
});

// PUT /api/v1/admin/servers/:id
router.put('/servers/:id', async (req: AdminAuthRequest, res: Response) => {
  try {
    const db = await getDb();
    const idx = db.servers.findIndex(s => s.id === req.params.id);
    if (idx === -1) {
      return res.status(404).json({ error: 'Server not found' });
    }

    const updated = {
      ...db.servers[idx],
      ...req.body,
      id: db.servers[idx].id,
      updatedAt: new Date().toISOString()
    };

    db.servers[idx] = updated;
    saveDb();

    return res.json(updated);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to update server' });
  }
});

// DELETE /api/v1/admin/servers/:id
router.delete('/servers/:id', async (req: AdminAuthRequest, res: Response) => {
  try {
    const db = await getDb();
    const beforeCount = db.servers.length;
    db.servers = db.servers.filter(s => s.id !== req.params.id);
    if (db.servers.length === beforeCount) {
      return res.status(404).json({ error: 'Server not found' });
    }
    saveDb();
    return res.json({ success: true, message: 'Server deleted successfully' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to delete server' });
  }
});

// POST /api/v1/admin/servers/:id/ping
router.post('/servers/:id/ping', async (req: AdminAuthRequest, res: Response) => {
  try {
    const db = await getDb();
    const server = db.servers.find(s => s.id === req.params.id);
    if (!server) {
      return res.status(404).json({ error: 'Server not found' });
    }

    // Simulated real-time ping check
    const jitter = Math.floor(Math.random() * 8) - 4;
    const newPing = Math.max(12, server.pingMs + jitter);
    server.pingMs = newPing;
    server.updatedAt = new Date().toISOString();
    saveDb();

    return res.json({
      serverId: server.id,
      name: server.name,
      ip: server.ip,
      pingMs: newPing,
      status: server.status,
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ==========================================
// NETWORK PROFILES & PAYLOAD PRESETS CRUD
// ==========================================

// GET /api/v1/admin/profiles
router.get('/profiles', async (req: AdminAuthRequest, res: Response) => {
  const db = await getDb();
  return res.json(db.profiles);
});

// POST /api/v1/admin/profiles
router.post('/profiles', async (req: AdminAuthRequest, res: Response) => {
  try {
    const db = await getDb();
    const pData = req.body as Partial<NetworkProfile>;

    if (!pData.name || !pData.bugHost || !pData.sni) {
      return res.status(400).json({ error: 'Profile name, Bug Host, and SNI are required' });
    }

    const newProfile: NetworkProfile = {
      id: 'prof_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 5),
      name: pData.name,
      operator: pData.operator || 'Inwi',
      bugHost: pData.bugHost,
      sni: pData.sni,
      payloadTemplate: pData.payloadTemplate || 'GET / HTTP/1.1[crlf]Host: [host][crlf]Upgrade: websocket[crlf][crlf]',
      sslEnabled: pData.sslEnabled !== undefined ? Boolean(pData.sslEnabled) : true,
      heartbeatInterval: Number(pData.heartbeatInterval) || 20,
      keepAlive: pData.keepAlive !== undefined ? Boolean(pData.keepAlive) : true,
      status: pData.status || 'active',
      targetProtocol: pData.targetProtocol || 'WebSocket TUN',
      description: pData.description || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    db.profiles.unshift(newProfile);
    saveDb();

    return res.status(201).json(newProfile);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to create profile' });
  }
});

// PUT /api/v1/admin/profiles/:id
router.put('/profiles/:id', async (req: AdminAuthRequest, res: Response) => {
  try {
    const db = await getDb();
    const idx = db.profiles.findIndex(p => p.id === req.params.id);
    if (idx === -1) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    const updated = {
      ...db.profiles[idx],
      ...req.body,
      id: db.profiles[idx].id,
      updatedAt: new Date().toISOString()
    };

    db.profiles[idx] = updated;
    saveDb();

    return res.json(updated);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to update profile' });
  }
});

// DELETE /api/v1/admin/profiles/:id
router.delete('/profiles/:id', async (req: AdminAuthRequest, res: Response) => {
  try {
    const db = await getDb();
    const beforeCount = db.profiles.length;
    db.profiles = db.profiles.filter(p => p.id !== req.params.id);
    if (db.profiles.length === beforeCount) {
      return res.status(404).json({ error: 'Profile not found' });
    }
    saveDb();
    return res.json({ success: true, message: 'Profile deleted successfully' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to delete profile' });
  }
});

// ==========================================
// LICENSES & VOUCHER MANAGEMENT
// ==========================================

// GET /api/v1/admin/licenses
router.get('/licenses', async (req: AdminAuthRequest, res: Response) => {
  const db = await getDb();
  return res.json(db.licenses);
});

// POST /api/v1/admin/licenses
router.post('/licenses', async (req: AdminAuthRequest, res: Response) => {
  try {
    const db = await getDb();
    const { duration, maxDevices, ownerName, ownerContact, notes, customKey } = req.body;

    const key = customKey && customKey.trim().length > 4 ? customKey.trim().toUpperCase() : generateVpnLicenseKey();

    // Check if key already exists
    if (db.licenses.some(l => l.key === key)) {
      return res.status(400).json({ error: 'License key already exists' });
    }

    let expiresAt: string | null = null;
    const now = Date.now();
    if (duration === '1 Day Trial') {
      expiresAt = new Date(now + 1 * 86400000).toISOString();
    } else if (duration === '7 Days') {
      expiresAt = new Date(now + 7 * 86400000).toISOString();
    } else if (duration === '30 Days') {
      expiresAt = new Date(now + 30 * 86400000).toISOString();
    } else if (duration === '3 Months') {
      expiresAt = new Date(now + 90 * 86400000).toISOString();
    } else if (duration === '6 Months') {
      expiresAt = new Date(now + 180 * 86400000).toISOString();
    } else if (duration === '1 Year') {
      expiresAt = new Date(now + 365 * 86400000).toISOString();
    } else if (duration === 'Unlimited') {
      expiresAt = null;
    }

    const newLicense: LicenseKey = {
      id: 'lic_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 5),
      key,
      duration: duration || '30 Days',
      maxDevices: Number(maxDevices) || 1,
      boundHwids: [],
      status: 'active',
      ownerName: ownerName || 'Anonymous Customer',
      ownerContact: ownerContact || '',
      createdAt: new Date().toISOString(),
      expiresAt,
      notes: notes || ''
    };

    db.licenses.unshift(newLicense);
    saveDb();

    return res.status(201).json(newLicense);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to create license' });
  }
});

// POST /api/v1/admin/licenses/batch-generate
router.post('/licenses/batch-generate', async (req: AdminAuthRequest, res: Response) => {
  try {
    const db = await getDb();
    const { count, duration, maxDevices, prefix, batchTag } = req.body;
    const num = Math.min(Math.max(Number(count) || 1, 1), 100);
    const keyPrefix = prefix || 'NET-VIP';

    const generated: LicenseKey[] = [];
    const now = Date.now();

    for (let i = 0; i < num; i++) {
      const key = generateVpnLicenseKey(keyPrefix);
      let expiresAt: string | null = null;
      if (duration === '1 Day Trial') expiresAt = new Date(now + 1 * 86400000).toISOString();
      else if (duration === '7 Days') expiresAt = new Date(now + 7 * 86400000).toISOString();
      else if (duration === '30 Days') expiresAt = new Date(now + 30 * 86400000).toISOString();
      else if (duration === '3 Months') expiresAt = new Date(now + 90 * 86400000).toISOString();
      else if (duration === '6 Months') expiresAt = new Date(now + 180 * 86400000).toISOString();
      else if (duration === '1 Year') expiresAt = new Date(now + 365 * 86400000).toISOString();
      else expiresAt = null;

      const lic: LicenseKey = {
        id: 'lic_' + (Date.now() + i).toString(36) + Math.random().toString(36).substring(2, 5),
        key,
        duration: duration || '30 Days',
        maxDevices: Number(maxDevices) || 1,
        boundHwids: [],
        status: 'active',
        ownerName: `Batch #${batchTag || 'Voucher'} - Key ${i + 1}`,
        createdAt: new Date().toISOString(),
        expiresAt,
        notes: `Generated via Batch Wizard (${duration})`
      };

      generated.push(lic);
      db.licenses.unshift(lic);
    }

    saveDb();
    return res.json({
      success: true,
      count: generated.length,
      keys: generated
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed batch generation' });
  }
});

// PUT /api/v1/admin/licenses/:id
router.put('/licenses/:id', async (req: AdminAuthRequest, res: Response) => {
  try {
    const db = await getDb();
    const idx = db.licenses.findIndex(l => l.id === req.params.id);
    if (idx === -1) {
      return res.status(404).json({ error: 'License not found' });
    }

    const updated = {
      ...db.licenses[idx],
      ...req.body,
      id: db.licenses[idx].id
    };

    db.licenses[idx] = updated;
    saveDb();

    return res.json(updated);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to update license' });
  }
});

// POST /api/v1/admin/licenses/:id/reset-hwid
router.post('/licenses/:id/reset-hwid', async (req: AdminAuthRequest, res: Response) => {
  try {
    const db = await getDb();
    const license = db.licenses.find(l => l.id === req.params.id);
    if (!license) {
      return res.status(404).json({ error: 'License not found' });
    }

    license.boundHwids = [];
    saveDb();

    return res.json({ success: true, message: 'Bound hardware IDs cleared successfully', license });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// DELETE /api/v1/admin/licenses/:id
router.delete('/licenses/:id', async (req: AdminAuthRequest, res: Response) => {
  try {
    const db = await getDb();
    const beforeCount = db.licenses.length;
    db.licenses = db.licenses.filter(l => l.id !== req.params.id);
    if (db.licenses.length === beforeCount) {
      return res.status(404).json({ error: 'License not found' });
    }
    saveDb();
    return res.json({ success: true, message: 'License deleted successfully' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ==========================================
// APP SETTINGS & REMOTE KILL-SWITCH
// ==========================================

// GET /api/v1/admin/settings
router.get('/settings', async (req: AdminAuthRequest, res: Response) => {
  const db = await getDb();
  return res.json(db.settings);
});

// PUT /api/v1/admin/settings
router.put('/settings', async (req: AdminAuthRequest, res: Response) => {
  try {
    const db = await getDb();
    db.settings = {
      ...db.settings,
      ...req.body
    };
    saveDb();
    return res.json(db.settings);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to update settings' });
  }
});

// POST /api/v1/admin/settings/emergency-kill
router.post('/settings/emergency-kill', async (req: AdminAuthRequest, res: Response) => {
  try {
    const { activate } = req.body;
    const db = await getDb();
    db.settings.killSwitchActivated = Boolean(activate);
    if (activate) {
      db.settings.maintenanceMode = true;
      db.settings.maintenanceMessage = 'EMERGENCY SHUTDOWN: Remote Kill Switch activated by Administrator.';
    }
    saveDb();
    return res.json({
      success: true,
      killSwitchActivated: db.settings.killSwitchActivated,
      maintenanceMode: db.settings.maintenanceMode
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ==========================================
// LIVE TELEMETRY & CONNECTIONS
// ==========================================

// GET /api/v1/admin/telemetry/live-connections
router.get('/telemetry/live-connections', async (req: AdminAuthRequest, res: Response) => {
  const db = await getDb();
  return res.json(db.liveConnections);
});

// POST /api/v1/admin/telemetry/disconnect/:id
router.post('/telemetry/disconnect/:id', async (req: AdminAuthRequest, res: Response) => {
  try {
    const db = await getDb();
    const conn = db.liveConnections.find(c => c.id === req.params.id);
    if (!conn) {
      return res.status(404).json({ error: 'Connection not found or already terminated' });
    }

    // Decrement server count if matched
    const server = db.servers.find(s => s.id === conn.serverId);
    if (server && server.currentConnections > 0) {
      server.currentConnections -= 1;
    }

    if (!db.forceDisconnectedHwids) {
      db.forceDisconnectedHwids = [];
    }
    if (conn.hwid && !db.forceDisconnectedHwids.includes(conn.hwid)) {
      db.forceDisconnectedHwids.push(conn.hwid);
    }

    db.liveConnections = db.liveConnections.filter(c => c.id !== req.params.id);
    saveDb();

    return res.json({ success: true, message: `Device ${conn.hwid} disconnected forcibly.` });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ==========================================
// CRYPTO & ENCRYPTION DEBUGGER TOOL
// ==========================================

// POST /api/v1/admin/tools/encrypt-tester
router.post('/tools/encrypt-tester', async (req: AdminAuthRequest, res: Response) => {
  try {
    const { mode, text, customKey } = req.body;
    const db = await getDb();
    const key = customKey || db.settings.payloadEncryptionKey;

    if (mode === 'decrypt') {
      const decrypted = decryptPayload(text, key);
      return res.json({ result: decrypted, mode: 'decrypted' });
    } else {
      const encrypted = encryptPayload(text, key);
      return res.json({ result: encrypted, mode: 'encrypted' });
    }
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// ==========================================
// SUBSCRIBERS & USERS (1GB TRIAL) MANAGEMENT
// ==========================================

// GET /api/admin/subscribers
router.get('/subscribers', async (req: AdminAuthRequest, res: Response) => {
  try {
    const db = await getDb();
    if (!db.subscribers) {
      db.subscribers = [];
    }

    const { search, operator, status } = req.query;
    let list = [...db.subscribers];

    if (operator && operator !== 'ALL') {
      list = list.filter(s => s.operator === operator);
    }

    if (status && status !== 'ALL') {
      list = list.filter(s => s.status === status);
    }

    if (search) {
      const q = (search as string).toLowerCase();
      list = list.filter(s => 
        s.phone_number.toLowerCase().includes(q) || 
        s.device_id.toLowerCase().includes(q) ||
        (s.notes && s.notes.toLowerCase().includes(q))
      );
    }

    return res.json({
      success: true,
      total: db.subscribers.length,
      count: list.length,
      subscribers: list
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/subscribers/stats
router.get('/subscribers/stats', async (req: AdminAuthRequest, res: Response) => {
  try {
    const db = await getDb();
    const subs = db.subscribers || [];

    const total = subs.length;
    const active = subs.filter(s => s.status === 'active').length;
    const expired = subs.filter(s => s.status === 'trial_expired').length;
    const suspended = subs.filter(s => s.status === 'suspended').length;
    const vipCount = subs.filter(s => s.is_vip).length;

    const operatorCounts: Record<string, number> = {
      INWI: 0,
      ORANGE: 0,
      MAROC_TELECOM: 0,
      GENERIC: 0
    };

    let totalAllocatedBytes = 0;
    let totalConsumedBytes = 0;

    for (const s of subs) {
      operatorCounts[s.operator] = (operatorCounts[s.operator] || 0) + 1;
      totalAllocatedBytes += (s.trial_total_bytes || 1073741824);
      totalConsumedBytes += (s.trial_used_bytes || 0);
    }

    return res.json({
      success: true,
      total,
      active,
      expired,
      suspended,
      vipCount,
      operatorCounts,
      totalAllocatedGb: +(totalAllocatedBytes / (1024 * 1024 * 1024)).toFixed(2),
      totalConsumedGb: +(totalConsumedBytes / (1024 * 1024 * 1024)).toFixed(2)
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/subscribers
router.post('/subscribers', async (req: AdminAuthRequest, res: Response) => {
  try {
    const db = await getDb();
    const { phone_number, operator, trial_total_bytes, is_vip, device_id, notes, durationDays } = req.body;

    if (!phone_number) {
      return res.status(400).json({ error: 'رقم الهاتف مطلوب' });
    }

    const cleanPhone = phone_number.toString().trim().replace(/[\s-]/g, '');
    if (!db.subscribers) db.subscribers = [];

    const existing = db.subscribers.find(s => s.phone_number === cleanPhone);
    if (existing) {
      return res.status(400).json({ error: 'المشترك بهذا الرقم مسجل بالفعل مسبقاً.' });
    }

    const validDays = Number(durationDays) || 30;
    const newSub: Subscriber = {
      id: 'sub_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
      phone_number: cleanPhone,
      operator: operator || 'INWI',
      trial_total_bytes: Number(trial_total_bytes) || 2147483648, // 2.0 GB default (2 * 1024 * 1024 * 1024)
      trial_used_bytes: 0,
      is_vip: Boolean(is_vip),
      vip_plan: is_vip ? 'VIP Unlimited' : undefined,
      status: 'active',
      device_id: device_id || ('dev_' + Math.random().toString(36).substring(2, 10)),
      registered_at: Date.now(),
      expires_at: Date.now() + validDays * 24 * 60 * 60 * 1000,
      notes: notes || '',
      last_sync_at: Date.now()
    };

    db.subscribers.unshift(newSub);
    saveDb();

    return res.status(201).json({ success: true, subscriber: newSub, message: 'تمت إضافة المشترك بنجاح' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// PUT /api/admin/subscribers/:id
router.put('/subscribers/:id', async (req: AdminAuthRequest, res: Response) => {
  try {
    const db = await getDb();
    if (!db.subscribers) db.subscribers = [];

    const idx = db.subscribers.findIndex(s => s.id === req.params.id);
    if (idx === -1) {
      return res.status(404).json({ error: 'المشترك غير موجود' });
    }

    const current = db.subscribers[idx];
    const { phone_number, operator, trial_total_bytes, trial_used_bytes, is_vip, status, device_id, notes, expires_at } = req.body;

    db.subscribers[idx] = {
      ...current,
      phone_number: phone_number ? phone_number.toString().trim().replace(/[\s-]/g, '') : current.phone_number,
      operator: operator || current.operator,
      trial_total_bytes: typeof trial_total_bytes === 'number' ? trial_total_bytes : current.trial_total_bytes,
      trial_used_bytes: typeof trial_used_bytes === 'number' ? trial_used_bytes : current.trial_used_bytes,
      is_vip: typeof is_vip === 'boolean' ? is_vip : current.is_vip,
      status: status || current.status,
      device_id: device_id !== undefined ? device_id : current.device_id,
      notes: notes !== undefined ? notes : current.notes,
      expires_at: typeof expires_at === 'number' ? expires_at : current.expires_at
    };

    saveDb();

    return res.json({ success: true, subscriber: db.subscribers[idx], message: 'تم تحديث بيانات المشترك بنجاح' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/subscribers/:id/extend-quota
router.post('/subscribers/:id/extend-quota', async (req: AdminAuthRequest, res: Response) => {
  try {
    const db = await getDb();
    if (!db.subscribers) db.subscribers = [];

    const sub = db.subscribers.find(s => s.id === req.params.id);
    if (!sub) {
      return res.status(404).json({ error: 'المشترك غير موجود' });
    }

    const addBytes = Number(req.body.addBytes) || 1073741824; // default +1GB
    sub.trial_total_bytes += addBytes;
    
    // If was expired, reactivate
    if (sub.status === 'trial_expired' && sub.trial_used_bytes < sub.trial_total_bytes) {
      sub.status = 'active';
    }

    saveDb();

    return res.json({
      success: true,
      subscriber: sub,
      message: `تمت إضافة +${(addBytes / (1024 * 1024)).toFixed(0)} MB إلى رصيد المشترك بنجاح.`
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/subscribers/:id/toggle-vip
router.post('/subscribers/:id/toggle-vip', async (req: AdminAuthRequest, res: Response) => {
  try {
    const db = await getDb();
    if (!db.subscribers) db.subscribers = [];

    const sub = db.subscribers.find(s => s.id === req.params.id);
    if (!sub) {
      return res.status(404).json({ error: 'المشترك غير موجود' });
    }

    sub.is_vip = !sub.is_vip;
    if (sub.is_vip) {
      sub.status = 'active';
      sub.vip_plan = 'VIP Unlimited Plan';
    } else {
      sub.vip_plan = undefined;
      if (sub.trial_used_bytes >= sub.trial_total_bytes) {
        sub.status = 'trial_expired';
      }
    }

    saveDb();

    return res.json({
      success: true,
      subscriber: sub,
      message: sub.is_vip ? 'تمت ترقية المشترك إلى حساب VIP غير محدود 🚀' : 'تم تحويل المشترك إلى الحساب المجاني التجريبي'
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/subscribers/:id/toggle-status
router.post('/subscribers/:id/toggle-status', async (req: AdminAuthRequest, res: Response) => {
  try {
    const db = await getDb();
    if (!db.subscribers) db.subscribers = [];

    const sub = db.subscribers.find(s => s.id === req.params.id);
    if (!sub) {
      return res.status(404).json({ error: 'المشترك غير موجود' });
    }

    if (sub.status === 'suspended') {
      sub.status = (!sub.is_vip && sub.trial_used_bytes >= sub.trial_total_bytes) ? 'trial_expired' : 'active';
    } else {
      sub.status = 'suspended';
    }

    saveDb();

    return res.json({
      success: true,
      subscriber: sub,
      message: sub.status === 'suspended' ? 'تم حظر وتعليق هذا المشترك ⛔' : 'تم تفعيل حساب المشترك بنجاح ✅'
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// DELETE /api/admin/subscribers/:id
router.delete('/subscribers/:id', async (req: AdminAuthRequest, res: Response) => {
  try {
    const db = await getDb();
    if (!db.subscribers) db.subscribers = [];

    const initialLen = db.subscribers.length;
    db.subscribers = db.subscribers.filter(s => s.id !== req.params.id);

    if (db.subscribers.length === initialLen) {
      return res.status(404).json({ error: 'المشترك غير موجود' });
    }

    saveDb();
    return res.json({ success: true, message: 'تم حذف المشترك من قاعدة البيانات بنجاح' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 8. PLANS CRUD (إدارة باقات الاشتراك والأسعار)
// ==========================================

// GET /api/v1/admin/plans
router.get('/plans', async (req: AdminAuthRequest, res: Response) => {
  try {
    const db = await getDb();
    if (!db.plans || db.plans.length === 0) {
      db.plans = [...INITIAL_PLANS];
      saveDb();
    }
    return res.json(db.plans);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/admin/plans
router.post('/plans', async (req: AdminAuthRequest, res: Response) => {
  try {
    const db = await getDb();
    if (!db.plans) db.plans = [];

    const { name, priceDhs, dataGb, durationDays, extraInfo, badge, operator, is_active } = req.body;

    if (!name || !priceDhs || !dataGb || !durationDays) {
      return res.status(400).json({ error: 'الاسم، السعر (درهم)، سعة الـ GB، ومدة الصلاحية (أيام) حقول مطلوبة.' });
    }

    const newPlan: SubscriptionPlan = {
      id: 'plan_' + Number(priceDhs) + 'dh_' + Number(durationDays) + 'd_' + Math.random().toString(36).substring(2, 5),
      name: name.toString().trim(),
      priceDhs: Number(priceDhs),
      dataGb: Number(dataGb),
      durationDays: Number(durationDays),
      extraInfo: extraInfo ? extraInfo.toString().trim() : '',
      badge: badge ? badge.toString().trim() : '',
      operator: operator ? operator.toString().trim().toUpperCase() as any : 'ALL',
      is_active: is_active !== false,
      createdAt: new Date().toISOString()
    };

    db.plans.push(newPlan);
    saveDb();

    return res.status(201).json({ success: true, plan: newPlan, message: 'تمت إضافة باقة الاشتراك بنجاح' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// PUT /api/v1/admin/plans/:id
router.put('/plans/:id', async (req: AdminAuthRequest, res: Response) => {
  try {
    const db = await getDb();
    if (!db.plans) db.plans = [];

    const idx = db.plans.findIndex(p => p.id === req.params.id);
    if (idx === -1) {
      return res.status(404).json({ error: 'الباقة غير موجودة' });
    }

    const current = db.plans[idx];
    const { name, priceDhs, dataGb, durationDays, extraInfo, badge, operator, is_active } = req.body;

    db.plans[idx] = {
      ...current,
      name: name !== undefined ? name.toString().trim() : current.name,
      priceDhs: priceDhs !== undefined ? Number(priceDhs) : current.priceDhs,
      dataGb: dataGb !== undefined ? Number(dataGb) : current.dataGb,
      durationDays: durationDays !== undefined ? Number(durationDays) : current.durationDays,
      extraInfo: extraInfo !== undefined ? extraInfo.toString().trim() : current.extraInfo,
      badge: badge !== undefined ? badge.toString().trim() : current.badge,
      operator: operator !== undefined ? operator.toString().trim().toUpperCase() as any : (current.operator || 'ALL'),
      is_active: is_active !== undefined ? Boolean(is_active) : current.is_active
    };

    saveDb();

    return res.json({ success: true, plan: db.plans[idx], message: 'تم تحديث بيانات الباقة بنجاح' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// DELETE /api/v1/admin/plans/:id
router.delete('/plans/:id', async (req: AdminAuthRequest, res: Response) => {
  try {
    const db = await getDb();
    if (!db.plans) db.plans = [];

    const initialLen = db.plans.length;
    db.plans = db.plans.filter(p => p.id !== req.params.id);

    if (db.plans.length === initialLen) {
      return res.status(404).json({ error: 'الباقة غير موجودة' });
    }

    saveDb();
    return res.json({ success: true, message: 'تم حذف الباقة بنجاح' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 9. RECHARGE REQUESTS (مراجعة التعبئات والاشتراكات)
// ==========================================

// GET /api/v1/admin/recharges
router.get('/recharges', async (req: AdminAuthRequest, res: Response) => {
  try {
    const db = await getDb();
    if (!db.recharges) db.recharges = [];

    const statusFilter = (req.query.status || '').toString().toLowerCase();
    const operatorFilter = (req.query.operator || '').toString().toUpperCase();
    const search = (req.query.search || '').toString().trim().toLowerCase();

    let filtered = [...db.recharges];

    if (statusFilter && statusFilter !== 'all') {
      filtered = filtered.filter(r => r.status === statusFilter);
    }

    if (operatorFilter && operatorFilter !== 'ALL') {
      filtered = filtered.filter(r => r.operator.toUpperCase().includes(operatorFilter));
    }

    if (search) {
      filtered = filtered.filter(r => 
        (r.phone_number && r.phone_number.includes(search)) ||
        (r.recharge_code && r.recharge_code.includes(search)) ||
        (r.device_id && r.device_id.toLowerCase().includes(search)) ||
        (r.plan_name && r.plan_name.toLowerCase().includes(search))
      );
    }

    // Sort by submitted_at descending (newest first)
    filtered.sort((a, b) => (b.submitted_at || 0) - (a.submitted_at || 0));

    const pendingCount = db.recharges.filter(r => r.status === 'pending').length;
    const approvedCount = db.recharges.filter(r => r.status === 'approved').length;
    const rejectedCount = db.recharges.filter(r => r.status === 'rejected').length;
    const totalRevenueDhs = db.recharges
      .filter(r => r.status === 'approved')
      .reduce((sum, r) => sum + (r.priceDhs || 0), 0);

    return res.json({
      success: true,
      recharges: filtered,
      counts: {
        total: db.recharges.length,
        pending: pendingCount,
        approved: approvedCount,
        rejected: rejectedCount,
        totalRevenueDhs
      }
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/admin/recharges/:id/approve (قبول التعبئة وتفعيل رصيد المشترك)
router.post('/recharges/:id/approve', async (req: AdminAuthRequest, res: Response) => {
  try {
    const db = await getDb();
    if (!db.recharges) db.recharges = [];
    if (!db.subscribers) db.subscribers = [];

    const recharge = db.recharges.find(r => r.id === req.params.id);
    if (!recharge) {
      return res.status(404).json({ error: 'طلب التعبئة غير موجود' });
    }

    // 1. Calculate bytes to add
    const dataGb = recharge.dataGb || 20;
    const durationDays = recharge.durationDays || 3;
    const bytesToAdd = dataGb * 1024 * 1024 * 1024;
    const durationMs = durationDays * 24 * 60 * 60 * 1000;

    // 2. Find or create subscriber
    const cleanPhone = (recharge.phone_number || '').trim().replace(/[\s-]/g, '');
    let sub = db.subscribers.find(s => 
      (cleanPhone && s.phone_number === cleanPhone) ||
      (recharge.device_id && s.device_id === recharge.device_id)
    );

    if (sub) {
      // Update existing subscriber
      sub.is_vip = true;
      sub.vip_plan = recharge.plan_name || `${recharge.priceDhs} DH / ${dataGb} GB (${durationDays}d)`;
      sub.trial_total_bytes += bytesToAdd;
      sub.status = 'active';
      
      const currentExpiry = typeof sub.expires_at === 'number' && sub.expires_at > Date.now() ? sub.expires_at : Date.now();
      sub.expires_at = currentExpiry + durationMs;
      sub.last_sync_at = Date.now();
      sub.notes = (sub.notes ? sub.notes + ' | ' : '') + `تعبئة مقبولة: ${recharge.priceDhs}DH (${dataGb}GB)`;
    } else {
      // Create new subscriber
      sub = {
        id: 'sub_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
        phone_number: cleanPhone,
        operator: recharge.operator || 'INWI',
        trial_total_bytes: bytesToAdd,
        trial_used_bytes: 0,
        is_vip: true,
        vip_plan: recharge.plan_name || `${recharge.priceDhs} DH / ${dataGb} GB (${durationDays}d)`,
        status: 'active',
        device_id: recharge.device_id || ('dev_' + Date.now().toString(36)),
        registered_at: Date.now(),
        expires_at: Date.now() + durationMs,
        notes: `تعبئة مقبولة: ${recharge.priceDhs}DH (${dataGb}GB)`,
        last_sync_at: Date.now()
      };
      db.subscribers.unshift(sub);
    }

    // 3. Mark recharge as approved
    recharge.status = 'approved';
    recharge.processed_at = Date.now();
    recharge.processed_by = req.adminUser?.name || req.adminUser?.username || 'Admin';

    saveDb();

    return res.json({
      success: true,
      message: `تم قبول طلب التعبئة بنجاح وتفعيل ${dataGb} GB وصلاحية ${durationDays} يوم للمشترك ${cleanPhone} ✅`,
      request: recharge,
      subscriber: sub
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/admin/recharges/:id/reject (رفض التعبئة)
router.post('/recharges/:id/reject', async (req: AdminAuthRequest, res: Response) => {
  try {
    const db = await getDb();
    if (!db.recharges) db.recharges = [];

    const recharge = db.recharges.find(r => r.id === req.params.id);
    if (!recharge) {
      return res.status(404).json({ error: 'طلب التعبئة غير موجود' });
    }

    const { reason } = req.body;
    recharge.status = 'rejected';
    recharge.rejection_reason = reason || 'رمز التعبئة غير صحيح أو مستعمل مسبقاً';
    recharge.processed_at = Date.now();
    recharge.processed_by = req.adminUser?.name || req.adminUser?.username || 'Admin';

    saveDb();

    return res.json({
      success: true,
      message: 'تم رفض طلب التعبئة بنجاح ⛔',
      request: recharge
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// DELETE /api/v1/admin/recharges/:id
router.delete('/recharges/:id', async (req: AdminAuthRequest, res: Response) => {
  try {
    const db = await getDb();
    if (!db.recharges) db.recharges = [];

    const initialLen = db.recharges.length;
    db.recharges = db.recharges.filter(r => r.id !== req.params.id);

    if (db.recharges.length === initialLen) {
      return res.status(404).json({ error: 'طلب التعبئة غير موجود' });
    }

    saveDb();
    return res.json({ success: true, message: 'تم حذف سجل التعبئة بنجاح' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/admin/recharges/manual (تعبئة يدوية مباشرة من لوحة التحكم)
router.post('/recharges/manual', async (req: AdminAuthRequest, res: Response) => {
  try {
    const db = await getDb();
    if (!db.recharges) db.recharges = [];
    if (!db.subscribers) db.subscribers = [];

    const { phone_number, operator, plan_id, notes } = req.body;
    const cleanPhone = (phone_number || '').toString().trim().replace(/[\s-]/g, '');

    if (!cleanPhone) {
      return res.status(400).json({ error: 'رقم الهاتف مطلوب' });
    }

    let plan = (db.plans || []).find(p => p.id === plan_id);
    if (!plan) {
      plan = (db.plans && db.plans.length > 0) ? db.plans[0] : INITIAL_PLANS[0];
    }

    const dataGb = plan.dataGb || 20;
    const durationDays = plan.durationDays || 3;
    const bytesToAdd = dataGb * 1024 * 1024 * 1024;
    const durationMs = durationDays * 24 * 60 * 60 * 1000;

    // Create recharge request directly as approved
    const manualRecharge: RechargeRequest = {
      id: 'rch_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
      phone_number: cleanPhone,
      operator: operator || 'INWI',
      plan_id: plan.id,
      plan_name: plan.name,
      priceDhs: plan.priceDhs,
      dataGb: dataGb,
      durationDays: durationDays,
      recharge_code: 'MANUAL_ADMIN_TOPUP',
      device_id: 'admin_direct',
      status: 'approved',
      submitted_at: Date.now(),
      processed_at: Date.now(),
      processed_by: req.adminUser?.name || req.adminUser?.username || 'Admin',
      notes: notes || 'شحن يدوي مباشر من لوحة الأدمن'
    };

    db.recharges.unshift(manualRecharge);

    // Update or create subscriber
    let sub = db.subscribers.find(s => s.phone_number === cleanPhone);
    if (sub) {
      sub.is_vip = true;
      sub.vip_plan = plan.name;
      sub.trial_total_bytes += bytesToAdd;
      sub.status = 'active';
      const currentExpiry = typeof sub.expires_at === 'number' && sub.expires_at > Date.now() ? sub.expires_at : Date.now();
      sub.expires_at = currentExpiry + durationMs;
      sub.last_sync_at = Date.now();
      sub.notes = (sub.notes ? sub.notes + ' | ' : '') + `شحن يدوي: ${plan.name}`;
    } else {
      sub = {
        id: 'sub_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
        phone_number: cleanPhone,
        operator: operator || 'INWI',
        trial_total_bytes: bytesToAdd,
        trial_used_bytes: 0,
        is_vip: true,
        vip_plan: plan.name,
        status: 'active',
        device_id: 'dev_' + Date.now().toString(36),
        registered_at: Date.now(),
        expires_at: Date.now() + durationMs,
        notes: `شحن يدوي: ${plan.name}`,
        last_sync_at: Date.now()
      };
      db.subscribers.unshift(sub);
    }

    saveDb();

    return res.status(201).json({
      success: true,
      message: `تم شحن رصيد ${dataGb} GB وصلاحية ${durationDays} يوم للمشترك ${cleanPhone} بنجاح ✅`,
      request: manualRecharge,
      subscriber: sub
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
