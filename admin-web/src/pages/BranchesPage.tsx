import { useEffect, useState } from "react";
import { api } from "../services/api";
import { Branch } from "../types";

export function BranchesPage() {
  const [branches, setBranches] = useState<Branch[]>([]);

  useEffect(() => {
    api.get("/api/v1/branches").then((r) => setBranches(r.data.data));
  }, []);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-primary">Branches</h1>
        <p className="text-sm text-slate-500">All branches in the network.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {branches.map((b) => (
          <div key={b.id} className="card p-5">
            <div className="text-xs text-slate-400 font-mono">{b.branch_code}</div>
            <div className="font-semibold text-primary mt-1">{b.name}</div>
            <div className="text-sm text-slate-500 mt-1">{b.address}, {b.city}, {b.state}</div>
            <span className={`badge mt-3 ${b.status === "ACTIVE" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-slate-100 text-slate-600"}`}>
              {b.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
