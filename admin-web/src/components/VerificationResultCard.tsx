import { AIResultContract, DecisionEngineContract } from "../types";
import { CheckCircle2, XCircle, AlertTriangle, ShieldCheck, ShieldAlert, Cpu, Activity } from "lucide-react";

interface VerificationResultCardProps {
  aiResult: AIResultContract | null;
  decisionEngine: DecisionEngineContract | null;
  isAnalyzing?: boolean;
}

export function VerificationResultCard({
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

  if (!aiResult || !decisionEngine) {
    return (
      <div className="card p-6 flex flex-col items-center justify-center text-center text-slate-400 space-y-3 h-full">
        <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 border border-slate-200">
          <Cpu size={28} />
        </div>
        <div>
          <h4 className="text-sm font-bold text-slate-700">Verification Result Standby</h4>
          <p className="text-xs text-slate-400 mt-1 max-w-xs">
            Start the camera and click &ldquo;Capture Face&rdquo; or select a Demo Scenario above to evaluate AI verification & decision engine output.
          </p>
        </div>
      </div>
    );
  }

  const isApproved = decisionEngine.decision === "APPROVED";
  const isReview = decisionEngine.decision === "MANUAL REVIEW";
  const isBlocked = decisionEngine.decision === "BLOCKED";

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
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">Verification Result</h3>
        </div>
        <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
          Core Rule #7 Auth
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
            {decisionEngine.decision}
          </h2>
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Risk: <strong className={decisionTheme.text}>{aiResult.riskLevel}</strong>
          </span>
        </div>
      </div>

      {/* AI Metric Fields Grid (Strict Prompt Fields) */}
      <div className="grid grid-cols-2 gap-2.5 text-xs">
        {/* Face Match */}
        <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80 flex flex-col justify-between">
          <span className="text-slate-500 text-[11px] font-medium uppercase tracking-wider">Face Match</span>
          <div className="flex items-center gap-1.5 mt-1">
            {aiResult.faceMatch ? (
              <span className="font-bold text-emerald-700 inline-flex items-center gap-1">
                <CheckCircle2 size={14} /> Match
              </span>
            ) : (
              <span className="font-bold text-rose-700 inline-flex items-center gap-1">
                <XCircle size={14} /> Mismatch
              </span>
            )}
          </div>
        </div>

        {/* Liveness */}
        <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80 flex flex-col justify-between">
          <span className="text-slate-500 text-[11px] font-medium uppercase tracking-wider">Liveness</span>
          <div className="flex items-center gap-1.5 mt-1">
            {aiResult.liveness ? (
              <span className="font-bold text-emerald-700 inline-flex items-center gap-1">
                <ShieldCheck size={14} /> Passed
              </span>
            ) : (
              <span className="font-bold text-rose-700 inline-flex items-center gap-1">
                <ShieldAlert size={14} /> Failed
              </span>
            )}
          </div>
        </div>

        {/* Confidence */}
        <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80 flex flex-col justify-between">
          <span className="text-slate-500 text-[11px] font-medium uppercase tracking-wider">Confidence</span>
          <span className="font-mono text-base font-bold text-slate-900 mt-1">
            {aiResult.confidence.toFixed(1)}%
          </span>
        </div>

        {/* Risk Score & Level */}
        <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80 flex flex-col justify-between">
          <span className="text-slate-500 text-[11px] font-medium uppercase tracking-wider">Risk Score</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="font-mono text-base font-bold text-slate-900">
              {aiResult.riskScore}
              <span className="text-xs font-normal text-slate-400">/100</span>
            </span>
            <span
              className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${
                aiResult.riskLevel === "LOW"
                  ? "bg-emerald-100 text-emerald-800"
                  : aiResult.riskLevel === "MEDIUM"
                  ? "bg-amber-100 text-amber-800"
                  : "bg-rose-100 text-rose-800"
              }`}
            >
              {aiResult.riskLevel}
            </span>
          </div>
        </div>
      </div>

      {/* Recommended Action (Prompt Required) */}
      <div className="pt-2">
        <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
          Recommended Action
        </h4>
        <div className={`p-3 rounded-lg border text-xs font-semibold leading-relaxed ${decisionTheme.actionBoxBg}`}>
          {decisionEngine.recommendedAction}
        </div>
      </div>
    </div>
  );
}
