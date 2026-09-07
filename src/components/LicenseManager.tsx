import React, { useState } from 'react';
import { 
  KeyRound, 
  Plus, 
  Trash2, 
  Edit3, 
  RotateCcw, 
  Download, 
  Copy, 
  CheckCircle, 
  AlertTriangle, 
  Users, 
  Smartphone, 
  Layers,
  X,
  Search,
  Filter
} from 'lucide-react';
import { LicenseKey } from '../types/vpn';
import { api } from '../services/api';

interface LicenseManagerProps {
  licenses: LicenseKey[];
  onLicenseCreated: (license: LicenseKey) => void;
  onLicensesBatchCreated: (licenses: LicenseKey[]) => void;
  onLicenseUpdated: (license: LicenseKey) => void;
  onLicenseDeleted: (id: string) => void;
  onRefresh: () => void;
}

export const LicenseManager: React.FC<LicenseManagerProps> = ({
  licenses = [],
  onLicenseCreated,
  onLicensesBatchCreated,
  onLicenseUpdated,
  onLicenseDeleted,
  onRefresh,
}) => {
  const [isSingleModalOpen, setIsSingleModalOpen] = useState(false);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [editingLicense, setEditingLicense] = useState<LicenseKey | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copySuccess, setCopySuccess] = useState<string | null>(null);
  const [resettingId, setResettingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  // Single Form State
  const [singleForm, setSingleForm] = useState({
    customKey: '',
    duration: '30 Days' as LicenseKey['duration'],
    maxDevices: 1,
    ownerName: '',
    ownerContact: '',
    notes: '',
    status: 'active' as LicenseKey['status'],
  });

  // Batch Form State
  const [batchForm, setBatchForm] = useState({
    count: 10,
    prefix: 'NET-VIP',
    duration: '30 Days' as LicenseKey['duration'],
    maxDevices: 1,
    batchTag: 'Reseller_Batch_01'
  });

  const openAddSingleModal = () => {
    setEditingLicense(null);
    setSingleForm({
      customKey: '',
      duration: '30 Days',
      maxDevices: 1,
      ownerName: 'Customer VIP',
      ownerContact: '+212600112233',
      notes: 'Standard 30 Days Voucher',
      status: 'active',
    });
    setIsSingleModalOpen(true);
  };

  const openEditModal = (lic: LicenseKey) => {
    setEditingLicense(lic);
    setSingleForm({
      customKey: lic.key,
      duration: lic.duration,
      maxDevices: lic.maxDevices,
      ownerName: lic.ownerName,
      ownerContact: lic.ownerContact || '',
      notes: lic.notes || '',
      status: lic.status,
    });
    setIsSingleModalOpen(true);
  };

  const handleSingleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editingLicense) {
        const updated = await api.updateLicense(editingLicense.id, singleForm);
        onLicenseUpdated(updated);
      } else {
        const created = await api.createLicense(singleForm);
        onLicenseCreated(created);
      }
      setIsSingleModalOpen(false);
    } catch (err: any) {
      alert(err.message || 'Failed to save license');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await api.batchGenerateLicenses(batchForm);
      onLicensesBatchCreated(res.keys);
      setIsBatchModalOpen(false);
      alert(`Successfully generated ${res.count} VIP vouchers!`);
    } catch (err: any) {
      alert(err.message || 'Failed to generate batch');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetHwid = async (id: string, keyName: string) => {
    if (!window.confirm(`Reset bound HWIDs for key ${keyName}? This allows the user to re-bind new Android hardware.`)) return;
    setResettingId(id);
    try {
      const res = await api.resetHwid(id);
      onLicenseUpdated(res.license);
    } catch (err: any) {
      alert('Failed to reset HWID: ' + err.message);
    } finally {
      setResettingId(null);
    }
  };

  const handleDelete = async (id: string, keyName: string) => {
    if (!window.confirm(`Delete license key ${keyName}?`)) return;
    try {
      await api.deleteLicense(id);
      onLicenseDeleted(id);
    } catch (err: any) {
      alert(err.message || 'Failed to delete license');
    }
  };

  const copyKeyToClipboard = (keyStr: string) => {
    navigator.clipboard.writeText(keyStr);
    setCopySuccess(keyStr);
    setTimeout(() => setCopySuccess(null), 2000);
  };

  const exportKeys = (format: 'txt' | 'csv') => {
    if (!licenses.length) return;
    let content = '';
    let mimeType = 'text/plain';
    let filename = `nexus_licenses_${Date.now()}.${format}`;

    if (format === 'csv') {
      mimeType = 'text/csv';
      content = 'Key,Duration,MaxDevices,BoundDevices,Status,Owner,ExpiresAt\n';
      licenses.forEach(l => {
        content += `"${l.key}","${l.duration}",${l.maxDevices},${l.boundHwids.length},"${l.status}","${l.ownerName}","${l.expiresAt || 'Lifetime'}"\n`;
      });
    } else {
      content = licenses.map(l => `${l.key} | ${l.duration} | ${l.ownerName}`).join('\n');
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredLicenses = (licenses || []).filter(lic => {
    if (!lic) return false;
    const matchSearch = (lic.key || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (lic.ownerName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (lic.notes && lic.notes.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchStatus = filterStatus === 'ALL' || lic.status === filterStatus;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-cyan-400" />
            Voucher & HWID-Bound License Management
          </h2>
          <p className="text-xs text-slate-400">
            Generate VIP keys, enforce Android hardware binding, and manage reseller batches.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 p-1 rounded-xl">
            <button
              onClick={() => exportKeys('csv')}
              className="px-2.5 py-1 text-xs text-slate-300 hover:text-white rounded hover:bg-slate-800 flex items-center gap-1 font-mono"
            >
              <Download className="w-3.5 h-3.5 text-cyan-400" />
              <span>CSV</span>
            </button>
            <button
              onClick={() => exportKeys('txt')}
              className="px-2.5 py-1 text-xs text-slate-300 hover:text-white rounded hover:bg-slate-800 flex items-center gap-1 font-mono"
            >
              <Download className="w-3.5 h-3.5 text-violet-400" />
              <span>TXT</span>
            </button>
          </div>

          <button
            onClick={() => setIsBatchModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-violet-600/30 hover:bg-violet-600/50 border border-violet-500/40 text-violet-200 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
          >
            <Layers className="w-4 h-4 text-violet-400" />
            <span>Batch Wizard</span>
          </button>

          <button
            onClick={openAddSingleModal}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-white text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-cyan-500/20 hover:scale-[1.02] transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Generate Single Key</span>
          </button>
        </div>
      </div>

      {/* Search & Filter bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800">
        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search key, client name, note..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-400"
          />
        </div>

        <div className="flex items-center gap-1.5 text-xs">
          <span className="text-slate-400 font-mono text-[11px]">Filter:</span>
          {['ALL', 'active', 'expired', 'suspended'].map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-2.5 py-1 rounded-lg font-mono text-[11px] capitalize transition-colors ${
                filterStatus === st
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Licenses Table */}
      <div className="rounded-2xl bg-slate-900/70 border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-950/60 border-b border-slate-800 text-slate-400 font-mono uppercase text-[10px]">
                <th className="p-4 font-semibold">License Key</th>
                <th className="p-4 font-semibold">Owner & Notes</th>
                <th className="p-4 font-semibold">Duration & Expiry</th>
                <th className="p-4 font-semibold">HWID Hardware Binding</th>
                <th className="p-4 font-semibold">Status</th>
                <th className="p-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {filteredLicenses.map((lic) => {
                const isMaxed = lic.boundHwids.length >= lic.maxDevices;
                return (
                  <tr key={lic.id} className="hover:bg-slate-800/30 transition-colors">
                    {/* Key & Copy */}
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-cyan-300 tracking-wider">
                          {lic.key}
                        </span>
                        <button
                          onClick={() => copyKeyToClipboard(lic.key)}
                          className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800"
                          title="Copy Key"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        {copySuccess === lic.key && (
                          <span className="text-[10px] text-emerald-400 font-sans">Copied!</span>
                        )}
                      </div>
                    </td>

                    {/* Owner info */}
                    <td className="p-4">
                      <div className="font-sans font-semibold text-slate-200">{lic.ownerName}</div>
                      {lic.ownerContact && (
                        <div className="text-[11px] text-slate-400">{lic.ownerContact}</div>
                      )}
                      {lic.notes && (
                        <div className="text-[10px] text-slate-500 italic mt-0.5 truncate max-w-xs font-sans">
                          {lic.notes}
                        </div>
                      )}
                    </td>

                    {/* Duration & Expiry */}
                    <td className="p-4">
                      <div className="text-slate-200 font-bold">{lic.duration}</div>
                      <div className="text-[11px] text-slate-400">
                        {lic.expiresAt ? (
                          <span>Exp: {new Date(lic.expiresAt).toLocaleDateString()}</span>
                        ) : (
                          <span className="text-emerald-400">Never (Lifetime)</span>
                        )}
                      </div>
                    </td>

                    {/* Bound HWIDs */}
                    <td className="p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            isMaxed
                              ? 'bg-amber-950/60 text-amber-400 border border-amber-500/30'
                              : 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          {lic.boundHwids.length} / {lic.maxDevices} Devices Bound
                        </span>
                        {lic.boundHwids.length > 0 && (
                          <button
                            onClick={() => handleResetHwid(lic.id, lic.key)}
                            disabled={resettingId === lic.id}
                            className="text-[10px] text-violet-400 hover:text-violet-300 flex items-center gap-0.5 hover:underline disabled:opacity-50"
                            title="Clear Bound HWIDs"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Reset HWID</span>
                          </button>
                        )}
                      </div>

                      {lic.boundHwids.length > 0 ? (
                        <div className="text-[10px] text-slate-400 space-y-0.5">
                          {lic.boundHwids.map((hw, i) => (
                            <div key={i} className="truncate max-w-[200px]">
                              • {hw}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-500 italic">No device bound yet</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="p-4">
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                          lic.status === 'active'
                            ? 'bg-emerald-950/60 text-emerald-400 border-emerald-500/30'
                            : lic.status === 'expired'
                            ? 'bg-slate-800 text-slate-400 border-slate-700'
                            : 'bg-red-950/60 text-red-400 border-red-500/30'
                        }`}
                      >
                        {lic.status.toUpperCase()}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEditModal(lic)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-cyan-300 transition-colors"
                          title="Edit License"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(lic.id, lic.key)}
                          className="p-1.5 rounded-lg bg-red-950/40 hover:bg-red-900/60 text-red-400 hover:text-red-300 transition-colors"
                          title="Delete License"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Single Generate / Edit Modal */}
      {isSingleModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0f172a] border border-slate-700/80 rounded-2xl w-full max-w-lg shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white font-mono flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-cyan-400" />
                {editingLicense ? 'Edit License Key' : 'Generate VIP License Key'}
              </h3>
              <button
                onClick={() => setIsSingleModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSingleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Custom Key Format (Leave blank for auto NET-VIP-XXXX-YYYY)
                </label>
                <input
                  type="text"
                  value={singleForm.customKey}
                  onChange={(e) => setSingleForm({ ...singleForm, customKey: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white font-mono uppercase focus:outline-none focus:border-cyan-400"
                  placeholder="e.g. NET-VIP-9900-1122"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Duration Validity
                  </label>
                  <select
                    value={singleForm.duration}
                    onChange={(e) => setSingleForm({ ...singleForm, duration: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-cyan-400"
                  >
                    <option value="1 Day Trial">1 Day Trial</option>
                    <option value="7 Days">7 Days</option>
                    <option value="30 Days">30 Days (Standard VIP)</option>
                    <option value="3 Months">3 Months</option>
                    <option value="6 Months">6 Months</option>
                    <option value="1 Year">1 Year</option>
                    <option value="Unlimited">Unlimited (Lifetime)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Max Concurrent Devices
                  </label>
                  <select
                    value={singleForm.maxDevices}
                    onChange={(e) => setSingleForm({ ...singleForm, maxDevices: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-cyan-400"
                  >
                    <option value={1}>1 Device (Standard)</option>
                    <option value={2}>2 Devices (Dual Phone)</option>
                    <option value={3}>3 Devices (Family Pass)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Owner Name
                  </label>
                  <input
                    type="text"
                    value={singleForm.ownerName}
                    onChange={(e) => setSingleForm({ ...singleForm, ownerName: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-cyan-400"
                    placeholder="Customer Name"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Contact / Telegram
                  </label>
                  <input
                    type="text"
                    value={singleForm.ownerContact}
                    onChange={(e) => setSingleForm({ ...singleForm, ownerContact: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-cyan-400"
                    placeholder="+2126... or @username"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Status
                </label>
                <select
                  value={singleForm.status}
                  onChange={(e) => setSingleForm({ ...singleForm, status: e.target.value as any })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-cyan-400"
                >
                  <option value="active">Active</option>
                  <option value="expired">Expired</option>
                  <option value="suspended">Suspended (Blocked)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Internal Notes
                </label>
                <textarea
                  rows={2}
                  value={singleForm.notes}
                  onChange={(e) => setSingleForm({ ...singleForm, notes: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-cyan-400"
                  placeholder="e.g. Paid via CIH / Attijari / Crypto"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsSingleModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-xs font-medium text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-white text-xs font-bold shadow-lg shadow-cyan-500/20 disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : editingLicense ? 'Update License' : 'Generate License'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Batch Generation Wizard Modal */}
      {isBatchModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0f172a] border border-slate-700/80 rounded-2xl w-full max-w-lg shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white font-mono flex items-center gap-2">
                <Layers className="w-4 h-4 text-violet-400" />
                Reseller Batch Key Generator Wizard
              </h3>
              <button
                onClick={() => setIsBatchModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleBatchSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Number of Vouchers
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={batchForm.count}
                    onChange={(e) => setBatchForm({ ...batchForm, count: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-violet-400 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Key Prefix
                  </label>
                  <input
                    type="text"
                    value={batchForm.prefix}
                    onChange={(e) => setBatchForm({ ...batchForm, prefix: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-violet-400 font-mono"
                    placeholder="NET-VIP"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Duration Validity
                  </label>
                  <select
                    value={batchForm.duration}
                    onChange={(e) => setBatchForm({ ...batchForm, duration: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-violet-400"
                  >
                    <option value="1 Day Trial">1 Day Trial</option>
                    <option value="7 Days">7 Days</option>
                    <option value="30 Days">30 Days (Standard VIP)</option>
                    <option value="3 Months">3 Months</option>
                    <option value="6 Months">6 Months</option>
                    <option value="1 Year">1 Year</option>
                    <option value="Unlimited">Unlimited</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Max Devices / Key
                  </label>
                  <select
                    value={batchForm.maxDevices}
                    onChange={(e) => setBatchForm({ ...batchForm, maxDevices: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-violet-400"
                  >
                    <option value={1}>1 Device</option>
                    <option value={2}>2 Devices</option>
                    <option value={3}>3 Devices</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Batch Tag / Reseller Label
                </label>
                <input
                  type="text"
                  value={batchForm.batchTag}
                  onChange={(e) => setBatchForm({ ...batchForm, batchTag: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-violet-400"
                  placeholder="e.g. Dealer_Casablanca_10x"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsBatchModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-xs font-medium text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-xs font-bold shadow-lg shadow-violet-500/20 disabled:opacity-50"
                >
                  {isSubmitting ? 'Generating...' : `Generate ${batchForm.count} Vouchers`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
