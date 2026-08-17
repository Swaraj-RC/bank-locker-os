import { Search, Bell, Building2, ShieldCheck, ChevronDown, UserCheck } from "lucide-react";
import { useAuth } from "../hooks/useAuth";

export function Topbar() {
  const { user } = useAuth();

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 sticky top-0 z-20 shadow-sm">
      {/* Global Search Bar */}
      <div className="relative w-96">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Search Customer ID (e.g. CUST-4410), Locker #, Session..."
          className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003366]/20 focus:border-[#003366] transition-all"
        />
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-5">
        {/* Branch Selector Pill */}
        <div className="flex items-center gap-2 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-lg text-xs">
          <Building2 size={14} className="text-[#003366]" />
          <span className="font-semibold text-slate-800">Pune Camp Main Branch</span>
          <span className="font-mono text-[10px] text-slate-500">(PUNE-01)</span>
          <ChevronDown size={12} className="text-slate-400 ml-1" />
        </div>

        {/* System Time / Status */}
        <div className="hidden lg:flex items-center gap-1.5 text-xs text-slate-600 font-medium border-r border-slate-200 pr-4">
          <ShieldCheck size={15} className="text-emerald-600" /> AI Vision Engine Ready
        </div>

        {/* Notifications */}
        <button className="relative p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
          <Bell size={18} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white" />
        </button>

        {/* Profile Card */}
        <div className="flex items-center gap-3 border-l border-slate-200 pl-4">
          <div className="w-9 h-9 rounded-lg bg-[#003366] text-white flex items-center justify-center font-bold text-xs shadow-xs">
            <UserCheck size={16} />
          </div>
          <div className="text-left leading-tight hidden sm:block">
            <div className="text-xs font-bold text-slate-900">{user?.full_name || "Rajesh Varma"}</div>
            <div className="text-[11px] font-mono text-slate-500">
              {user?.employee_id || "EMP1001"} · Verification Officer
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

