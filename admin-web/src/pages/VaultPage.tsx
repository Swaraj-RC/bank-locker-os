import { useEffect, useState } from "react";
import { api } from "../services/api";
import { Locker, Branch } from "../types";
import { StatusBadge } from "../components/StatusBadge";
import { Search } from "lucide-react";

const STATUS_OPTIONS = ["AVAILABLE", "OCCUPIED", "VERIFICATION_PENDING", "ACCESS_ACTIVE", "MAINTENANCE", "RESTRICTED"];
const SIZE_OPTIONS = ["SMALL", "MEDIUM", "LARGE", "EXTRA_LARGE"];

const CARD_COLORS: Record<string, string> = {
  AVAILABLE: "bg-emerald-50 border-emerald-200",
  OCCUPIED: "bg-white border-slate-200",
  VERIFICATION_PENDING: "bg-amber-50 border-amber-300",
  ACCESS_ACTIVE: "bg-blue-50 border-blue-300",
  MAINTENANCE: "bg-orange-50 border-orange-200",
  RESTRICTED: "bg-red-50 border-red-200",
};

export function VaultPage() {
  const [lockers, setLockers] = useState<Locker[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchId, setBranchId] = useState("");
  const [status, setStatus] = useState("");
  const [size, setSize] = useState("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Locker | null>(null);

  async function load() {
    const params: Record<string, string> = {};
    if (branchId) params.branch_id = branchId;
    if (status) params.status = status;
    if (size) params.locker_size = size;
    if (search) params.search = search;
    const resp = await api.get("/api/v1/admin/lockers", { params });
    setLockers(resp.data.data);
  }

  useEffect(() => {
    api.get("/api/v1/branches").then((r) => setBranches(r.data.data));
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 6000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId, status, size, search]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-primary">Locker Vault</h1>
        <p className="text-sm text-slate-500">Live status of every locker across your branches.</p>
      </div>

      <div className="card p-4 flex flex-wrap gap-3 items-center">
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
          <input
            value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search locker number..."
            className="pl-8 pr-3 py-1.5 text-sm border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <select value={branchId} onChange={(e) => setBranchId(e.target.value)} className="text-sm border border-border rounded-md px-2 py-1.5">
          <option value="">All Branches</option>
          {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="text-sm border border-border rounded-md px-2 py-1.5">
          <option value="">All Statuses</option>
          {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
        </select>
        <select value={size} onChange={(e) => setSize(e.target.value)} className="text-sm border border-border rounded-md px-2 py-1.5">
          <option value="">All Sizes</option>
          {SIZE_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <span className="text-xs text-slate-400 ml-auto">{lockers.length} lockers</span>
      </div>

      <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-10 gap-3">
        {lockers.map((l) => (
          <button
            key={l.id}
            onClick={() => setSelected(l)}
            className={`aspect-square rounded-lg border-2 p-2 flex flex-col items-center justify-center gap-1 hover:shadow-md transition-shadow ${CARD_COLORS[l.status]}`}
          >
            <span className="font-mono font-semibold text-sm text-primary">{l.locker_number}</span>
            <span className="text-[9px] text-slate-500">{l.locker_size}</span>
          </button>
        ))}
      </div>

      {selected && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-end z-50" onClick={() => setSelected(null)}>
          <div className="bg-white h-full w-96 shadow-xl p-6 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-primary">Locker {selected.locker_number}</h2>
              <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-primary">✕</button>
            </div>
            <div className="space-y-3 text-sm">
              <Row label="Status"><StatusBadge status={selected.status} kind="locker" /></Row>
              <Row label="Size">{selected.locker_size}</Row>
              <Row label="Customer">{selected.customer_id ? selected.customer_id.slice(0, 8) + "…" : "Unassigned"}</Row>
              <Row label="Last Activity">{selected.last_operation_at ? new Date(selected.last_operation_at).toLocaleString() : "—"}</Row>
              <Row label="Locker ID"><span className="font-mono text-xs">{selected.id}</span></Row>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-border pb-2">
      <span className="text-slate-500">{label}</span>
      <span className="text-primary font-medium">{children}</span>
    </div>
  );
}
