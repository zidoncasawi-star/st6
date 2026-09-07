import { Router, Request, Response, NextFunction } from 'express';
import { getDb, saveDb, INITIAL_PLANS } from '../db.js';
import { encryptPayload, verifyClientSignature } from '../crypto.js';
import { LiveConnection, RechargeRequest, SubscriptionPlan } from '../../src/types/vpn.js';

const router = Router();

/**
 * Security Middleware: Check X-Client-Secret if provided
 */
router.use(async (req: Request, res: Response, next: NextFunction) => {
  const clientSecret = req.headers['x-client-secret'] as string;
  // If client provides X-Client-Secret header, check its validity
  if (clientSecret) {
    const db = await getDb();
    const validSecret = db.settings.clientAppSecret || 'nexus_client_sec_2026_x791a8c';
    if (
      clientSecret !== validSecret &&
      clientSecret !== 'nexus_client_sec_2026_x791a8c' &&
      clientSecret !== 'NEXUS-ANDROID-APP-SECRET-V1-SECURE'
    ) {
      return res.status(401).json({
        status: 'error',
        valid: false,
        success: false,
        error: 'Unauthorized: Invalid X-Client-Secret header.'
      });
    }
  }
  next();
});

/**
 * Helper to validate a license key against HWID
 */
async function checkLicense(hwid: string, licenseKey: string) {
  const db = await getDb();
  const cleanKey = (licenseKey || '').trim().toUpperCase();
  const cleanHwid = (hwid || '').trim();

  if (!cleanKey) {
    return { valid: false, reason: 'يرجى إدخال كود الترخيص' };
  }

  const license = db.licenses.find(l => l.key === cleanKey);

  if (!license) {
    return { valid: false, reason: 'كود الترخيص غير موجود أو غير صالح.' };
  }

  if (license.status === 'suspended') {
    return { valid: false, reason: 'تم تجميد هذا الترخيص من قبل إدارة الخوادم.' };
  }

  if (license.status === 'expired') {
    return { valid: false, reason: 'انتهت صلاحية قسيمة هذا الاشتراك.' };
  }

  if (license.expiresAt) {
    const expiryDate = new Date(license.expiresAt).getTime();
    if (Date.now() > expiryDate) {
      license.status = 'expired';
      saveDb();
      return { valid: false, reason: 'انتهت فترة صلاحية الاشتراك.' };
    }
  }

  // Check HWID binding
  if (cleanHwid) {
    if (!license.boundHwids.includes(cleanHwid)) {
      if (license.boundHwids.length >= license.maxDevices) {
        return {
          valid: false,
          reason: `تم تجاوز الحد الأقصى للأجهزة (${license.boundHwids.length}/${license.maxDevices}). تواصل مع الدعم لفك ربط العتاد (Reset HWID).`
        };
      }
      // Bind current HWID
      license.boundHwids.push(cleanHwid);
      if (!license.activatedAt) {
        license.activatedAt = new Date().toISOString();
      }
      saveDb();
    }
  }

  return { valid: true, license };
}

/**
 * Helper to build standard init response
 */
async function buildInitResponse(req: Request) {
  const db = await getDb();
  const clientVer = (req.body?.appVersion || req.query?.appVersion || req.query?.version || '1.0.0') as string;
  const isOutdated = clientVer < db.settings.minAppVersion;
  const isKillActive = Boolean(db.settings.killSwitchActivated || db.settings.maintenanceMode);

  const formattedServers = db.servers
    .filter(s => s.status !== 'maintenance')
    .map(s => ({
      id: s.id,
      name: s.name,
      country: s.countryName,
      countryCode: s.countryCode,
      flag: s.flag,
      host: s.domain || s.ip,
      ip: s.ip,
      port: s.ports && s.ports.length > 0 ? s.ports[0] : 80,
      ports: s.ports || [80, 443],
      protocol: s.protocol === 'WebSocket TUN' ? 'WS' : s.protocol,
      pingMs: s.pingMs || 35,
      speedMbps: s.speedMbps || 1000,
      isGamingReady: s.protocol === 'BadVPN UDP' || (s.ports && s.ports.includes(7300)) || false,
      isAutoSelect: true,
      status: s.status,
      wsPath: s.wsPath || '/ws-tunnel',
      sshPort: s.sshPort || 22,
      authUsername: s.authUsername || '',
      authPassword: s.authPassword || ''
    }));

  const formattedProfiles = db.profiles
    .filter(p => p.status === 'active')
    .map(p => ({
      id: p.id,
      name: p.name,
      operator: p.operator,
      bugHost: p.bugHost,
      sni: p.sni,
      payloadTemplate: p.payloadTemplate,
      sslEnabled: p.sslEnabled,
      heartbeatInterval: p.heartbeatInterval || 20,
      keepAlive: p.keepAlive,
      status: p.status,
      targetProtocol: p.targetProtocol,
      description: p.description || ''
    }));

  return {
    status: 'ok',
    success: true,
    minVersion: db.settings.minAppVersion,
    currentVersion: db.settings.currentVersion,
    killSwitch: isKillActive,
    maintenance: db.settings.maintenanceMode,
    maintenanceMessage: db.settings.maintenanceMessage,
    announcement: db.settings.announcementEnabled ? db.settings.announcementMessage : '',
    updateUrl: db.settings.updateUrl,
    forceUpdate: db.settings.forceUpdate || isOutdated,
    servers: formattedServers,
    profiles: formattedProfiles,
    operators: db.settings.enabledOperators,
    support: {
      telegram: db.settings.telegramSupport,
      email: db.settings.supportEmail
    }
  };
}

// =========================================================================
// 1. POST /init & GET /init & /app/init (App initialization and server fleet)
// =========================================================================
router.post('/init', async (req: Request, res: Response) => {
  try {
    const data = await buildInitResponse(req);
    return res.json(data);
  } catch (err: any) {
    return res.status(500).json({ status: 'error', success: false, error: err.message });
  }
});

router.get('/init', async (req: Request, res: Response) => {
  try {
    const data = await buildInitResponse(req);
    return res.json(data);
  } catch (err: any) {
    return res.status(500).json({ status: 'error', success: false, error: err.message });
  }
});

router.get('/app/init', async (req: Request, res: Response) => {
  try {
    const data = await buildInitResponse(req);
    return res.json(data);
  } catch (err: any) {
    return res.status(500).json({ status: 'error', success: false, error: err.message });
  }
});

router.post('/app/init', async (req: Request, res: Response) => {
  try {
    const data = await buildInitResponse(req);
    return res.json(data);
  } catch (err: any) {
    return res.status(500).json({ status: 'error', success: false, error: err.message });
  }
});

// =========================================================================
// 2. POST /verify-license & /auth/verify-license (License Key & HWID Check)
// =========================================================================
router.post(['/verify-license', '/auth/verify-license', '/app/auth'], async (req: Request, res: Response) => {
  try {
    const hwid = (req.body?.hwid || req.headers['x-hwid'] || '').toString();
    const licenseKey = (req.body?.licenseKey || '').toString();

    if (!hwid && !licenseKey) {
      return res.status(400).json({
        status: 'error',
        valid: false,
        success: false,
        message: 'Missing required parameters: hwid and licenseKey are required.'
      });
    }

    const check = await checkLicense(hwid, licenseKey);
    if (!check.valid || !check.license) {
      return res.status(403).json({
        status: 'error',
        valid: false,
        success: false,
        message: check.reason || 'Invalid license key'
      });
    }

    const lic = check.license;
    return res.json({
      status: 'ok',
      valid: true,
      success: true,
      licenseKey: lic.key,
      planType: `VIP Member (${lic.duration})`,
      duration: lic.duration,
      expiresAt: lic.expiresAt,
      maxDevices: lic.maxDevices,
      activeDevices: lic.boundHwids.length,
      boundDevices: lic.boundHwids,
      owner: lic.ownerName,
      message: 'تم تفعيل الاشتراك بنجاح',
      clientSessionToken: Buffer.from(`${hwid}:${lic.key}:${Date.now()}`).toString('base64')
    });
  } catch (err: any) {
    return res.status(500).json({ status: 'error', valid: false, success: false, error: err.message });
  }
});

// =========================================================================
// 3. POST /connect (Register new active VPN session)
// =========================================================================
router.post('/connect', async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const { hwid, licenseKey, serverId, profileId, deviceName, appVersion } = req.body;
    const clientHwid = (hwid || req.headers['x-hwid'] || 'HWID-CLIENT-' + Date.now().toString(36)).toString();

    if (db.settings.killSwitchActivated || db.settings.maintenanceMode) {
      return res.status(503).json({
        status: 'error',
        success: false,
        killSwitch: true,
        message: db.settings.maintenanceMessage || 'Remote Kill-Switch is active. Connection refused.'
      });
    }

    const clientIp = ((req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '197.230.1.1').split(',')[0].trim();
    const server = db.servers.find(s => s.id === serverId) || db.servers[0];
    const profile = db.profiles.find(p => p.id === profileId) || db.profiles[0];

    // Remove client from forceDisconnectedHwids on new fresh connect request
    if (db.forceDisconnectedHwids) {
      db.forceDisconnectedHwids = db.forceDisconnectedHwids.filter(h => h !== clientHwid);
    }

    // Upsert live connection
    const sessionId = 'sess_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
    const existingIdx = db.liveConnections.findIndex(c => c.hwid === clientHwid);

    const connObj: LiveConnection = {
      id: sessionId,
      hwid: clientHwid,
      licenseKey: licenseKey || 'FREE-TRIAL',
      deviceName: deviceName || 'Android Device',
      clientIp,
      serverId: server ? server.id : 'srv_auto',
      serverName: server ? server.name : 'Auto Gateway',
      profileId: profile ? profile.id : 'prof_auto',
      profileName: profile ? profile.name : 'Default Injection',
      operator: profile ? profile.operator : 'Inwi',
      bytesUp: 10240,
      bytesDown: 24500,
      connectedAt: new Date().toISOString(),
      pingMs: server ? server.pingMs : 35,
      appVersion: appVersion || '1.5.2'
    };

    if (existingIdx !== -1) {
      db.liveConnections[existingIdx] = connObj;
    } else {
      db.liveConnections.unshift(connObj);
      if (server) {
        server.currentConnections = (server.currentConnections || 0) + 1;
      }
    }

    saveDb();

    return res.json({
      status: 'ok',
      success: true,
      sessionId,
      killSwitch: false,
      message: 'تم بدء جلسة الاتصال بنجاح',
      connectedServer: server ? server.name : 'Nexus Node'
    });
  } catch (err: any) {
    return res.status(500).json({ status: 'error', success: false, error: err.message });
  }
});

// =========================================================================
// 4. POST /ping & /app/telemetry/heartbeat (Heartbeat telemetry every 15s)
// =========================================================================
router.post(['/ping', '/app/telemetry/heartbeat'], async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const { hwid, sessionId, bytesTx, bytesRx, bytesUp, bytesDown, pingMs, durationSeconds } = req.body;
    const clientHwid = (hwid || req.headers['x-hwid'] || '').toString();

    // Check emergency kill switch
    if (db.settings.killSwitchActivated) {
      return res.json({
        status: 'ok',
        success: true,
        killSwitch: true,
        forceDisconnect: true,
        message: 'تم تفعيل الإيقاف الطارئ العام (Master Kill Switch). جاري قطع النفق.'
      });
    }

    // Check if admin forcefully disconnected this specific HWID
    const isForceDisconnected = db.forceDisconnectedHwids && db.forceDisconnectedHwids.includes(clientHwid);
    if (isForceDisconnected) {
      return res.json({
        status: 'ok',
        success: true,
        killSwitch: true,
        forceDisconnect: true,
        message: 'تم إنهاء الجلسة وطرد الاتصال من قبل المشرف.'
      });
    }

    // Update connection telemetry
    const conn = db.liveConnections.find(c => c.hwid === clientHwid || (sessionId && c.id === sessionId));
    if (conn) {
      const up = Number(bytesTx || bytesUp) || 0;
      const down = Number(bytesRx || bytesDown) || 0;
      if (up > 0) conn.bytesUp = up;
      if (down > 0) conn.bytesDown = down;
      if (pingMs) conn.pingMs = Number(pingMs);
      saveDb();
    }

    return res.json({
      status: 'ok',
      success: true,
      killSwitch: false,
      forceDisconnect: false,
      serverTime: new Date().toISOString()
    });
  } catch (err: any) {
    return res.status(500).json({ status: 'error', success: false, error: err.message });
  }
});

// =========================================================================
// 5. POST /disconnect (Graceful session close)
// =========================================================================
router.post('/disconnect', async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const { hwid, sessionId, bytesTx, bytesRx } = req.body;
    const clientHwid = (hwid || req.headers['x-hwid'] || '').toString();

    const connIdx = db.liveConnections.findIndex(c => c.hwid === clientHwid || (sessionId && c.id === sessionId));
    if (connIdx !== -1) {
      const conn = db.liveConnections[connIdx];
      const server = db.servers.find(s => s.id === conn.serverId);
      if (server && server.currentConnections > 0) {
        server.currentConnections -= 1;
      }
      db.liveConnections.splice(connIdx, 1);
      saveDb();
    }

    return res.json({
      status: 'ok',
      success: true,
      message: 'تم إنهاء الجلسة بنجاح'
    });
  } catch (err: any) {
    return res.status(500).json({ status: 'error', success: false, error: err.message });
  }
});

// =========================================================================
// 6. GET /app/servers (Public active servers)
// =========================================================================
router.get('/app/servers', async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    if (db.settings.maintenanceMode || db.settings.killSwitchActivated) {
      return res.status(503).json({
        success: false,
        error: 'System is under maintenance. No servers available.',
        maintenance: true
      });
    }

    const publicServers = db.servers
      .filter(s => s.status !== 'maintenance')
      .map(s => ({
        id: s.id,
        name: s.name,
        countryCode: s.countryCode,
        countryName: s.countryName,
        flag: s.flag,
        protocol: s.protocol,
        ports: s.ports,
        status: s.status,
        pingMs: s.pingMs,
        speedMbps: s.speedMbps,
        isFull: (s.currentConnections || 0) >= s.capacity,
        loadPercentage: Math.min(100, Math.round(((s.currentConnections || 0) / s.capacity) * 100))
      }));

    return res.json({
      success: true,
      count: publicServers.length,
      servers: publicServers
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// =========================================================================
// 7. GET /app/config/:serverId (Obfuscated & Encrypted config bundle)
// =========================================================================
router.get('/app/config/:serverId', async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const { serverId } = req.params;
    const { profileId, hwid, licenseKey } = req.query;

    if (db.settings.maintenanceMode || db.settings.killSwitchActivated) {
      return res.status(503).json({ error: 'Maintenance mode is active.' });
    }

    const server = db.servers.find(s => s.id === serverId);
    if (!server) {
      return res.status(404).json({ error: 'Server not found' });
    }

    let profile = db.profiles.find(p => p.id === profileId);
    if (!profile) {
      profile = db.profiles.find(p => p.status === 'active') || db.profiles[0];
    }

    const rawConfig = {
      server: {
        id: server.id,
        name: server.name,
        host: server.domain || server.ip,
        ip: server.ip,
        ports: server.ports,
        primaryPort: server.ports[0],
        protocol: server.protocol,
        wsPath: server.wsPath,
        sshPort: server.sshPort || 22,
        auth: {
          username: server.authUsername,
          password: server.authPassword,
          publicKey: server.publicKey
        }
      },
      profile: profile ? {
        id: profile.id,
        name: profile.name,
        operator: profile.operator,
        sni: profile.sni,
        bugHost: profile.bugHost,
        payload: profile.payloadTemplate
          .replace(/\[host\]/g, server.domain || server.ip)
          .replace(/\[host_port\]/g, `${server.domain || server.ip}:${server.ports[0]}`)
          .replace(/\[port\]/g, String(server.ports[0]))
          .replace(/\[crlf\]/g, '\r\n')
          .replace(/\[ua\]/g, 'Dalvik/2.1.0 (Linux; U; Android 14)')
          .replace(/\[random\]/g, Math.random().toString(36).substring(2, 10)),
        sslEnabled: profile.sslEnabled,
        heartbeatInterval: profile.heartbeatInterval,
        keepAlive: profile.keepAlive
      } : null,
      meta: {
        generatedAt: new Date().toISOString(),
        clientHwid: hwid || 'ANONYMOUS',
        licenseKey: licenseKey || 'FREE-TRIAL'
      }
    };

    const encryptedBundle = encryptPayload(rawConfig, db.settings.payloadEncryptionKey);

    return res.json({
      success: true,
      serverId: server.id,
      encrypted: true,
      encryptionAlgorithm: 'AES-256-CBC-HMAC-SHA256',
      data: encryptedBundle
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// =========================================================================
// 8. GET /config/sync (Client signature synchronization)
// =========================================================================
router.get('/config/sync', async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const clientSecretHeader = req.headers['x-client-secret'] as string;
    const clientSignatureHeader = req.headers['x-client-signature'] as string;
    const clientHwid = (req.headers['x-hwid'] as string) || (req.query.hwid as string) || 'UNKNOWN';
    const timestamp = Number(req.headers['x-timestamp']) || Date.now();

    const isDirectSecretMatch = clientSecretHeader && (
      clientSecretHeader === db.settings.clientAppSecret ||
      clientSecretHeader === 'nexus_client_sec_2026_x791a8c' ||
      clientSecretHeader === 'NEXUS-ANDROID-APP-SECRET-V1-SECURE'
    );
    const isSignatureValid = verifyClientSignature(clientHwid, timestamp, clientSignatureHeader);

    const authHeader = req.headers.authorization;
    const isAdminAuth = authHeader && authHeader.startsWith('Bearer ');

    if (!isDirectSecretMatch && !isSignatureValid && !isAdminAuth) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized: Invalid or missing Android Client App Signature / Secret Key.'
      });
    }

    if (db.settings.maintenanceMode || db.settings.killSwitchActivated) {
      return res.status(503).json({
        success: false,
        error: db.settings.maintenanceMessage || 'Network maintenance in progress.'
      });
    }

    const fullPayload = {
      appSettings: {
        appName: db.settings.appName,
        minVersion: db.settings.minAppVersion,
        currentVersion: db.settings.currentVersion,
        updateUrl: db.settings.updateUrl,
        announcement: db.settings.announcementMessage,
        operators: db.settings.enabledOperators
      },
      servers: db.servers.filter(s => s.status !== 'maintenance'),
      profiles: db.profiles.filter(p => p.status === 'active'),
      syncedAt: new Date().toISOString()
    };

    const encryptedData = encryptPayload(fullPayload, db.settings.payloadEncryptionKey);

    return res.json({
      success: true,
      syncVersion: '2.0',
      encrypted: true,
      data: encryptedData
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// =========================================================================
// 9. POST /user/register & /api/user/register (Subscriber Registration & 1GB Trial)
// =========================================================================
router.post(['/user/register', '/subscribers/register'], async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const { phone_number, operator, device_id } = req.body;

    const rawPhone = (phone_number || '').toString().trim().replace(/[\s-]/g, '');
    const rawDevId = (device_id || req.headers['x-hwid'] || '').toString().trim();
    
    if (!rawPhone && !rawDevId) {
      return res.status(400).json({
        status: 'error',
        success: false,
        message: 'رقم الهاتف (phone_number) أو معرّف الجهاز (device_id) مطلوب لإتمام التسجيل.'
      });
    }

    // Normalize operator
    let normOp: 'INWI' | 'ORANGE' | 'MAROC_TELECOM' | 'GENERIC' = 'INWI';
    const opStr = (operator || '').toString().toUpperCase();
    if (opStr.includes('INWI')) normOp = 'INWI';
    else if (opStr.includes('ORANGE')) normOp = 'ORANGE';
    else if (opStr.includes('MAROC') || opStr.includes('IAM') || opStr.includes('TELECOM')) normOp = 'MAROC_TELECOM';
    else normOp = 'GENERIC';

    // Find existing subscriber by phone or device_id
    if (!db.subscribers) {
      db.subscribers = [];
    }

    let user = db.subscribers.find(s => 
      (rawPhone && s.phone_number === rawPhone) || 
      (rawDevId && s.device_id === rawDevId)
    );

    if (user) {
      // Update device_id or operator if provided
      if (rawDevId) user.device_id = rawDevId;
      if (rawPhone && (!user.phone_number || user.phone_number.length < 8)) user.phone_number = rawPhone;
      user.last_sync_at = Date.now();

      // Check expiration
      if (!user.is_vip && user.trial_used_bytes >= user.trial_total_bytes) {
        user.status = 'trial_expired';
      }
      if (user.expires_at && Date.now() > user.expires_at) {
        if (!user.is_vip) user.status = 'trial_expired';
      }

      saveDb();

      const remainingBytes = user.is_vip ? 999999999999 : Math.max(0, user.trial_total_bytes - user.trial_used_bytes);
      return res.json({
        status: 'ok',
        success: true,
        isNew: false,
        message: user.is_vip ? 'مرحباً بك مجدداً! حساب VIP نشط' : 'تم العثور على حسابك بنجاح',
        user: {
          phone_number: user.phone_number,
          operator: user.operator,
          trial_total_bytes: user.trial_total_bytes,
          trial_used_bytes: user.trial_used_bytes,
          is_vip: user.is_vip,
          status: user.status,
          device_id: user.device_id,
          registered_at: user.registered_at,
          expires_at: user.expires_at
        },
        remaining_bytes: remainingBytes
      });
    }

    // Check if device_id has ever been used (Prevent abuse by changing phone number)
    const existingDeviceUser = db.subscribers.find(s => rawDevId && s.device_id === rawDevId);
    
    // Determine Trial Eligibility
    // If device was already used for a trial/account, NO new trial.
    const isStar6 = ['INWI', 'ORANGE', 'MAROC_TELECOM'].includes(normOp);
    const canGetTrial = isStar6 && !existingDeviceUser;

    const trialBytes = canGetTrial ? (500 * 1024 * 1024) : 0; // 500 MB for *6, 0 for others
    const initialStatus = canGetTrial ? 'active' : 'trial_expired'; // Active for trial, expired otherwise
    const expiresAt = canGetTrial ? (Date.now() + 2 * 60 * 60 * 1000) : Date.now(); // 2 hours for trial

    // Create new subscriber
    const newSubscriber = {
      id: 'sub_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
      phone_number: rawPhone || ('06' + Math.floor(10000000 + Math.random() * 90000000)),
      operator: normOp,
      trial_total_bytes: trialBytes,
      trial_used_bytes: 0,
      is_vip: false,
      status: initialStatus as const,
      device_id: rawDevId || ('dev_' + Date.now().toString(36)),
      registered_at: Date.now(),
      expires_at: expiresAt,
      last_sync_at: Date.now()
    };

    db.subscribers.unshift(newSubscriber);
    saveDb();

    return res.status(201).json({
      status: 'ok',
      success: true,
      isNew: true,
      message: 'تم تسجيل المشترك بنجاح وتفعيل رصيد 2.0 GB مجاناً',
      user: {
        phone_number: newSubscriber.phone_number,
        operator: newSubscriber.operator,
        trial_total_bytes: newSubscriber.trial_total_bytes,
        trial_used_bytes: newSubscriber.trial_used_bytes,
        is_vip: newSubscriber.is_vip,
        status: newSubscriber.status,
        device_id: newSubscriber.device_id,
        registered_at: newSubscriber.registered_at,
        expires_at: newSubscriber.expires_at
      },
      remaining_bytes: newSubscriber.trial_total_bytes
    });
  } catch (err: any) {
    return res.status(500).json({ status: 'error', success: false, error: err.message });
  }
});

// =========================================================================
// 10. POST /user/sync-usage (Deduct consumed bytes from 1.0 GB trial)
// =========================================================================
router.post(['/user/sync-usage', '/subscribers/sync-usage'], async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const { phone_number, device_id, used_bytes, bytesTx, bytesRx } = req.body;

    const rawPhone = (phone_number || '').toString().trim().replace(/[\s-]/g, '');
    const rawDevId = (device_id || req.headers['x-hwid'] || '').toString().trim();

    if (!db.subscribers) {
      db.subscribers = [];
    }

    let user = db.subscribers.find(s => 
      (rawPhone && s.phone_number === rawPhone) || 
      (rawDevId && s.device_id === rawDevId)
    );

    if (!user) {
      return res.status(404).json({
        status: 'error',
        success: false,
        message: 'المشترك غير موجود. يرجى التسجيل أولاً عبر /api/user/register.'
      });
    }

    // Calculate added bytes
    let deltaBytes = 0;
    if (typeof used_bytes === 'number' && used_bytes > 0) {
      deltaBytes = used_bytes;
    } else if (bytesTx || bytesRx) {
      deltaBytes = (Number(bytesTx) || 0) + (Number(bytesRx) || 0);
    }

    if (deltaBytes > 0) {
      user.trial_used_bytes += deltaBytes;
    }

    user.last_sync_at = Date.now();

    // Check quota
    if (!user.is_vip && user.trial_used_bytes >= user.trial_total_bytes) {
      user.status = 'trial_expired';
    }

    saveDb();

    const remaining = user.is_vip ? 999999999999 : Math.max(0, user.trial_total_bytes - user.trial_used_bytes);
    const isExpired = user.status === 'trial_expired' && !user.is_vip;

    return res.json({
      status: 'ok',
      success: true,
      is_vip: user.is_vip,
      user_status: user.status,
      trial_total_bytes: user.trial_total_bytes,
      trial_used_bytes: user.trial_used_bytes,
      remaining_bytes: remaining,
      is_expired: isExpired,
      message: isExpired ? 'لقد استهلكت رصيدك التجريبي بالكامل (1.0 GB). قم بالترقية إلى VIP للمتابعة.' : 'تمت مزامنة الاستهلاك بنجاح'
    });
  } catch (err: any) {
    return res.status(500).json({ status: 'error', success: false, error: err.message });
  }
});

// =========================================================================
// 11. GET /user/profile & /user/status
// =========================================================================
router.get(['/user/profile', '/user/status'], async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const phone = (req.query.phone_number || req.query.phone || '').toString().trim().replace(/[\s-]/g, '');
    const devId = (req.query.device_id || req.query.hwid || req.headers['x-hwid'] || '').toString().trim();

    if (!db.subscribers) {
      db.subscribers = [];
    }

    const user = db.subscribers.find(s => (phone && s.phone_number === phone) || (devId && s.device_id === devId));

    if (!user) {
      return res.status(404).json({
        status: 'error',
        success: false,
        message: 'المشترك غير مسجل'
      });
    }

    const remaining = user.is_vip ? 999999999999 : Math.max(0, user.trial_total_bytes - user.trial_used_bytes);

    return res.json({
      status: 'ok',
      success: true,
      user: {
        id: user.id,
        phone_number: user.phone_number,
        operator: user.operator,
        trial_total_bytes: user.trial_total_bytes,
        trial_used_bytes: user.trial_used_bytes,
        remaining_bytes: remaining,
        is_vip: user.is_vip,
        vip_plan: user.vip_plan,
        status: user.status,
        device_id: user.device_id,
        registered_at: user.registered_at,
        expires_at: user.expires_at,
        last_sync_at: user.last_sync_at
      }
    });
  } catch (err: any) {
    return res.status(500).json({ status: 'error', success: false, error: err.message });
  }
});

// =========================================================================
// 12. GET /config?operator={operator} (Filtered Tweaks & Presets per Operator)
// =========================================================================
router.get(['/config', '/presets'], async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const rawOperator = (req.query.operator || req.query.op || 'ALL').toString().toUpperCase();

    let matchedOperator = 'All / Generic';
    if (rawOperator.includes('INWI')) {
      matchedOperator = 'Inwi';
    } else if (rawOperator.includes('ORANGE')) {
      matchedOperator = 'Orange';
    } else if (rawOperator.includes('MAROC') || rawOperator.includes('IAM') || rawOperator.includes('TELECOM')) {
      matchedOperator = 'Maroc Telecom';
    }

    // Filter profiles
    const filteredProfiles = db.profiles
      .filter(p => p.status === 'active')
      .filter(p => {
        if (rawOperator === 'ALL' || rawOperator === 'GENERIC') return true;
        return p.operator === matchedOperator || p.operator === 'All / Generic' || p.operator === 'International';
      })
      .map(p => ({
        id: p.id,
        name: p.name,
        operator: p.operator,
        bugHost: p.bugHost,
        sni: p.sni,
        payloadTemplate: p.payloadTemplate,
        sslEnabled: p.sslEnabled,
        heartbeatInterval: p.heartbeatInterval,
        keepAlive: p.keepAlive,
        targetProtocol: p.targetProtocol,
        status: p.status,
        description: p.description
      }));

    // Active servers
    const availableServers = db.servers
      .filter(s => s.status !== 'maintenance')
      .map(s => ({
        id: s.id,
        name: s.name,
        country: s.countryName,
        countryCode: s.countryCode,
        flag: s.flag,
        host: s.domain || s.ip,
        ip: s.ip,
        port: s.ports && s.ports.length > 0 ? s.ports[0] : 80,
        ports: s.ports,
        protocol: s.protocol === 'WebSocket TUN' ? 'WS' : s.protocol,
        pingMs: s.pingMs,
        speedMbps: s.speedMbps,
        isGamingReady: s.protocol === 'BadVPN UDP' || (s.ports && s.ports.includes(7300)) || false,
        isAutoSelect: true,
        status: s.status
      }));

    return res.json({
      status: 'ok',
      success: true,
      operator: rawOperator,
      matchedOperatorName: matchedOperator,
      count: filteredProfiles.length,
      killSwitch: Boolean(db.settings.killSwitchActivated || db.settings.maintenanceMode),
      announcement: db.settings.announcementEnabled ? db.settings.announcementMessage : '',
      updateUrl: db.settings.updateUrl,
      minVersion: db.settings.minAppVersion,
      servers: availableServers,
      profiles: filteredProfiles
    });
  } catch (err: any) {
    return res.status(500).json({ status: 'error', success: false, error: err.message });
  }
});

// =========================================================================
// 13. GET /recharge/plans & GET /plans (Available Subscription Plans)
// =========================================================================
router.get(['/recharge/plans', '/plans', '/public-plans'], async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const plans = (db.plans && db.plans.length > 0) ? db.plans : INITIAL_PLANS;
    const activePlans = plans.filter(p => p.is_active !== false).map(p => ({
      ...p,
      price_dhs: p.priceDhs,
      data_gb: p.dataGb,
      duration_days: p.durationDays,
      extra_info: p.extraInfo,
    }));

    return res.json({
      status: 'ok',
      success: true,
      plans: activePlans
    });
  } catch (err: any) {
    return res.status(500).json({ status: 'error', success: false, error: err.message });
  }
});

// =========================================================================
// 14. POST /recharge/submit (Manual Recharge Submission Endpoint)
// =========================================================================
router.post(['/recharge/submit', '/recharge/request'], async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    if (!db.recharges) {
      db.recharges = [];
    }
    if (!db.plans || db.plans.length === 0) {
      db.plans = [...INITIAL_PLANS];
    }

    const { phone_number, operator, plan_id, recharge_code, device_id, hwid } = req.body;

    const rawPhone = (phone_number || '').toString().trim().replace(/[\s-]/g, '');
    const rawCode = (recharge_code || req.body.code || '').toString().trim().replace(/[\s-]/g, '');
    const rawPlanId = (plan_id || '').toString().trim();
    const rawDevId = (device_id || hwid || req.headers['x-hwid'] || '').toString().trim();

    if (!rawPhone || rawPhone.length < 8) {
      return res.status(400).json({
        status: 'error',
        success: false,
        message: 'يرجى إدخال رقم هاتف صحيح (مثال: 06XXXXXXXX أو 07XXXXXXXX)'
      });
    }

    if (!rawCode || rawCode.length < 4) {
      return res.status(400).json({
        status: 'error',
        success: false,
        message: 'يرجى إدخال كود أو رمز التعبئة بشكل صحيح'
      });
    }

    // Match plan
    let matchedPlan = db.plans.find(p => p.id === rawPlanId);
    if (!matchedPlan) {
      // Try finding by price or default to 20DH
      matchedPlan = db.plans[0] || INITIAL_PLANS[0];
    }

    // Determine normalized operator
    let normOp: 'INWI' | 'ORANGE' | 'MAROC_TELECOM' | 'GENERIC' = 'INWI';
    const rawOpStr = (operator || '').toString().toUpperCase();
    if (rawOpStr.includes('ORANGE')) {
      normOp = 'ORANGE';
    } else if (rawOpStr.includes('MAROC') || rawOpStr.includes('IAM') || rawOpStr.includes('TELECOM')) {
      normOp = 'MAROC_TELECOM';
    } else if (rawOpStr.includes('GENERIC') || rawOpStr.includes('ALL')) {
      normOp = 'GENERIC';
    } else {
      normOp = 'INWI';
    }

    const newRecharge: RechargeRequest = {
      id: 'rch_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
      phone_number: rawPhone,
      operator: normOp,
      plan_id: matchedPlan.id,
      plan_name: matchedPlan.name,
      priceDhs: matchedPlan.priceDhs,
      dataGb: matchedPlan.dataGb,
      durationDays: matchedPlan.durationDays,
      recharge_code: rawCode,
      device_id: rawDevId || ('dev_' + Date.now().toString(36)),
      status: 'pending',
      submitted_at: Date.now()
    };

    db.recharges.unshift(newRecharge);
    saveDb();

    return res.status(201).json({
      status: 'ok',
      success: true,
      message: `تم إرسال طلب التعبئة بنجاح (${matchedPlan.name} - ${matchedPlan.priceDhs} درهم). سيقوم المشرف بمراجعته وتفعيل رصيدك فوراً.`,
      request: newRecharge,
      pending_count: db.recharges.filter(r => r.status === 'pending').length
    });
  } catch (err: any) {
    return res.status(500).json({ status: 'error', success: false, error: err.message });
  }
});

// =========================================================================
// 15. GET /recharge/status & /recharge/history (Client Recharge Status Query)
// =========================================================================
router.get(['/recharge/status', '/recharge/history'], async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const phone = (req.query.phone_number || req.query.phone || '').toString().trim().replace(/[\s-]/g, '');
    const devId = (req.query.device_id || req.query.hwid || req.headers['x-hwid'] || '').toString().trim();

    const recharges = (db.recharges || []).filter(r => 
      (phone && r.phone_number === phone) || 
      (devId && r.device_id === devId)
    );

    const latest = recharges.length > 0 ? recharges[0] : null;

    return res.json({
      status: 'ok',
      success: true,
      latest,
      history: recharges.slice(0, 10)
    });
  } catch (err: any) {
    return res.status(500).json({ status: 'error', success: false, error: err.message });
  }
});

export default router;
