import React, { useMemo } from 'react';
import { StoredReport } from '../types';

interface IncidentChartProps {
  reports: StoredReport[];
}

interface CategoryStat {
  count: number;
  color: string;
  keywords: string[];
}

const IncidentChart: React.FC<IncidentChartProps> = ({ reports }) => {
  const stats = useMemo(() => {
    const categories: Record<string, CategoryStat> = {
      'Loss': { count: 0, color: 'bg-red-500', keywords: ['theft', 'stolen', 'missing', 'loss', 'robbery'] },
      'Access': { count: 0, color: 'bg-blue-500', keywords: ['access', 'badge', 'gate', 'door', 'intruder', 'denied', 'visitor'] },
      'Safety': { count: 0, color: 'bg-emerald-500', keywords: ['injury', 'medical', 'fire', 'hazard', 'safety', 'slip', 'fall', 'ambulance'] },
      'Violation': { count: 0, color: 'bg-yellow-500', keywords: ['uniform', 'sleep', 'late', 'procedure', 'insubordination', 'phone'] },
      'Other': { count: 0, color: 'bg-slate-500', keywords: [] }
    };

    reports.forEach(r => {
      const text = r.content.toLowerCase();
      let matched = false;
      for (const [key, config] of Object.entries(categories)) {
        if (key === 'Other') continue;
        if (config.keywords.some(k => text.includes(k))) {
          config.count++;
          matched = true;
          break;
        }
      }
      if (!matched) categories['Other'].count++;
    });

    const maxCount = Math.max(...Object.values(categories).map(c => c.count), 1);
    return { categories, maxCount, total: reports.length };
  }, [reports]);

  if (stats.total === 0) return null;

  return (
    <div className="bg-slate-900/50 rounded-xl p-4 sm:p-6 border border-slate-700 mb-6 overflow-hidden">
      <h4 className="text-[10px] sm:text-sm font-bold text-slate-400 uppercase mb-4 sm:mb-6 tracking-wider">Frequency (30 Days)</h4>
      
      <div className="flex items-end justify-between gap-2 sm:gap-4 h-32 sm:h-40 px-1">
        {Object.entries(stats.categories).map(([label, data]: [string, CategoryStat]) => {
          const heightPct = Math.max((data.count / stats.maxCount) * 100, 5);
          
          return (
            <div key={label} className="flex-1 flex flex-col items-center group">
              <div className="relative w-full flex justify-center items-end h-full">
                 <div className="absolute -top-7 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 text-white text-[8px] py-1 px-1.5 rounded shadow-lg border border-slate-600 whitespace-nowrap z-10">
                   {data.count}
                 </div>
                 <div 
                   className={`w-full max-w-[24px] sm:max-w-[40px] rounded-t-sm sm:rounded-t-md transition-all duration-500 ${data.color} ${data.count === 0 ? 'opacity-20 h-[2px]' : 'opacity-80 hover:opacity-100'}`}
                   style={{ height: `${data.count === 0 ? 2 : heightPct}%` }}
                 ></div>
              </div>
              <span className="mt-2 text-[8px] sm:text-xs font-medium text-slate-400 text-center leading-tight truncate w-full">{label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default IncidentChart;