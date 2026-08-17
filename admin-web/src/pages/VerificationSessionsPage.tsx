import { useState } from "react";
import { MOCK_SESSIONS } from "../services/mockData";
import { SessionCard } from "../components/SessionCard";
import { SessionStatus } from "../types";
import { ListTodo, Search, Filter, Plus, ScanFace } from "lucide-react";
import { Link } from "react-router-dom";

export function VerificationSessionsPage() {
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [searchTerm, setSearchTerm] = useState<string>("");

  const filteredSessions = MOCK_SESSIONS.filter((session) => {
    const matchesStatus =
      selectedStatus === "ALL" || session.status === selectedStatus;
    const matchesSearch =
      session.sessionId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      session.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      session.customerId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      session.lockerId.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const statuses = [
    "ALL",
    "STARTED",
    "VERIFYING",
    "APPROVED",
    "REVIEW",
    "BLOCKED",
    "COMPLETED",
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Verification Sessions Management
            </h1>
            <span className="text-xs font-mono font-bold text-[#003366] bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
              {filteredSessions.length} Active Sessions
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Timeline progression of in-bank customer verification workflows and audit trails
          </p>
        </div>

        <Link
          to="/verification"
          className="btn-accent text-xs font-bold py-2 px-4 shadow-sm flex items-center gap-2 self-start sm:self-auto"
        >
          <ScanFace size={16} /> New Verification Session
        </Link>
      </div>

      {/* Filter and Search Bar */}
      <div className="card p-4 space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search Session ID, Customer ID, Locker..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003366]/20 focus:border-[#003366]"
            />
          </div>

          {/* Status Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto p-1 bg-slate-100 rounded-lg text-xs font-semibold">
            {statuses.map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setSelectedStatus(st)}
                className={`px-3 py-1 rounded-md transition-colors text-xs whitespace-nowrap ${
                  selectedStatus === st
                    ? "bg-[#003366] text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-200"
                }`}
              >
                {st === "ALL" ? "All Sessions" : st}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Sessions Timeline Cards Grid (Prompt Required) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredSessions.map((session) => (
          <SessionCard key={session.sessionId} session={session} />
        ))}
      </div>

      {filteredSessions.length === 0 && (
        <div className="card p-12 text-center text-slate-400 space-y-2">
          <ListTodo size={40} className="mx-auto text-slate-300" />
          <p className="text-sm font-semibold text-slate-700">No matching verification sessions</p>
          <p className="text-xs text-slate-400">
            Adjust your filter criteria or search keyword above to view session history.
          </p>
        </div>
      )}
    </div>
  );
}
