import React from 'react';
import { Columns, Rows, AlertTriangle, Copy, Hash } from 'lucide-react';
import GlassCard from './GlassCard';

const KPIWidget = ({ metadata }) => {
  if (!metadata) return null;

  const { row_count, col_count, total_nulls, null_rate, duplicate_count } = metadata;

  const kpis = [
    {
      label: 'Row Count',
      value: row_count.toLocaleString(),
      icon: Rows,
      color: 'text-blue-500 bg-blue-500/10',
      description: 'Total data rows/records'
    },
    {
      label: 'Column Count',
      value: col_count.toLocaleString(),
      icon: Columns,
      color: 'text-indigo-500 bg-indigo-500/10',
      description: 'Total dimensions/features'
    },
    {
      label: 'Missing Values',
      value: total_nulls.toLocaleString(),
      subValue: `${null_rate.toFixed(1)}% null rate`,
      icon: AlertTriangle,
      color: total_nulls > 0 ? 'text-amber-500 bg-amber-500/10' : 'text-emerald-500 bg-emerald-500/10',
      description: 'Empty or NaN data cells'
    },
    {
      label: 'Duplicate Rows',
      value: duplicate_count.toLocaleString(),
      icon: Copy,
      color: duplicate_count > 0 ? 'text-rose-500 bg-rose-500/10' : 'text-emerald-500 bg-emerald-500/10',
      description: 'Identical repeated rows'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {kpis.map((kpi, idx) => {
        const Icon = kpi.icon;
        return (
          <GlassCard key={idx} className="relative overflow-hidden group">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs text-slate-400 font-medium tracking-wider uppercase">
                  {kpi.label}
                </p>
                <h3 className="text-2xl font-bold mt-1 tracking-tight">
                  {kpi.value}
                </h3>
                {kpi.subValue && (
                  <p className="text-xs font-semibold text-slate-500 mt-0.5">
                    {kpi.subValue}
                  </p>
                )}
              </div>
              <div className={`p-2 rounded-xl ${kpi.color}`}>
                <Icon className="h-5 w-5" />
              </div>
            </div>
            
            <p className="text-xs text-slate-500 mt-4 border-t border-slate-800/40 pt-2">
              {kpi.description}
            </p>
            
            {/* Background Glow */}
            <div className="absolute -bottom-10 -right-10 w-24 h-24 bg-indigo-500/5 rounded-full blur-xl group-hover:scale-150 transition-transform duration-500"></div>
          </GlassCard>
        );
      })}
    </div>
  );
};

export default KPIWidget;
