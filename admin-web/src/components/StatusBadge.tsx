const LOCKER_COLORS: Record<string, string> = {
  AVAILABLE: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  OCCUPIED: "bg-slate-100 text-slate-700 border border-slate-300",
  VERIFICATION_PENDING: "bg-amber-50 text-amber-700 border border-amber-200",
  ACCESS_ACTIVE: "bg-blue-50 text-blue-700 border border-blue-200",
  MAINTENANCE: "bg-orange-50 text-orange-700 border border-orange-200",
  RESTRICTED: "bg-red-50 text-red-700 border border-red-200",
};

const REQUEST_COLORS: Record<string, string> = {
  SUBMITTED: "bg-slate-100 text-slate-700 border border-slate-300",
  VERIFICATION_PENDING: "bg-amber-50 text-amber-700 border border-amber-200",
  TOKEN_A_VERIFIED: "bg-amber-50 text-amber-700 border border-amber-200",
  TOKEN_B_VERIFIED: "bg-amber-50 text-amber-700 border border-amber-200",
  APPROVAL_PENDING: "bg-amber-50 text-amber-700 border border-amber-200",
  APPROVED: "bg-blue-50 text-blue-700 border border-blue-200",
  ACCESS_ACTIVE: "bg-blue-50 text-blue-700 border border-blue-200",
  COMPLETED: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  REJECTED: "bg-red-50 text-red-700 border border-red-200",
  EXPIRED: "bg-red-50 text-red-700 border border-red-200",
  CANCELLED: "bg-slate-100 text-slate-500 border border-slate-300",
  MANUAL_REVIEW: "bg-orange-50 text-orange-700 border border-orange-300",
  BLOCKED: "bg-red-100 text-red-800 border border-red-400",
};

export function StatusBadge({ status, kind = "request" }: { status: string; kind?: "locker" | "request" }) {
  const colors = kind === "locker" ? LOCKER_COLORS : REQUEST_COLORS;
  const cls = colors[status] || "bg-slate-100 text-slate-700 border border-slate-300";
  return <span className={`badge ${cls}`}>{status.replace(/_/g, " ")}</span>;
}
