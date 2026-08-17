import { useState } from "react";
import { MOCK_AUDIT_LOG_ITEMS } from "../services/mockData";
import { StatusBadge } from "../components/StatusBadge";
import { AuditLogItem } from "../types";
import {
  ShieldAlert,
  Search,
  Download,
  Filter,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  Calendar,
  UserCheck,
} from "lucide-react";
import { Link } from "react-router-dom";

export function AuditLogs() {
  const [selectedFilter, setSelectedFilter] = useState<string>("ALL");
  const [searchCustId, setSearchCustId] = useState<string>("");

  const filteredLogs = MOCK_AUDIT_LOG_ITEMS.filter((item) => {
    // Filter by decision
    const matchesDecision =
      selectedFilter === "ALL" ||
      item.decision.toUpperCase() === selectedFilter.toUpperCase();

    // Search by customer ID, session ID, or locker
    const matchesSearch =
      searchCustId === "" ||
      item.customerId.toLowerCase().includes(searchCustId.toLowerCase()) ||
      (item.customerName &&
        item.customerName.toLowerCase().includes(searchCustId.toLowerCase())) ||
      item.sessionId.toLowerCase().includes(searchCustId.toLowerCase()) ||
      item.locker.toLowerCase().includes(searchCustId.toLowerCase());

    return matchesDecision && matchesSearch;
  });

  const filterOptions = [
    { label: "All", value: "ALL" },
    { label: "Approved", value: "APPROVED" },
    { label: "Manual Review", value: "MANUAL REVIEW" },
    { label: "Blocked", value: "BLOCKED" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Biometric Security & Compliance Audit Logs
            </h1>
            <span className="text-xs font-mono font-bold text-[#003366] bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
              Immutable Trail
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Cryptographically sealed operational audit records for bank locker verification sessions
          </p>
        </div>

        <button
          type="button"
          onClick={() => alert("Audit log export generated (CSV format).")}
          className="btn-secondary text-xs font-semibold py-2 px-3.5 flex items-center gap-2 self-start sm:self-auto"
        >
          <Download size={14} /> Export Audit Log (CSV)
        </button>
      </div>

      {/* Filter and Search Bar (Prompt Required) */}
      <div className="card p-4 space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Search by Customer ID */}
          <div className="relative w-full sm:w-80">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchCustId}
              onChange={(e) => setSearchCustId(e.target.value)}
              placeholder="Search by Customer ID (e.g. CUST-4410)..."
              className="w-full pl-9 pr-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003366]/20 focus:border-[#003366]"
            />
          </div>

          {/* Decision Filters (Prompt Required: All, Approved, Manual Review, Blocked) */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto p-1 bg-slate-100 rounded-lg text-xs font-semibold">
            <span className="text-slate-400 px-2 text-[11px] uppercase">Filter:</span>
            {filterOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setSelectedFilter(opt.value)}
                className={`px-3 py-1 rounded-md transition-colors text-xs whitespace-nowrap ${
                  selectedFilter === opt.value
                    ? "bg-[#003366] text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-200"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Professional Audit Table (Prompt Required Columns) */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Session ID</th>
                <th className="py-3 px-4">Customer ID</th>
                <th className="py-3 px-4">Locker</th>
                <th className="py-3 px-4">Face</th>
                <th className="py-3 px-4">Liveness</th>
                <th className="py-3 px-4">Risk</th>
                <th className="py-3 px-4">Decision</th>
                <th className="py-3 px-4 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                  {/* Timestamp */}
                  <td className="py-3 px-4 font-mono text-slate-500 whitespace-nowrap">
                    {log.timestamp}
                  </td>

                  {/* Session ID */}
                  <td className="py-3 px-4 font-mono font-bold text-[#003366]">
                    {log.sessionId}
                  </td>

                  {/* Customer ID & Name */}
                  <td className="py-3 px-4">
                    <div className="font-bold text-slate-900">{log.customerName || "Customer"}</div>
                    <div className="font-mono text-[11px] text-slate-500">{log.customerId}</div>
                  </td>

                  {/* Locker */}
                  <td className="py-3 px-4">
                    <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                      {log.locker}
                    </span>
                  </td>

                  {/* Face */}
                  <td className="py-3 px-4">
                    {log.faceMatch === true ? (
                      <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded text-[11px]">
                        <CheckCircle2 size={12} /> Match
                      </span>
                    ) : log.faceMatch === false ? (
                      <span className="inline-flex items-center gap-1 text-rose-700 font-semibold bg-rose-50 border border-rose-200 px-2 py-0.5 rounded text-[11px]">
                        <XCircle size={12} /> Mismatch
                      </span>
                    ) : (
                      <span className="text-slate-400">N/A</span>
                    )}
                  </td>

                  {/* Liveness */}
                  <td className="py-3 px-4">
                    {log.liveness === true ? (
                      <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded text-[11px]">
                        <ShieldCheck size={12} /> Passed
                      </span>
                    ) : log.liveness === false ? (
                      <span className="inline-flex items-center gap-1 text-rose-700 font-semibold bg-rose-50 border border-rose-200 px-2 py-0.5 rounded text-[11px]">
                        <XCircle size={12} /> Failed
                      </span>
                    ) : (
                      <span className="text-slate-400">N/A</span>
                    )}
                  </td>

                  {/* Risk */}
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1.5 font-mono">
                      <span className="font-bold text-slate-800">{log.riskScore}/100</span>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.2 rounded uppercase ${
                          log.riskLevel === "LOW"
                            ? "bg-emerald-100 text-emerald-800"
                            : log.riskLevel === "MEDIUM"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-rose-100 text-rose-800"
                        }`}
                      >
                        {log.riskLevel}
                      </span>
                    </div>
                  </td>

                  {/* Decision */}
                  <td className="py-3 px-4">
                    <StatusBadge status={log.decision} />
                  </td>

                  {/* Details Action */}
                  <td className="py-3 px-4 text-right">
                    <Link
                      to={`/verification?cust=${log.customerId}`}
                      className="text-xs font-semibold text-[#003366] hover:underline"
                    >
                      Inspect
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredLogs.length === 0 && (
          <div className="p-10 text-center text-slate-400 text-xs">
            No audit records found matching your customer ID search or decision filter.
          </div>
        )}
      </div>
    </div>
  );
}
