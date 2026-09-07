import React, { useState } from 'react';
import { Lock, Shield, Key, ArrowRight, UserCheck, AlertCircle, Eye, EyeOff, Sparkles, RefreshCw } from 'lucide-react';
import { api } from '../services/api';

interface LoginModalProps {
  onLoginSuccess: (admin: any) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('RODIXSTAR6');
  const [password, setPassword] = useState('admin_password_123');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.login(username.trim(), password);
      onLoginSuccess(data.admin);
    } catch (err: any) {
      setError(err.message || 'Invalid username or password');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickSelect = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
    setError(null);
  };

  const handleResetAndLogin = async () => {
    setIsResetting(true);
    setError(null);
    try {
      const targetUser = username.trim() || 'RODIXSTAR6';
      const targetPass = password || 'admin_password_123';
      
      // Call reset endpoint
      await fetch('/api/v1/admin/reset-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: targetUser, newPassword: targetPass }),
      });

      // Then log in
      const data = await api.login(targetUser, targetPass);
      onLoginSuccess(data.admin);
    } catch (err: any) {
      setError('Auto-recovery failed: ' + (err.message || 'Error resetting credentials'));
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070b12] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background ambient glowing cyber grids */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-violet-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-[#0d121d]/90 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-6 relative z-10">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-violet-600 via-indigo-600 to-cyan-400 p-0.5 shadow-xl shadow-indigo-500/20">
            <div className="w-full h-full bg-[#0b0f17] rounded-[14px] flex items-center justify-center">
              <Lock className="w-7 h-7 text-cyan-400" />
            </div>
          </div>

          <h1 className="text-2xl font-black text-white tracking-tight">
            NEXUS<span className="text-cyan-400">CORE</span>
          </h1>
          <p className="text-xs text-slate-400 font-mono">
            Android VPN & Inwi *6 Tunnel Gateway Admin Portal
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-950/70 border border-red-500/50 text-red-200 text-xs space-y-2 animate-in fade-in">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span className="font-semibold">{error}</span>
            </div>
            <div className="pt-1 border-t border-red-900/60 flex items-center justify-between">
              <span className="text-[11px] text-red-300">Need to reset credentials?</span>
              <button
                type="button"
                onClick={handleResetAndLogin}
                disabled={isResetting}
                className="px-2.5 py-1 rounded bg-red-800/80 hover:bg-red-700 text-white text-[11px] font-mono inline-flex items-center gap-1"
              >
                <RefreshCw className={`w-3 h-3 ${isResetting ? 'animate-spin' : ''}`} />
                <span>Auto-Fix & Enter</span>
              </button>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 font-mono">
              Admin Username
            </label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:outline-none focus:border-cyan-400 font-mono transition-colors"
              placeholder="RODIXSTAR6 or admin"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 font-mono">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 pr-10 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:outline-none focus:border-cyan-400 font-mono transition-colors"
                placeholder="••••••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading || isResetting}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 via-indigo-600 to-violet-600 text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 hover:opacity-95 transition-all disabled:opacity-50"
          >
            <span>{isLoading ? 'Verifying Credentials...' : 'Authenticate & Enter Gateway'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Quick Demo Fill Helper */}
        <div className="pt-3 border-t border-slate-800 space-y-2 text-center">
          <p className="text-[11px] text-slate-400 font-mono">Select Authorized Account:</p>
          <div className="flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => handleQuickSelect('RODIXSTAR6', 'admin_password_123')}
              className={`px-3 py-1.5 rounded-lg border text-xs font-mono inline-flex items-center gap-1.5 transition-all ${
                username === 'RODIXSTAR6'
                  ? 'bg-cyan-950/60 border-cyan-500/60 text-cyan-300 shadow-sm shadow-cyan-500/20'
                  : 'bg-slate-900 border-slate-700 text-slate-300 hover:text-cyan-300'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>RODIXSTAR6</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickSelect('admin', 'admin_password_123')}
              className={`px-3 py-1.5 rounded-lg border text-xs font-mono inline-flex items-center gap-1.5 transition-all ${
                username === 'admin'
                  ? 'bg-indigo-950/60 border-indigo-500/60 text-indigo-300 shadow-sm shadow-indigo-500/20'
                  : 'bg-slate-900 border-slate-700 text-slate-300 hover:text-indigo-300'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5 text-indigo-400" />
              <span>admin</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
