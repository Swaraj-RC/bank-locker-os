import { useEffect, useState } from "react";
import { api } from "../services/api";
import { MOCK_BRANCHES } from "../services/mockData";
import { Building2, ShieldCheck, MapPin } from "lucide-react";

export function BranchesPage() {
  const [branches, setBranches] = useState<any[]>(MOCK_BRANCHES);

  useEffect(() => {
    api
      .get("/api/v1/branches")
      .then((r) => {
        if (r.data?.data && Array.isArray(r.data.data)) {
          setBranches(r.data.data);
        }
      })
      .catch(() => {
        setBranches(MOCK_BRANCHES);
      });
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Bank Branch Network</h1>
          <span className="text-xs font-mono font-bold text-[#003366] bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
            {branches.length} Operational Hubs
          </span>
        </div>
        <p className="text-xs text-slate-500 mt-0.5">
          Federated safety deposit locker facilities under dual-custody access policy.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {branches.map((b) => (
          <div key={b.id} className="card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-400 font-mono font-bold">{b.code}</span>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> ACTIVE
              </span>
            </div>

            <div>
              <div className="font-bold text-slate-900 text-sm">{b.name}</div>
              <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                <MapPin size={13} className="text-slate-400 shrink-0" />
                <span>{b.city}, India</span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium">
              <span>Biometric Terminals: <strong>2 Active</strong></span>
              <span className="text-[#003366] font-mono">Vault Bay A-D</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

