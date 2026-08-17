import { VerificationSession } from "../types";
import { StatusBadge } from "./StatusBadge";
import { Clock, User, Vault, ArrowRight, ShieldCheck, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { Link } from "react-router-dom";

interface SessionCardProps {
  session: VerificationSession;
}

export function SessionCard({ session }: SessionCardProps) {
  const getTimelineSteps = () => {
    const isApproved = session.status === "APPROVED" || session.status === "COMPLETED";
    const isReview = session.status === "REVIEW";
    const isBlocked = session.status === "BLOCKED";
    const isVerifying = session.status === "VERIFYING";

    return [
      { name: "Initiated", done: true, current: false },
      { name: "Camera Active", done: isVerifying || isApproved || isReview || isBlocked, current: session.status === "STARTED" },
      { name: "AI Verification", done: isApproved || isReview || isBlocked, current: isVerifying },
      {
        name: isApproved ? "Authorized" : isReview ? "Review" : isBlocked ? "Blocked" : "Decision",
        done: isApproved || isReview || isBlocked,
        current: isApproved || isReview || isBlocked,
        error: isBlocked,
        warning: isReview,
      },
    ];
  };

  const steps = getTimelineSteps();

  return (
    <div className="card p-5 space-y-4 hover:border-[#003366]/40 transition-all">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#003366]/10 text-[#003366] flex items-center justify-center font-bold text-xs font-mono">
            SES
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-bold text-[#003366]">{session.sessionId}</span>
              <span className="text-slate-300">•</span>
              <span className="text-xs font-semibold text-slate-700">{session.branch}</span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-mono">
              <Clock size={11} /> {session.startedTime}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <StatusBadge status={session.status} />
        </div>
      </div>

      {/* Customer & Locker Meta */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 space-y-0.5">
          <span className="text-[10px] uppercase font-bold text-slate-400">Customer</span>
          <div className="font-bold text-slate-900 truncate">{session.customerName}</div>
          <div className="font-mono text-[11px] text-[#003366]">{session.customerId}</div>
        </div>

        <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 space-y-0.5">
          <span className="text-[10px] uppercase font-bold text-slate-400">Target Locker</span>
          <div className="font-mono text-base font-bold text-[#003366]">{session.lockerId}</div>
          <div className="text-[10px] text-slate-500">Bay Authorized</div>
        </div>

        <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 space-y-0.5">
          <span className="text-[10px] uppercase font-bold text-slate-400">Operator ID</span>
          <div className="font-mono font-bold text-slate-800">{session.operatorId}</div>
          <div className="text-[10px] text-slate-500">Staff Terminal 01</div>
        </div>
      </div>

      {/* Timeline Steps Progression */}
      <div className="pt-2">
        <div className="flex items-center justify-between relative">
          <div className="absolute left-3 right-3 top-1/2 -translate-y-1/2 h-0.5 bg-slate-200 -z-0" />
          {steps.map((step, idx) => (
            <div key={idx} className="relative z-10 flex flex-col items-center gap-1 bg-white px-1">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border-2 transition-all ${
                  step.error
                    ? "bg-rose-600 border-rose-600 text-white"
                    : step.warning
                    ? "bg-amber-500 border-amber-500 text-white"
                    : step.done
                    ? "bg-[#003366] border-[#003366] text-white"
                    : "bg-white border-slate-300 text-slate-400"
                }`}
              >
                {step.error ? "✕" : step.done ? "✓" : idx + 1}
              </div>
              <span className="text-[10px] font-medium text-slate-600 whitespace-nowrap">{step.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Action Footer */}
      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
        {session.aiResult ? (
          <span className="text-[11px] font-mono text-slate-500">
            Confidence: <strong className="text-slate-900">{session.aiResult.confidence.toFixed(1)}%</strong> · Risk:{" "}
            <strong className="text-slate-900">{session.aiResult.riskScore}/100</strong>
          </span>
        ) : (
          <span className="text-[11px] text-slate-400 italic">Biometric acquisition pending...</span>
        )}

        <Link
          to={`/verification?cust=${session.customerId}`}
          className="btn-secondary text-xs py-1 px-3 flex items-center gap-1 font-semibold"
        >
          Open Session <ArrowRight size={13} />
        </Link>
      </div>
    </div>
  );
}
