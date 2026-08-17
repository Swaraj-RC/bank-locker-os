import { AIResultContract, DecisionEngineContract, VerificationAttemptResponse } from "../types";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ShieldCheck,
  ShieldAlert,
  Cpu,
  Clock,
  Zap,
  Activity,
  AlertOctagon,
} from "lucide-react";

interface VerificationResultCardProps {
  result?: VerificationAttemptResponse | null;
  aiResult?: AIResultContract | null;
  decisionEngine?: DecisionEngineContract | null;
  isAnalyzing?: boolean;
}

export function VerificationResultCard({
  result,
  aiResult,
  decisionEngine,
  isAnalyzing,
}: VerificationResultCardProps) {
  if (isAnalyzing) {
    return (
      <div className="card p-5 space-y-4 animate-pulse h-full flex flex-col justify-between">
        <div className="space-y-3">
          <div className="h-4 bg-slate-200 rounded w-1/2" />
          <div className="h-20 bg-slate-200 rounded-xl" />
          <div className="grid grid-cols-2 gap-2 pt-2">
            <div className="h-12 bg-slate-200 rounded-lg" />
            <div className="h-12 bg-slate-200 rounded-lg" />
            <div className="h-12 bg-slate-200 rounded-lg" />
            <div className="h-12 bg-slate-200 rounded-lg" />
          </div>
        </div>
        <div className="h-16 bg-slate-200 rounded-xl" />
      </div>
    );
  }

  // Extract metrics from either new result or legacy contracts
  const hasData = Boolean(result || (aiResult && decisionEngine));

  if (!hasData) {
    return (
      <div className="card p-6 flex flex-col items-center justify-center text-center text-slate-400 space-y-3 h-full">
        <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 border border-slate-200">
          <Cpu size={28} />
        </div>
        <div>
          <h4 className="text-sm font-bold text-slate-700">Verification Result Standby</h4>
          <p className="text-xs text-slate-400 mt-1 max-w-xs">
            Start the verification session and click &ldquo;Capture Face&rdquo; to evaluate FastAPI AI verification & decision engine output.
          </p>
        </div>
      </div>
    );
  }

  const decision = (result?.decision || decisionEngine?.decision || "APPROVED").toUpperCase();
  const isApproved = decision === "APPROVED";
  const isReview = decision === "MANUAL REVIEW" || decision === "REVIEW";
  const isBlocked = decision === "BLOCKED";

  const faceMatch = result ? result.face_match : aiResult?.faceMatch ?? true;
  const faceConfidence = result ? result.face_confidence : aiResult?.confidence ?? 98.4;
  const liveness = result ? result.liveness_passed : aiResult?.liveness ?? true;
  const livenessConfidence = result?.liveness_confidence ?? (liveness ? 98.0 : 12.5);
  const spoofProbability = result?.spoof_probability ?? (liveness ? 1.6 : 88.0);
  const riskScore = result ? result.risk_score : aiResult?.riskScore ?? 12;
  const riskLevel = result ? result.risk_level : aiResult?.riskLevel ?? "LOW";
  const failureReason = result?.failure_reason;
  const recommendedAction =
    result?.recommended_action ||
    decisionEngine?.recommendedAction ||
    (isApproved
      ? "Locker operation authorized."
      : isReview
      ? "Manual physical identity inspection required."
      : "Face biometric mismatch. Locker access blocked.");
  const processingTime = result?.processing_time_ms ?? 320;

  // Decision Card Theme Config
  const decisionTheme = isApproved
    ? {
        bg: "bg-emerald-50",
        border: "border-emerald-300",
        text: "text-emerald-900",
        badgeBg: "bg-emerald-600",
        icon: <CheckCircle2 size={24} className="text-emerald-600" />,
        actionBoxBg: "bg-emerald-100/60 border-emerald-300 text-emerald-950",
      }
    : isReview
    ? {
        bg: "bg-amber-50",
        border: "border-amber-300",
        text: "text-amber-900",
        badgeBg: "bg-amber-600",
        icon: <AlertTriangle size={24} className="text-amber-600" />,
        actionBoxBg: "bg-amber-100/60 border-amber-300 text-amber-950",
      }
    : {
        bg: "bg-rose-50",
        border: "border-rose-300",
        text: "text-rose-900",
        badgeBg: "bg-rose-600",
        icon: <XCircle size={24} className="text-rose-600" />,
        actionBoxBg: "bg-rose-100/60 border-rose-300 text-rose-950",
      };

  return (
    <div className="card p-5 flex flex-col justify-between space-y-4 h-full">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Cpu size={16} className="text-[#003366]" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
            Authoritative Verification Result
          </h3>
        </div>
        <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
          FastAPI Engine
        </span>
      </div>

      {/* Main Decision Banner Card */}
      <div className={`p-4 rounded-xl border-2 ${decisionTheme.bg} ${decisionTheme.border} space-y-2`}>
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-600">Decision</span>
          <div className="flex items-center gap-1.5">{decisionTheme.icon}</div>
        </div>

        <div className="flex items-baseline justify-between">
          <h2 className={`text-2xl font-black tracking-tight ${decisionTheme.text}`}>
            {decision}
          </h2>
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Risk: <strong className={decisionTheme.text}>{riskLevel}</strong>
          </span>
        </div>
      </div>

      {/* Failure Reason Banner (if applicable) */}
      {failureReason && (
        <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2">
          <AlertOctagon size={16} className="text-rose-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold block">Failure Reason</span>
            <span className="text-[11px] text-rose-700 leading-snug">{failureReason}</span>
          </div>
        </div>
      )}

      {/* AI Metric Fields Grid (Contract Required Fields) */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        {/* Face Match */}
        <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/80 flex flex-col justify-between">
          <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Face Match</span>
          <div className="flex items-center gap-1.5 mt-1">
            {faceMatch ? (
              <span className="font-bold text-emerald-700 inline-flex items-center gap-1 text-xs">
                <CheckCircle2 size={13} /> Match
              </span>
            ) : (
              <span className="font-bold text-rose-700 inline-flex items-center gap-1 text-xs">
                <XCircle size={13} /> Mismatch
              </span>
            )}
          </div>
        </div>

        {/* Liveness */}
        <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/80 flex flex-col justify-between">
          <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Liveness</span>
          <div className="flex items-center gap-1.5 mt-1">
            {liveness ? (
              <span className="font-bold text-emerald-700 inline-flex items-center gap-1 text-xs">
                <ShieldCheck size={13} /> Passed
              </span>
            ) : (
              <span className="font-bold text-rose-700 inline-flex items-center gap-1 text-xs">
                <ShieldAlert size={13} /> Failed
              </span>
            )}
          </div>
        </div>

        {/* Face Confidence */}
        <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/80 flex flex-col justify-between">
          <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Face Confidence</span>
          <span className="font-mono text-sm font-bold text-slate-900 mt-0.5">
            {faceConfidence.toFixed(1)}%
          </span>
        </div>

        {/* Liveness Confidence */}
        <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/80 flex flex-col justify-between">
          <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Liveness Conf.</span>
          <span className="font-mono text-sm font-bold text-slate-900 mt-0.5">
            {livenessConfidence.toFixed(1)}%
          </span>
        </div>

        {/* Spoof Probability */}
        <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/80 flex flex-col justify-between">
          <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Spoof Probability</span>
          <span
            className={`font-mono text-sm font-bold mt-0.5 ${
              spoofProbability > 50 ? "text-rose-600" : "text-emerald-700"
            }`}
          >
            {spoofProbability.toFixed(1)}%
          </span>
        </div>

        {/* Processing Time */}
        <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/80 flex flex-col justify-between">
          <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
            <Clock size={11} /> Processing Time
          </span>
          <span className="font-mono text-sm font-bold text-slate-900 mt-0.5">
            {processingTime} ms
          </span>
        </div>

        {/* Risk Score & Level Full Width */}
        <div className="col-span-2 p-2.5 rounded-lg bg-slate-50 border border-slate-200/80 flex items-center justify-between">
          <div>
            <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider block">Risk Score</span>
            <span className="font-mono text-sm font-bold text-slate-900">
              {riskScore}
              <span className="text-xs font-normal text-slate-400">/100</span>
            </span>
          </div>
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase border ${
              riskLevel === "LOW"
                ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                : riskLevel === "MEDIUM"
                ? "bg-amber-100 text-amber-800 border-amber-300"
                : "bg-rose-100 text-rose-800 border-rose-300"
            }`}
          >
            {riskLevel} RISK
          </span>
        </div>
      </div>

      {/* Recommended Action (Prompt Required) */}
      <div className="pt-1">
        <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
          Recommended Action
        </h4>
        <div className={`p-3 rounded-lg border text-xs font-semibold leading-relaxed ${decisionTheme.actionBoxBg}`}>
          {recommendedAction}
        </div>
      </div>
    </div>
  );
}

