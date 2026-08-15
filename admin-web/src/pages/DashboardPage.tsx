import { useEffect, useState } from "react";
import { api } from "../services/api";
import { KpiCard } from "../components/KpiCard";
import { StatusBadge } from "../components/StatusBadge";
import { DashboardKpis, Locker, LockerRequest, AuditEvent } from "../types";
import { Link } from "react-router-dom";
import { VaultGridMini } from "../components/VaultGridMini";

export function DashboardPage() {
  const [kpis, setKpis] = useState<DashboardKpis | null>(null);
  const [lockers, setLockers] = useState<Locker[]>([]);
  const [requests, setRequests] = useState<LockerRequest[]>([]);
  const [events, setEvents] = useState<AuditEvent[]>([]);

  async function load() {
    const [k, l, r, a] = await Promise.all([
      api.get("/api/v1/admin/dashboard"),
      api.get("/api/v1/admin/lockers"),
      api.get("/api/v1/admin/requests"),
      api.get("/api/v1/audit", { params: { limit: 8 } }),
    ]);
    setKpis(k.data.data);
    setLockers(l.data.data);
    setRequests(r.data.data);
    setEvents(a.data.data);
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 8000); // simple polling for near-real-time refresh
    return () => clearInterval(interval);
  }, []);

  const pendingRequests = requests
    .filter((r) => !["COMPLETED", "REJECTED", "EXPIRED", "CANCELLED"].includes(r.status))
    .slice(0, 6);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-primary">Dashboard</h1>
        <p className="text-sm text-slate-500">Real-time overview of locker operations across your branch.</p>
      </div>

      {kpis && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <KpiCard label="Total Lockers" value={kpis.total_lockers} />
          <KpiCard label="Occupied" value={kpis.occupied} />
          <KpiCard label="Available" value={kpis.available} accent="text-success" />
          <KpiCard label="Active Requests" value={kpis.active_requests} accent="text-info" />
          <KpiCard label="Access Today" value={kpis.access_today} />
          <KpiCard label="Pending Verifications" value={kpis.pending_verifications} accent="text-warning" />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-primary text-sm">Live Vault Grid</h2>
            <Link to="/vault" className="text-xs text-info hover:underline">View full vault →</Link>
          </div>
          <VaultGridMini lockers={lockers.slice(0, 36)} />
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-primary text-sm">Recent Audit Events</h2>
            <Link to="/compliance" className="text-xs text-info hover:underline">View all →</Link>
          </div>
          <ul className="space-y-3">
            {events.map((e) => (
              <li key={e.id} className="text-xs">
                <div className="text-slate-400">{new Date(e.created_at).toLocaleTimeString()}</div>
                <div className="text-primary">{e.action.replace(/_/g, " ")}</div>
              </li>
            ))}
            {events.length === 0 && <li className="text-xs text-slate-400">No audit events yet.</li>}
          </ul>
        </div>
      </div>

      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-primary text-sm">Request Queue</h2>
          <Link to="/requests" className="text-xs text-info hover:underline">View all →</Link>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-slate-500 border-b border-border">
              <th className="py-2 font-medium">Request ID</th>
              <th className="font-medium">Type</th>
              <th className="font-medium">Status</th>
              <th className="font-medium">Submitted</th>
              <th className="font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {pendingRequests.map((r) => (
              <tr key={r.id} className="border-b border-border last:border-0">
                <td className="py-2 font-mono text-xs text-slate-500">{r.id.slice(0, 8)}</td>
                <td>{r.request_type}</td>
                <td><StatusBadge status={r.status} /></td>
                <td className="text-slate-500 text-xs">{new Date(r.requested_at).toLocaleString()}</td>
                <td>
                  <Link to={`/requests/${r.id}`} className="text-info text-xs hover:underline">Open →</Link>
                </td>
              </tr>
            ))}
            {pendingRequests.length === 0 && (
              <tr><td colSpan={5} className="py-4 text-center text-slate-400 text-xs">No active requests right now.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
