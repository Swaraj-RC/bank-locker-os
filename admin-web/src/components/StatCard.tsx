import { ReactNode } from "react";

interface StatCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  icon?: ReactNode;
  trend?: {
    value: string;
    isPositive?: boolean;
  };
  accentColor?: string;
}

export function StatCard({ label, value, subtext, icon, trend, accentColor }: StatCardProps) {
  return (
    <div className="card p-5 flex flex-col justify-between relative overflow-hidden group">
      {accentColor && (
        <div className={`absolute top-0 left-0 right-0 h-1 ${accentColor}`} />
      )}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p>
          <h3 className="text-2xl font-bold text-slate-900 mt-1.5 tracking-tight">{value}</h3>
        </div>
        {icon && (
          <div className="p-2.5 rounded-lg bg-slate-100/80 text-[#003366] group-hover:scale-105 transition-transform">
            {icon}
          </div>
        )}
      </div>

      {(trend || subtext) && (
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
          {trend && (
            <span
              className={`font-semibold px-1.5 py-0.5 rounded text-[11px] ${
                trend.isPositive
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : "bg-rose-50 text-rose-700 border border-rose-200"
              }`}
            >
              {trend.isPositive ? "↑" : "↓"} {trend.value}
            </span>
          )}
          {subtext && <span className="text-slate-500 font-medium">{subtext}</span>}
        </div>
      )}
    </div>
  );
}
