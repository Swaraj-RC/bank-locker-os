import { useAuth } from "../hooks/useAuth";
import { UserCheck, ShieldCheck, Cpu, Building2, Sliders, Database } from "lucide-react";

export function SettingsPage() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">Staff & Terminal Settings</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Operator profile, branch station parameters, and AI biometric verification thresholds
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Logged in Employee Profile */}
        <div className="card p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <UserCheck size={18} className="text-[#003366]" />
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Operator Profile
            </h2>
          </div>

          <div className="space-y-3 text-xs">
            <Row label="Employee Name" value={user?.full_name || "Rajesh Varma"} />
            <Row label="Employee ID" value={user?.employee_id || user?.id || "EMP1001"} isMono />
            <Row label="Official Email" value={user?.email || "emp1001@banklocker.internal"} isMono />
            <Row label="Assigned Role" value={user?.role?.replace(/_/g, " ") || "BANK OPERATOR"} />
            <Row label="Assigned Branch" value="Pune Camp Main Branch (PUNE-01)" />
            <Row label="Session Clearance" value="Tier-2 Biometric Terminal Authority" />
            <Row label="Account Status" value="ACTIVE / VERIFIED" isSuccess />
          </div>
        </div>

        {/* AI & Vision Terminal Configuration */}
        <div className="card p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Cpu size={18} className="text-[#2563EB]" />
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              AI Decision Engine Thresholds
            </h2>
          </div>

          <div className="space-y-3 text-xs">
            <Row label="Minimum Confidence for Approval" value="95.0%" isMono />
            <Row label="Liveness Passive 3D Requirement" value="MANDATORY (Strict)" />
            <Row label="Max Risk Score Allowed" value="25 / 100" isMono />
            <Row label="High Risk Escalation Threshold" value="Score >= 75" isMono />
            <Row label="Neural Embedding Model" value="Edge-FaceNet-v4.2-Quantized" isMono />
            <Row label="Presentation Attack Defense" value="Active (ISO/IEC 30107-3 Level 2)" />
            <Row label="Decision Engine Authority" value="Backend Authoritative (Single Source of Truth)" />
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  isMono,
  isSuccess,
}: {
  label: string;
  value?: string | null;
  isMono?: boolean;
  isSuccess?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
      <span className="text-slate-500 font-medium">{label}</span>
      <span
        className={`font-semibold ${
          isMono ? "font-mono text-slate-800" : isSuccess ? "text-emerald-700" : "text-slate-900"
        }`}
      >
        {value || "—"}
      </span>
    </div>
  );
}
