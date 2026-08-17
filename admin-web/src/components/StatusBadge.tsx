const STATUS_CONFIGS: Record<string, { label: string; cls: string; dot: string }> = {
  // Decisions
  APPROVED: { label: "APPROVED", cls: "bg-emerald-50 text-emerald-800 border-emerald-300 font-bold", dot: "bg-emerald-600" },
  "MANUAL REVIEW": { label: "MANUAL REVIEW", cls: "bg-amber-50 text-amber-800 border-amber-300 font-bold", dot: "bg-amber-500" },
  REVIEW: { label: "MANUAL REVIEW", cls: "bg-amber-50 text-amber-800 border-amber-300 font-bold", dot: "bg-amber-500" },
  BLOCKED: { label: "BLOCKED", cls: "bg-rose-50 text-rose-800 border-rose-300 font-bold", dot: "bg-rose-600" },

  // Risk Levels
  LOW: { label: "LOW RISK", cls: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
  MEDIUM: { label: "MEDIUM RISK", cls: "bg-amber-50 text-amber-700 border-amber-200", dot: "bg-amber-500" },
  HIGH: { label: "HIGH RISK", cls: "bg-rose-50 text-rose-700 border-rose-200", dot: "bg-rose-600" },

  // Verification Features
  MATCH: { label: "Match", cls: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
  MISMATCH: { label: "Mismatch", cls: "bg-rose-50 text-rose-700 border-rose-200", dot: "bg-rose-600" },
  PASSED: { label: "Passed", cls: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
  FAILED: { label: "Failed", cls: "bg-rose-50 text-rose-700 border-rose-200", dot: "bg-rose-600" },

  // Session & Operation States
  STARTED: { label: "Session Started", cls: "bg-slate-100 text-slate-700 border-slate-300", dot: "bg-slate-500" },
  VERIFYING: { label: "Analyzing Face", cls: "bg-blue-50 text-blue-700 border-blue-300", dot: "bg-blue-500 animate-pulse" },
  COMPLETED: { label: "Completed", cls: "bg-slate-100 text-slate-700 border-slate-300", dot: "bg-slate-500" },

  // Locker & Account States
  ACTIVE: { label: "Active", cls: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
  AVAILABLE: { label: "Available", cls: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
  OCCUPIED: { label: "Occupied", cls: "bg-slate-100 text-slate-700 border-slate-300", dot: "bg-slate-500" },
  VERIFICATION_PENDING: { label: "Verification Pending", cls: "bg-amber-50 text-amber-800 border-amber-200", dot: "bg-amber-500" },
  APPROVAL_PENDING: { label: "Approval Pending", cls: "bg-amber-50 text-amber-800 border-amber-200", dot: "bg-amber-500" },
  ACCESS_ACTIVE: { label: "Access Active", cls: "bg-blue-50 text-blue-800 border-blue-200", dot: "bg-blue-600 animate-pulse" },
  MAINTENANCE: { label: "Maintenance", cls: "bg-orange-50 text-orange-800 border-orange-200", dot: "bg-orange-500" },
  RESTRICTED: { label: "Restricted", cls: "bg-rose-50 text-rose-800 border-rose-200", dot: "bg-rose-600" },
  SUSPENDED: { label: "Suspended", cls: "bg-rose-50 text-rose-800 border-rose-200", dot: "bg-rose-600" },
  SUBMITTED: { label: "Submitted", cls: "bg-slate-100 text-slate-700 border-slate-300", dot: "bg-slate-400" },
  REJECTED: { label: "Rejected", cls: "bg-rose-50 text-rose-700 border-rose-200", dot: "bg-rose-500" },
  EXPIRED: { label: "Expired", cls: "bg-rose-50 text-rose-600 border-rose-200", dot: "bg-rose-400" },
  CANCELLED: { label: "Cancelled", cls: "bg-slate-100 text-slate-500 border-slate-200", dot: "bg-slate-400" },
};

export function StatusBadge({ status, className = "" }: { status?: string | null; kind?: "locker" | "request" | "audit" | "decision"; className?: string }) {
  if (!status) return null;
  const upper = status.toUpperCase();
  const config = STATUS_CONFIGS[upper] || {
    label: status.replace(/_/g, " "),
    cls: "bg-slate-100 text-slate-700 border-slate-300",
    dot: "bg-slate-400",
  };

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-semibold border ${config.cls} ${className}`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${config.dot}`} />
      <span>{config.label}</span>
    </span>
  );
}
