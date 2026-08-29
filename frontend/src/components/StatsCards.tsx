import React from 'react';
import { Clock, Send, AlertTriangle, XCircle, Layers, Activity } from 'lucide-react';
import { EmailStats } from '../types';

interface StatsCardsProps {
  stats: EmailStats;
}

export const StatsCards: React.FC<StatsCardsProps> = ({ stats }) => {
  const cards = [
    {
      label: 'Scheduled Queue',
      value: stats.scheduled,
      icon: Clock,
      color: 'text-brand-400',
      bg: 'bg-brand-500/10',
      border: 'border-brand-500/20',
      desc: 'Delayed BullMQ jobs',
    },
    {
      label: 'Active Processing',
      value: stats.processing,
      icon: Activity,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/20',
      desc: 'Worker threads handling',
    },
    {
      label: 'Dispatched (Sent)',
      value: stats.sent,
      icon: Send,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/20',
      desc: 'Successfully delivered',
    },
    {
      label: 'Rate Limited (Delayed)',
      value: stats.rateLimited,
      icon: AlertTriangle,
      color: 'text-purple-400',
      bg: 'bg-purple-500/10',
      border: 'border-purple-500/20',
      desc: 'Throttled per sender cap',
    },
    {
      label: 'Failed Delivery',
      value: stats.failed,
      icon: XCircle,
      color: 'text-rose-400',
      bg: 'bg-rose-500/10',
      border: 'border-rose-500/20',
      desc: 'Exceeded retry attempts',
    },
    {
      label: 'Total Email Jobs',
      value: stats.total,
      icon: Layers,
      color: 'text-slate-300',
      bg: 'bg-slate-800/60',
      border: 'border-slate-700/60',
      desc: 'All recorded instances',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div
            key={idx}
            className={`glass-panel rounded-xl p-3.5 border ${card.border} transition-all hover:scale-[1.02]`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-400 truncate">
                {card.label}
              </span>
              <div className={`p-1.5 rounded-lg ${card.bg}`}>
                <Icon className={`w-3.5 h-3.5 ${card.color}`} />
              </div>
            </div>
            <div className="mt-2 flex items-baseline space-x-1.5">
              <span className="text-2xl font-extrabold text-white tracking-tight">
                {card.value}
              </span>
            </div>
            <p className="mt-1 text-[10px] text-slate-500 truncate">{card.desc}</p>
          </div>
        );
      })}
    </div>
  );
};
