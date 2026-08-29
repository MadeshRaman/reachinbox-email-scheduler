import React, { useState } from 'react';
import {
  Clock,
  Search,
  RefreshCw,
  AlertTriangle,
  Activity,
  Layers,
  Calendar,
} from 'lucide-react';
import { EmailJob } from '../types';

interface ScheduledTableProps {
  jobs: EmailJob[];
  loading: boolean;
  onRefresh: () => void;
}

export const ScheduledTable: React.FC<ScheduledTableProps> = ({
  jobs,
  loading,
  onRefresh,
}) => {
  const [filterQuery, setFilterQuery] = useState('');

  const filteredJobs = jobs.filter((j) => {
    const q = filterQuery.toLowerCase();
    return (
      j.recipientEmail.toLowerCase().includes(q) ||
      j.subject.toLowerCase().includes(q) ||
      (j.sender?.email || '').toLowerCase().includes(q) ||
      j.status.toLowerCase().includes(q)
    );
  });

  const getStatusBadge = (status: string, error?: string | null) => {
    switch (status) {
      case 'PROCESSING':
        return (
          <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30 animate-pulse">
            <Activity className="w-3 h-3 text-amber-400" />
            <span>Processing</span>
          </span>
        );
      case 'RATE_LIMITED':
        return (
          <span
            className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-500/10 text-purple-300 border border-purple-500/30"
            title={error || 'Hourly sender rate limit reached. Waiting for next window.'}
          >
            <AlertTriangle className="w-3 h-3 text-purple-400" />
            <span>Rate Limited</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-brand-500/10 text-brand-300 border border-brand-500/30">
            <Clock className="w-3 h-3 text-brand-400" />
            <span>Scheduled</span>
          </span>
        );
    }
  };

  return (
    <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
      {/* Table Header Bar */}
      <div className="p-4 sm:p-5 border-b border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/60">
        <div>
          <h3 className="text-base font-bold text-white flex items-center space-x-2">
            <Clock className="w-4 h-4 text-brand-400" />
            <span>Scheduled Outbound Queue</span>
          </h3>
          <p className="text-xs text-slate-400">
            Persistent BullMQ delayed jobs awaiting dispatch execution
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder="Filter recipient, subject..."
              className="pl-8 pr-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-brand-500 w-48 sm:w-60"
            />
          </div>

          <button
            onClick={onRefresh}
            disabled={loading}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-semibold transition-all disabled:opacity-50"
            title="Refresh Table"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-brand-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-slate-950/60 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800">
            <tr>
              <th className="px-5 py-3.5 font-semibold">Recipient</th>
              <th className="px-5 py-3.5 font-semibold">Subject</th>
              <th className="px-5 py-3.5 font-semibold">Scheduled Time</th>
              <th className="px-5 py-3.5 font-semibold">Sender Account</th>
              <th className="px-5 py-3.5 font-semibold">Queue Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {loading && jobs.length === 0 ? (
              // Skeleton loading state
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td className="px-5 py-4"><div className="h-4 bg-slate-800 rounded w-36" /></td>
                  <td className="px-5 py-4"><div className="h-4 bg-slate-800 rounded w-48" /></td>
                  <td className="px-5 py-4"><div className="h-4 bg-slate-800 rounded w-28" /></td>
                  <td className="px-5 py-4"><div className="h-4 bg-slate-800 rounded w-32" /></td>
                  <td className="px-5 py-4"><div className="h-4 bg-slate-800 rounded w-20" /></td>
                </tr>
              ))
            ) : filteredJobs.length === 0 ? (
              // Empty State
              <tr>
                <td colSpan={5} className="text-center py-12 text-slate-500">
                  <Layers className="w-8 h-8 text-slate-600 mx-auto mb-2 opacity-60" />
                  <p className="text-sm font-semibold text-slate-400">No scheduled emails in queue</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Click "Compose Email" to queue new cold outreach sequences.
                  </p>
                </td>
              </tr>
            ) : (
              // Job Rows
              filteredJobs.map((job) => (
                <tr key={job.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="px-5 py-4 font-mono text-slate-200 font-medium">
                    {job.recipientEmail}
                  </td>
                  <td className="px-5 py-4 font-medium text-white max-w-xs truncate">
                    {job.subject}
                  </td>
                  <td className="px-5 py-4 text-slate-300 font-mono text-[11px]">
                    <div className="flex items-center space-x-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                      <span>{new Date(job.scheduledAt).toLocaleString()}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-slate-400 font-mono text-[11px] truncate max-w-[180px]">
                    {job.sender?.displayName
                      ? `${job.sender.displayName} <${job.sender.email}>`
                      : job.sender?.email || 'reachinbox@demo.ethereal.email'}
                  </td>
                  <td className="px-5 py-4">
                    {getStatusBadge(job.status, job.error)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
