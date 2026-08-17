import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  ScanFace,
  Vault,
  ListTodo,
  ShieldAlert,
  Settings,
  LogOut,
  ShieldCheck,
  UserCheck,
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";

const NAV_ITEMS = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/verification", label: "Customer Verification", icon: ScanFace },
  { to: "/lockers", label: "Locker Details", icon: Vault },
  { to: "/sessions", label: "Verification Sessions", icon: ListTodo },
  { to: "/audit-logs", label: "Audit Logs", icon: ShieldAlert },
  { to: "/customers", label: "Customers Directory", icon: UserCheck },
  { to: "/branches", label: "Branch Network", icon: Vault },
  { to: "/analytics", label: "Analytics & Telemetry", icon: LayoutDashboard },
  { to: "/settings", label: "Settings", icon: Settings },
];


export function Sidebar() {
  const { user, logout } = useAuth();

  return (
    <aside className="w-64 shrink-0 bg-[#0F172A] text-slate-300 flex flex-col border-r border-slate-800 select-none">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#003366] border border-blue-400/30 flex items-center justify-center text-white font-bold shadow-sm">
          <ShieldCheck size={22} className="text-blue-400" />
        </div>
        <div>
          <div className="text-white font-bold text-base tracking-tight flex items-center gap-1.5">
            SMART<span className="text-blue-400">LOCKER</span>
          </div>
          <div className="text-slate-400 text-[11px] font-medium tracking-wide">Bank Admin OS · Pune Camp</div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          Verification Operations
        </div>
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? "bg-[#003366] text-white font-semibold shadow-xs"
                  : "hover:bg-slate-800 text-slate-300 hover:text-white"
              }`
            }
          >
            <Icon size={18} className="shrink-0" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Logged-in Employee Profile Footer */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/40 space-y-3">
        {/* Core System Heartbeat Status */}
        <div className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> AI Pipeline
          </span>
          <span className="font-mono text-[10px] font-bold text-emerald-400">ONLINE</span>
        </div>

        {/* Staff Profile Box */}
        <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#003366] text-white flex items-center justify-center font-bold text-xs">
              <UserCheck size={16} />
            </div>
            <div className="overflow-hidden leading-tight">
              <div className="text-xs font-bold text-white truncate">{user?.full_name || "Rajesh Varma"}</div>
              <div className="text-[10px] font-mono text-blue-400">ID: {user?.employee_id || user?.id || "EMP1001"}</div>
            </div>
          </div>

          <div className="text-[10px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-800/80 font-medium">
            <span>Branch Operator</span>
            <span className="text-emerald-400 font-mono">STAFF #01</span>
          </div>
        </div>

        {/* Logout Button */}
        <button
          onClick={logout}
          className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 w-full transition-colors"
        >
          <LogOut size={15} /> Sign out staff
        </button>
      </div>
    </aside>
  );
}

