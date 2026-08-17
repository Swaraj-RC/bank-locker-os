import { useState } from "react";
import { MOCK_LOCKERS } from "../services/mockData";
import { StatusBadge } from "../components/StatusBadge";
import { Locker, AuthorizedUser } from "../types";
import {
  Vault,
  Filter,
  UserCheck,
  ShieldCheck,
  Clock,
  Building2,
  Users,
  CheckCircle2,
  XCircle,
  AlertCircle,
  KeyRound,
  Search,
} from "lucide-react";
import { Link } from "react-router-dom";

export function LockerGrid() {
  const [selectedSize, setSelectedSize] = useState<string>("ALL");
  const [selectedLocker, setSelectedLocker] = useState<Locker>(MOCK_LOCKERS[0]);
  const [searchTerm, setSearchTerm] = useState<string>("");

  const filteredLockers = MOCK_LOCKERS.filter((l) => {
    const matchesSize =
      selectedSize === "ALL" || l.locker_size.toUpperCase() === selectedSize.toUpperCase();
    const matchesSearch =
      l.locker_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (l.customer_name && l.customer_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (l.customer_id && l.customer_id.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesSize && matchesSearch;
  });

  const totalLockers = MOCK_LOCKERS.length;
  const occupiedLockers = MOCK_LOCKERS.filter(
    (l) => l.status === "OCCUPIED" || l.status === "ACCESS_ACTIVE"
  ).length;
  const availableLockers = MOCK_LOCKERS.filter((l) => l.status === "AVAILABLE").length;
  const occupancyPercent = Math.round((occupiedLockers / totalLockers) * 100);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Locker Details & Vault Bay Registry
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Physical safety locker allocation, status monitoring, and authorized user mandates · Branch: Pune Camp
          </p>
        </div>

        <Link
          to={`/verification?cust=${selectedLocker.customer_id || "CUST-4410"}`}
          className="btn-primary text-xs font-semibold py-2 px-3.5 flex items-center gap-2 self-start sm:self-auto"
        >
          <UserCheck size={15} /> Verify Locker Holder
        </Link>
      </div>

      {/* Occupancy Indicator Banner (Prompt Required) */}
      <div className="card p-5 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Vault size={18} className="text-[#003366]" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Vault Occupancy Indicator
            </h2>
          </div>
          <div className="flex items-center gap-4 text-xs font-medium">
            <span className="flex items-center gap-1.5 text-slate-700">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-700" /> Occupied:{" "}
              <strong>{occupiedLockers}</strong>
            </span>
            <span className="flex items-center gap-1.5 text-emerald-700">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Available:{" "}
              <strong>{availableLockers}</strong>
            </span>
            <span className="font-mono text-xs font-bold text-[#003366] bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
              {occupancyPercent}% Allocated
            </span>
          </div>
        </div>

        {/* Visual Progress Bar */}
        <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden flex">
          <div
            className="bg-[#003366] h-full transition-all duration-300"
            style={{ width: `${occupancyPercent}%` }}
            title={`Occupied: ${occupancyPercent}%`}
          />
          <div
            className="bg-emerald-500 h-full transition-all duration-300"
            style={{ width: `${100 - occupancyPercent}%` }}
            title="Available"
          />
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search Locker # (e.g. L-102) or Name..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003366]/20 focus:border-[#003366]"
          />
        </div>

        <div className="flex items-center gap-1.5 bg-white border border-slate-200 p-1 rounded-lg text-xs font-semibold self-stretch sm:self-auto overflow-x-auto">
          <span className="text-slate-400 px-2 text-[11px] uppercase">Size:</span>
          {["ALL", "SMALL", "MEDIUM", "LARGE", "XL", "EXECUTIVE"].map((sz) => (
            <button
              key={sz}
              onClick={() => setSelectedSize(sz)}
              className={`px-3 py-1 rounded-md transition-colors text-xs ${
                selectedSize === sz
                  ? "bg-[#003366] text-white"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {sz}
            </button>
          ))}
        </div>
      </div>

      {/* Selected Locker Detail Focus View (Prompt Required Cards) */}
      <div className="card p-6 bg-slate-50 border-slate-300 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-[#003366] text-white flex items-center justify-center font-mono font-bold text-lg">
              {selectedLocker.locker_number}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 font-mono">
                  Locker {selectedLocker.locker_number}
                </h3>
                <StatusBadge status={selectedLocker.status} />
              </div>
              <span className="text-xs text-slate-500">
                Bay Allocation & Master Authorization Profile
              </span>
            </div>
          </div>

          {selectedLocker.customer_id && (
            <Link
              to={`/verification?cust=${selectedLocker.customer_id}`}
              className="btn-accent text-xs font-semibold py-2 px-3.5 flex items-center gap-1.5 self-start sm:self-auto"
            >
              <UserCheck size={14} /> Launch Biometric Verification
            </Link>
          )}
        </div>

        {/* Top 6 Metadata Cards (Prompt Required) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
          {/* Locker Number */}
          <div className="card p-3 bg-white space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400">Locker Number</span>
            <div className="font-mono font-bold text-base text-[#003366]">
              {selectedLocker.locker_number}
            </div>
          </div>

          {/* Branch */}
          <div className="card p-3 bg-white space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400">Branch</span>
            <div className="font-bold text-slate-900 truncate">
              {selectedLocker.branch_name || "Pune Camp"}
            </div>
          </div>

          {/* Size */}
          <div className="card p-3 bg-white space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400">Size</span>
            <div className="font-bold text-slate-900">
              {selectedLocker.locker_size}
            </div>
          </div>

          {/* Owner */}
          <div className="card p-3 bg-white space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400">Owner</span>
            <div className="font-bold text-slate-900 truncate">
              {selectedLocker.customer_name || "Unassigned"}
            </div>
            {selectedLocker.customer_id && (
              <span className="font-mono text-[10px] text-[#003366] block">
                {selectedLocker.customer_id}
              </span>
            )}
          </div>

          {/* Status */}
          <div className="card p-3 bg-white space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400">Status</span>
            <div>
              <StatusBadge status={selectedLocker.status} />
            </div>
          </div>

          {/* Last Access */}
          <div className="card p-3 bg-white space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400">Last Access</span>
            <div className="font-mono text-slate-700 text-[11px] truncate">
              {selectedLocker.last_operation_at || "Never"}
            </div>
          </div>
        </div>

        {/* Authorized Users Table (Prompt Required) */}
        <div className="card p-5 bg-white space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users size={16} className="text-[#003366]" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                Authorized Key Holders & Nominees ({selectedLocker.authorized_users?.length || 0})
              </h4>
            </div>
            <span className="text-[11px] text-slate-400">Dual-custody verification registry</span>
          </div>

          {selectedLocker.authorized_users && selectedLocker.authorized_users.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                    <th className="py-2.5 px-3">Authorized Name</th>
                    <th className="py-2.5 px-3">Relationship</th>
                    <th className="py-2.5 px-3">Biometric Enrolled</th>
                    <th className="py-2.5 px-3">Authorization Type</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Last Access</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {selectedLocker.authorized_users.map((user) => (
                    <tr key={user.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-3 font-bold text-slate-900">{user.name}</td>
                      <td className="py-3 px-3 text-slate-600">{user.relationship}</td>
                      <td className="py-3 px-3">
                        {user.biometricEnrolled ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded text-[11px]">
                            <CheckCircle2 size={12} /> 3D Face Enrolled
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-slate-500 font-semibold bg-slate-100 border border-slate-200 px-2 py-0.5 rounded text-[11px]">
                            <AlertCircle size={12} /> Pending Enrollment
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 font-mono text-[11px] text-slate-700">
                        {user.authorizationType.replace(/_/g, " ")}
                      </td>
                      <td className="py-3 px-3">
                        <StatusBadge status={user.status} />
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-500">{user.lastAccess}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-6 text-slate-400 text-xs">
              No authorized joint holders or nominees assigned to this locker bay.
            </div>
          )}
        </div>
      </div>

      {/* Physical Locker Grid List */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
          Select Locker from Bay Matrix ({filteredLockers.length} available)
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {filteredLockers.map((locker) => {
            const isSelected = selectedLocker.id === locker.id;
            return (
              <button
                key={locker.id}
                type="button"
                onClick={() => setSelectedLocker(locker)}
                className={`p-4 rounded-xl text-left border transition-all flex flex-col justify-between ${
                  isSelected
                    ? "bg-white border-[#003366] ring-2 ring-[#003366]/20 shadow-md"
                    : "bg-white border-slate-200 hover:border-slate-300"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-sm font-bold text-[#003366]">
                    {locker.locker_number}
                  </span>
                  <span className="text-[10px] uppercase font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                    {locker.locker_size}
                  </span>
                </div>

                <div className="my-1.5">
                  <StatusBadge status={locker.status} />
                </div>

                <div className="text-[11px] text-slate-500 font-medium truncate mt-2">
                  {locker.customer_name || "Unassigned"}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
