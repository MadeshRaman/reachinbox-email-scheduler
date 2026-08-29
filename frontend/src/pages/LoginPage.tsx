import React, { useState } from 'react';
import { Mail, Sparkles, ShieldCheck, Zap, HardDrive, Search, Slack, ArrowRight } from 'lucide-react';
import { loginApi } from '../services/api';
import { User } from '../types';

interface LoginPageProps {
  onLoginSuccess: (user: User) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [emailInput, setEmailInput] = useState('demo@reachinbox.ai');
  const [nameInput, setNameInput] = useState('ReachInbox Demo User');

  const handleGoogleLogin = () => {
    setLoading(true);
    // Redirect to backend OAuth route
    window.location.href = 'http://localhost:5000/api/auth/google';
  };

  const featurePills = [
    { icon: Zap, label: 'BullMQ Delayed Scheduling', desc: 'Fault-tolerant background job execution surviving server restarts' },
    { icon: HardDrive, label: 'Distributed Redis Rate Limiter', desc: 'Atomic hourly throttling per sender with smart delay calculations' },
    { icon: Search, label: 'Elasticsearch Full-Text Search', desc: 'Sub-millisecond email log query with MySQL fallback' },
    { icon: Slack, label: 'Real Slack Webhook Integration', desc: 'Automated channel alerts when hourly sender limits are reached' },
  ];

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Dynamic Background Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-brand-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-md w-full space-y-8 glass-panel rounded-3xl p-8 border border-slate-800 shadow-2xl relative z-10">
        {/* Header Branding */}
        <div className="text-center space-y-3">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-tr from-brand-600 to-cyan-400 p-0.5 shadow-xl shadow-brand-500/20 flex items-center justify-center">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
              <Mail className="w-7 h-7 text-brand-400" />
            </div>
          </div>
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight text-white">
              ReachInbox <span className="bg-gradient-to-r from-brand-400 to-cyan-400 bg-clip-text text-transparent">Scheduler</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Enterprise Distributed Cold Email Outreach Platform
            </p>
          </div>
        </div>

        {/* Feature Overview List */}
        <div className="space-y-2.5 pt-2">
          {featurePills.map((feat, i) => {
            const Icon = feat.icon;
            return (
              <div key={i} className="flex items-start space-x-3 p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80">
                <div className="p-1.5 rounded-lg bg-brand-500/10 border border-brand-500/20 text-brand-400 flex-shrink-0 mt-0.5">
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-200">{feat.label}</h4>
                  <p className="text-[11px] text-slate-400 leading-snug">{feat.desc}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Login Form / Action */}
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-300">
              Active User Account
            </label>
            <input
              type="email"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              placeholder="your-email@reachinbox.ai"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 font-mono"
            />
          </div>

          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center space-x-3 px-4 py-3 rounded-xl bg-gradient-to-r from-brand-600 to-cyan-500 hover:from-brand-500 hover:to-cyan-400 text-white text-xs font-bold transition-all shadow-lg shadow-brand-600/30 active:scale-95 disabled:opacity-50"
          >
            {/* Google G Icon */}
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>{loading ? 'Authenticating...' : 'Sign In with Google Account'}</span>
          </button>
        </div>

        {/* Footer info */}
        <p className="text-center text-[11px] text-slate-500">
          Powered by Express • TypeScript • BullMQ • Redis • MySQL • Elasticsearch • Tailwind
        </p>
      </div>
    </div>
  );
};
