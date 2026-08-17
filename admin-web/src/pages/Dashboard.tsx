import { useState, useEffect } from "react";
import { StatCard } from "../components/StatCard";
import { StatusBadge } from "../components/StatusBadge";
import { SecurityAlertCard } from "../components/SecurityAlertCard";
import {
  MOCK_KPIS,
  MOCK_RECENT_ACTIVITIES,
  MOCK_SECURITY_ALERTS,
  MOCK_BRANCH_STATUS,
} from "../services/mockData";
import {
  Vault,
  ScanFace,
  CheckCircle2,
  XCircle,
  ArrowRight,
  ShieldCheck,
  Server,
  Database,
  Lock,
  Radio,
  PlusCircle,
  Sparkles,
  Zap,
} from "lucide-react";
import { Link } from "react-router-dom";

export function Dashboard() {
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [activities, setActivities] = useState(MOCK_RECENT_ACTIVITIES);
  const [kpis, setKpis] = useState(MOCK_KPIS);
  const [pulseCount, setPulseCount] = useState(0);

  // Demo Presentation Mode Live Simulation
  useEffect(() => {
    if (!isDemoMode) {
      setActivities(MOCK_RECENT_ACTIVITIES);
      setKpis(MOCK_KPIS);
      return;
    }

    const SIMULATED_STREAM = [
      {
        id: "ACT-LIVE-1",
        time: "Just now",
        customerName: "Vikram Malhotra",
        customerId: "CUST-5521",
        lockerId: "L-108",
        decision: "APPROVED" as const,
        confidence: 98.6,
      },
      {
        id: "ACT-LIVE-2",
        time: "10s ago",
        customerName: "Ananya Iyer",
        customerId: "CUST-3902",
        lockerId: "L-204",
        decision: "APPROVED" as const,
        confidence: 99.2,
      },
      {
        id: "ACT-LIVE-3",
        time: "25s ago",
        customerName: "Rohan Deshmukh",
        customerId: "CUST-7740",
        lockerId: "L-115",
        decision: "MANUAL REVIEW" as const,
        confidence: 88.4,
      },
      {
        id: "ACT-LIVE-4",
        time: "40s ago",
        customerName: "Priya Sharma",
        customerId: "CUST-2291",
        lockerId: "L-101",
        decision: "APPROVED" as const,
        confidence: 97.9,
      },
    ];


    let streamIdx = 0;
    const interval = setInterval(() => {
      const nextEvent = {
        ...SIMULATED_STREAM[streamIdx % SIMULATED_STREAM.length],
        id: `ACT-SIM-${Date.now()}`,
      };
      streamIdx++;

      setActivities((prev) => [nextEvent, ...prev.slice(0, 4)]);
      setKpis((prev) => ({
        ...prev,
        today_verifications: prev.today_verifications + 1,
        approved_today:
          nextEvent.decision === "APPROVED" ? prev.approved_today + 1 : prev.approved_today,
      }));
      setPulseCount((c) => c + 1);
    }, 4000);

    return () => clearInterval(interval);
  }, [isDemoMode]);

  return (
    <div className="space-y-6">
      {/* Header Banner with Demo Presentation Mode Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Employee Verification Dashboard
            </h1>
            {isDemoMode && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-full animate-pulse">
                <Sparkles size={12} /> LIVE DEMO STREAM ACTIVE
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time biometric authorization feed · Branch: Pune Camp Main Hub
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Demo Mode Switch */}
          <button
            type="button"
            onClick={() => setIsDemoMode(!isDemoMode)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all flex items-center gap-1.5 ${
              isDemoMode
                ? "bg-purple-600 text-white border-purple-700 shadow-sm"
                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
            }`}
            title="Toggle live simulated data stream for presentation"
          >
            <Sparkles size={14} className={isDemoMode ? "text-amber-300" : "text-purple-600"} />
            <span>Demo Mode: <strong>{isDemoMode ? "ON" : "OFF"}</strong></span>
          </button>

          <Link
            to="/verification"
            className="btn-accent flex items-center gap-2 text-xs font-semibold py-2 px-4 shadow-sm"
          >
            <ScanFace size={16} /> Start Customer Verification
          </Link>
        </div>
      </div>

      {/* Top 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Lockers"
          value={kpis.total_lockers}
          subtext="Pune Camp Vault Bay A-D"
          icon={<Vault size={20} />}
          accentColor="bg-[#003366]"
        />
        <StatCard
          label="Today's Verifications"
          value={kpis.today_verifications}
          subtext={isDemoMode ? "Streaming live updates..." : "In-bank staff sessions"}
          icon={<ScanFace size={20} />}
          accentColor="bg-[#2563EB]"
          trend={{ value: isDemoMode ? `+${pulseCount} live` : "+12% vs avg", isPositive: true }}
        />
        <StatCard
          label="Approved Today"
          value={kpis.approved_today}
          subtext="92.4% success rate"
          icon={<CheckCircle2 size={20} className="text-emerald-600" />}
          accentColor="bg-[#16A34A]"
          trend={{ value: `${kpis.approved_today} authorized`, isPositive: true }}
        />
        <StatCard
          label="Failed Attempts"
          value={kpis.failed_attempts}
          subtext="Blocked or review"
          icon={<XCircle size={20} className="text-rose-600" />}
          accentColor="bg-[#DC2626]"
        />
      </div>

      {/* Main 2-Column Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Recent Verification Activity */}
        <div className="lg:col-span-2 space-y-6">
          {/* Recent Activity Table */}
          <div className="card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div>
                  <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                    Recent Verification Activity
                  </h2>
                  <p className="text-xs text-slate-500">Latest in-branch facial & liveness authorizations</p>
                </div>
                {isDemoMode && (
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                )}
              </div>
              <Link
                to="/audit-logs"
                className="text-xs text-[#003366] font-semibold hover:underline flex items-center gap-1"
              >
                View Audit Trail <ArrowRight size={13} />
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                    <th className="py-2.5 px-3">Time</th>
                    <th className="py-2.5 px-3">Customer</th>
                    <th className="py-2.5 px-3">Locker</th>
                    <th className="py-2.5 px-3">Decision</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {activities.map((act, index) => (
                    <tr
                      key={act.id}
                      className={`hover:bg-slate-50/60 transition-colors ${
                        isDemoMode && index === 0 ? "bg-emerald-50/40" : ""
                      }`}
                    >
                      <td className="py-3 px-3 font-mono text-slate-500 whitespace-nowrap">
                        {act.time}
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-900">{act.customerName}</div>
                        <div className="font-mono text-[11px] text-[#003366]">{act.customerId}</div>
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          {act.lockerId}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <StatusBadge status={act.decision} />
                      </td>
                      <td className="py-3 px-3 text-right">
                        <Link
                          to={`/verification?cust=${act.customerId}`}
                          className="text-xs font-semibold text-[#003366] hover:underline"
                        >
                          Details
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Security Alerts Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Security Alerts & Exceptions
                </h2>
                <p className="text-xs text-slate-500">High-risk attempts and pending supervisory escalations</p>
              </div>
              <span className="text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
                3 Active Flags
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {MOCK_SECURITY_ALERTS.map((alert) => (
                <SecurityAlertCard key={alert.id} alert={alert} />
              ))}
            </div>
          </div>
        </div>

        {/* Right 1 Column: Branch Status & Terminal Control */}
        <div className="space-y-6">
          {/* Branch Status */}
          <div className="card p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Branch Status
                </h3>
                <span className="text-[11px] text-slate-400">Pune Camp Operations Hub</span>
              </div>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> ALL ONLINE
              </span>
            </div>

            <div className="space-y-3 text-xs">
              {/* Vault Online */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 flex items-center gap-1.5">
                    <Vault size={14} className="text-[#003366]" /> Vault Online
                  </span>
                  <span className="font-mono text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded">
                    ACTIVE
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">{MOCK_BRANCH_STATUS.vault.detail}</p>
              </div>

              {/* AI Service Connected */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 flex items-center gap-1.5">
                    <Server size={14} className="text-blue-600" /> AI Service Connected
                  </span>
                  <span className="font-mono text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded">
                    CONNECTED
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">{MOCK_BRANCH_STATUS.aiService.detail}</p>
              </div>

              {/* Database Connected */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 flex items-center gap-1.5">
                    <Database size={14} className="text-purple-600" /> Database Connected
                  </span>
                  <span className="font-mono text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded">
                    SYNCED
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">{MOCK_BRANCH_STATUS.database.detail}</p>
              </div>
            </div>
          </div>

          {/* Quick Terminal Launch Box */}
          <div className="card p-5 bg-[#0F172A] text-white border-slate-800 space-y-3">
            <div className="flex items-center gap-2 text-blue-400">
              <ScanFace size={18} />
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                Staff Verification Station
              </h4>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Customer identity verification must be conducted inside bank premises via Terminal #01.
            </p>
            <Link
              to="/verification"
              className="btn-primary w-full bg-[#2563EB] hover:bg-blue-600 text-white text-xs font-bold py-2.5 rounded-lg flex items-center justify-center gap-2 shadow-sm"
            >
              Open Verification Terminal <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

