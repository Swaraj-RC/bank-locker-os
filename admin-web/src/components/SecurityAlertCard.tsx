import { SecurityAlert } from "../types";
import { AlertOctagon, AlertTriangle, ShieldAlert, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

interface SecurityAlertCardProps {
  alert: SecurityAlert;
  onReview?: (alert: SecurityAlert) => void;
}

export function SecurityAlertCard({ alert, onReview }: SecurityAlertCardProps) {
  const getIcon = () => {
    switch (alert.type) {
      case "HIGH_RISK_ATTEMPT":
        return <AlertOctagon size={18} className="text-rose-600 shrink-0" />;
      case "MANUAL_REVIEW_PENDING":
        return <AlertTriangle size={18} className="text-amber-600 shrink-0" />;
      case "LIVENESS_FAILURE":
        return <ShieldAlert size={18} className="text-rose-600 shrink-0" />;
      default:
        return <AlertTriangle size={18} className="text-amber-600 shrink-0" />;
    }
  };

  const getSeverityBadge = () => {
    switch (alert.severity) {
      case "CRITICAL":
        return "bg-rose-100 text-rose-800 border-rose-200";
      case "HIGH":
        return "bg-amber-100 text-amber-800 border-amber-200";
      case "MEDIUM":
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  return (
    <div className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-all space-y-2.5">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-slate-50 border border-slate-100">{getIcon()}</div>
          <div>
            <h4 className="text-xs font-bold text-slate-900 leading-tight">{alert.title}</h4>
            <span className="text-[10px] text-slate-400 font-mono">{alert.timestamp}</span>
          </div>
        </div>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getSeverityBadge()}`}>
          {alert.severity}
        </span>
      </div>

      <p className="text-xs text-slate-600 leading-relaxed">{alert.description}</p>

      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 font-mono text-[11px] text-slate-500">
          <span>Cust: <strong className="text-slate-800">{alert.customerId}</strong></span>
          <span>•</span>
          <span>Locker: <strong className="text-[#003366]">{alert.lockerId}</strong></span>
        </div>

        <Link
          to={`/verification?cust=${alert.customerId}`}
          className="text-xs font-semibold text-[#003366] hover:text-blue-700 flex items-center gap-1"
        >
          Inspect <ArrowRight size={13} />
        </Link>
      </div>
    </div>
  );
}
