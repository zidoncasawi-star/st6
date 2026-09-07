import React, { useState, useEffect, useRef } from 'react';
import { 
  Smartphone, 
  Power, 
  Wifi, 
  Battery, 
  Signal, 
  Server, 
  Key, 
  Lock, 
  Zap, 
  Terminal, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Copy, 
  Check, 
  ArrowRight, 
  ArrowLeft, 
  Radio, 
  Crown, 
  Gift, 
  ShieldAlert, 
  ShieldCheck, 
  Sparkles, 
  Sliders, 
  Layers, 
  Activity, 
  Download, 
  Upload, 
  Flame, 
  HelpCircle,
  Clock,
  ChevronRight,
  Globe,
  CreditCard,
  Tag
} from 'lucide-react';
import { VpnServer, NetworkProfile, LicenseKey, Subscriber, SubscriptionPlan } from '../types/vpn';
import { api } from '../services/api';

interface AndroidSimulatorProps {
  servers: VpnServer[];
  profiles: NetworkProfile[];
  licenses: LicenseKey[];
}

export const AndroidSimulator: React.FC<AndroidSimulatorProps> = ({
  servers = [],
  profiles = [],
  licenses = [],
}) => {
  // Screen & Navigation States
  // Screen 1: Welcome | Screen 2: Operator Select | Screen 3: Phone Registration | Screen 4: Main App
  const [screen, setScreen] = useState<'onboarding_welcome' | 'onboarding_operator' | 'onboarding_register' | 'main_app'>('onboarding_welcome');

  // User Profile & Operator State
  const [userPhone, setUserPhone] = useState('0661234567');
  const [userOperator, setUserOperator] = useState<'INWI' | 'ORANGE' | 'MAROC_TELECOM'>('INWI');
  const [authMode, setAuthMode] = useState<'trial' | 'license'>('trial');
  const [selectedLicenseKey, setSelectedLicenseKey] = useState(licenses?.[0]?.key || 'NET-VIP-8899-2026');
  const [simHwid, setSimHwid] = useState(() => 'HWID-ANDR-' + Math.random().toString(36).substring(2, 6).toUpperCase() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase());

  // Current Subscriber State (Synced with Backend)
  const [subscriber, setSubscriber] = useState<{
    id?: string;
    phone_number: string;
    operator: 'INWI' | 'ORANGE' | 'MAROC_TELECOM' | 'GENERIC';
    trial_total_bytes: number;
    trial_used_bytes: number;
    remaining_bytes: number;
    is_vip: boolean;
    status: 'active' | 'suspended' | 'trial_expired';
  }>({
    phone_number: '0661234567',
    operator: 'INWI',
    trial_total_bytes: 2147483648, // 2.0 GB
    trial_used_bytes: 209715200, // ~200 MB default
    remaining_bytes: 1937768448,
    is_vip: false,
    status: 'active'
  });

  // Recharge State inside Simulator
  const [isRechargeModalOpen, setIsRechargeModalOpen] = useState(false);
  const [simPlans, setSimPlans] = useState<SubscriptionPlan[]>([
    { id: 'plan_20dh_3d', name: 'باقة 20 درهم', priceDhs: 20, dataGb: 20, durationDays: 3, extraInfo: '1h مكالمة + 20 GB' },
    { id: 'plan_50dh_15d', name: 'باقة 50 درهم', priceDhs: 50, dataGb: 50, durationDays: 15, extraInfo: '2h مكالمة + 50 GB', badge: 'الأكثر طلباً' },
    { id: 'plan_100dh_30d', name: 'باقة 100 درهم', priceDhs: 100, dataGb: 100, durationDays: 30, extraInfo: 'غير محدود + 100 GB', badge: 'VIP غير محدود' }
  ]);
  const [selectedPlanId, setSelectedPlanId] = useState('plan_20dh_3d');
  const [rechargePin, setRechargePin] = useState('');
  const [isSubmittingRecharge, setIsSubmittingRecharge] = useState(false);
  const [rechargeStatusInfo, setRechargeStatusInfo] = useState<any>(null);

  // Selected Server & Profile (Isolated to chosen operator)
  const [selectedServerId, setSelectedServerId] = useState<string>('');
  const [selectedProfileId, setSelectedProfileId] = useState<string>('');

  // Tunnel Connection State
  const [isConnected, setIsConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [connectionTime, setConnectionTime] = useState(0);
  const [liveDownloadKbps, setLiveDownloadKbps] = useState(0);
  const [liveUploadKbps, setLiveUploadKbps] = useState(0);

  // Live Toast Notification inside simulator
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'vip' | 'quota' | 'error' | 'info' } | null>(null);

  // Decrypted Config & REST Gateway Log
  const [decryptedConfig, setDecryptedConfig] = useState<any>(null);
  const [apiLogs, setApiLogs] = useState<Array<{
    endpoint: string;
    method: string;
    status: number;
    time: string;
    payload?: any;
    response?: any;
  }>>([]);

  const addLog = (endpoint: string, method: string, status: number, payload?: any, response?: any) => {
    setApiLogs((prev) => [
      {
        endpoint,
        method,
        status,
        time: new Date().toLocaleTimeString(),
        payload,
        response,
      },
      ...prev.slice(0, 19),
    ]);
  };

  const showToast = (text: string, type: 'vip' | 'quota' | 'error' | 'info' = 'info') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // -------------------------------------------------------------
  // Operator-Isolated Profiles & Servers
  // -------------------------------------------------------------
  const operatorProfiles = React.useMemo(() => {
    return profiles.filter((p) => {
      if (userOperator === 'INWI') {
        return p.operator?.toLowerCase().includes('inwi') || p.operator === 'All / Generic';
      }
      if (userOperator === 'ORANGE') {
        return p.operator?.toLowerCase().includes('orange') || p.operator === 'All / Generic';
      }
      if (userOperator === 'MAROC_TELECOM') {
        return p.operator?.toLowerCase().includes('maroc') || p.operator?.toLowerCase().includes('iam') || p.operator === 'All / Generic';
      }
      return true;
    });
  }, [profiles, userOperator]);

  useEffect(() => {
    if (operatorProfiles.length > 0) {
      setSelectedProfileId(operatorProfiles[0].id);
    }
  }, [operatorProfiles]);

  useEffect(() => {
    if (servers.length > 0 && !selectedServerId) {
      setSelectedServerId(servers[0].id);
    }
  }, [servers, selectedServerId]);

  // -------------------------------------------------------------
  // Step 1: Onboarding -> Next to Operator
  // -------------------------------------------------------------
  const handleStartOnboarding = () => {
    setScreen('onboarding_operator');
  };

  // Step 2: Select Operator -> Next to Phone Register
  const handleSelectOperatorAndNext = async (op: 'INWI' | 'ORANGE' | 'MAROC_TELECOM') => {
    setUserOperator(op);
    setScreen('onboarding_register');
  };

  // Step 3: Register / Login with 1.0 GB Trial
  const handleCompleteRegistration = async () => {
    try {
      if (authMode === 'trial') {
        const payload = {
          phone_number: userPhone,
          operator: userOperator,
          device_id: simHwid
        };
        const res = await api.registerUser(payload);
        addLog('/api/user/register', 'POST', 200, payload, res);
        
        if (res.user) {
          setSubscriber({
            id: res.user.id,
            phone_number: res.user.phone_number,
            operator: res.user.operator,
            trial_total_bytes: res.user.trial_total_bytes || 1073741824,
            trial_used_bytes: res.user.trial_used_bytes || 0,
            remaining_bytes: res.remaining_bytes || 1073741824,
            is_vip: Boolean(res.user.is_vip),
            status: res.user.status || 'active'
          });
        }
      } else {
        // VIP License
        const authRes = await api.clientVerifyLicense(simHwid, selectedLicenseKey);
        addLog('/api/client/verify-license', 'POST', 200, { hwid: simHwid, key: selectedLicenseKey }, authRes);
        setSubscriber(prev => ({
          ...prev,
          is_vip: true,
          status: 'active'
        }));
      }

      // Fetch operator config
      const configRes = await api.getConfigByOperator(userOperator);
      addLog(`/api/config?operator=${userOperator}`, 'GET', 200, null, configRes);
      if (configRes?.profiles) {
        setDecryptedConfig(configRes);
      }

      showToast('تم تفعيل باقة 2.0 GB بنجاح! جاهز للاتصال 🚀', 'info');
      setScreen('main_app');
    } catch (err: any) {
      addLog('/api/user/register', 'POST', 400, { phone_number: userPhone }, { error: err.message });
      alert('Registration error: ' + err.message);
    }
  };

  // -------------------------------------------------------------
  // Recharge Flow Inside Android Simulator
  // -------------------------------------------------------------
  useEffect(() => {
    // Load plans from API
    api.getPublicPlans().then((res) => {
      if (res?.plans?.length) {
        setSimPlans(res.plans);
      }
    }).catch(() => {});
  }, []);

  const handleSimRechargeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rechargePin.trim()) {
      showToast('يرجى إدخال رمز كود التعبئة المكون من 14 أو 16 رقماً', 'error');
      return;
    }

    setIsSubmittingRecharge(true);
    try {
      const payload = {
        phone_number: userPhone,
        operator: userOperator,
        device_id: simHwid,
        plan_id: selectedPlanId,
        recharge_code: rechargePin.trim()
      };

      const res = await api.submitRecharge(payload);
      addLog('/api/user/recharge/submit', 'POST', 200, payload, res);

      if (res.success) {
        setRechargeStatusInfo({
          status: 'pending',
          request_id: res.request_id,
          message: res.message
        });
        showToast('✅ تم إرسال طلب التعبئة للمشرف للمراجعة والمصادقة!', 'info');
        setRechargePin('');
      } else {
        showToast(res.error || 'فشل إرسال طلب التعبئة', 'error');
      }
    } catch (err: any) {
      addLog('/api/user/recharge/submit', 'POST', 400, { card_pin: rechargePin }, { error: err.message });
      showToast('خطأ: ' + err.message, 'error');
    } finally {
      setIsSubmittingRecharge(false);
    }
  };

  // -------------------------------------------------------------
  // Live Admin Control Sync: Poll User Profile every 2.5s
  // -------------------------------------------------------------
  useEffect(() => {
    if (screen !== 'main_app') return;

    const syncProfileFromBackend = async () => {
      try {
        const res = await api.getUserProfile({
          phone_number: userPhone,
          device_id: simHwid
        });

        if (res?.user) {
          const u = res.user;
          const wasVip = subscriber.is_vip;
          const wasSuspended = subscriber.status === 'suspended';
          const prevTotal = subscriber.trial_total_bytes;

          // 1. VIP UPGRADE DETECTION
          if (!wasVip && u.is_vip) {
            showToast('👑 مبروك! تمت ترقيتك إلى حساب VIP غير محدود من قبل المشرف', 'vip');
          }

          // 2. QUOTA EXTENSION DETECTION
          if (u.trial_total_bytes > prevTotal) {
            const addedMb = Math.round((u.trial_total_bytes - prevTotal) / (1024 * 1024));
            showToast(`🎁 قام المشرف بتمديد رصيدك بمقدار +${addedMb} MB!`, 'quota');
          }

          // 3. SUSPEND DETECTION
          if (u.status === 'suspended') {
            if (isConnected) {
              setIsConnected(false);
              showToast('🚫 تم حظر وتعليق هذا الجهاز من قِبل المشرف! تم قطع النفق فورياً.', 'error');
            }
          }

          // 4. TRIAL EXPIRED DETECTION
          if (!u.is_vip && u.status === 'trial_expired' && isConnected) {
            setIsConnected(false);
            showToast('⚠️ لقد استهلكت رصيد الـ 1.0 GB المجاني بالكامل! تم فصل النفق.', 'error');
          }

          setSubscriber({
            id: u.id,
            phone_number: u.phone_number,
            operator: u.operator,
            trial_total_bytes: u.trial_total_bytes,
            trial_used_bytes: u.trial_used_bytes,
            remaining_bytes: u.remaining_bytes,
            is_vip: u.is_vip,
            status: u.status
          });
        }
      } catch (err) {
        // quiet catch
      }
    };

    const interval = setInterval(syncProfileFromBackend, 2500);
    return () => clearInterval(interval);
  }, [screen, userPhone, simHwid, subscriber, isConnected]);

  // -------------------------------------------------------------
  // Live Data Traffic Simulation while Connected
  // -------------------------------------------------------------
  useEffect(() => {
    let interval: any;
    if (isConnected) {
      interval = setInterval(async () => {
        setConnectionTime((prev) => prev + 1);

        // Generate dynamic speed
        const downSpeed = Math.floor(1200 + Math.random() * 800); // 1.2 - 2.0 MB/s
        const upSpeed = Math.floor(250 + Math.random() * 200); // 250 - 450 KB/s
        setLiveDownloadKbps(downSpeed);
        setLiveUploadKbps(upSpeed);

        // Deduct 2 - 4 MB per tick if not VIP
        if (!subscriber.is_vip) {
          const deltaBytes = Math.floor((1.5 + Math.random() * 1.5) * 1024 * 1024);
          try {
            const syncRes = await api.syncUserUsage({
              phone_number: userPhone,
              device_id: simHwid,
              used_bytes: deltaBytes
            });
            if (syncRes?.trial_used_bytes !== undefined) {
              setSubscriber(prev => ({
                ...prev,
                trial_used_bytes: syncRes.trial_used_bytes,
                remaining_bytes: syncRes.remaining_bytes,
                status: syncRes.user_status
              }));

              if (syncRes.is_expired) {
                setIsConnected(false);
                showToast('⚠️ انتهى رصيد الـ 1.0 GB التجريبي بالكامل!', 'error');
              }
            }
          } catch (e) {
            console.error('Usage sync error:', e);
          }
        }
      }, 2000);
    } else {
      setConnectionTime(0);
      setLiveDownloadKbps(0);
      setLiveUploadKbps(0);
    }
    return () => clearInterval(interval);
  }, [isConnected, subscriber.is_vip, userPhone, simHwid]);

  // -------------------------------------------------------------
  // Connect / Disconnect Handshake
  // -------------------------------------------------------------
  const handleToggleConnection = async () => {
    if (subscriber.status === 'suspended') {
      showToast('🚫 لا يمكن الاتصال: هذا الجهاز محظور من قبل المشرف', 'error');
      return;
    }

    if (!subscriber.is_vip && subscriber.status === 'trial_expired') {
      showToast('⚠️ لا يمكن الاتصال: نفذ رصيد الـ 1.0 GB المجاني', 'error');
      return;
    }

    if (isConnected) {
      try {
        await api.clientDisconnect({
          hwid: simHwid,
          sessionId: 'sess_' + Date.now().toString(36),
          bytesTx: 3500000,
          bytesRx: 28000000,
        });
        addLog('/api/client/disconnect', 'POST', 200, { hwid: simHwid }, { status: 'disconnected' });
      } catch (e) {
        console.error(e);
      }
      setIsConnected(false);
      showToast('تم فصل نفق الـ VPN بنجاح', 'info');
      return;
    }

    setConnecting(true);
    setTimeout(async () => {
      try {
        const srv = servers.find((s) => s.id === selectedServerId) || servers[0];
        const prof = operatorProfiles.find((p) => p.id === selectedProfileId) || operatorProfiles[0];

        const connectRes = await api.clientConnect({
          hwid: simHwid,
          licenseKey: selectedLicenseKey,
          serverId: srv?.id || 'srv_fr_1',
          profileId: prof?.id || 'prof_inwi_1',
          deviceName: 'Samsung Galaxy S24 Ultra (*6 Special)',
          appVersion: '1.5.2'
        });

        if (connectRes?.tunnelConfig) {
          setDecryptedConfig(connectRes.tunnelConfig);
        }

        setConnecting(false);
        setIsConnected(true);
        addLog('/api/client/connect', 'POST', 200, { hwid: simHwid, serverId: srv?.id, profileId: prof?.id }, connectRes);
        showToast('تم تأمين النفق المشفر بنجاح عبر بروتوكول WebSocket SSL 🛡️', 'info');
      } catch (err: any) {
        setConnecting(false);
        showToast('فشل الاتصال: ' + err.message, 'error');
      }
    }, 1100);
  };

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Helper values for 1GB Quota progress
  const usedMb = +(subscriber.trial_used_bytes / (1024 * 1024)).toFixed(1);
  const totalMb = +(subscriber.trial_total_bytes / (1024 * 1024)).toFixed(0);
  const remainingMb = Math.max(0, +((subscriber.trial_total_bytes - subscriber.trial_used_bytes) / (1024 * 1024)).toFixed(1));
  const usagePct = Math.min(100, Math.round((subscriber.trial_used_bytes / (subscriber.trial_total_bytes || 1073741824)) * 100));

  // Operator visual colors
  const getOperatorMeta = (op: string) => {
    if (op === 'INWI') return { name: 'Inwi *6 (إنوي)', color: 'fuchsia', bg: 'bg-fuchsia-600', text: 'text-fuchsia-400', border: 'border-fuchsia-500' };
    if (op === 'ORANGE') return { name: 'Orange *6 (أورنج)', color: 'orange', bg: 'bg-orange-600', text: 'text-orange-400', border: 'border-orange-500' };
    if (op === 'MAROC_TELECOM') return { name: 'IAM *6 (اتصالات المغرب)', color: 'sky', bg: 'bg-sky-600', text: 'text-sky-400', border: 'border-sky-500' };
    return { name: 'Generic / عام', color: 'slate', bg: 'bg-slate-700', text: 'text-slate-400', border: 'border-slate-600' };
  };

  const opMeta = getOperatorMeta(userOperator);
  const selectedServer = servers.find((s) => s.id === selectedServerId) || servers[0];
  const selectedProfile = operatorProfiles.find((p) => p.id === selectedProfileId) || operatorProfiles[0];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-[#0e1422] via-[#11192e] to-[#0e1422] p-6 rounded-3xl border border-slate-800 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/20">
              <Smartphone className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight font-sans">
              محاكي تطبيق الأندرويد & بوابة التفاعل اللحظي (Android Client & Live Sync)
            </h2>
          </div>
          <p className="text-xs text-slate-400 max-w-3xl leading-relaxed">
            محاكاة كاملة لدورة حياة تطبيق الأندرويد: شاشات التهيئة (Onboarding Wizard)، عزل شبكات المغرب (*6 Social Pass)، باقة الـ 1.0 GB التلقائية، والاستجابة الفورية لإجراءات المشرف (ترقية VIP، تمديد الرصيد، الحظر).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setScreen('onboarding_welcome');
              setIsConnected(false);
              showToast('تمت إعادة ضبط شاشات التهيئة (Onboarding Reset)', 'info');
            }}
            className="px-3.5 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            إعادة التهيئة (Reset Wizard)
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ========================================================================= */}
        {/* LEFT COLUMN: Modern Android Phone AMOLED Frame */}
        {/* ========================================================================= */}
        <div className="lg:col-span-5 flex justify-center">
          <div className="w-full max-w-[350px] bg-[#050811] rounded-[42px] border-[7px] border-slate-800 shadow-2xl p-4 flex flex-col justify-between h-[730px] relative overflow-hidden ring-2 ring-indigo-500/20 font-sans">
            
            {/* Top Phone Camera / Speaker Notch */}
            <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-28 h-4 bg-slate-900 rounded-full flex items-center justify-center gap-2 z-30">
              <div className="w-2 h-2 rounded-full bg-slate-800" />
              <div className="w-7 h-1.5 rounded-full bg-slate-800" />
            </div>

            {/* Android Status Bar */}
            <div className="pt-3 pb-1 flex items-center justify-between text-[10px] font-mono text-slate-400 px-3 z-20">
              <span>12:45</span>
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] font-bold text-slate-300">{userOperator}</span>
                <Signal className="w-3 h-3 text-cyan-400" />
                <Wifi className="w-3 h-3 text-cyan-400" />
                <Battery className="w-3.5 h-3.5 text-slate-300" />
              </div>
            </div>

            {/* FLOATING TOAST NOTIFICATION (Live Admin Actions feedback) */}
            {toastMessage && (
              <div className={`absolute top-12 left-4 right-4 z-40 p-2.5 rounded-2xl text-[11px] font-medium shadow-2xl border animate-in slide-in-from-top-4 duration-200 flex items-center gap-2 ${
                toastMessage.type === 'vip' 
                  ? 'bg-amber-950/95 text-amber-200 border-amber-500/50 shadow-amber-500/30' 
                  : toastMessage.type === 'quota'
                  ? 'bg-emerald-950/95 text-emerald-200 border-emerald-500/50 shadow-emerald-500/30'
                  : toastMessage.type === 'error'
                  ? 'bg-rose-950/95 text-rose-200 border-rose-500/50 shadow-rose-500/30'
                  : 'bg-indigo-950/95 text-indigo-200 border-indigo-500/50 shadow-indigo-500/30'
              }`}>
                {toastMessage.type === 'vip' && <Crown className="w-4 h-4 text-amber-400 shrink-0" />}
                {toastMessage.type === 'quota' && <Gift className="w-4 h-4 text-emerald-400 shrink-0" />}
                {toastMessage.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />}
                {toastMessage.type === 'info' && <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />}
                <span className="leading-snug">{toastMessage.text}</span>
              </div>
            )}

            {/* ========================================================================= */}
            {/* PHONE SCREEN BODY (Dynamic Wizard / Main App) */}
            {/* ========================================================================= */}
            <div className="flex-1 overflow-y-auto px-1 py-2 space-y-3 text-xs scrollbar-none">
              
              {/* SCREEN 1: Onboarding Welcome Screen */}
              {screen === 'onboarding_welcome' && (
                <div className="h-full flex flex-col justify-between py-4 text-center space-y-4 animate-in fade-in zoom-in-95 duration-200">
                  <div className="space-y-3 pt-6">
                    <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-fuchsia-600 via-indigo-600 to-cyan-500 mx-auto flex items-center justify-center text-white shadow-xl shadow-indigo-500/30">
                      <Zap className="w-8 h-8" />
                    </div>
                    <h3 className="text-base font-black text-white">Nexus Tunnel Pro</h3>
                    <p className="text-xs text-slate-400 px-4 leading-relaxed">
                      أسرع نفق VPN مشفر ومخصص لتخطي قيود شبكات التواصل الاجتماعي بالمغرب (*6 Social Pass).
                    </p>
                  </div>

                  {/* Feature Highlights Bento */}
                  <div className="space-y-2 text-right px-2">
                    <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800/80 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-400 shrink-0">
                        <Gift className="w-4 h-4" />
                      </div>
                      <div>
                        <h5 className="font-bold text-white text-[11px]">2.0 GB رصيد مجاني ترحيبي</h5>
                        <p className="text-[10px] text-slate-400">تفعيل فوري لجميع الخطوط التجريبية الجديدة</p>
                      </div>
                    </div>

                    <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800/80 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-fuchsia-500/10 flex items-center justify-center text-fuchsia-400 shrink-0">
                        <Sliders className="w-4 h-4" />
                      </div>
                      <div>
                        <h5 className="font-bold text-white text-[11px]">عزل بايلودات الشبكات (*6)</h5>
                        <p className="text-[10px] text-slate-400">دعم كامل لـ Inwi و Orange و IAM</p>
                      </div>
                    </div>

                    <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800/80 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 shrink-0">
                        <ShieldCheck className="w-4 h-4" />
                      </div>
                      <div>
                        <h5 className="font-bold text-white text-[11px]">تشفير عسكري AES-256</h5>
                        <p className="text-[10px] text-slate-400">حماية فائقة واستقرار سرعة الألعاب</p>
                      </div>
                    </div>
                  </div>

                  {/* Next Button */}
                  <div className="pt-2 px-2">
                    <button
                      onClick={handleStartOnboarding}
                      className="w-full py-3 rounded-2xl bg-gradient-to-r from-cyan-500 via-indigo-600 to-fuchsia-600 hover:opacity-95 text-white font-bold text-xs shadow-lg shadow-indigo-500/30 flex items-center justify-center gap-2 transition"
                    >
                      <span>ابدأ الإعداد (NEXT ➔)</span>
                    </button>
                  </div>
                </div>
              )}

              {/* SCREEN 2: Operator Selection (Isolation Screen) */}
              {screen === 'onboarding_operator' && (
                <div className="h-full flex flex-col justify-between py-2 space-y-4 animate-in slide-in-from-right-4 duration-200">
                  <div className="space-y-1.5 text-right px-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-indigo-400 font-mono">STEP 2 OF 3</span>
                      <button onClick={() => setScreen('onboarding_welcome')} className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1">
                        <ArrowRight className="w-3 h-3" /> رجوع
                      </button>
                    </div>
                    <h3 className="text-sm font-black text-white">اختر مشغل الاتصالات الخاص بك</h3>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      سيتم قفل وعزل السيرفرات والبايلودات المتوافقة مع نوع بطاقة SIM الخاصة بك:
                    </p>
                  </div>

                  {/* 3 Operator Cards */}
                  <div className="space-y-2.5 px-2">
                    {/* INWI */}
                    <button
                      onClick={() => setUserOperator('INWI')}
                      className={`w-full p-3.5 rounded-2xl border text-right transition flex items-center justify-between ${
                        userOperator === 'INWI'
                          ? 'bg-fuchsia-950/80 border-fuchsia-500 shadow-lg shadow-fuchsia-500/20'
                          : 'bg-slate-900/60 border-slate-800 hover:bg-slate-800/60'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-fuchsia-600 flex items-center justify-center text-white font-bold">
                          INWI
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-white">Inwi *6 (عرض إنوي)</h4>
                          <p className="text-[10px] text-fuchsia-300">Facebook, Instagram, TikTok, Reels</p>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-fuchsia-900/60 text-fuchsia-200">
                        WS SSL 443
                      </span>
                    </button>

                    {/* ORANGE */}
                    <button
                      onClick={() => setUserOperator('ORANGE')}
                      className={`w-full p-3.5 rounded-2xl border text-right transition flex items-center justify-between ${
                        userOperator === 'ORANGE'
                          ? 'bg-orange-950/80 border-orange-500 shadow-lg shadow-orange-500/20'
                          : 'bg-slate-900/60 border-slate-800 hover:bg-slate-800/60'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-orange-600 flex items-center justify-center text-white font-bold">
                          ORG
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-white">Orange *6 (عرض أورنج)</h4>
                          <p className="text-[10px] text-orange-300">WhatsApp, Social Pass, Direct 80</p>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-orange-900/60 text-orange-200">
                        Direct 80
                      </span>
                    </button>

                    {/* IAM (MAROC TELECOM) */}
                    <button
                      onClick={() => setUserOperator('MAROC_TELECOM')}
                      className={`w-full p-3.5 rounded-2xl border text-right transition flex items-center justify-between ${
                        userOperator === 'MAROC_TELECOM'
                          ? 'bg-sky-950/80 border-sky-500 shadow-lg shadow-sky-500/20'
                          : 'bg-slate-900/60 border-slate-800 hover:bg-slate-800/60'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-sky-600 flex items-center justify-center text-white font-bold">
                          IAM
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-white">Maroc Telecom *6 (اتصالات المغرب)</h4>
                          <p className="text-[10px] text-sky-300">YouTube, Social, SSH Custom WS</p>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-900/60 text-sky-200">
                        SSH + WS
                      </span>
                    </button>
                  </div>

                  {/* Next Button */}
                  <div className="pt-2 px-2">
                    <button
                      onClick={() => handleSelectOperatorAndNext(userOperator)}
                      className="w-full py-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:opacity-95 text-white font-bold text-xs shadow-lg shadow-indigo-500/30 flex items-center justify-center gap-2 transition"
                    >
                      <span>تأكيد المشغل والمتابعة (NEXT ➔)</span>
                    </button>
                  </div>
                </div>
              )}

              {/* SCREEN 3: Phone Registration & 1.0 GB Allocation */}
              {screen === 'onboarding_register' && (
                <div className="h-full flex flex-col justify-between py-2 space-y-4 animate-in slide-in-from-right-4 duration-200">
                  <div className="space-y-1.5 text-right px-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-indigo-400 font-mono">STEP 3 OF 3</span>
                      <button onClick={() => setScreen('onboarding_operator')} className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1">
                        <ArrowRight className="w-3 h-3" /> رجوع
                      </button>
                    </div>
                    <h3 className="text-sm font-black text-white">تفعيل باقة 2.0 GB المجانية</h3>
                    <p className="text-[11px] text-slate-400">
                      أدخل رقم هاتفك لاستلام الرصيد التجريبي الفوري (2.0 GB) وربط معرّف الجهاز (HWID):
                    </p>
                  </div>

                  <div className="space-y-3 px-2">
                    {/* Auth Mode Toggle */}
                    <div className="grid grid-cols-2 gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-[11px]">
                      <button
                        type="button"
                        onClick={() => setAuthMode('trial')}
                        className={`py-1.5 rounded-lg font-bold transition ${
                          authMode === 'trial' ? 'bg-fuchsia-600 text-white shadow' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        2.0 GB Trial (رصيد مجاني)
                      </button>
                      <button
                        type="button"
                        onClick={() => setAuthMode('license')}
                        className={`py-1.5 rounded-lg font-bold transition ${
                          authMode === 'license' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        VIP License (كود VIP)
                      </button>
                    </div>

                    {authMode === 'trial' ? (
                      <div className="space-y-2 text-right">
                        <label className="text-[11px] font-semibold text-slate-300">رقم الهاتف (Phone Number):</label>
                        <input
                          type="text"
                          value={userPhone}
                          onChange={(e) => setUserPhone(e.target.value)}
                          placeholder="مثال: 0661234567"
                          className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:border-indigo-500 focus:outline-none"
                        />
                        <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-[10px] text-slate-400 space-y-1">
                          <div className="flex justify-between">
                            <span>المشغل المختار:</span>
                            <span className="text-white font-bold">{opMeta.name}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>الرصيد المخصص:</span>
                            <span className="text-emerald-400 font-bold font-mono">2.0 GB (2048 MB)</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2 text-right">
                        <label className="text-[11px] font-semibold text-slate-300">كود ترخيص VIP:</label>
                        <input
                          type="text"
                          value={selectedLicenseKey}
                          onChange={(e) => setSelectedLicenseKey(e.target.value.toUpperCase())}
                          placeholder="NET-VIP-XXXX-YYYY"
                          className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono uppercase focus:border-indigo-500 focus:outline-none"
                        />
                      </div>
                    )}
                  </div>

                  {/* Start App Button */}
                  <div className="pt-2 px-2">
                    <button
                      onClick={handleCompleteRegistration}
                      className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-600 to-indigo-600 hover:opacity-95 text-white font-bold text-xs shadow-lg shadow-teal-500/30 flex items-center justify-center gap-2 transition"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>تفعيل الـ 2.0 GB وبدء التطبيق (START)</span>
                    </button>
                  </div>
                </div>
              )}

              {/* SCREEN 4: Main Android App Dashboard */}
              {screen === 'main_app' && (
                <div className="space-y-3 animate-in fade-in duration-200">
                  {/* App Brand & Operator Header */}
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5 px-1">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xs shadow-md shadow-indigo-500/20">
                        N
                      </div>
                      <div>
                        <h4 className="font-bold text-white text-xs leading-none">Nexus Tunnel Pro</h4>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className={`text-[9px] font-bold ${opMeta.text}`}>{opMeta.name}</span>
                          <span className="text-[9px] text-slate-500 font-mono">• v1.5.2</span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => setScreen('onboarding_operator')}
                      className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white text-[10px] flex items-center gap-1"
                      title="تبديل المشغل"
                    >
                      <Sliders className="w-3 h-3 text-cyan-400" />
                      <span>تغيير</span>
                    </button>
                  </div>

                  {/* HERO CARD 1: VIP UNLIMITED vs 1.0 GB QUOTA vs SUSPENDED */}
                  {subscriber.status === 'suspended' ? (
                    <div className="p-3.5 rounded-2xl bg-rose-950/80 border border-rose-500/60 space-y-1.5 text-right animate-pulse">
                      <div className="flex items-center justify-between text-rose-300">
                        <ShieldAlert className="w-4 h-4 text-rose-400" />
                        <span className="text-xs font-bold">الحساب محظور (Suspended)</span>
                      </div>
                      <p className="text-[10px] text-rose-200 leading-snug">
                        تم تعليق هذا الجهاز من قِبل لوحة التحكم. لا يمكن بدء النفق حتى يقوم المشرف بإلغاء الحظر.
                      </p>
                    </div>
                  ) : subscriber.is_vip ? (
                    /* VIP UNLIMITED CARD (Infinite Quota ♾️) */
                    <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-950/80 via-yellow-950/50 to-amber-950/80 border border-amber-500/60 space-y-2 shadow-lg shadow-amber-500/10">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Crown className="w-4 h-4 text-amber-400" />
                          <span className="text-xs font-black text-amber-300 font-sans tracking-wide">VIP UNLIMITED</span>
                        </div>
                        <span className="text-xs font-mono font-bold text-amber-400 bg-amber-900/60 px-2 py-0.5 rounded-full border border-amber-500/40">
                          ♾️ غير محدود
                        </span>
                      </div>
                      <p className="text-[10px] text-amber-200/90 leading-relaxed text-right">
                        تمت ترقيتك إلى باقة VIP غير محدودة من الإدارة. تصفح وتحميل بلا حدود وأولوية قصوى.
                      </p>
                    </div>
                  ) : (
                    /* 2.0 GB TRIAL PROGRESS METER CARD */
                    <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2 text-right">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Gift className="w-3.5 h-3.5 text-cyan-400" />
                          <span className="text-xs font-bold text-white">رصيد باقة 2.0 GB المجانية</span>
                        </div>
                        <span className="text-[11px] font-mono font-bold text-cyan-300">
                          {remainingMb} MB متبقية
                        </span>
                      </div>

                      {/* Progress bar */}
                      <div className="space-y-1">
                        <div className="h-2.5 w-full rounded-full bg-slate-950 overflow-hidden border border-slate-800 p-0.5">
                          <div
                            style={{ width: `${usagePct}%` }}
                            className={`h-full rounded-full transition-all duration-500 ${
                              usagePct >= 100
                                ? 'bg-rose-500'
                                : usagePct > 75
                                ? 'bg-amber-500'
                                : 'bg-gradient-to-r from-cyan-400 to-emerald-400'
                            }`}
                          />
                        </div>
                        <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                          <span>{usedMb} MB مستهلكة</span>
                          <span>إجمالي {totalMb} MB ({usagePct}%)</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* RECHARGE / TOP-UP BANNER BUTTON */}
                  <button
                    onClick={() => setIsRechargeModalOpen(true)}
                    className="w-full p-2.5 rounded-2xl bg-gradient-to-r from-fuchsia-950/80 to-indigo-950/80 border border-fuchsia-500/40 hover:border-fuchsia-400 flex items-center justify-between transition group shadow-lg shadow-fuchsia-950/40"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-fuchsia-600 to-indigo-600 flex items-center justify-center text-white shadow-sm">
                        <CreditCard className="w-3.5 h-3.5" />
                      </div>
                      <div className="text-right">
                        <div className="text-[11px] font-bold text-white flex items-center gap-1">
                          <span>تعبئة الرصيد (Recharge)</span>
                          <span className="text-[9px] bg-fuchsia-500/20 text-fuchsia-300 px-1.5 py-0.2 rounded font-mono">20GB - 100GB</span>
                        </div>
                        <p className="text-[9px] text-slate-400">شحن فوري بالبطاقة (20DH / 50DH / 100DH)</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-fuchsia-400 group-hover:translate-x-[-2px] transition-transform" />
                  </button>

                  {/* Isolated Server Selector */}
                  <div className="p-2.5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1.5 text-right">
                    <label className="text-[10px] font-mono text-slate-400 flex items-center justify-between">
                      <span>Server Node</span>
                      <span className="text-cyan-400">{selectedServer?.pingMs}ms</span>
                    </label>
                    <select
                      value={selectedServerId}
                      onChange={(e) => setSelectedServerId(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-white font-medium focus:outline-none"
                    >
                      {servers.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.flag} {s.name} ({s.countryCode}) • {s.protocol}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Isolated Operator SNI / Payload Presets */}
                  <div className="p-2.5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1.5 text-right">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="font-mono text-slate-400">Isolated Payload Preset</span>
                      <span className={`font-bold ${opMeta.text}`}>*6 Special</span>
                    </div>
                    <select
                      value={selectedProfileId}
                      onChange={(e) => setSelectedProfileId(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-white font-medium focus:outline-none"
                    >
                      {operatorProfiles.map((p) => (
                        <option key={p.id} value={p.id}>
                          [{p.operator}] {p.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Big Power Connect Button */}
                  <div className="pt-2 flex flex-col items-center">
                    <button
                      onClick={handleToggleConnection}
                      disabled={connecting}
                      className={`w-24 h-24 rounded-full flex flex-col items-center justify-center transition-all duration-300 shadow-2xl relative ${
                        isConnected
                          ? 'bg-gradient-to-tr from-emerald-600 to-teal-400 text-white shadow-emerald-500/40 ring-4 ring-emerald-500/20 animate-pulse'
                          : connecting
                          ? 'bg-amber-600 text-white animate-spin'
                          : subscriber.status === 'suspended'
                          ? 'bg-slate-800 text-slate-600 cursor-not-allowed'
                          : 'bg-gradient-to-tr from-indigo-700 to-violet-500 text-white hover:scale-105 shadow-indigo-500/30'
                      }`}
                    >
                      <Power className="w-8 h-8" />
                      <span className="text-[9px] font-bold uppercase mt-1 tracking-wider">
                        {connecting ? 'SYNC...' : isConnected ? 'DISCONNECT' : 'TAP TO CONNECT'}
                      </span>
                    </button>

                    {/* Live Speed & Timer */}
                    {isConnected ? (
                      <div className="mt-3 text-center space-y-1">
                        <div className="text-xs font-mono font-bold text-emerald-400 flex items-center justify-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                          <span>⏱ {formatTimer(connectionTime)}</span>
                        </div>
                        <div className="flex items-center justify-center gap-4 text-[10px] font-mono text-slate-300">
                          <span className="flex items-center gap-1 text-emerald-400">
                            <Download className="w-3 h-3" /> {(liveDownloadKbps / 1024).toFixed(2)} MB/s
                          </span>
                          <span className="flex items-center gap-1 text-cyan-400">
                            <Upload className="w-3 h-3" /> {liveUploadKbps} KB/s
                          </span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-[10px] text-slate-500 mt-2 font-mono">
                        {subscriber.status === 'suspended' ? '🚫 Device Suspended' : 'Ready to tunnel *6'}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* IN-APP RECHARGE SHEET / MODAL */}
              {isRechargeModalOpen && (
                <div className="absolute inset-0 bg-black/90 backdrop-blur-md z-50 p-4 flex flex-col justify-between animate-in slide-in-from-bottom duration-300 font-sans text-right">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                      <button
                        type="button"
                        onClick={() => {
                          setIsRechargeModalOpen(false);
                          setRechargeStatusInfo(null);
                        }}
                        className="w-7 h-7 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center text-xs"
                      >
                        ✕
                      </button>
                      <div className="flex items-center gap-1.5">
                        <CreditCard className="w-4 h-4 text-fuchsia-400" />
                        <h4 className="font-bold text-white text-xs">تعبئة رصيد البطاقة (Recharge)</h4>
                      </div>
                    </div>

                    <p className="text-[10px] text-slate-400">
                      اختر الباقة المناسبة وأدخل كود بطاقة التعبئة الورقية (Scratch Card PIN):
                    </p>

                    {/* Plan Selector */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-300">اختر العرض (Tarif):</label>
                      <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                        {(() => {
                          const filteredPlans = simPlans.filter(p => p.operator === 'ALL' || p.operator === userOperator);
                          
                          if (filteredPlans.length === 0) {
                            return (
                              <div className="p-4 rounded-xl border border-dashed border-slate-700 bg-slate-900/50 text-center space-y-2">
                                <div className="text-slate-400 font-bold text-[11px]">غير متوفرة حالياً</div>
                                <div className="text-[9px] text-slate-500">لا توجد باقات متاحة لهذه الشبكة في الوقت الحالي.</div>
                              </div>
                            );
                          }

                          return filteredPlans.map((plan) => (
                            <div
                              key={plan.id}
                              onClick={() => setSelectedPlanId(plan.id)}
                              className={`p-2 rounded-xl border text-right cursor-pointer transition flex items-center justify-between ${
                                selectedPlanId === plan.id
                                  ? 'bg-fuchsia-950/70 border-fuchsia-500 shadow-md shadow-fuchsia-950/50'
                                  : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                              }`}
                            >
                              <div className="flex items-center gap-1">
                                {plan.badge && (
                                  <span className="text-[8px] bg-amber-500/20 text-amber-300 px-1 py-0.5 rounded font-bold">
                                    {plan.badge}
                                  </span>
                                )}
                                <span className="text-[11px] font-bold font-mono text-emerald-400">
                                  {plan.priceDhs} DH
                                </span>
                              </div>
                              <div>
                                <div className="text-[11px] font-bold text-white">{plan.name}</div>
                                <div className="text-[9px] text-slate-400 font-mono">
                                  {plan.dataGb} GB • {plan.durationDays} أيام
                                </div>
                              </div>
                            </div>
                          ));
                        })()}
                      </div>
                    </div>

                    {/* PIN Input */}
                    <form onSubmit={handleSimRechargeSubmit} className="space-y-2.5">
                      <div>
                        <label className="text-[10px] font-bold text-slate-300 block mb-1">
                          كود بطاقة التعبئة (14 - 16 رقماً):
                        </label>
                        <input
                          type="text"
                          value={rechargePin}
                          onChange={(e) => setRechargePin(e.target.value.replace(/\D/g, ''))}
                          placeholder="مثال: 58291048291048"
                          maxLength={16}
                          className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 focus:border-fuchsia-500 text-white font-mono text-xs text-center tracking-widest outline-none"
                        />
                      </div>

                      {rechargeStatusInfo && (
                        <div className="p-2 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-[10px] text-emerald-300 space-y-0.5">
                          <div className="font-bold flex items-center justify-between">
                            <span className="text-amber-300">قيد المراجعة والمطابقة</span>
                            <span>طلب تعبئة مسجل</span>
                          </div>
                          <p className="text-[9px] text-slate-300">{rechargeStatusInfo.message}</p>
                        </div>
                      )}

                      <button
                        type="submit"
                        disabled={isSubmittingRecharge || !rechargePin.trim()}
                        className="w-full py-2.5 rounded-xl bg-gradient-to-r from-fuchsia-600 to-indigo-600 hover:opacity-90 disabled:opacity-50 text-white font-bold text-[11px] flex items-center justify-center gap-1.5 shadow-lg shadow-fuchsia-600/30 transition"
                      >
                        {isSubmittingRecharge ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>جارٍ الإرسال والتحقق...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>تأكيد وشحن الرصيد الفوري</span>
                          </>
                        )}
                      </button>
                    </form>
                  </div>

                  <div className="pt-2 text-center border-t border-slate-800">
                    <span className="text-[9px] text-slate-500 font-mono">
                      Nexus Secure Payment Gateway • Inwi / Orange / IAM
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Android Navigation Bar Pill */}
            <div className="w-28 h-1 bg-slate-700 rounded-full mx-auto mt-2 z-20" />
          </div>
        </div>

        {/* ========================================================================= */}
        {/* RIGHT COLUMN: Live Admin Simulation & REST Gateway Inspector */}
        {/* ========================================================================= */}
        <div className="lg:col-span-7 space-y-4">
          {/* Quick Live Interactive Admin Controls */}
          <div className="p-5 rounded-3xl bg-[#0e1422] border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-fuchsia-500/10 flex items-center justify-center text-fuchsia-400">
                  <Activity className="w-4 h-4" />
                </div>
                <h3 className="text-xs font-bold text-white font-sans uppercase tracking-wide">
                  لوحة التجربة السريعة لإجراءات المشرف (Live Admin Action Simulator)
                </h3>
              </div>
              <span className="text-[10px] text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-500/30 font-mono">
                Real-Time Polling 2.5s
              </span>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              جرّب التفاعل الفوري بالنقر على أزرار المشرف أدناه لملاحظة انعكاسها اللحظي داخل شاشة هاتف الأندرويد:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Toggle VIP */}
              <button
                onClick={async () => {
                  if (subscriber.id) {
                    await api.toggleSubscriberVip(subscriber.id);
                  } else {
                    setSubscriber(prev => ({ ...prev, is_vip: !prev.is_vip }));
                    showToast(!subscriber.is_vip ? '👑 تمت الترقية إلى VIP غير محدود!' : 'تم إلغاء VIP', 'vip');
                  }
                }}
                className={`p-3 rounded-2xl border text-right transition space-y-1 ${
                  subscriber.is_vip
                    ? 'bg-amber-950/60 border-amber-500 text-amber-200'
                    : 'bg-slate-900 border-slate-800 hover:border-amber-500/50 text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <Crown className="w-4 h-4 text-amber-400" />
                  <span className="text-[10px] font-mono font-bold">1. VIP TOGGLE</span>
                </div>
                <div className="text-xs font-bold">{subscriber.is_vip ? 'إلغاء وضع VIP' : 'ترقية فورية إلى VIP'}</div>
                <p className="text-[10px] text-slate-400">إلغاء قيود الـ 1.0 GB فورياً ♾️</p>
              </button>

              {/* Extend +1GB */}
              <button
                onClick={async () => {
                  if (subscriber.id) {
                    await api.extendSubscriberQuota(subscriber.id, 1073741824);
                  } else {
                    setSubscriber(prev => ({
                      ...prev,
                      trial_total_bytes: prev.trial_total_bytes + 1073741824,
                      status: 'active'
                    }));
                    showToast('🎁 قام المشرف بتمديد رصيدك بمقدار +1.0 GB!', 'quota');
                  }
                }}
                className="p-3 rounded-2xl bg-slate-900 border border-slate-800 hover:border-emerald-500/50 text-slate-300 text-right transition space-y-1"
              >
                <div className="flex items-center justify-between">
                  <Gift className="w-4 h-4 text-emerald-400" />
                  <span className="text-[10px] font-mono font-bold text-emerald-400">+1.0 GB</span>
                </div>
                <div className="text-xs font-bold text-white">تمديد الرصيد (+1 GB)</div>
                <p className="text-[10px] text-slate-400">زيادة سعة البيانات لشريط الاستهلاك</p>
              </button>

              {/* Suspend Toggle */}
              <button
                onClick={async () => {
                  if (subscriber.id) {
                    await api.toggleSubscriberStatus(subscriber.id);
                  } else {
                    const newStatus = subscriber.status === 'suspended' ? 'active' : 'suspended';
                    setSubscriber(prev => ({ ...prev, status: newStatus }));
                    if (newStatus === 'suspended') setIsConnected(false);
                    showToast(newStatus === 'suspended' ? '🚫 تم تعليق وحظر الجهاز!' : 'تم فك الحظر عن الجهاز', 'error');
                  }
                }}
                className={`p-3 rounded-2xl border text-right transition space-y-1 ${
                  subscriber.status === 'suspended'
                    ? 'bg-rose-950/60 border-rose-500 text-rose-200'
                    : 'bg-slate-900 border-slate-800 hover:border-rose-500/50 text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <ShieldAlert className="w-4 h-4 text-rose-400" />
                  <span className="text-[10px] font-mono font-bold text-rose-400">SUSPEND</span>
                </div>
                <div className="text-xs font-bold">{subscriber.status === 'suspended' ? 'إلغاء الحظر والتعليق' : 'حظر الجهاز فورياً'}</div>
                <p className="text-[10px] text-slate-400">قطع النفق ومنع الاتصال</p>
              </button>
            </div>
          </div>

          {/* In-Memory Decrypted Tunnel Config Debugger */}
          <div className="p-5 rounded-3xl bg-[#0e1422] border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-wider font-mono flex items-center gap-2">
                <Lock className="w-4 h-4 text-cyan-400" />
                In-Memory Client Decrypted Config (Isolated to {userOperator})
              </h3>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/50 border border-emerald-500/30 px-2 py-0.5 rounded">
                AES-256 Decrypted
              </span>
            </div>

            <pre className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-300 overflow-x-auto h-40 leading-relaxed scrollbar-none">
              {decryptedConfig
                ? JSON.stringify(decryptedConfig, null, 2)
                : '// Encrypted payload delivered by /api/config or /api/client/connect...'}
            </pre>
          </div>

          {/* Real-Time REST API Traffic Log */}
          <div className="p-5 rounded-3xl bg-[#0e1422] border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-violet-400 uppercase tracking-wider font-mono flex items-center gap-2">
                <Terminal className="w-4 h-4 text-violet-400" />
                Live Client Gateway HTTP Trace (Endpoints & Signatures)
              </h3>
              <button
                onClick={() => setApiLogs([])}
                className="text-[11px] text-slate-400 hover:text-white font-mono"
              >
                Clear Log
              </button>
            </div>

            <div className="space-y-2 max-h-56 overflow-y-auto pr-1 font-mono text-xs">
              {apiLogs.length === 0 ? (
                <div className="p-4 text-center text-slate-500 italic">
                  No requests sent yet. Start onboarding or connect in the phone simulator.
                </div>
              ) : (
                apiLogs.map((log, i) => (
                  <div
                    key={i}
                    className="p-2.5 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            log.method === 'GET'
                              ? 'bg-cyan-500/20 text-cyan-300'
                              : 'bg-emerald-500/20 text-emerald-300'
                          }`}
                        >
                          {log.method}
                        </span>
                        <span className="text-slate-200 font-bold">{log.endpoint}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded ${
                            log.status === 200
                              ? 'bg-emerald-950 text-emerald-400'
                              : 'bg-red-950 text-red-400'
                          }`}
                        >
                          {log.status}
                        </span>
                        <span className="text-[10px] text-slate-500">{log.time}</span>
                      </div>
                    </div>

                    {log.response && (
                      <div className="text-[10px] text-slate-400 truncate mt-1">
                        Response: {JSON.stringify(log.response).substring(0, 130)}...
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
