import { useEffect, useState } from "react";
import { api } from "../services/api";
import { MOCK_LOCKERS } from "../services/mockData";
import { StatusBadge } from "../components/StatusBadge";
import { Users, Search } from "lucide-react";
import { Link } from "react-router-dom";

export function CustomersPage() {
  const [search, setSearch] = useState("");
  const [lockers, setLockers] = useState<any[]>(MOCK_LOCKERS);

  useEffect(() => {
    api
      .get("/api/v1/admin/lockers")
      .then((r) => {
        if (r.data?.data && Array.isArray(r.data.data)) {
          setLockers(r.data.data);
        }
      })
      .catch(() => {
        setLockers(MOCK_LOCKERS);
      });
  }, []);

  const assigned = lockers.filter((l) => l.customer_id);
  const filtered = assigned.filter(
    (l) =>
      !search ||
      l.locker_number.toLowerCase().includes(search.toLowerCase()) ||
      (l.customer_id && l.customer_id.toLowerCase().includes(search.toLowerCase())) ||
      (l.customer_name && l.customer_name.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Customer Directory</h1>
          <span className="text-xs font-mono font-bold text-[#003366] bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
            {assigned.length} Active Holders
          </span>
        </div>
        <p className="text-xs text-slate-500 mt-0.5">
          Customers with an assigned physical locker bay. Biometric data access restricted to secure sessions.
        </p>
      </div>

      <div className="card p-4">
        <div className="relative w-80 max-w-full">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by customer name, ID, or locker #..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003366]/20 focus:border-[#003366]"
          />
        </div>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
            <tr>
              <th className="py-3 px-4">Customer Name & ID</th>
              <th className="py-3 px-4">Locker Bay</th>
              <th className="py-3 px-4">Branch</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Last Activity</th>
              <th className="py-3 px-4 text-right">Verification</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium">
            {filtered.map((l) => (
              <tr key={l.id} className="hover:bg-slate-50/70 transition-colors">
                <td className="py-3 px-4">
                  <div className="font-bold text-slate-900">{l.customer_name || "Account Holder"}</div>
                  <div className="font-mono text-[11px] text-slate-500">{l.customer_id}</div>
                </td>
                <td className="py-3 px-4">
                  <span className="font-mono font-bold text-[#003366] bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                    {l.locker_number}
                  </span>
                </td>
                <td className="py-3 px-4 text-slate-600">{l.branch_name || "Pune Camp"}</td>
                <td className="py-3 px-4">
                  <StatusBadge status={l.status} />
                </td>
                <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                  {l.last_operation_at || "Recent"}
                </td>
                <td className="py-3 px-4 text-right">
                  <Link
                    to={`/verification?cust=${l.customer_id}`}
                    className="text-xs font-semibold text-[#003366] hover:underline"
                  >
                    Verify Holder
                  </Link>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="py-10 text-center text-slate-400 text-xs">
                  No matching customers found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

