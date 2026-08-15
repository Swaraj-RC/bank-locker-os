import { Locker } from "../types";

const DOT_COLORS: Record<string, string> = {
  AVAILABLE: "bg-emerald-400",
  OCCUPIED: "bg-slate-400",
  VERIFICATION_PENDING: "bg-amber-400 animate-pulse",
  ACCESS_ACTIVE: "bg-blue-500",
  MAINTENANCE: "bg-orange-400",
  RESTRICTED: "bg-red-500",
};

export function VaultGridMini({ lockers }: { lockers: Locker[] }) {
  return (
    <div className="grid grid-cols-6 sm:grid-cols-9 gap-2">
      {lockers.map((l) => (
        <div
          key={l.id}
          title={`${l.locker_number} · ${l.status}`}
          className="aspect-square rounded-md border border-border flex items-center justify-center text-[10px] font-mono text-slate-600 relative bg-slate-50"
        >
          <span className={`absolute top-1 right-1 w-1.5 h-1.5 rounded-full ${DOT_COLORS[l.status] || "bg-slate-300"}`} />
          {l.locker_number}
        </div>
      ))}
    </div>
  );
}
