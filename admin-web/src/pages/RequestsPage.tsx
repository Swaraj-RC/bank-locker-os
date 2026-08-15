import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../services/api";
import { LockerRequest } from "../types";
import { StatusBadge } from "../components/StatusBadge";

const STATUS_FILTERS = [
  "", "SUBMITTED", "VERIFICATION_PENDING", "TOKEN_A_VERIFIED", "TOKEN_B_VERIFIED",
  "APPROVED", "ACCESS_ACTIVE", "COMPLETED", "REJECTED", "CANCELLED",
];

export function RequestsPage() {
  const [requests, setRequests] = useState<LockerRequest[]>([]);
  const [status, setStatus] = useState("");

  async function load() {
    const params = status ? { status } : {};
    const resp = await api.get("/api/v1/admin/requests", { params });
    setRequests(resp.data.data);
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 6000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-primary">Requests</h1>
          <p className="text-sm text-slate-500">All locker access, inspection, maintenance and closure requests.</p>
        </div>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="text-sm border border-border rounded-md px-2 py-1.5">
          {STATUS_FILTERS.map((s) => <option key={s} value={s}>{s ? s.replace(/_/g, " ") : "All Statuses"}</option>)}
        </select>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr className="text-left text-xs text-slate-500">
              <th className="py-2.5 px-4 font-medium">Request ID</th>
              <th className="font-medium">Locker</th>
              <th className="font-medium">Type</th>
              <th className="font-medium">Status</th>
              <th className="font-medium">Submitted</th>
              <th className="font-medium px-4"></th>
            </tr>
          </thead>
          <tbody>
            {requests.map((r) => (
              <tr key={r.id} className="border-t border-border hover:bg-slate-50">
                <td className="py-2.5 px-4 font-mono text-xs text-slate-500">{r.id.slice(0, 8)}</td>
                <td className="font-mono text-xs">{r.locker_id.slice(0, 8)}</td>
                <td>{r.request_type}</td>
                <td><StatusBadge status={r.status} /></td>
                <td className="text-slate-500 text-xs">{new Date(r.requested_at).toLocaleString()}</td>
                <td className="px-4"><Link to={`/requests/${r.id}`} className="text-info text-xs hover:underline">Open →</Link></td>
              </tr>
            ))}
            {requests.length === 0 && (
              <tr><td colSpan={6} className="py-8 text-center text-slate-400 text-xs">No requests match this filter.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
