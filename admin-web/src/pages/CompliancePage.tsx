import { useEffect, useState } from "react";
import { api } from "../services/api";
import { AuditEvent } from "../types";

export function CompliancePage() {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [filters, setFilters] = useState({ actor_role: "", entity_type: "", action: "" });

  async function load() {
    const params: Record<string, string> = { limit: "150" };
    if (filters.actor_role) params.actor_role = filters.actor_role;
    if (filters.entity_type) params.entity_type = filters.entity_type;
    if (filters.action) params.action = filters.action;
    const resp = await api.get("/api/v1/audit", { params });
    setEvents(resp.data.data);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const totalEvents = events.length;
  const failedVerifications = events.filter((e) => e.action.includes("VERIFICATION_FAILED") || e.action.includes("VERIFICATION_ATTEMPT_FAILED")).length;
  const successfulOps = events.filter((e) => e.action === "OPERATION_COMPLETED").length;
  const rejected = events.filter((e) => e.new_state === "REJECTED").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-primary">Compliance & Audit</h1>
        <p className="text-sm text-slate-500">Complete, append-only reconstruction of every privileged operation.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-4">
          <div className="text-xs text-slate-500 uppercase">Total Audit Events</div>
          <div className="text-2xl font-semibold text-primary">{totalEvents}</div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-slate-500 uppercase">Successful Operations</div>
          <div className="text-2xl font-semibold text-success">{successfulOps}</div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-slate-500 uppercase">Failed Verification Attempts</div>
          <div className="text-2xl font-semibold text-warning">{failedVerifications}</div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-slate-500 uppercase">Rejected Requests</div>
          <div className="text-2xl font-semibold text-danger">{rejected}</div>
        </div>
      </div>

      <div className="card p-4 flex flex-wrap gap-3">
        <select
          value={filters.actor_role}
          onChange={(e) => setFilters((f) => ({ ...f, actor_role: e.target.value }))}
          className="text-sm border border-border rounded-md px-2 py-1.5"
        >
          <option value="">All Roles</option>
          <option value="CUSTOMER">Customer</option>
          <option value="BANK_OPERATOR">Bank Operator</option>
          <option value="BRANCH_MANAGER">Branch Manager</option>
          <option value="SUPER_ADMIN">Super Admin</option>
        </select>
        <select
          value={filters.entity_type}
          onChange={(e) => setFilters((f) => ({ ...f, entity_type: e.target.value }))}
          className="text-sm border border-border rounded-md px-2 py-1.5"
        >
          <option value="">All Entities</option>
          <option value="USER">User</option>
          <option value="LOCKER">Locker</option>
          <option value="LOCKER_REQUEST">Locker Request</option>
          <option value="VERIFICATION_TOKEN">Verification Token</option>
        </select>
        <input
          value={filters.action}
          onChange={(e) => setFilters((f) => ({ ...f, action: e.target.value }))}
          placeholder="Filter by action (e.g. LOGIN_SUCCESS)"
          className="text-sm border border-border rounded-md px-2 py-1.5 flex-1 min-w-[200px]"
        />
      </div>

      <div className="card p-6">
        <h2 className="font-semibold text-primary mb-4 text-sm">Audit Timeline</h2>
        <ol className="space-y-4 border-l border-border pl-4 max-h-[600px] overflow-y-auto">
          {events.map((e) => (
            <li key={e.id} className="relative">
              <span className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-primary" />
              <div className="text-xs text-slate-400 font-mono">{new Date(e.created_at).toLocaleString()}</div>
              <div className="text-sm text-primary font-medium">{e.action.replace(/_/g, " ")}</div>
              <div className="text-xs text-slate-500">
                {e.actor_role ? `${e.actor_role.replace("_", " ")} · ` : "System · "}
                {e.entity_type}{e.entity_id ? ` #${e.entity_id.slice(0, 8)}` : ""}
                {e.previous_state && e.new_state ? ` · ${e.previous_state} → ${e.new_state}` : ""}
              </div>
            </li>
          ))}
          {events.length === 0 && <li className="text-xs text-slate-400">No audit events match this filter.</li>}
        </ol>
      </div>
    </div>
  );
}
