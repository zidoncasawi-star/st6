import React, { useState, useEffect } from 'react';
import { VpnServer } from '../types/vpn';
import { 
  Server, 
  Cpu, 
  HardDrive, 
  MemoryStick, 
  Activity, 
  ArrowUpRight, 
  ArrowDownRight,
  Wifi,
  TerminalSquare
} from 'lucide-react';

interface VpsResourceMonitorProps {
  servers: VpnServer[];
}

interface ServerMetrics {
  cpuUsage: number;
  ramUsage: number;
  diskUsage: number;
  netIn: number;
  netOut: number;
  uptime: string;
}

export const VpsResourceMonitor: React.FC<VpsResourceMonitorProps> = ({ servers }) => {
  const [metrics, setMetrics] = useState<Record<string, ServerMetrics>>({});
  
  // Simulate live metrics
  useEffect(() => {
    setMetrics(prev => {
      const initMetrics = { ...prev };
      let updated = false;
      servers.forEach(server => {
        if (!initMetrics[server.id]) {
          initMetrics[server.id] = {
            cpuUsage: 10 + Math.random() * 40,
            ramUsage: 30 + Math.random() * 40,
            diskUsage: 20 + Math.random() * 50,
            netIn: Math.random() * 50,
            netOut: Math.random() * 150,
            uptime: `${Math.floor(Math.random() * 30 + 1)}d ${Math.floor(Math.random() * 24)}h`
          };
          updated = true;
        }
      });
      return updated ? initMetrics : prev;
    });

    const interval = setInterval(() => {
      setMetrics(prev => {
        const next = { ...prev };
        servers.forEach(server => {
          if (next[server.id]) {
            // Random walk
            const old = next[server.id];
            next[server.id] = {
              cpuUsage: Math.max(1, Math.min(100, old.cpuUsage + (Math.random() * 10 - 5))),
              ramUsage: Math.max(10, Math.min(95, old.ramUsage + (Math.random() * 4 - 2))),
              diskUsage: old.diskUsage, // mostly static
              netIn: Math.max(0, old.netIn + (Math.random() * 20 - 10)),
              netOut: Math.max(0, old.netOut + (Math.random() * 50 - 25)),
              uptime: old.uptime
            };
          }
        });
        return next;
      });
    }, 2000);
    return () => clearInterval(interval);
  }, [servers]);

  const getColorClass = (value: number) => {
    if (value > 85) return 'text-rose-400 bg-rose-500/20';
    if (value > 65) return 'text-amber-400 bg-amber-500/20';
    return 'text-emerald-400 bg-emerald-500/20';
  };
  
  const getProgressColor = (value: number) => {
    if (value > 85) return 'bg-rose-500';
    if (value > 65) return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-900/90 via-[#0d1527] to-[#121029] p-5 rounded-2xl border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-full bg-gradient-to-l from-indigo-600/10 via-cyan-500/5 to-transparent pointer-events-none" />
        
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl font-bold text-white font-sans tracking-tight">
              استهلاك موارد VPS (Resource Monitor)
            </h1>
            <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              LIVE TELEMETRY
            </span>
          </div>
          <p className="text-xs text-slate-400">
            مراقبة حية لاستهلاك المعالج (CPU)، الذاكرة (RAM)، التخزين (Disk) وسرعة الشبكة لأسطول الخوادم.
          </p>
        </div>
      </div>

      {(!servers || servers.length === 0) ? (
        <div className="flex flex-col items-center justify-center p-12 text-center bg-[#0e1422] rounded-3xl border border-slate-800">
          <Server className="w-16 h-16 text-slate-700 mb-4" />
          <h3 className="text-lg font-bold text-slate-300">لا توجد خوادم (Servers) حالياً</h3>
          <p className="text-sm text-slate-500 mt-2 max-w-sm">
            قم بإضافة خوادم VPN جديدة في قسم إدارة الخوادم لتتمكن من مراقبة استهلاك مواردها هنا.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {servers.map(server => {
            const stats = metrics[server.id];
            if (!stats) return null;

            return (
              <div key={server.id} className="p-5 rounded-3xl bg-[#0e1422] border border-slate-800 space-y-5 hover:border-slate-700 transition-colors shadow-lg">
                {/* Header */}
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-xl shadow-lg ${
                    server.status === 'active' ? 'bg-gradient-to-tr from-emerald-500/20 to-teal-500/20 text-emerald-400 border border-emerald-500/30 shadow-emerald-500/10' :
                    server.status === 'full' ? 'bg-gradient-to-tr from-amber-500/20 to-orange-500/20 text-amber-400 border border-amber-500/30 shadow-amber-500/10' :
                    'bg-slate-800 text-slate-500 border border-slate-700'
                  }`}>
                    {server.flag}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white tracking-tight">{server.name}</h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] font-mono text-slate-400">{server.ip}</span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                        server.status === 'active' ? 'bg-emerald-500/10 text-emerald-400' :
                        server.status === 'full' ? 'bg-amber-500/10 text-amber-400' :
                        'bg-rose-500/10 text-rose-400'
                      }`}>
                        {server.status}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Uptime</div>
                  <div className="text-xs font-mono text-slate-300">{stats.uptime}</div>
                </div>
              </div>

              {/* Resource Bars */}
              <div className="space-y-4">
                {/* CPU */}
                <div>
                  <div className="flex justify-between items-end mb-1.5">
                    <div className="flex items-center gap-1.5 text-slate-400">
                      <Cpu className="w-3.5 h-3.5" />
                      <span className="text-[11px] font-bold uppercase tracking-wider">CPU Usage</span>
                    </div>
                    <span className={`text-xs font-mono font-bold px-1.5 py-0.5 rounded ${getColorClass(stats.cpuUsage)}`}>
                      {stats.cpuUsage.toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                    <div 
                      className={`h-full transition-all duration-700 ease-in-out ${getProgressColor(stats.cpuUsage)}`} 
                      style={{ width: `${stats.cpuUsage}%` }}
                    />
                  </div>
                </div>

                {/* RAM */}
                <div>
                  <div className="flex justify-between items-end mb-1.5">
                    <div className="flex items-center gap-1.5 text-slate-400">
                      {/* using Server as Memory Stick alternative */}
                      <Server className="w-3.5 h-3.5" />
                      <span className="text-[11px] font-bold uppercase tracking-wider">RAM Usage</span>
                    </div>
                    <span className={`text-xs font-mono font-bold px-1.5 py-0.5 rounded ${getColorClass(stats.ramUsage)}`}>
                      {stats.ramUsage.toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                    <div 
                      className={`h-full transition-all duration-700 ease-in-out ${getProgressColor(stats.ramUsage)}`} 
                      style={{ width: `${stats.ramUsage}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-1 px-1">
                    <span className="text-[9px] font-mono text-slate-500">{(stats.ramUsage * 0.08).toFixed(1)} GB</span>
                    <span className="text-[9px] font-mono text-slate-500">8.0 GB</span>
                  </div>
                </div>

                {/* Disk */}
                <div>
                  <div className="flex justify-between items-end mb-1.5">
                    <div className="flex items-center gap-1.5 text-slate-400">
                      <HardDrive className="w-3.5 h-3.5" />
                      <span className="text-[11px] font-bold uppercase tracking-wider">Disk (SSD)</span>
                    </div>
                    <span className={`text-xs font-mono font-bold px-1.5 py-0.5 rounded ${getColorClass(stats.diskUsage)}`}>
                      {stats.diskUsage.toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                    <div 
                      className={`h-full transition-all duration-700 ease-in-out ${getProgressColor(stats.diskUsage)}`} 
                      style={{ width: `${stats.diskUsage}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-1 px-1">
                    <span className="text-[9px] font-mono text-slate-500">{(stats.diskUsage * 0.4).toFixed(1)} GB</span>
                    <span className="text-[9px] font-mono text-slate-500">40 GB</span>
                  </div>
                </div>
              </div>

              {/* Network */}
              <div className="pt-4 border-t border-slate-800/80">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <Wifi className="w-3.5 h-3.5" />
                    <span className="text-[11px] font-bold uppercase tracking-wider">Network I/O</span>
                  </div>
                  <span className="text-[10px] bg-slate-900 border border-slate-800 px-2 py-0.5 rounded text-cyan-400 font-mono">
                    {(stats.netIn + stats.netOut).toFixed(1)} Mbps
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800/60 flex flex-col">
                    <span className="text-[9px] text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                      <ArrowDownRight className="w-3 h-3 text-emerald-400" />
                      RX (In)
                    </span>
                    <span className="text-sm font-mono font-bold text-white">
                      {stats.netIn.toFixed(1)} <span className="text-[10px] text-slate-500 font-sans">Mbps</span>
                    </span>
                  </div>
                  <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800/60 flex flex-col">
                    <span className="text-[9px] text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                      <ArrowUpRight className="w-3 h-3 text-cyan-400" />
                      TX (Out)
                    </span>
                    <span className="text-sm font-mono font-bold text-white">
                      {stats.netOut.toFixed(1)} <span className="text-[10px] text-slate-500 font-sans">Mbps</span>
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Process info dummy */}
              <div className="pt-3 flex items-center justify-between bg-slate-900/50 p-2.5 rounded-xl border border-slate-800/60">
                 <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono">
                   <TerminalSquare className="w-3.5 h-3.5" />
                   <span>nexus-core-daemon</span>
                 </div>
                 <div className="flex items-center gap-1.5">
                   <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                   <span className="text-[10px] text-emerald-400 font-mono">Running</span>
                 </div>
              </div>

            </div>
          );
        })}
        </div>
      )}
    </div>
  );
};
