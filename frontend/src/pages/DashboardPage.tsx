import React, { useState } from 'react';
import { useEmails } from '../hooks/useEmails';
import { useSlack } from '../hooks/useSlack';
import { Header } from '../components/Header';
import { StatsCards } from '../components/StatsCards';
import { ScheduledTable } from '../components/ScheduledTable';
import { SentTable } from '../components/SentTable';
import { SearchTab } from '../components/SearchTab';
import { ComposeModal } from '../components/ComposeModal';
import { User } from '../types';
import { Clock, Send, Search, Sparkles, RefreshCw, AlertCircle } from 'lucide-react';

interface DashboardPageProps {
  user: User;
  onLogout: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState<'scheduled' | 'sent' | 'search'>('scheduled');
  const [isComposeOpen, setIsComposeOpen] = useState(false);

  const { scheduledJobs, sentJobs, stats, loading, error, refresh } = useEmails();
  const {
    status: slackStatus,
    actionLoading: slackActionLoading,
    error: slackError,
    connectSlack,
    disconnectSlack,
  } = useSlack();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col antialiased">
      {/* Top Header Navigation */}
      <Header
        user={user}
        slackStatus={slackStatus}
        slackLoading={slackActionLoading}
        onConnectSlack={connectSlack}
        onDisconnectSlack={disconnectSlack}
        onOpenCompose={() => setIsComposeOpen(true)}
        onLogout={onLogout}
      />

      {/* Main Workspace Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Slack Connection Notification / Error Banner */}
        {slackError && (
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{slackError}</span>
          </div>
        )}

        {/* Top Metric Stats Summary Cards */}
        <StatsCards stats={stats} />

        {/* Tab Controls Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2 bg-slate-900/90 p-1.5 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveTab('scheduled')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'scheduled'
                  ? 'bg-brand-600 text-white shadow-md shadow-brand-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Scheduled Queue ({stats.scheduled + stats.processing + stats.rateLimited})</span>
            </button>

            <button
              onClick={() => setActiveTab('sent')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'sent'
                  ? 'bg-brand-600 text-white shadow-md shadow-brand-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Send className="w-3.5 h-3.5" />
              <span>Sent Emails ({stats.sent})</span>
            </button>

            <button
              onClick={() => setActiveTab('search')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'search'
                  ? 'bg-brand-600 text-white shadow-md shadow-brand-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Search className="w-3.5 h-3.5" />
              <span>Elasticsearch Logs</span>
            </button>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => refresh()}
              disabled={loading}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-300 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-brand-400' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Tab Content Display */}
        <div className="space-y-6">
          {activeTab === 'scheduled' && (
            <ScheduledTable
              jobs={scheduledJobs}
              loading={loading}
              onRefresh={refresh}
            />
          )}

          {activeTab === 'sent' && (
            <SentTable
              jobs={sentJobs}
              loading={loading}
              onRefresh={refresh}
            />
          )}

          {activeTab === 'search' && <SearchTab />}
        </div>
      </main>

      {/* Compose Email Modal */}
      <ComposeModal
        isOpen={isComposeOpen}
        onClose={() => setIsComposeOpen(false)}
        onSuccess={() => refresh()}
      />

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-6 text-center text-xs text-slate-500 bg-slate-900/30 mt-auto">
        <p>
          ReachInbox Email Scheduler • BullMQ Delayed Processing • Redis Rate Limiting • MySQL • Elasticsearch 8.11 • Nodemailer
        </p>
      </footer>
    </div>
  );
};
