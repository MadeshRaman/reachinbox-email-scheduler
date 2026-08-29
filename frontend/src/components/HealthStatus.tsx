import React from 'react';
import { Activity, RefreshCw, CheckCircle2, AlertCircle, Clock, Server } from 'lucide-react';
import { HealthCheckResponse } from '../types';

interface Props {
  data: HealthCheckResponse | null;
  loading: boolean;
  error: string | null;
  lastChecked: Date | null;
  onRefresh: () => void;
}

export const HealthStatus: React.FC<Props> = ({
  data,
  loading,
  error,
  lastChecked,
  onRefresh,
}) => {
  const formatUptime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    if (mins > 0) return `${mins}m ${secs}s`;
    return `${secs}s`;
  };

  return (
    <div className="glass-panel rounded-2xl p-6 relative overflow-hidden border border-slate-800">
      {/* Background Accent Glow */}
      <div className="absolute top-0 right-0 -mt-8 -mr-8 w-44 h-44 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-800/80">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-slate-800 border border-slate-700">
            <Activity className="w-5 h-5 text-brand-400" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Live Backend Connection</h3>
            <p className="text-xs text-slate-400">Endpoint: <code className="text-brand-400 font-mono">GET /api/health</code></p>
          </div>
        </div>

        <button
          onClick={onRefresh}
          disabled={loading}
          className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 transition-all disabled:opacity-50 shadow-sm"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-brand-400' : ''}`} />
          <span>{loading ? 'Pinging Server...' : 'Test Connection'}</span>
        </button>
      </div>

      <div className="mt-5">
        {loading && !data && (
          <div className="py-6 flex flex-col items-center justify-center space-y-2 text-slate-400 text-xs">
            <RefreshCw className="w-5 h-5 animate-spin text-brand-400" />
            <span>Checking backend health status...</span>
          </div>
        )}

        {error && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-200 text-xs flex items-start space-x-3">
            <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-rose-300">Backend Server Offline or Unreachable</p>
              <p className="text-rose-200/80 leading-relaxed">{error}</p>
              <p className="text-[11px] text-rose-300/70 pt-1">
                Tip: Start the backend with <code className="bg-rose-950/60 px-1 py-0.5 rounded font-mono">npm run dev</code> inside the <code className="bg-rose-950/60 px-1 py-0.5 rounded font-mono">backend/</code> directory.
              </p>
            </div>
          </div>
        )}

        {data && !error && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-200 text-xs flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span className="font-semibold text-emerald-300">API Gateway Healthy</span>
              </div>
              <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/50 px-2 py-0.5 rounded-full border border-emerald-500/30">
                HTTP 200 OK
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
                <span className="text-[11px] text-slate-500 block mb-1">Service</span>
                <span className="font-semibold text-slate-200 font-mono truncate block">{data.service}</span>
              </div>
              <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
                <span className="text-[11px] text-slate-500 block mb-1">Status</span>
                <span className="font-semibold text-emerald-400 font-mono uppercase">{data.status}</span>
              </div>
              <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
                <span className="text-[11px] text-slate-500 block mb-1">Uptime</span>
                <span className="font-semibold text-slate-200 font-mono flex items-center space-x-1">
                  <Clock className="w-3 h-3 text-slate-400 inline" />
                  <span>{formatUptime(data.uptime)}</span>
                </span>
              </div>
              <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
                <span className="text-[11px] text-slate-500 block mb-1">Environment</span>
                <span className="font-semibold text-brand-300 font-mono capitalize">{data.environment}</span>
              </div>
            </div>
          </div>
        )}

        {lastChecked && (
          <p className="mt-3 text-[11px] text-slate-500 text-right">
            Last checked: {lastChecked.toLocaleTimeString()}
          </p>
        )}
      </div>
    </div>
  );
};
