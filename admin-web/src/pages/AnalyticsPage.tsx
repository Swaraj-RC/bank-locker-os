import { useEffect, useState } from "react";
import { api } from "../services/api";
import { DashboardKpis } from "../types";

export function AnalyticsPage() {
  const [kpis, setKpis] = useState<DashboardKpis | null>(null);

  useEffect(() => {
    api.get("/api/v1/admin/dashboard").then((r) => setKpis(r.data.data));
  }, []);

  const utilization = kpis && kpis.total_lockers > 0
    ? Math.round(((kpis.occupied + kpis.access_today) / kpis.total_lockers) * 100)
    : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-primary">Analytics</h1>
        <p className="text-sm text-slate-500 bg-amber-50 border border-amber-200 inline-block px-2 py-1 rounded text-xs mt-1">
          Simulation / Prototype Metrics — not audited financial figures
        </p>
      </div>

      {kpis && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Metric label="Locker Utilization" value={`${utilization}%`} />
          <Metric label="Access Requests Today" value={kpis.access_today} />
          <Metric label="Pending Requests" value={kpis.active_requests} />
          <Metric label="Pending Verifications" value={kpis.pending_verifications} />
        </div>
      )}

      <div className="card p-6 text-sm text-slate-500">
        This prototype demonstrates the *shape* of operational reporting a production deployment would
        provide — average verification time, administrative time saved, and historical utilization trends
        would be computed from the audit event stream once real production volume exists.
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="card p-4">
      <div className="text-xs text-slate-500 uppercase">{label}</div>
      <div className="text-2xl font-semibold text-primary">{value}</div>
    </div>
  );
}
