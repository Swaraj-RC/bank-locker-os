import { DataTable, Column } from "../components/DataTable";
import { StatusBadge } from "../components/StatusBadge";
import { MOCK_REQUESTS } from "../services/mockData";
import { LockerRequest } from "../types";
import { ClipboardList } from "lucide-react";

export function Requests() {
  const columns: Column<LockerRequest>[] = [
    { header: "Reference ID", accessor: "id", className: "font-mono font-bold text-[#003366]" },
    { header: "Locker #", accessor: "locker_id", className: "font-semibold text-slate-900" },
    { header: "Customer Name", accessor: "customer_id" },
    { header: "Request Type", accessor: "request_type" },
    { header: "Status", accessor: (row) => <StatusBadge status={row.status} kind="request" /> },
    { header: "Correlation Ref", accessor: "correlation_id", className: "font-mono text-[11px] text-slate-400" },
    { header: "Submitted Time", accessor: "requested_at", className: "font-mono text-slate-500" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Locker Access & Operation Requests</h1>
          <p className="text-xs text-slate-500 mt-0.5">Dual-custody verification workflow & token approvals</p>
        </div>
        <button className="btn-primary flex items-center gap-2">
          <ClipboardList size={16} /> New Access Request
        </button>
      </div>

      <DataTable columns={columns} data={MOCK_REQUESTS} searchPlaceholder="Filter requests by ID, customer..." pageSize={8} />
    </div>
  );
}
