import React from 'react';
import { Mail, Plus, Slack, LogOut, CheckCircle, RefreshCw } from 'lucide-react';
import { User, SlackStatus } from '../types';

interface HeaderProps {
  user: User | null;
  slackStatus: SlackStatus;
  slackLoading: boolean;
  onConnectSlack: () => void;
  onDisconnectSlack: () => void;
  onOpenCompose: () => void;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  slackStatus,
  slackLoading,
  onConnectSlack,
  onDisconnectSlack,
  onOpenCompose,
  onLogout,
}) => {
  return (
    <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-xl sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-cyan-400 p-0.5 shadow-lg shadow-brand-500/20 flex items-center justify-center">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <Mail className="w-5 h-5 text-brand-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                ReachInbox
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-400 border border-brand-500/20">
                Scheduler
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              Distributed Cold Outreach & Delayed Queue Engine
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-3">
          {/* Slack Connection Button */}
          {slackStatus.connected ? (
            <div className="flex items-center space-x-1.5 bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs px-3 py-1.5 rounded-lg shadow-sm">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
              <span className="font-medium truncate max-w-[120px]">
                Slack: {slackStatus.teamName || 'Connected'}
              </span>
              <button
                onClick={onDisconnectSlack}
                disabled={slackLoading}
                className="text-[10px] text-rose-400 hover:text-rose-300 ml-1 underline transition-colors"
                title="Disconnect Slack"
              >
                Disconnect
              </button>
            </div>
          ) : (
            <button
              onClick={onConnectSlack}
              disabled={slackLoading}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 transition-all shadow-sm"
              title="Connect Slack for rate-limit notifications"
            >
              {slackLoading ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-brand-400" />
              ) : (
                <Slack className="w-3.5 h-3.5 text-amber-400" />
              )}
              <span>Connect Slack</span>
            </button>
          )}

          {/* Compose New Email Button */}
          <button
            onClick={onOpenCompose}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-brand-600 to-cyan-500 hover:from-brand-500 hover:to-cyan-400 text-white text-xs font-bold transition-all shadow-md shadow-brand-600/30 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Compose Email</span>
          </button>

          {/* User Profile & Logout */}
          <div className="h-6 w-px bg-slate-800 mx-1 hidden sm:block" />

          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-full overflow-hidden border border-slate-700 bg-slate-800 flex-shrink-0">
              <img
                src={user?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                alt={user?.name || 'User'}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="hidden md:block text-left text-xs">
              <span className="font-semibold text-slate-200 block truncate max-w-[130px]">
                {user?.name || 'ReachInbox User'}
              </span>
              <span className="text-[10px] text-slate-400 block truncate max-w-[130px]">
                {user?.email || 'demo@reachinbox.ai'}
              </span>
            </div>
            <button
              onClick={onLogout}
              className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
