import { useEffect, useState } from "react";
import { api } from "../services/api";
import { LockerRequest } from "../types";

interface CustomerRow {
  id: string;
  full_name: string;
  email: string;
  phone: string;
}

export function CustomersPage() {
  const [search, setSearch] = useState("");
  const [lockers, setLockers] = useState<any[]>([]);

  useEffect(() => {
    api.get("/api/v1/admin/lockers").then((r) => setLockers(r.data.data));
  }, []);

  const assigned = lockers.filter((l) => l.customer_id);
  const filtered = assigned.filter((l) =>
    !search || l.locker_number.toLowerCase().includes(search.toLowerCase()) || l.customer_id.includes(search)
  );

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-primary">Customers</h1>
        <p className="text-sm text-slate-500">Customers with an assigned locker. Sensitive fields are masked.</p>
      </div>

      <input
        value={search} onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by locker number or customer ID..."
        className="text-sm border border-border rounded-md px-3 py-2 w-96 max-w-full"
      />

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr className="text-left text-xs text-slate-500">
              <th className="py-2.5 px-4 font-medium">Customer ID</th>
              <th className="font-medium">Locker</th>
              <th className="font-medium">Branch</th>
              <th className="font-medium">Status</th>
              <th className="font-medium">Last Activity</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((l) => (
              <tr key={l.id} className="border-t border-border hover:bg-slate-50">
                <td className="py-2.5 px-4 font-mono text-xs text-slate-500">{l.customer_id.slice(0, 8)}••••</td>
                <td className="font-mono text-xs">{l.locker_number}</td>
                <td className="text-xs">{l.branch_id.slice(0, 8)}…</td>
                <td className="text-xs">{l.status}</td>
                <td className="text-xs text-slate-500">{l.last_operation_at ? new Date(l.last_operation_at).toLocaleDateString() : "—"}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={5} className="py-8 text-center text-slate-400 text-xs">No matching customers.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
