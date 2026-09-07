import React, { useState, useEffect, useMemo } from 'react';
import { 
  CreditCard, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Search, 
  RefreshCw, 
  Smartphone, 
  Copy, 
  Check, 
  Plus, 
  Sparkles, 
  Trash2, 
  Filter, 
  Crown, 
  Zap, 
  ShieldCheck, 
  HardDrive, 
  Calendar, 
  DollarSign,
  AlertCircle,
  Tag,
  Edit2,
  ExternalLink,
  MessageSquare
} from 'lucide-react';
import { RechargeRequest, SubscriptionPlan } from '../types/vpn';
import { api } from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';

export const RechargeManager: React.FC = () => {
  const { t } = useLanguage();
  const [recharges, setRecharges] = useState<RechargeRequest[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [counts, setCounts] = useState<{
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    totalRevenueDhs: number;
  }>({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    totalRevenueDhs: 0
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [operatorFilter, setOperatorFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);

  // Modals
  const [isRejectModalOpen, setIsRejectModalOpen] = useState<boolean>(false);
  const [rejectingItem, setRejectingItem] = useState<RechargeRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>('رمز التعبئة غير صحيح أو مستعمل مسبقاً');

  const [isManualModalOpen, setIsManualModalOpen] = useState<boolean>(false);
  const [manualForm, setManualForm] = useState({
    phone_number: '',
    operator: 'INWI' as 'INWI' | 'ORANGE' | 'MAROC_TELECOM' | 'GENERIC',
    plan_id: '',
    notes: ''
  });

  const [isPlansModalOpen, setIsPlansModalOpen] = useState<boolean>(false);
  const [isPlanEditModalOpen, setIsPlanEditModalOpen] = useState<boolean>(false);
  const [editingPlan, setEditingPlan] = useState<Partial<SubscriptionPlan> | null>(null);

  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Fetch data
  const loadData = async () => {
    try {
      setIsLoading(true);
      const [rechargesRes, plansRes] = await Promise.all([
        api.getRecharges({
          status: statusFilter !== 'all' ? statusFilter : undefined,
          operator: operatorFilter !== 'ALL' ? operatorFilter : undefined,
          search: searchQuery || undefined
        }),
        api.getPlans()
      ]);

      if (rechargesRes.recharges) {
        setRecharges(rechargesRes.recharges);
        setCounts(rechargesRes.counts || {
          total: rechargesRes.recharges.length,
          pending: rechargesRes.recharges.filter(r => r.status === 'pending').length,
          approved: rechargesRes.recharges.filter(r => r.status === 'approved').length,
          rejected: rechargesRes.recharges.filter(r => r.status === 'rejected').length,
          totalRevenueDhs: rechargesRes.recharges
            .filter(r => r.status === 'approved')
            .reduce((sum, r) => sum + (r.priceDhs || 0), 0)
        });
      }

      if (plansRes) {
        setPlans(plansRes);
        if (!manualForm.plan_id && plansRes.length > 0) {
          setManualForm(prev => ({ ...prev, plan_id: plansRes[0].id }));
        }
      }
    } catch (err: any) {
      console.error('Failed to load recharge data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000); // Polling every 10s for new recharge submissions
    return () => clearInterval(interval);
  }, [statusFilter, operatorFilter, searchQuery]);

  const showToast = (type: 'success' | 'error', text: string) => {
    setActionMessage({ type, text });
    setTimeout(() => setActionMessage(null), 4500);
  };

  // Copy code helper
  const handleCopyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCodeId(id);
    setTimeout(() => setCopiedCodeId(null), 2000);
  };

  // Approve action
  const handleApprove = async (id: string) => {
    try {
      const res = await api.approveRecharge(id);
      showToast('success', res.message || 'تم قبول التعبئة وتفعيل رصيد المشترك بنجاح ✅');
      loadData();
    } catch (err: any) {
      showToast('error', err.message || 'فشل قبول طلب التعبئة');
    }
  };

  // Open Reject modal
  const openRejectModal = (item: RechargeRequest) => {
    setRejectingItem(item);
    setRejectionReason('رمز التعبئة غير صحيح أو مستعمل مسبقاً');
    setIsRejectModalOpen(true);
  };

  // Confirm Reject action
  const handleConfirmReject = async () => {
    if (!rejectingItem) return;
    try {
      const res = await api.rejectRecharge(rejectingItem.id, rejectionReason);
      showToast('success', res.message || 'تم رفض طلب التعبئة ⛔');
      setIsRejectModalOpen(false);
      setRejectingItem(null);
      loadData();
    } catch (err: any) {
      showToast('error', err.message || 'فشل رفض طلب التعبئة');
    }
  };

  // Delete action
  const handleDelete = async (id: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا السجل؟')) return;
    try {
      await api.deleteRecharge(id);
      showToast('success', 'تم حذف السجل بنجاح');
      loadData();
    } catch (err: any) {
      showToast('error', err.message || 'فشل حذف السجل');
    }
  };

  // Submit Manual Recharge
  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualForm.phone_number || manualForm.phone_number.length < 8) {
      alert('يرجى إدخال رقم هاتف صحيح');
      return;
    }
    try {
      const res = await api.createManualRecharge(manualForm);
      showToast('success', res.message || 'تمت التعبئة اليدوية بنجاح ✅');
      setIsManualModalOpen(false);
      setManualForm({
        phone_number: '',
        operator: 'INWI',
        plan_id: plans[0]?.id || '',
        notes: ''
      });
      loadData();
    } catch (err: any) {
      showToast('error', err.message || 'فشل تنفيذ التعبئة اليدوية');
    }
  };

  // Save Plan
  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlan?.name || !editingPlan?.priceDhs || !editingPlan?.dataGb || !editingPlan?.durationDays) {
      alert('يرجى ملء جميع الحقول المطلوبة');
      return;
    }

    try {
      if (editingPlan.id) {
        await api.updatePlan(editingPlan.id, editingPlan);
        showToast('success', 'تم تحديث بيانات الباقة بنجاح');
      } else {
        await api.createPlan(editingPlan);
        showToast('success', 'تمت إضافة باقة الاشتراك بنجاح');
      }
      setIsPlanEditModalOpen(false);
      setEditingPlan(null);
      const updatedPlans = await api.getPlans();
      setPlans(updatedPlans);
    } catch (err: any) {
      showToast('error', err.message || 'فشل حفظ الباقة');
    }
  };

  // Delete Plan
  const handleDeletePlan = async (id: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذه الباقة؟')) return;
    try {
      await api.deletePlan(id);
      showToast('success', 'تم حذف الباقة بنجاح');
      const updatedPlans = await api.getPlans();
      setPlans(updatedPlans);
    } catch (err: any) {
      showToast('error', err.message || 'فشل حذف الباقة');
    }
  };

  // Total GBs calculated
  const totalGbsApproved = useMemo(() => {
    return recharges
      .filter(r => r.status === 'approved')
      .reduce((sum, r) => sum + (r.dataGb || 0), 0);
  }, [recharges]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200 text-slate-100" dir="rtl">
      {/* Toast Notification */}
      {actionMessage && (
        <div 
          className={`fixed top-5 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 text-sm font-medium backdrop-blur-md border ${
            actionMessage.type === 'success' 
              ? 'bg-emerald-950/90 text-emerald-200 border-emerald-500/50 shadow-emerald-500/20' 
              : 'bg-rose-950/90 text-rose-200 border-rose-500/50 shadow-rose-500/20'
          } animate-in fade-in slide-in-from-top-4 duration-150`}
        >
          {actionMessage.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          )}
          <span>{actionMessage.text}</span>
        </div>
      )}

      {/* Header & Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#0d131f] border border-slate-800/80 rounded-2xl p-5 shadow-lg">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 via-orange-500 to-yellow-400 p-0.5 shadow-lg shadow-amber-500/20">
            <div className="w-full h-full bg-[#0b0f17] rounded-[14px] flex items-center justify-center">
              <CreditCard className="w-6 h-6 text-amber-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-white font-sans">مراجعة التعبئات والاشتراكات</h1>
              {counts.pending > 0 && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500 text-black animate-pulse shadow-md shadow-amber-500/30">
                  {counts.pending} طلب معلق
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 font-sans mt-0.5">
              مراجعة أكواد التعبئة اليدوية (*6 / *3)، قبول وتفعيل سعات الـ GB وتمديد صلاحية المشتركين فورياً.
            </p>
          </div>
        </div>

        {/* Top Actions */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setIsPlansModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-700/90 text-xs font-semibold text-slate-200 border border-slate-700/60 transition-all shadow-sm"
          >
            <Tag className="w-4 h-4 text-cyan-400" />
            <span>إدارة الباقات والأسعار</span>
          </button>

          <button
            type="button"
            onClick={() => setIsManualModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold text-xs transition-all shadow-lg shadow-amber-500/20 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>شحن يدوي مباشر (+ Top-Up)</span>
          </button>

          <button
            type="button"
            onClick={loadData}
            disabled={isLoading}
            className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-slate-700/60 transition-all"
            title="تحديث البيانات"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-amber-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Summary Analytics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Card 1: Pending */}
        <div className="bg-[#0e1422] border border-amber-500/30 rounded-2xl p-4 relative overflow-hidden shadow-lg shadow-amber-500/5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-amber-300/90 font-sans">طلبات معلقة</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400 border border-amber-500/20">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-400 font-mono tracking-tight">{counts.pending}</span>
            <span className="text-[11px] text-slate-400 font-sans">بانتظار المراجعة</span>
          </div>
          {counts.pending > 0 && (
            <div className="mt-2 text-[11px] text-amber-300/80 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping"></span>
              <span>تتطلب إجراء سريع</span>
            </div>
          )}
        </div>

        {/* Card 2: Approved */}
        <div className="bg-[#0e1422] border border-emerald-500/30 rounded-2xl p-4 shadow-lg shadow-emerald-500/5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-emerald-300/90 font-sans">طلبات مقبولة</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 border border-emerald-500/20">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-400 font-mono tracking-tight">{counts.approved}</span>
            <span className="text-[11px] text-slate-400 font-sans">تم تفعيلها</span>
          </div>
        </div>

        {/* Card 3: Rejected */}
        <div className="bg-[#0e1422] border border-rose-500/30 rounded-2xl p-4 shadow-lg shadow-rose-500/5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-rose-300/90 font-sans">طلبات مرفوضة</span>
            <div className="w-8 h-8 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-400 border border-rose-500/20">
              <XCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-rose-400 font-mono tracking-tight">{counts.rejected}</span>
            <span className="text-[11px] text-slate-400 font-sans">أكواد غير صالحة</span>
          </div>
        </div>

        {/* Card 4: Total Revenue (DH) */}
        <div className="bg-[#0e1422] border border-cyan-500/30 rounded-2xl p-4 shadow-lg shadow-cyan-500/5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-cyan-300/90 font-sans">إجمالي المداخيل</span>
            <div className="w-8 h-8 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-400 border border-cyan-500/20">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-cyan-300 font-mono tracking-tight">{counts.totalRevenueDhs}</span>
            <span className="text-[11px] text-slate-400 font-sans">درهم مغربي</span>
          </div>
        </div>

        {/* Card 5: Total GBs */}
        <div className="bg-[#0e1422] border border-violet-500/30 rounded-2xl p-4 shadow-lg shadow-violet-500/5 col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-violet-300/90 font-sans">البيانات الممنوحة</span>
            <div className="w-8 h-8 rounded-xl bg-violet-500/10 flex items-center justify-center text-violet-400 border border-violet-500/20">
              <HardDrive className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-violet-300 font-mono tracking-tight">{totalGbsApproved}</span>
            <span className="text-[11px] text-slate-400 font-sans">GB مفعّلة</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-[#0e1422] border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 bg-[#090d16] p-1 rounded-xl border border-slate-800/80 w-full md:w-auto overflow-x-auto">
          {[
            { id: 'all', label: 'جميع الطلبات', count: counts.total },
            { id: 'pending', label: 'معلقة (Pending)', count: counts.pending, highlight: counts.pending > 0 },
            { id: 'approved', label: 'مقبولة (Approved)', count: counts.approved },
            { id: 'rejected', label: 'مرفوضة (Rejected)', count: counts.rejected }
          ].map((tab) => {
            const isActive = statusFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  isActive 
                    ? 'bg-amber-500 text-slate-950 shadow-md font-bold' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  isActive 
                    ? 'bg-black/20 text-slate-950 font-mono' 
                    : tab.highlight 
                      ? 'bg-amber-500/20 text-amber-300 font-mono font-bold' 
                      : 'bg-slate-800 text-slate-400 font-mono'
                }`}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Operator & Search Inputs */}
        <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full md:w-auto">
          {/* Operator Select */}
          <select
            value={operatorFilter}
            onChange={(e) => setOperatorFilter(e.target.value)}
            className="bg-[#090d16] border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-200 font-sans focus:outline-none focus:border-amber-500 w-full sm:w-auto"
          >
            <option value="ALL">جميع الشبكات (Inwi / Orange / IAM)</option>
            <option value="INWI">Inwi (إنوي *6)</option>
            <option value="ORANGE">Orange (أورنج *6)</option>
            <option value="MAROC_TELECOM">Maroc Telecom (اتصالات المغرب *6)</option>
          </select>

          {/* Search Input */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="بحث برقم الهاتف، كود التعبئة، أو المعرف..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#090d16] border border-slate-700/80 rounded-xl pr-9 pl-3 py-2 text-xs text-slate-200 placeholder-slate-500 font-sans focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>
      </div>

      {/* Requests Table */}
      <div className="bg-[#0e1422] border border-slate-800/90 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="bg-[#0a0f19] border-b border-slate-800 text-slate-400 font-mono uppercase tracking-wider text-[11px]">
                <th className="p-4 font-semibold">المشترك / الهاتف</th>
                <th className="p-4 font-semibold">المشغل (الشبكة)</th>
                <th className="p-4 font-semibold">الباقة المطلوبة</th>
                <th className="p-4 font-semibold">رمز وكود التعبئة (Recharge Code)</th>
                <th className="p-4 font-semibold">تاريخ التقديم</th>
                <th className="p-4 font-semibold text-center">الحالة</th>
                <th className="p-4 font-semibold text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {recharges.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-slate-500">
                    <CreditCard className="w-10 h-10 mx-auto mb-3 opacity-30 text-amber-400" />
                    <p className="text-sm font-semibold text-slate-300">لا توجد طلبات تعبئة مطابقة</p>
                    <p className="text-xs text-slate-500 mt-1">عندما يُدخل أي مستخدم كود تعبئة من تطبيق الأندرويد، سيظهر هنا فورياً.</p>
                  </td>
                </tr>
              ) : (
                recharges.map((item) => {
                  const isPending = item.status === 'pending';
                  const isApproved = item.status === 'approved';
                  const isRejected = item.status === 'rejected';

                  // Format date
                  const dateStr = item.submitted_at 
                    ? new Date(item.submitted_at).toLocaleDateString('ar-MA', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })
                    : 'الآن';

                  return (
                    <tr 
                      key={item.id} 
                      className={`transition-colors ${
                        isPending 
                          ? 'bg-amber-950/10 hover:bg-amber-950/20' 
                          : 'hover:bg-slate-800/30'
                      }`}
                    >
                      {/* Subscriber & Phone */}
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs ${
                            item.operator === 'INWI' 
                              ? 'bg-purple-950/70 text-purple-300 border border-purple-500/40' 
                              : item.operator === 'ORANGE' 
                                ? 'bg-orange-950/70 text-orange-300 border border-orange-500/40' 
                                : 'bg-blue-950/70 text-blue-300 border border-blue-500/40'
                          }`}>
                            <Smartphone className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="font-bold text-white font-mono text-sm tracking-wide flex items-center gap-1.5">
                              <span>{item.phone_number}</span>
                            </div>
                            <span className="text-[10px] text-slate-400 font-mono">
                              ID: {item.device_id.substring(0, 16)}...
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Operator Badge */}
                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold ${
                          item.operator === 'INWI' 
                            ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' 
                            : item.operator === 'ORANGE' 
                              ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30' 
                              : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                        }`}>
                          <span>{item.operator === 'INWI' ? '🟣 Inwi *6' : item.operator === 'ORANGE' ? '🟠 Orange *6' : '🔵 Maroc Telecom *6'}</span>
                        </span>
                      </td>

                      {/* Requested Plan */}
                      <td className="p-4">
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-amber-300 font-mono text-sm">
                              {item.priceDhs} درهم
                            </span>
                            <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono font-bold text-[11px] border border-amber-500/30">
                              {item.dataGb} GB
                            </span>
                            <span className="text-[11px] text-slate-400 font-sans">
                              ({item.durationDays} أيام)
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-400 font-sans">
                            {item.plan_name || 'باقة إنترنت فائقة'}
                          </span>
                        </div>
                      </td>

                      {/* Recharge Code (Monospace + One-Click Copy) */}
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <div className="bg-[#070b12] border border-amber-500/40 px-3 py-1.5 rounded-xl font-mono text-amber-300 font-bold tracking-widest text-sm select-all">
                            {item.recharge_code}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleCopyCode(item.recharge_code, item.id)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-all"
                            title="نسخ كود التعبئة"
                          >
                            {copiedCodeId === item.id ? (
                              <Check className="w-4 h-4 text-emerald-400" />
                            ) : (
                              <Copy className="w-4 h-4 text-slate-400" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Date */}
                      <td className="p-4 font-mono text-slate-400 text-[11px]">
                        {dateStr}
                      </td>

                      {/* Status */}
                      <td className="p-4 text-center">
                        {isPending && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
                            <Clock className="w-3.5 h-3.5" />
                            <span>معلقة (Pending)</span>
                          </span>
                        )}
                        {isApproved && (
                          <div className="flex flex-col items-center">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>مقبولة ومفعلة</span>
                            </span>
                            {item.processed_by && (
                              <span className="text-[10px] text-slate-500 mt-0.5">
                                بواسطة: {item.processed_by}
                              </span>
                            )}
                          </div>
                        )}
                        {isRejected && (
                          <div className="flex flex-col items-center">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                              <XCircle className="w-3.5 h-3.5" />
                              <span>مرفوضة</span>
                            </span>
                            {item.rejection_reason && (
                              <span className="text-[10px] text-rose-400/80 mt-0.5 max-w-[150px] truncate" title={item.rejection_reason}>
                                {item.rejection_reason}
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="p-4">
                        <div className="flex items-center justify-center gap-2">
                          {isPending ? (
                            <>
                              {/* Approve Button */}
                              <button
                                type="button"
                                onClick={() => handleApprove(item.id)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/30 transition-all active:scale-95"
                                title="قبول التعبئة وتفعيل رصيد الـ GB للمشترك فورياً"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>قبول (Approve)</span>
                              </button>

                              {/* Reject Button */}
                              <button
                                type="button"
                                onClick={() => openRejectModal(item)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/40 font-semibold text-xs transition-all active:scale-95"
                                title="رفض الطلب"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                <span>رفض (Reject)</span>
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleDelete(item.id)}
                              className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-rose-950 text-slate-400 hover:text-rose-300 border border-slate-700/60 transition-all"
                              title="حذف هذا السجل"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
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

      {/* Reject Modal */}
      {isRejectModalOpen && rejectingItem && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#0e1422] border border-rose-500/50 rounded-3xl w-full max-w-md p-6 space-y-5 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-600/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
                <XCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white font-sans">رفض طلب التعبئة</h3>
                <p className="text-xs text-slate-400 font-mono">{rejectingItem.phone_number} - {rejectingItem.priceDhs} DH</p>
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-semibold text-slate-300">سبب الرفض:</label>
              <div className="space-y-2">
                {[
                  'رمز التعبئة غير صحيح أو غير مكتمل',
                  'كود التعبئة مستعمل مسبقاً',
                  'المبلغ لا يطابق الباقة المطلوبة',
                  'شبكة المشغل غير متطابقة مع الكود'
                ].map((reason) => (
                  <label 
                    key={reason} 
                    className="flex items-center gap-2.5 p-2.5 rounded-xl bg-[#090d16] border border-slate-800 hover:border-rose-500/50 cursor-pointer text-xs text-slate-200"
                  >
                    <input
                      type="radio"
                      name="rejection_reason"
                      checked={rejectionReason === reason}
                      onChange={() => setRejectionReason(reason)}
                      className="text-rose-500 focus:ring-rose-500"
                    />
                    <span>{reason}</span>
                  </label>
                ))}
              </div>

              <input
                type="text"
                placeholder="أو اكتب سبب مخصص..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full bg-[#090d16] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsRejectModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-bold text-white shadow-lg shadow-rose-600/30"
              >
                تأكيد الرفض ⛔
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Top-up Modal */}
      {isManualModalOpen && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#0e1422] border border-amber-500/50 rounded-3xl w-full max-w-lg p-6 space-y-5 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white font-sans">شحن وتعبئة يدوية مباشرة</h3>
                  <p className="text-xs text-slate-400 font-sans">تزويد المشترك برصيد GB وصلاحية مباشرة من لوحة التحكم</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsManualModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">رقم هاتف المشترك:</label>
                <input
                  type="text"
                  placeholder="06XXXXXXXX أو 07XXXXXXXX"
                  value={manualForm.phone_number}
                  onChange={(e) => setManualForm({ ...manualForm, phone_number: e.target.value })}
                  className="w-full bg-[#090d16] border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white font-mono placeholder-slate-500 focus:border-amber-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1.5">المشغل:</label>
                  <select
                    value={manualForm.operator}
                    onChange={(e) => setManualForm({ ...manualForm, operator: e.target.value as any })}
                    className="w-full bg-[#090d16] border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white font-sans focus:border-amber-500"
                  >
                    <option value="INWI">Inwi (إنوي *6)</option>
                    <option value="ORANGE">Orange (أورنج *6)</option>
                    <option value="MAROC_TELECOM">Maroc Telecom (اتصالات المغرب *6)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1.5">الباقة المراد شحنها:</label>
                  <select
                    value={manualForm.plan_id}
                    onChange={(e) => setManualForm({ ...manualForm, plan_id: e.target.value })}
                    className="w-full bg-[#090d16] border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white font-sans focus:border-amber-500"
                  >
                    {plans.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} - ({p.priceDhs} DH / {p.dataGb} GB)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">ملاحظات إضافية (اختياري):</label>
                <input
                  type="text"
                  placeholder="مثال: شحن مباشر لزبون VIP عبر واتساب..."
                  value={manualForm.notes}
                  onChange={(e) => setManualForm({ ...manualForm, notes: e.target.value })}
                  className="w-full bg-[#090d16] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-sans placeholder-slate-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsManualModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-lg shadow-amber-500/20"
                >
                  تأكيد وشحن الرصيد فوراً ⚡
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Plans Manager Modal */}
      {isPlansModalOpen && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#0e1422] border border-slate-700/80 rounded-3xl w-full max-w-2xl p-6 space-y-5 shadow-2xl animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
                  <Tag className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white font-sans">{t('plans', 'title')}</h3>
                  <p className="text-xs text-slate-400 font-sans">{t('plans', 'subtitle')}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPlansModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Plans List */}
            <div className="space-y-3">
              {plans.map((p) => (
                <div 
                  key={p.id}
                  className="bg-[#090d16] border border-slate-800 rounded-2xl p-4 flex items-center justify-between gap-4 hover:border-slate-700 transition-all"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500/20 to-orange-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 font-mono font-bold">
                      {p.priceDhs}D
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white font-sans text-sm">{p.name}</span>
                        {p.badge && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            {p.badge}
                          </span>
                        )}
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/30 font-mono">
                          {p.operator || 'ALL'}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          p.is_active !== false ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-400'
                        }`}>
                          {p.is_active !== false ? t('common', 'active') : t('common', 'inactive')}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-slate-400 font-sans">
                        <span className="text-amber-400 font-mono font-bold">{p.dataGb} GB</span>
                        <span>•</span>
                        <span className="text-cyan-400 font-mono">{p.durationDays} {t('plans', 'validityDays')}</span>
                        {p.extraInfo && (
                          <>
                            <span>•</span>
                            <span className="text-slate-300">{p.extraInfo}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Edit / Delete Buttons */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingPlan(p);
                        setIsPlanEditModalOpen(true);
                      }}
                      className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700"
                      title={t('plans', 'editPlan')}
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeletePlan(p.id)}
                      className="p-2 rounded-xl bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-300 border border-slate-700"
                      title={t('common', 'delete')}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setEditingPlan({
                    name: 'باقة جديدة',
                    priceDhs: 30,
                    dataGb: 30,
                    durationDays: 7,
                    extraInfo: '30 GB إنترنت فائق السرعة',
                    badge: '',
                    operator: 'ALL',
                    is_active: true
                  });
                  setIsPlanEditModalOpen(true);
                }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-md shadow-cyan-600/20"
              >
                <Plus className="w-4 h-4" />
                <span>{t('plans', 'newPlan')}</span>
              </button>

              <button
                type="button"
                onClick={() => setIsPlansModalOpen(false)}
                className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300"
              >
                {t('common', 'cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Plan Edit Modal */}
      {isPlanEditModalOpen && editingPlan && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#0e1422] border border-cyan-500/50 rounded-3xl w-full max-w-md p-6 space-y-4 shadow-2xl animate-in zoom-in-95 duration-150">
            <h3 className="text-base font-bold text-white font-sans">
              {editingPlan.id ? 'تعديل باقة الاشتراك' : 'إضافة باقة اشتراك جديدة'}
            </h3>

            <form onSubmit={handleSavePlan} className="space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">اسم الباقة:</label>
                <input
                  type="text"
                  value={editingPlan.name || ''}
                  onChange={(e) => setEditingPlan({ ...editingPlan, name: e.target.value })}
                  className="w-full bg-[#090d16] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  placeholder="مثال: باقة 20 درهم (3 أيام / 20GB)"
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">السعر (DH):</label>
                  <input
                    type="number"
                    value={editingPlan.priceDhs || ''}
                    onChange={(e) => setEditingPlan({ ...editingPlan, priceDhs: Number(e.target.value) })}
                    className="w-full bg-[#090d16] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                    min="1"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">السعة (GB):</label>
                  <input
                    type="number"
                    value={editingPlan.dataGb || ''}
                    onChange={(e) => setEditingPlan({ ...editingPlan, dataGb: Number(e.target.value) })}
                    className="w-full bg-[#090d16] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                    min="1"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">المدة (أيام):</label>
                  <input
                    type="number"
                    value={editingPlan.durationDays || ''}
                    onChange={(e) => setEditingPlan({ ...editingPlan, durationDays: Number(e.target.value) })}
                    className="w-full bg-[#090d16] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                    min="1"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">شركة الاتصال (Operator):</label>
                <select
                  value={editingPlan.operator || 'ALL'}
                  onChange={(e) => setEditingPlan({ ...editingPlan, operator: e.target.value as any })}
                  className="w-full bg-[#090d16] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-sans focus:border-amber-500"
                >
                  <option value="ALL">جميع الشبكات (ALL)</option>
                  <option value="INWI">إنوي (INWI)</option>
                  <option value="ORANGE">أورنج (ORANGE)</option>
                  <option value="MAROC_TELECOM">اتصالات المغرب (IAM)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">مميزات إضافية (extraInfo):</label>
                <input
                  type="text"
                  value={editingPlan.extraInfo || ''}
                  onChange={(e) => setEditingPlan({ ...editingPlan, extraInfo: e.target.value })}
                  className="w-full bg-[#090d16] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  placeholder="مثال: 1h مكالمة + أولوية VIP"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">شارة الباقة (Badge):</label>
                <input
                  type="text"
                  value={editingPlan.badge || ''}
                  onChange={(e) => setEditingPlan({ ...editingPlan, badge: e.target.value })}
                  className="w-full bg-[#090d16] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  placeholder="مثال: الأكثر طلباً، باقة التوفير..."
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="is_active_plan"
                  checked={editingPlan.is_active !== false}
                  onChange={(e) => setEditingPlan({ ...editingPlan, is_active: e.target.checked })}
                  className="rounded text-amber-500 focus:ring-amber-500"
                />
                <label htmlFor="is_active_plan" className="text-xs text-slate-300 cursor-pointer">
                  تفعيل الباقة وإظهارها في قائمة الشحن
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setIsPlanEditModalOpen(false);
                    setEditingPlan(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-300"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-lg shadow-cyan-600/30"
                >
                  حفظ الباقة ✅
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
