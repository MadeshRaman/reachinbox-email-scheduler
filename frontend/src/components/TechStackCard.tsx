import React from 'react';
import { 
  Server, 
  Database, 
  HardDrive, 
  Layers, 
  Search, 
  Send, 
  Code2, 
  Box, 
  Cpu
} from 'lucide-react';
import { ServiceItem } from '../types';

interface Props {
  item: ServiceItem;
}

export const TechStackCard: React.FC<Props> = ({ item }) => {
  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'server':
        return <Server className="w-5 h-5 text-emerald-400" />;
      case 'database':
        return <Database className="w-5 h-5 text-blue-400" />;
      case 'redis':
        return <HardDrive className="w-5 h-5 text-rose-400" />;
      case 'queue':
        return <Layers className="w-5 h-5 text-purple-400" />;
      case 'search':
        return <Search className="w-5 h-5 text-amber-400" />;
      case 'email':
        return <Send className="w-5 h-5 text-teal-400" />;
      case 'code':
        return <Code2 className="w-5 h-5 text-cyan-400" />;
      case 'docker':
        return <Box className="w-5 h-5 text-sky-400" />;
      default:
        return <Cpu className="w-5 h-5 text-brand-400" />;
    }
  };

  return (
    <div className="glass-panel glass-panel-hover rounded-xl p-4 transition-all duration-200 group">
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-lg bg-slate-800/80 border border-slate-700/50 group-hover:border-slate-600 transition-colors">
            {getIcon(item.iconName)}
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white group-hover:text-brand-300 transition-colors">
              {item.name}
            </h4>
            <span className="text-[11px] text-slate-400 font-mono">{item.category}</span>
          </div>
        </div>
        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
          {item.tag}
        </span>
      </div>
      <p className="mt-3 text-xs text-slate-400 leading-relaxed">
        {item.description}
      </p>
    </div>
  );
};
