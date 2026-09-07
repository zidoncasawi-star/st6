import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, 
  Smartphone, 
  Plus, 
  Search, 
  RefreshCw, 
  Crown, 
  Clock, 
  HardDrive, 
  Sparkles, 
  ShieldAlert, 
  ShieldCheck, 
  CheckCircle2, 
  XCircle, 
  Edit3, 
  Trash2, 
  Copy, 
  Check, 
  Filter, 
  Database, 
  Zap, 
  Radio, 
  ArrowUpRight, 
  Gift, 
  PieChart as PieChartIcon,
  Sliders,
  Flame,
  AlertTriangle
} from 'lucide-react';
import { Subscriber, NetworkProfile } from '../types/vpn';
import { api } from '../services/api';

interface SubscribersManagerProps {
  profiles?: NetworkProfile[];
}

export const SubscribersManager: React.FC<SubscribersManagerProps> = ({ profiles = [] }) => {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [stats, setStats] = useState<{
    total: number;
    active: number;
    expired: number;
    suspended: number;
    vipCount: number;
    operatorCounts: Record<string, number>;
    totalAllocatedGb: number;
    totalConsumedGb: number;
  } | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [operatorFilter, setOperatorFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [isExtendModalOpen, setIsExtendModalOpen] = useState<boolean>(false);
  const [selectedSub, setSelectedSub] = useState<Subscriber | null>(null);

  // Form states for Add/Edit
  const [formData, setFormData] = useState({
    phone_number: '',
    operator: 'INWI' as 'INWI' | 'ORANGE' | 'MAROC_TELECOM' | 'GENERIC',
    trial_total_gb: 1.0,
    is_vip: false,
    device_id: '',
    durationDays: 30,
    notes: '',
    status: 'active' as 'active' | 'suspended' | 'trial_expired'
  });

  // Form state for Quota extension
  const [extendMb, setExtendMb] = useState<number>(1024); // 1024 MB = 1 GB

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [subsRes, statsRes] = await Promise.all([
        api.getSubscribers(),
        api.getSubscriberStats()
      ]);
      if (subsRes.success) {
        setSubscribers(subsRes.subscribers);
      }
      if (statsRes.success) {
        setStats(statsRes);
      }
    } catch (err: any) {
      console.error('Failed to load subscribers:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Filtered subscribers
  const filteredSubscribers = useMemo(() => {
    return subscribers.filter((sub) => {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch = 
        !q ||
        sub.phone_number.toLowerCase().includes(q) ||
        sub.device_id.toLowerCase().includes(q) ||
        (sub.notes && sub.notes.toLowerCase().includes(q));

      const matchOp = operatorFilter === 'ALL' || sub.operator === operatorFilter;
      const matchStatus = statusFilter === 'ALL' || sub.status === statusFilter;

      return matchSearch && matchOp && matchStatus;
    });
  }, [subscribers, searchQuery, operatorFilter, statusFilter]);

  // Actions
  const handleToggleVip = async (sub: Subscriber) => {
    try {
      const res = await api.toggleSubscriberVip(sub.id);
      if (res.success) {
        loadData();
      }
    } catch (err: any) {
      alert('Error toggling VIP: ' + err.message);
    }
  };

  const handleToggleStatus = async (sub: Subscriber) => {
    try {
      const res = await api.toggleSubscriberStatus(sub.id);
      if (res.success) {
        loadData();
      }
    } catch (err: any) {
      alert('Error toggling status: ' + err.message);
    }
  };

  const handleDeleteSubscriber = async (id: string) => {
    if (!window.confirm('هل أنت متأكد من رغبتك في حذف هذا المشترك نهائياً؟')) return;
    try {
      const res = await api.deleteSubscriber(id);
      if (res.success) {
        loadData();
      }
    } catch (err: any) {
      alert('Error deleting subscriber: ' + err.message);
    }
  };

  const handleExtendQuotaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSub) return;
    try {
      const bytesToAdd = extendMb * 1024 * 1024;
      const res = await api.extendSubscriberQuota(selectedSub.id, bytesToAdd);
      if (res.success) {
        setIsExtendModalOpen(false);
        loadData();
      }
    } catch (err: any) {
      alert('Error extending quota: ' + err.message);
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const totalBytes = Math.round(formData.trial_total_gb * 1024 * 1024 * 1024);
      const res = await api.createSubscriber({
        phone_number: formData.phone_number,
        operator: formData.operator,
        trial_total_bytes: totalBytes,
        is_vip: formData.is_vip,
        device_id: formData.device_id,
        durationDays: formData.durationDays,
        notes: formData.notes
      });
      if (res.success) {
        setIsAddModalOpen(false);
        setFormData({
          phone_number: '',
          operator: 'INWI',
          trial_total_gb: 1.0,
          is_vip: false,
          device_id: '',
          durationDays: 30,
          notes: '',
          status: 'active'
        });
        loadData();
      }
    } catch (err: any) {
      alert('Error adding subscriber: ' + err.message);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSub) return;
    try {
      const totalBytes = Math.round(formData.trial_total_gb * 1024 * 1024 * 1024);
      const res = await api.updateSubscriber(selectedSub.id, {
        phone_number: formData.phone_number,
        operator: formData.operator,
        trial_total_bytes: totalBytes,
        is_vip: formData.is_vip,
        status: formData.status,
        device_id: formData.device_id,
        notes: formData.notes
      });
      if (res.success) {
        setIsEditModalOpen(false);
        loadData();
      }
    } catch (err: any) {
      alert('Error updating subscriber: ' + err.message);
    }
  };

  const openEditModal = (sub: Subscriber) => {
    setSelectedSub(sub);
    setFormData({
      phone_number: sub.phone_number,
      operator: sub.operator,
      trial_total_gb: +(sub.trial_total_bytes / (1024 * 1024 * 1024)).toFixed(2),
      is_vip: sub.is_vip,
      device_id: sub.device_id,
      durationDays: 30,
      notes: sub.notes || '',
      status: sub.status
    });
    setIsEditModalOpen(true);
  };

  const openExtendModal = (sub: Subscriber) => {
    setSelectedSub(sub);
    setExtendMb(1024); // 1 GB default
    setIsExtendModalOpen(true);
  };

  // Helper for operator visual badge
  const renderOperatorBadge = (op: string) => {
    const opNorm = op?.toUpperCase() || 'INWI';
    if (opNorm.includes('INWI')) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-fuchsia-950/80 text-fuchsia-300 border border-fuchsia-500/40">
          <span className="w-2 h-2 rounded-full bg-fuchsia-400"></span>
          Inwi *6 (إنوي)
        </span>
      );
    }
    if (opNorm.includes('ORANGE')) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-orange-950/80 text-orange-300 border border-orange-500/40">
          <span className="w-2 h-2 rounded-full bg-orange-400"></span>
          Orange *6 (أورنج)
        </span>
      );
    }
    if (opNorm.includes('MAROC') || opNorm.includes('IAM') || opNorm.includes('TELECOM')) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-sky-950/80 text-sky-300 border border-sky-500/40">
          <span className="w-2 h-2 rounded-full bg-sky-400"></span>
          IAM *6 (اتصالات المغرب)
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">
        <span className="w-2 h-2 rounded-full bg-slate-400"></span>
        Generic / عام
      </span>
    );
  };

  // Calculate percentages for operators
  const totalSubCount = subscribers.length || 1;
  const inwiCount = subscribers.filter(s => s.operator === 'INWI').length;
  const orangeCount = subscribers.filter(s => s.operator === 'ORANGE').length;
  const iamCount = subscribers.filter(s => s.operator === 'MAROC_TELECOM').length;
  const genericCount = subscribers.filter(s => s.operator === 'GENERIC').length;

  const inwiPct = Math.round((inwiCount / totalSubCount) * 100);
  const orangePct = Math.round((orangeCount / totalSubCount) * 100);
  const iamPct = Math.round((iamCount / totalSubCount) * 100);
  const genericPct = Math.round((genericCount / totalSubCount) * 100);

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-gradient-to-r from-[#0e1422] via-[#11192e] to-[#0e1422] p-6 rounded-3xl border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-fuchsia-500/5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="space-y-1.5 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-fuchsia-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-fuchsia-500/20">
              <Users className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight font-sans">
              إدارة المشتركين والأرصدة التجريبية (Subscribers & 1GB Trials)
            </h2>
          </div>
          <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
            متابعة مستخدمي باقات 1.0 GB المجانية، حسابات الـ VIP، تخصيص البايلودات لكل مشغل (إنوي *6، أورنج *6، اتصالات المغرب *6)، وتمديد الأرصدة لحظياً.
          </p>
        </div>

        <div className="flex items-center gap-3 z-10">
          <button
            onClick={loadData}
            disabled={isLoading}
            className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 transition flex items-center gap-2 text-xs font-semibold"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            تحديث
          </button>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-fuchsia-600 via-indigo-600 to-cyan-500 hover:opacity-95 text-white font-bold text-xs shadow-lg shadow-indigo-500/20 flex items-center gap-2 transition"
          >
            <Plus className="w-4 h-4" />
            إضافة مشترك جديد
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Subscribers */}
        <div className="p-5 rounded-2xl bg-[#0e1422]/90 border border-slate-800/80 flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-mono font-medium">TOTAL SUBSCRIBERS</span>
            <Users className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-white font-mono">{stats?.total ?? subscribers.length}</div>
            <p className="text-[11px] text-slate-400 mt-0.5">مشترك مسجل في السيرفر</p>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-800/50 flex items-center justify-between text-[11px] text-indigo-400 font-mono">
            <span>+1.0 GB Auto-Provision</span>
            <span>100% Active</span>
          </div>
        </div>

        {/* Active 1GB Trials */}
        <div className="p-5 rounded-2xl bg-[#0e1422]/90 border border-slate-800/80 flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-mono font-medium">1.0 GB TRIAL ACTIVE</span>
            <Sparkles className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-emerald-400 font-mono">{stats?.active ?? subscribers.filter(s => s.status === 'active' && !s.is_vip).length}</div>
            <p className="text-[11px] text-slate-400 mt-0.5">مستخدم رصيد مجاني نشط</p>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-800/50 flex items-center justify-between text-[11px] text-emerald-400 font-mono">
            <span>Quota Valid</span>
            <span>Free Tier</span>
          </div>
        </div>

        {/* VIP Accounts */}
        <div className="p-5 rounded-2xl bg-[#0e1422]/90 border border-slate-800/80 flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-mono font-medium">VIP UNLIMITED</span>
            <Crown className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-amber-400 font-mono">{stats?.vipCount ?? subscribers.filter(s => s.is_vip).length}</div>
            <p className="text-[11px] text-slate-400 mt-0.5">مشترك بحساب غير محدود</p>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-800/50 flex items-center justify-between text-[11px] text-amber-400 font-mono">
            <span>No Quota Limit</span>
            <span>Priority Routing</span>
          </div>
        </div>

        {/* Expired Trials */}
        <div className="p-5 rounded-2xl bg-[#0e1422]/90 border border-slate-800/80 flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-mono font-medium">TRIAL EXPIRED</span>
            <XCircle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-rose-400 font-mono">{stats?.expired ?? subscribers.filter(s => s.status === 'trial_expired').length}</div>
            <p className="text-[11px] text-slate-400 mt-0.5">استهلكوا الـ 1.0 GB بالكامل</p>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-800/50 flex items-center justify-between text-[11px] text-rose-400 font-mono">
            <span>Requires Extension</span>
            <span>Prompt VIP</span>
          </div>
        </div>

        {/* Data Consumed */}
        <div className="p-5 rounded-2xl bg-[#0e1422]/90 border border-slate-800/80 flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-mono font-medium">TRIAL BANDWIDTH</span>
            <HardDrive className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-cyan-400 font-mono">
              {stats?.totalConsumedGb ?? '0.00'} <span className="text-xs text-slate-400">/ {stats?.totalAllocatedGb ?? '0'} GB</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">إجمالي الترافيك المستهلك</p>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-800/50 flex items-center justify-between text-[11px] text-cyan-400 font-mono">
            <span>Active Metering</span>
            <span>Live Sync</span>
          </div>
        </div>
      </div>

      {/* Operators Distribution & Payload Manager Bento Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Operators Distribution Pie / Bar Analytics */}
        <div className="lg:col-span-1 p-6 rounded-3xl bg-[#0e1422] border border-slate-800 space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-white font-bold text-sm font-sans">
              <PieChartIcon className="w-4 h-4 text-fuchsia-400" />
              إحصائيات توزيع الشبكات (Operators Analytics)
            </div>
            <span className="text-[11px] text-slate-400 font-mono">{subscribers.length} Users</span>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            نسبة المشتركين موزعة حسب نوع الشريحة ومشغل الاتصالات في المغرب:
          </p>

          {/* Progress Stack Bar */}
          <div className="h-4 w-full rounded-full bg-slate-900 border border-slate-800 overflow-hidden flex shadow-inner">
            <div 
              style={{ width: `${inwiPct}%` }} 
              className="h-full bg-fuchsia-500 transition-all duration-500" 
              title={`Inwi: ${inwiCount} users (${inwiPct}%)`}
            />
            <div 
              style={{ width: `${orangePct}%` }} 
              className="h-full bg-orange-500 transition-all duration-500" 
              title={`Orange: ${orangeCount} users (${orangePct}%)`}
            />
            <div 
              style={{ width: `${iamPct}%` }} 
              className="h-full bg-sky-500 transition-all duration-500" 
              title={`Maroc Telecom: ${iamCount} users (${iamPct}%)`}
            />
            <div 
              style={{ width: `${genericPct}%` }} 
              className="h-full bg-slate-600 transition-all duration-500" 
              title={`Generic: ${genericCount} users (${genericPct}%)`}
            />
          </div>

          {/* Legend and stats */}
          <div className="space-y-3 pt-2 font-mono text-xs">
            {/* INWI */}
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-fuchsia-950/40 border border-fuchsia-800/30">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-fuchsia-500 shadow-sm shadow-fuchsia-500/50"></span>
                <span className="text-slate-200 font-semibold">Inwi (إنوي *6)</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-fuchsia-400 font-bold">{inwiCount} مشترك</span>
                <span className="text-[11px] text-slate-400 px-1.5 py-0.5 rounded bg-fuchsia-900/60">{inwiPct}%</span>
              </div>
            </div>

            {/* ORANGE */}
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-orange-950/40 border border-orange-800/30">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-orange-500 shadow-sm shadow-orange-500/50"></span>
                <span className="text-slate-200 font-semibold">Orange (أورنج *6)</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-orange-400 font-bold">{orangeCount} مشترك</span>
                <span className="text-[11px] text-slate-400 px-1.5 py-0.5 rounded bg-orange-900/60">{orangePct}%</span>
              </div>
            </div>

            {/* MAROC TELECOM */}
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-sky-950/40 border border-sky-800/30">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-sky-500 shadow-sm shadow-sky-500/50"></span>
                <span className="text-slate-200 font-semibold">Maroc Telecom (IAM *6)</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sky-400 font-bold">{iamCount} مشترك</span>
                <span className="text-[11px] text-slate-400 px-1.5 py-0.5 rounded bg-sky-900/60">{iamPct}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Operator Payload Manager (Quick Tweaks & Live SNI/Bug Host Inspector) */}
        <div className="lg:col-span-2 p-6 rounded-3xl bg-[#0e1422] border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-white font-bold text-sm font-sans">
              <Sliders className="w-4 h-4 text-cyan-400" />
              متحكم بايلودات وهوستات الشبكات (Operator Payload & Tweaks)
            </div>
            <span className="text-[11px] text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/30 font-mono">
              Live Auto-Filtered via GET /api/config
            </span>
          </div>

          <p className="text-xs text-slate-400">
            يتم تمرير هذه الإعدادات المشفرة تلقائياً لتطبيق الأندرويد بناءً على الشريحة المختارة من قِبل المستخدم:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Inwi Card */}
            <div className="p-4 rounded-2xl bg-fuchsia-950/20 border border-fuchsia-500/30 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-fuchsia-300">INWI *6 PASS</span>
                <span className="text-[10px] bg-fuchsia-500/20 text-fuchsia-300 px-1.5 py-0.5 rounded border border-fuchsia-500/30">WS SSL 443</span>
              </div>
              <div className="space-y-1 text-[11px] font-mono">
                <div className="text-slate-400">SNI / Bug Host:</div>
                <div className="text-white bg-black/40 px-2 py-1 rounded truncate border border-slate-800">
                  web.facebook.com
                </div>
              </div>
              <div className="space-y-1 text-[11px] font-mono">
                <div className="text-slate-400">Payload Header:</div>
                <div className="text-slate-300 bg-black/40 px-2 py-1 rounded truncate text-[10px] border border-slate-800">
                  GET / HTTP/1.1[crlf]Host: [host]...
                </div>
              </div>
            </div>

            {/* Orange Card */}
            <div className="p-4 rounded-2xl bg-orange-950/20 border border-orange-500/30 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-orange-300">ORANGE *6 PASS</span>
                <span className="text-[10px] bg-orange-500/20 text-orange-300 px-1.5 py-0.5 rounded border border-orange-500/30">WS Direct 80</span>
              </div>
              <div className="space-y-1 text-[11px] font-mono">
                <div className="text-slate-400">SNI / Bug Host:</div>
                <div className="text-white bg-black/40 px-2 py-1 rounded truncate border border-slate-800">
                  m.whatsapp.net
                </div>
              </div>
              <div className="space-y-1 text-[11px] font-mono">
                <div className="text-slate-400">Payload Header:</div>
                <div className="text-slate-300 bg-black/40 px-2 py-1 rounded truncate text-[10px] border border-slate-800">
                  GET / HTTP/1.1[crlf]Host: [host]...
                </div>
              </div>
            </div>

            {/* IAM Card */}
            <div className="p-4 rounded-2xl bg-sky-950/20 border border-sky-500/30 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-sky-300">IAM *6 PASS</span>
                <span className="text-[10px] bg-sky-500/20 text-sky-300 px-1.5 py-0.5 rounded border border-sky-500/30">SSH + WS</span>
              </div>
              <div className="space-y-1 text-[11px] font-mono">
                <div className="text-slate-400">SNI / Bug Host:</div>
                <div className="text-white bg-black/40 px-2 py-1 rounded truncate border border-slate-800">
                  m.youtube.com
                </div>
              </div>
              <div className="space-y-1 text-[11px] font-mono">
                <div className="text-slate-400">Payload Header:</div>
                <div className="text-slate-300 bg-black/40 px-2 py-1 rounded truncate text-[10px] border border-slate-800">
                  CONNECT [host_port] HTTP/1.1...
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-[#0e1422] border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex-1 relative w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="بحث برقم الهاتف (06...)، معرّف الجهاز (device_id)، أو الملاحظات..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          {/* Operator Filter */}
          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-400 text-[11px]">المشغل:</span>
            <select
              value={operatorFilter}
              onChange={(e) => setOperatorFilter(e.target.value)}
              className="bg-transparent text-white text-xs font-semibold focus:outline-none cursor-pointer"
            >
              <option value="ALL">الكل (All)</option>
              <option value="INWI">Inwi (إنوي)</option>
              <option value="ORANGE">Orange (أورنج)</option>
              <option value="MAROC_TELECOM">IAM (اتصالات المغرب)</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl text-xs">
            <span className="text-slate-400 text-[11px]">الحالة:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent text-white text-xs font-semibold focus:outline-none cursor-pointer"
            >
              <option value="ALL">الكل (All)</option>
              <option value="active">نشط (Active)</option>
              <option value="trial_expired">منتهي الرصيد (Expired)</option>
              <option value="suspended">محظور (Suspended)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Subscribers Table */}
      <div className="bg-[#0e1422] rounded-3xl border border-slate-800 overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="bg-slate-900/90 border-b border-slate-800 text-[11px] font-mono text-slate-400 select-none">
                <th className="py-3.5 px-4 text-left">رقم الهاتف (Phone)</th>
                <th className="py-3.5 px-4 text-left">المشغل (Operator)</th>
                <th className="py-3.5 px-4 text-left min-w-[200px]">استهلاك الـ 1.0 GB المجانية</th>
                <th className="py-3.5 px-4 text-left">الباقة (Tier)</th>
                <th className="py-3.5 px-4 text-left">الحالة (Status)</th>
                <th className="py-3.5 px-4 text-left">معرّف الجهاز (Device ID)</th>
                <th className="py-3.5 px-4 text-left">تاريخ التسجيل</th>
                <th className="py-3.5 px-4 text-right">إجراءات التحكم السريعة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-xs font-sans">
              {filteredSubscribers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500 font-mono">
                    {isLoading ? 'جاري تحميل المشتركين من الخادم...' : 'لا يوجد مشتركون يطابقون شروط البحث'}
                  </td>
                </tr>
              ) : (
                filteredSubscribers.map((sub) => {
                  const usedMb = +(sub.trial_used_bytes / (1024 * 1024)).toFixed(1);
                  const totalMb = +(sub.trial_total_bytes / (1024 * 1024)).toFixed(0);
                  const usagePct = Math.min(100, Math.round((sub.trial_used_bytes / (sub.trial_total_bytes || 1073741824)) * 100));

                  return (
                    <tr key={sub.id} className="hover:bg-slate-800/30 transition-colors group">
                      {/* Phone Number */}
                      <td className="py-4 px-4 text-left font-mono">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                            <Smartphone className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <span className="font-bold text-white tracking-wider">{sub.phone_number}</span>
                            {sub.notes && (
                              <p className="text-[10px] text-slate-400 max-w-[150px] truncate">{sub.notes}</p>
                            )}
                          </div>
                          <button
                            onClick={() => copyToClipboard(sub.phone_number, sub.id + '-phone')}
                            className="text-slate-500 hover:text-slate-300 p-1"
                            title="نسخ الرقم"
                          >
                            {copiedId === sub.id + '-phone' ? (
                              <Check className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Operator Badge */}
                      <td className="py-4 px-4 text-left">
                        {renderOperatorBadge(sub.operator)}
                      </td>

                      {/* 1GB Trial Usage Meter */}
                      <td className="py-4 px-4 text-left font-mono">
                        {sub.is_vip ? (
                          <div className="flex items-center gap-1.5 text-amber-400 font-semibold text-xs">
                            <Crown className="w-3.5 h-3.5 shrink-0" />
                            <span>باقة VIP غير محدودة (Unlimited)</span>
                          </div>
                        ) : (
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="text-white font-bold">{usedMb} MB</span>
                              <span className="text-slate-400">من أصل {totalMb} MB ({usagePct}%)</span>
                            </div>
                            <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden border border-slate-700/50">
                              <div
                                style={{ width: `${usagePct}%` }}
                                className={`h-full rounded-full transition-all duration-300 ${
                                  usagePct >= 100
                                    ? 'bg-rose-500'
                                    : usagePct > 75
                                    ? 'bg-amber-500'
                                    : 'bg-gradient-to-r from-cyan-400 to-emerald-400'
                                }`}
                              />
                            </div>
                          </div>
                        )}
                      </td>

                      {/* Tier Badge */}
                      <td className="py-4 px-4 text-left">
                        {sub.is_vip ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                            <Crown className="w-3 h-3 text-amber-400" />
                            VIP UNLIMITED
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 font-mono">
                            <Sparkles className="w-3 h-3 text-cyan-400" />
                            1.0 GB Trial
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4 text-left font-mono">
                        {sub.status === 'active' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-950 text-emerald-400 border border-emerald-500/30">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                            نشط (Active)
                          </span>
                        )}
                        {sub.status === 'trial_expired' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-950 text-rose-400 border border-rose-500/30">
                            منتهي الرصيد
                          </span>
                        )}
                        {sub.status === 'suspended' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-red-950 text-red-400 border border-red-500/30">
                            محظور (Banned)
                          </span>
                        )}
                      </td>

                      {/* Device ID */}
                      <td className="py-4 px-4 text-left font-mono text-[11px] text-slate-400">
                        <div className="flex items-center gap-1">
                          <span className="truncate max-w-[110px] bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                            {sub.device_id || 'N/A'}
                          </span>
                          {sub.device_id && (
                            <button
                              onClick={() => copyToClipboard(sub.device_id, sub.id + '-dev')}
                              className="text-slate-500 hover:text-slate-300 p-0.5"
                              title="نسخ معرف الجهاز"
                            >
                              {copiedId === sub.id + '-dev' ? (
                                <Check className="w-3 h-3 text-emerald-400" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Registered Date */}
                      <td className="py-4 px-4 text-left font-mono text-[11px] text-slate-400">
                        {new Date(sub.registered_at).toLocaleDateString('ar-MA', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </td>

                      {/* Action Buttons */}
                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Quick Extend +1GB Quota */}
                          <button
                            onClick={() => openExtendModal(sub)}
                            className="p-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 transition text-xs flex items-center gap-1"
                            title="تمديد الرصيد المجاني"
                          >
                            <Gift className="w-3.5 h-3.5" />
                            <span className="hidden xl:inline text-[11px] font-semibold font-sans">تمديد الرصيد</span>
                          </button>

                          {/* Toggle VIP */}
                          <button
                            onClick={() => handleToggleVip(sub)}
                            className={`p-1.5 rounded-lg border transition text-xs flex items-center gap-1 ${
                              sub.is_vip 
                                ? 'bg-amber-500/20 text-amber-300 border-amber-500/50' 
                                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-amber-300'
                            }`}
                            title={sub.is_vip ? 'إلغاء VIP' : 'ترقية إلى VIP'}
                          >
                            <Crown className="w-3.5 h-3.5" />
                            <span className="hidden xl:inline text-[11px] font-semibold font-sans">
                              {sub.is_vip ? 'إلغاء VIP' : 'ترقية VIP'}
                            </span>
                          </button>

                          {/* Toggle Suspend */}
                          <button
                            onClick={() => handleToggleStatus(sub)}
                            className={`p-1.5 rounded-lg border transition text-xs ${
                              sub.status === 'suspended'
                                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                                : 'bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500/20'
                            }`}
                            title={sub.status === 'suspended' ? 'إلغاء الحظر وتفعيل' : 'حظر الجهاز'}
                          >
                            {sub.status === 'suspended' ? (
                              <ShieldCheck className="w-3.5 h-3.5" />
                            ) : (
                              <ShieldAlert className="w-3.5 h-3.5" />
                            )}
                          </button>

                          {/* Edit */}
                          <button
                            onClick={() => openEditModal(sub)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
                            title="تعديل بيانات المشترك"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => handleDeleteSubscriber(sub.id)}
                            className="p-1.5 rounded-lg bg-red-950/60 hover:bg-red-900/80 text-red-400 border border-red-500/30 transition"
                            title="حذف المشترك"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: Extend Quota Modal */}
      {isExtendModalOpen && selectedSub && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0e1422] border border-indigo-500/40 rounded-3xl w-full max-w-md shadow-2xl p-6 space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white">
                  <Gift className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">تمديد الرصيد التجريبي المجاني</h3>
                  <p className="text-[11px] text-slate-400 font-mono">{selectedSub.phone_number}</p>
                </div>
              </div>
              <button
                onClick={() => setIsExtendModalOpen(false)}
                className="text-slate-400 hover:text-white text-xs font-mono"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleExtendQuotaSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300">حدد سعة الرصيد الإضافي المراد منحه:</label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { label: '+500 MB', mb: 500 },
                    { label: '+1.0 GB', mb: 1024 },
                    { label: '+2.0 GB', mb: 2048 },
                    { label: '+5.0 GB', mb: 5120 },
                  ].map((chip) => (
                    <button
                      key={chip.mb}
                      type="button"
                      onClick={() => setExtendMb(chip.mb)}
                      className={`py-2 rounded-xl text-xs font-bold border transition ${
                        extendMb === chip.mb
                          ? 'bg-indigo-600 text-white border-indigo-400 shadow-md shadow-indigo-600/30'
                          : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800'
                      }`}
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] text-slate-400">أو أدخل الحجم بالميجابايت يدوياً (MB):</label>
                <input
                  type="number"
                  min="100"
                  max="50000"
                  value={extendMb}
                  onChange={(e) => setExtendMb(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs font-mono"
                />
              </div>

              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-[11px] text-slate-400 space-y-1">
                <div className="flex justify-between">
                  <span>الرصيد الكلي الحالي:</span>
                  <span className="text-white font-mono">{+(selectedSub.trial_total_bytes / (1024 * 1024)).toFixed(0)} MB</span>
                </div>
                <div className="flex justify-between text-emerald-400 font-semibold">
                  <span>الرصيد الكلي بعد التمديد:</span>
                  <span className="font-mono">
                    {+((selectedSub.trial_total_bytes + extendMb * 1024 * 1024) / (1024 * 1024)).toFixed(0)} MB
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsExtendModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 font-semibold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs text-white font-bold shadow-lg shadow-indigo-600/30"
                >
                  تأكيد تمديد الرصيد
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Add Subscriber Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0e1422] border border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl p-6 space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-fuchsia-600 to-indigo-600 flex items-center justify-center text-white">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">إضافة مشترك جديد (New Subscriber)</h3>
                  <p className="text-[11px] text-slate-400">توليد حساب وحصة 1.0 GB مجاناً</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-white text-xs font-mono"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">رقم الهاتف (Phone Number) *</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: 0612345678 أو +212612345678"
                  value={formData.phone_number}
                  onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs font-mono focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">مشغل الاتصالات (Operator)</label>
                  <select
                    value={formData.operator}
                    onChange={(e: any) => setFormData({ ...formData, operator: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs font-semibold focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="INWI">Inwi (إنوي *6)</option>
                    <option value="ORANGE">Orange (أورنج *6)</option>
                    <option value="MAROC_TELECOM">Maroc Telecom (IAM *6)</option>
                    <option value="GENERIC">Generic (عام)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">سعة الرصيد المجاني (GB)</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    max="100"
                    value={formData.trial_total_gb}
                    onChange={(e) => setFormData({ ...formData, trial_total_gb: Number(e.target.value) })}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs font-mono focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">معرّف الجهاز (Device ID / HWID) (اختياري)</label>
                <input
                  type="text"
                  placeholder="سيتم ربطه تلقائياً عند أول اتصال من الهاتف"
                  value={formData.device_id}
                  onChange={(e) => setFormData({ ...formData, device_id: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs font-mono focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-950/20 border border-amber-500/30">
                <input
                  type="checkbox"
                  id="add-is-vip"
                  checked={formData.is_vip}
                  onChange={(e) => setFormData({ ...formData, is_vip: e.target.checked })}
                  className="w-4 h-4 text-amber-500 rounded bg-slate-900 border-slate-700"
                />
                <label htmlFor="add-is-vip" className="text-xs text-amber-300 font-semibold cursor-pointer">
                  ترقية هذا الحساب فوراً إلى VIP غير محدود (VIP Unlimited)
                </label>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">ملاحظات إضافية (Notes)</label>
                <input
                  type="text"
                  placeholder="مثال: مشترك عبر تيليجرام / عميل تجريبي"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 font-semibold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-fuchsia-600 to-indigo-600 hover:opacity-90 text-xs text-white font-bold shadow-lg shadow-indigo-600/30"
                >
                  حفظ وتسجيل المشترك
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Edit Subscriber Modal */}
      {isEditModalOpen && selectedSub && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0e1422] border border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl p-6 space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">تعديل بيانات المشترك</h3>
                  <p className="text-[11px] text-slate-400 font-mono">{selectedSub.id}</p>
                </div>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-white text-xs font-mono"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">رقم الهاتف</label>
                <input
                  type="text"
                  required
                  value={formData.phone_number}
                  onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">المشغل</label>
                  <select
                    value={formData.operator}
                    onChange={(e: any) => setFormData({ ...formData, operator: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs font-semibold"
                  >
                    <option value="INWI">Inwi (إنوي *6)</option>
                    <option value="ORANGE">Orange (أورنج *6)</option>
                    <option value="MAROC_TELECOM">IAM (اتصالات المغرب)</option>
                    <option value="GENERIC">Generic</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">الحالة (Status)</label>
                  <select
                    value={formData.status}
                    onChange={(e: any) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs font-semibold"
                  >
                    <option value="active">نشط (Active)</option>
                    <option value="trial_expired">منتهي الرصيد (Expired)</option>
                    <option value="suspended">محظور (Suspended)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">الرصيد الكلي (GB)</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.trial_total_gb}
                  onChange={(e) => setFormData({ ...formData, trial_total_gb: Number(e.target.value) })}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">معرّف الجهاز (Device ID)</label>
                <input
                  type="text"
                  value={formData.device_id}
                  onChange={(e) => setFormData({ ...formData, device_id: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs font-mono"
                />
              </div>

              <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-950/20 border border-amber-500/30">
                <input
                  type="checkbox"
                  id="edit-is-vip"
                  checked={formData.is_vip}
                  onChange={(e) => setFormData({ ...formData, is_vip: e.target.checked })}
                  className="w-4 h-4 text-amber-500 rounded bg-slate-900 border-slate-700"
                />
                <label htmlFor="edit-is-vip" className="text-xs text-amber-300 font-semibold cursor-pointer">
                  حساب VIP غير محدود (VIP Unlimited)
                </label>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">ملاحظات</label>
                <input
                  type="text"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 font-semibold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs text-white font-bold shadow-lg shadow-indigo-600/30"
                >
                  تحديث البيانات
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
