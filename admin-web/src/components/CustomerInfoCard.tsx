import { CustomerContract } from "../types";
import { StatusBadge } from "./StatusBadge";
import { User, Phone, MapPin, Vault, ShieldCheck, CheckCircle2, AlertCircle } from "lucide-react";

interface CustomerInfoCardProps {
  customer: CustomerContract | null;
  isLoading?: boolean;
}

export function CustomerInfoCard({ customer, isLoading }: CustomerInfoCardProps) {
  if (isLoading) {
    return (
      <div className="card p-5 space-y-4 animate-pulse">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-slate-200" />
          <div className="space-y-2 flex-1">
            <div className="h-4 bg-slate-200 rounded w-1/2" />
            <div className="h-3 bg-slate-200 rounded w-1/3" />
          </div>
        </div>
        <div className="space-y-2 pt-3 border-t border-slate-100">
          <div className="h-3 bg-slate-200 rounded" />
          <div className="h-3 bg-slate-200 rounded w-5/6" />
          <div className="h-3 bg-slate-200 rounded w-4/6" />
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="card p-8 text-center text-slate-400 space-y-2">
        <User size={36} className="mx-auto text-slate-300 stroke-[1.5]" />
        <p className="text-sm font-medium text-slate-600">No Customer Selected</p>
        <p className="text-xs text-slate-400">Search by Customer ID (e.g. CUST-4410) above to fetch account and locker record.</p>
      </div>
    );
  }

  return (
    <div className="card p-5 space-y-4">
      {/* Header Profile */}
      <div className="flex items-start justify-between pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-[#003366] text-white flex items-center justify-center font-bold text-lg shadow-sm">
            {customer.name
              .split(" ")
              .map((n) => n[0])
              .join("")
              .slice(0, 2)}
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 leading-tight">{customer.name}</h3>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs font-mono font-bold text-[#003366]">{customer.customerId}</span>
              <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-semibold bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded">
                <CheckCircle2 size={11} /> KYC Verified
              </span>
            </div>
          </div>
        </div>
        <StatusBadge status={customer.status} />
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-1 gap-2.5 text-xs">
        <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
          <span className="text-slate-500 flex items-center gap-1.5 font-medium">
            <Phone size={13} className="text-slate-400" /> Mobile
          </span>
          <span className="font-mono font-semibold text-slate-800">{customer.mobile || "+91 98230 44102"}</span>
        </div>

        <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
          <span className="text-slate-500 flex items-center gap-1.5 font-medium">
            <MapPin size={13} className="text-slate-400" /> Branch
          </span>
          <span className="font-semibold text-slate-800">{customer.branch}</span>
        </div>

        <div className="flex items-center justify-between p-2 rounded-lg bg-blue-50/70 border border-blue-100">
          <span className="text-[#003366] flex items-center gap-1.5 font-medium">
            <Vault size={13} className="text-[#003366]" /> Locker Number
          </span>
          <span className="font-mono font-bold text-sm text-[#003366]">{customer.lockerId}</span>
        </div>

        <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
          <span className="text-slate-500 flex items-center gap-1.5 font-medium">
            <ShieldCheck size={13} className="text-slate-400" /> Locker Status
          </span>
          <StatusBadge status={customer.lockerStatus || "OCCUPIED"} />
        </div>

        <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
          <span className="text-slate-500 flex items-center gap-1.5 font-medium">
            <AlertCircle size={13} className="text-slate-400" /> Customer Status
          </span>
          <StatusBadge status={customer.status} />
        </div>
      </div>
    </div>
  );
}
