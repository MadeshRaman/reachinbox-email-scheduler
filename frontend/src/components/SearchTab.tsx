import React, { useState } from 'react';
import {
  Search,
  Database,
  Zap,
  RefreshCw,
  Calendar,
  Layers,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
} from 'lucide-react';
import { searchEmailsApi } from '../services/api';
import { EmailJob } from '../types';

export const SearchTab: React.FC = () => {
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [source, setSource] = useState<'elasticsearch' | 'database' | null>(null);
  const [results, setResults] = useState<EmailJob[]>([]);
  const [totalCount, setTotalCount] = useState(0);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);
    setHasSearched(true);
    try {
      const data = await searchEmailsApi(query, statusFilter || undefined, 1, 50);
      setResults(data.jobs || []);
      setTotalCount(data.total || 0);
      setSource(data.source);
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SENT':
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            <span>SENT</span>
          </span>
        );
      case 'RATE_LIMITED':
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-300 border border-purple-500/30">
            <AlertTriangle className="w-3 h-3 text-purple-400" />
            <span>RATE_LIMITED</span>
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-300 border border-rose-500/30">
            <XCircle className="w-3 h-3 text-rose-400" />
            <span>FAILED</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-brand-500/10 text-brand-300 border border-brand-500/30">
            <Clock className="w-3 h-3 text-brand-400" />
            <span>SCHEDULED</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Search Header Bar */}
      <div className="glass-panel rounded-2xl p-6 border border-slate-800 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-white flex items-center space-x-2">
              <Zap className="w-4 h-4 text-brand-400" />
              <span>Full-Text Email Search & Audit Index</span>
            </h3>
            <p className="text-xs text-slate-400">
              Searches across recipient emails, subjects, bodies, and statuses with Elasticsearch fallback to MySQL
            </p>
          </div>

          {source && (
            <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-900 border border-slate-700">
              {source === 'elasticsearch' ? (
                <>
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-amber-300 font-mono">Engine: Elasticsearch 8.11</span>
                </>
              ) : (
                <>
                  <Database className="w-3.5 h-3.5 text-blue-400" />
                  <span className="text-blue-300 font-mono">Engine: MySQL Database (Fallback)</span>
                </>
              )}
            </div>
          )}
        </div>

        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search recipient, subject, keywords in body..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-500 transition-all font-medium"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-slate-300 focus:outline-none focus:border-brand-500"
          >
            <option value="">All Statuses</option>
            <option value="SCHEDULED">SCHEDULED</option>
            <option value="PROCESSING">PROCESSING</option>
            <option value="SENT">SENT</option>
            <option value="RATE_LIMITED">RATE_LIMITED</option>
            <option value="FAILED">FAILED</option>
          </select>

          <button
            type="submit"
            disabled={loading}
            className="flex items-center justify-center space-x-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-cyan-500 hover:from-brand-500 hover:to-cyan-400 text-white text-xs font-bold transition-all shadow-md shadow-brand-600/30 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? 'Searching...' : 'Run Search'}</span>
          </button>
        </form>
      </div>

      {/* Results List */}
      <div className="space-y-3">
        {hasSearched && (
          <div className="flex items-center justify-between px-1">
            <span className="text-xs text-slate-400">
              Found <strong className="text-white font-mono">{totalCount}</strong> matching record(s)
            </span>
          </div>
        )}

        {results.length > 0 ? (
          <div className="space-y-3">
            {results.map((job) => (
              <div
                key={job.id}
                className="glass-panel glass-panel-hover rounded-xl p-4 border border-slate-800 transition-all space-y-2.5"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center space-x-2.5">
                    <span className="text-xs font-bold text-brand-300 font-mono">
                      {job.recipientEmail}
                    </span>
                    {getStatusBadge(job.status)}
                  </div>
                  <div className="flex items-center space-x-3 text-[11px] text-slate-400 font-mono">
                    <span className="flex items-center space-x-1">
                      <Calendar className="w-3 h-3 text-slate-500" />
                      <span>{new Date(job.scheduledAt).toLocaleString()}</span>
                    </span>
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-semibold text-white">{job.subject}</h4>
                  <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                    {job.body}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-500 font-mono">
                  <span>ID: {job.id}</span>
                  <span>Attempts: {job.attempts || 0}</span>
                </div>
              </div>
            ))}
          </div>
        ) : hasSearched && !loading ? (
          <div className="glass-panel rounded-2xl p-12 text-center border border-slate-800 text-slate-500">
            <Layers className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm font-semibold text-slate-400">No matching email jobs found</p>
            <p className="text-xs text-slate-500 mt-1">Try tweaking your search term or status filter.</p>
          </div>
        ) : null}
      </div>
    </div>
  );
};
