import React, { useState } from 'react';
import {
  Send,
  Search,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  Layers,
  Calendar,
  AlertCircle,
} from 'lucide-react';
import { EmailJob } from '../types';

interface SentTableProps {
  jobs: EmailJob[];
  loading: boolean;
  onRefresh: () => void;
}

export const SentTable: React.FC<SentTableProps> = ({
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

  return (
    <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
      {/* Table Header Bar */}
      <div className="p-4 sm:p-5 border-b border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/60">
        <div>
          <h3 className="text-base font-bold text-white flex items-center space-x-2">
            <Send className="w-4 h-4 text-emerald-400" />
            <span>Sent & Delivered History</span>
          </h3>
          <p className="text-xs text-slate-400">
            Outbound email dispatches indexed in Elasticsearch and archived in MySQL
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
              <th className="px-5 py-3.5 font-semibold">Sent Time</th>
              <th className="px-5 py-3.5 font-semibold">Sender Account</th>
              <th className="px-5 py-3.5 font-semibold">Delivery Status</th>
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
                  <p className="text-sm font-semibold text-slate-400">No sent emails recorded yet</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Scheduled emails will transition here once dispatched by the BullMQ worker.
                  </p>
                </td>
              </tr>
            ) : (
              // Sent Job Rows
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
                      <span>
                        {job.sentAt ? new Date(job.sentAt).toLocaleString() : new Date(job.updatedAt).toLocaleString()}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-slate-400 font-mono text-[11px] truncate max-w-[180px]">
                    {job.sender?.displayName
                      ? `${job.sender.displayName} <${job.sender.email}>`
                      : job.sender?.email || 'reachinbox@demo.ethereal.email'}
                  </td>
                  <td className="px-5 py-4">
                    {job.status === 'SENT' ? (
                      <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        <span>Delivered</span>
                      </span>
                    ) : (
                      <span
                        className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-500/10 text-rose-300 border border-rose-500/30"
                        title={job.error || 'Max retry attempts exceeded'}
                      >
                        <XCircle className="w-3 h-3 text-rose-400" />
                        <span>Failed</span>
                      </span>
                    )}
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
