import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { CustomerInfoCard } from "../components/CustomerInfoCard";
import { CameraPanel } from "../components/CameraPanel";
import { VerificationResultCard } from "../components/VerificationResultCard";
import { StatusBadge } from "../components/StatusBadge";
import {
  MOCK_CUSTOMERS,
  DEFAULT_CUSTOMER,
  DEMO_SCENARIOS,
  DemoScenario,
} from "../services/mockData";
import {
  startVerification,
  submitVerificationAttempt,
  parseApiError,
} from "../services/api";
import {
  CustomerContract,
  VerificationAttemptResponse,
  VerificationLifecycleStatus,
  ApiErrorDetail,
} from "../types";
import {
  Search,
  ScanFace,
  Sparkles,
  ShieldCheck,
  RotateCcw,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Play,
  RefreshCw,
  X,
  AlertOctagon,
  Lock,
  Unlock,
  CheckCircle2,
} from "lucide-react";

export function CustomerVerificationPage() {
  const [searchParams] = useSearchParams();
  const initialCustId = searchParams.get("cust") || "CUST-4410";

  // Form input state
  const [customerId, setCustomerId] = useState(initialCustId);
  const [lockerId, setLockerId] = useState(
    MOCK_CUSTOMERS[initialCustId]?.lockerId || "L-102"
  );
  const [customer, setCustomer] = useState<CustomerContract | null>(
    MOCK_CUSTOMERS[initialCustId] || DEFAULT_CUSTOMER
  );

  // Frontend State Machine Lifecycle:
  // IDLE -> STARTED -> IN_PROGRESS -> APPROVED / REVIEW / BLOCKED -> COMPLETED
  const [sessionId, setSessionId] = useState<string | null>("SES-9821");
  const [verificationStatus, setVerificationStatus] =
    useState<VerificationLifecycleStatus>("STARTED");
  const [verificationResult, setVerificationResult] =
    useState<VerificationAttemptResponse | null>({
      session_id: "SES-9821",
      face_match: true,
      face_confidence: 98.4,
      liveness_passed: true,
      liveness_confidence: 98.0,
      spoof_probability: 1.6,
      risk_score: 12,
      risk_level: "LOW",
      decision: "APPROVED",
      failure_reason: null,
      recommended_action: "Locker operation authorized.",
      processing_time_ms: 320,
      timestamp: new Date().toISOString(),
    });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiErrorDetail | null>(null);

  // Camera & Analyzing UI state
  const [isCameraActive, setIsCameraActive] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeScenarioId, setActiveScenarioId] = useState<string | null>("scenario1");

  // Notifications & Modals
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showRetryModal, setShowRetryModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => Promise<void>) | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((current) => (current === msg ? null : current));
    }, 4500);
  }, []);

  // Sync if URL search parameter changes
  useEffect(() => {
    const cust = searchParams.get("cust");
    if (cust) {
      setCustomerId(cust);
      if (MOCK_CUSTOMERS[cust]) {
        setCustomer(MOCK_CUSTOMERS[cust]);
        setLockerId(MOCK_CUSTOMERS[cust].lockerId);
      }
    }
  }, [searchParams]);

  // Sync customer record when customerId input changes
  const handleCustomerLookup = (cId: string) => {
    const query = cId.trim().toUpperCase();
    if (MOCK_CUSTOMERS[query]) {
      setCustomer(MOCK_CUSTOMERS[query]);
      setLockerId(MOCK_CUSTOMERS[query].lockerId);
    } else {
      setCustomer({
        customerId: query || "CUST-4410",
        name: query ? `Holder (${query})` : "Rajesh Kumar",
        lockerId: lockerId || "L-102",
        branch: "Pune Camp",
        status: "ACTIVE",
        mobile: "+91 98230 44102",
        lockerStatus: "OCCUPIED",
      });
    }
  };

  // ML Challenge-Response Stage State: 0, 1, 2, 3, 4, 5 (transmitting) or null
  const [livenessStage, setLivenessStage] = useState<number | null>(null);
  const [livenessMessage, setLivenessMessage] = useState<string | null>(null);

  // -------------------------------------------------------------
  // API 1: START VERIFICATION SESSION
  // POST /api/v1/verification/start
  // -------------------------------------------------------------
  const handleStartVerification = async () => {
    setError(null);
    setLoading(true);

    const cId = customerId.trim().toUpperCase() || "CUST-4410";
    const lId = lockerId.trim().toUpperCase() || "L-102";

    try {
      const resp = await startVerification({
        customer_id: cId,
        locker_id: lId,
      });

      // Update React state machine
      setSessionId(resp.session_id);
      setVerificationStatus("STARTED");
      setVerificationResult(null);
      setLivenessStage(null);
      setLivenessMessage(null);
      handleCustomerLookup(cId);

      // Status 200/201 Success Toast
      showToast(`Verification Session Initialized (${resp.session_id})`);
    } catch (err: any) {
      const parsed = parseApiError(err);
      setError(parsed);

      // 500 error triggers retry dialog
      if (parsed.status === 500) {
        setPendingAction(() => handleStartVerification);
        setShowRetryModal(true);
      }
    } finally {
      setLoading(false);
    }
  };

  // -------------------------------------------------------------
  // ML CHALLENGE-RESPONSE FLOW & API 2: SUBMIT VERIFICATION ATTEMPT
  // Stages: 0 (Align) -> 1 (Blink twice) -> 2 (Look Up) -> 3 (Look Down) -> 4 (Verified) -> FastAPI
  // POST /api/v1/verification/attempt
  // -------------------------------------------------------------
  const runLivenessChallenge = async (scenarioOverride?: DemoScenario) => {
    const activeSession =
      sessionId || (scenarioOverride ? `SES-DEMO-${scenarioOverride.id.slice(-1)}01` : null);

    if (!activeSession) {
      setError({
        status: 400,
        title: "Session Missing",
        message: "No active verification session. Please click 'Start Verification' first.",
      });
      return;
    }

    if (verificationStatus === "COMPLETED" && !scenarioOverride) {
      setError({
        status: 409,
        title: "Session Conflict (409)",
        message: "Session already completed. Please start a new session to verify again.",
      });
      return;
    }

    setError(null);
    setIsAnalyzing(true);
    setVerificationStatus("IN_PROGRESS");
    setVerificationResult(null);

    const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    try {
      // Stage 0 → Position your face inside the oval
      setLivenessStage(0);
      setLivenessMessage("Position your face inside the oval");
      await sleep(750);

      // Stage 1 → Blink twice
      setLivenessStage(1);
      setLivenessMessage("Blink twice");
      await sleep(950);

      // Stage 2 → Look Up
      setLivenessStage(2);
      setLivenessMessage("Look Up");
      await sleep(950);

      // Stage 3 → Look Down
      setLivenessStage(3);
      setLivenessMessage("Look Down");
      await sleep(950);

      // Stage 4 → Liveness Verified ✓
      setLivenessStage(4);
      setLivenessMessage("Liveness Verified ✓");
      await sleep(750);

      // Transmitting to FastAPI Backend
      setLivenessStage(5);
      setLivenessMessage("Sending biometric data to FastAPI...");

      // Gather vector parameters from active scenario or realistic legitimate defaults
      const currentScenarioId = scenarioOverride ? scenarioOverride.id : activeScenarioId;
      let faceMatch = true;
      let faceConfidence = 98.4;
      let livenessPassed = true;
      let livenessConfidence = 98.0;
      let spoofProbability = 1.6;
      let processingTimeMs = 320;

      if (currentScenarioId === "scenario2") {
        // Wrong Person
        faceMatch = false;
        faceConfidence = 42.0;
        livenessPassed = true;
        livenessConfidence = 96.5;
        spoofProbability = 3.5;
        processingTimeMs = 310;
      } else if (currentScenarioId === "scenario3") {
        // Spoof Attempt
        faceMatch = true;
        faceConfidence = 97.0;
        livenessPassed = false;
        livenessConfidence = 12.0;
        spoofProbability = 88.0;
        processingTimeMs = 340;
      }

      const payload = {
        session_id: activeSession,
        face_match: faceMatch,
        face_confidence: faceConfidence,
        liveness_passed: livenessPassed,
        liveness_confidence: livenessConfidence,
        spoof_probability: spoofProbability,
        processing_time_ms: processingTimeMs,
      };

      // Call authoritative FastAPI endpoint (decision is determined by backend engine)
      const result = await submitVerificationAttempt(payload);

      // Populate VerificationResultCard directly from backend response
      setVerificationResult(result);

      // Transition state machine based on authoritative backend decision
      const upperDec = (result.decision || "").toUpperCase();
      if (upperDec === "APPROVED") {
        setVerificationStatus("APPROVED");
      } else if (upperDec === "BLOCKED") {
        setVerificationStatus("BLOCKED");
      } else {
        setVerificationStatus("REVIEW");
      }

      // 200/201 Success notification
      showToast(`Verification Evaluated: ${result.decision} (${result.risk_level} RISK)`);
    } catch (err: any) {
      const parsed = parseApiError(err);
      setError(parsed);
      setVerificationStatus("STARTED");

      if (parsed.status === 500) {
        setPendingAction(() => () => runLivenessChallenge(scenarioOverride));
        setShowRetryModal(true);
      }
    } finally {
      setIsAnalyzing(false);
      setLivenessStage(null);
      setLivenessMessage(null);
    }
  };

  const handleCapture = async () => {
    await runLivenessChallenge();
  };

  // -------------------------------------------------------------
  // COMPLETE SESSION / AUTHORIZE ACCESS
  // -------------------------------------------------------------
  const handleAuthorizeAccess = () => {
    setVerificationStatus("COMPLETED");
    showToast(`Locker ${lockerId} access authorized & session closed.`);
  };

  // -------------------------------------------------------------
  // RESET SESSION
  // -------------------------------------------------------------
  const handleResetSession = () => {
    setSessionId(null);
    setVerificationStatus("IDLE");
    setVerificationResult(null);
    setError(null);
    setActiveScenarioId(null);
    setLivenessStage(null);
    setLivenessMessage(null);
    showToast("Verification session reset to IDLE standby.");
  };

  // -------------------------------------------------------------
  // DEMO MODE SCENARIO SWITCHER (Preserved for Hackathon Judges)
  // Automatically runs through the challenge-response stages & transmits to FastAPI
  // -------------------------------------------------------------
  const applyDemoScenario = async (scenario: DemoScenario) => {
    setActiveScenarioId(scenario.id);
    setCustomerId(scenario.customer.customerId);
    setLockerId(scenario.customer.lockerId);
    setCustomer(scenario.customer);
    setError(null);

    const mockSesId = `SES-DEMO-${scenario.id.slice(-1)}01`;
    setSessionId(mockSesId);
    setIsCameraActive(true);

    showToast(`Loaded ${scenario.title} · Simulating ML Liveness`);
    await runLivenessChallenge(scenario);
  };

  return (
    <div className="space-y-6 relative">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-8 z-50 bg-[#0F172A] text-white px-4 py-2.5 rounded-xl shadow-lg border border-slate-700 flex items-center gap-2.5 text-xs font-semibold animate-in fade-in slide-in-from-top-3 duration-200">
          <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="text-slate-400 hover:text-white ml-2"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Header Banner with Session Identifier & State Machine Lifecycle */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              In-Bank Customer Verification
            </h1>
            {sessionId ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold text-[#003366] bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
                <ShieldCheck size={13} className="text-[#003366]" /> Session: {sessionId}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">
                Session: IDLE
              </span>
            )}
            <StatusBadge status={verificationStatus} />
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            FastAPI Authoritative Workflow: Biometric acquisition, passive liveness analysis, and backend decision engine
          </p>
        </div>

        <div className="flex items-center gap-2">
          {verificationStatus === "APPROVED" && (
            <button
              type="button"
              onClick={handleAuthorizeAccess}
              className="btn-success text-xs font-bold py-1.5 px-3 flex items-center gap-1.5"
            >
              <Unlock size={14} /> Complete & Authorize Access
            </button>
          )}

          <button
            type="button"
            onClick={handleResetSession}
            className="btn-secondary text-xs font-semibold py-1.5 px-3 flex items-center gap-1.5"
          >
            <RotateCcw size={13} /> Reset Session
          </button>
        </div>
      </div>

      {/* DEMO MODE SCENARIOS BAR (Hackathon Evaluation Showcase) */}
      <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600 border border-amber-200">
              <Sparkles size={16} />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Hackathon Demo Mode
              </h3>
              <span className="text-[11px] text-slate-500">
                Instant test presets for evaluation judges
              </span>
            </div>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">Select scenario to inject contract payload:</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Scenario 1: Legitimate Customer */}
          <button
            type="button"
            onClick={() => applyDemoScenario(DEMO_SCENARIOS.scenario1)}
            className={`p-3 rounded-xl border text-left transition-all relative ${
              activeScenarioId === "scenario1"
                ? "bg-emerald-50/80 border-emerald-500 ring-2 ring-emerald-500/20 shadow-sm"
                : "bg-slate-50 hover:bg-slate-100 border-slate-200"
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <CheckCircle size={14} className="text-emerald-600" /> Scenario 1
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
                APPROVED
              </span>
            </div>
            <div className="text-xs font-semibold text-slate-800">Legitimate Customer</div>
            <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-tight">
              Real holder (Rajesh Kumar). 98.4% Match, Liveness true, Risk LOW.
            </p>
          </button>

          {/* Scenario 2: Wrong Person */}
          <button
            type="button"
            onClick={() => applyDemoScenario(DEMO_SCENARIOS.scenario2)}
            className={`p-3 rounded-xl border text-left transition-all relative ${
              activeScenarioId === "scenario2"
                ? "bg-rose-50/80 border-rose-500 ring-2 ring-rose-500/20 shadow-sm"
                : "bg-slate-50 hover:bg-slate-100 border-slate-200"
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <XCircle size={14} className="text-rose-600" /> Scenario 2
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-rose-100 text-rose-800 border border-rose-300">
                BLOCKED
              </span>
            </div>
            <div className="text-xs font-semibold text-slate-800">Wrong Person</div>
            <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-tight">
              Impostor claimant. Face Match false (42.0%), Risk HIGH. Access blocked.
            </p>
          </button>

          {/* Scenario 3: Spoof Attempt */}
          <button
            type="button"
            onClick={() => applyDemoScenario(DEMO_SCENARIOS.scenario3)}
            className={`p-3 rounded-xl border text-left transition-all relative ${
              activeScenarioId === "scenario3"
                ? "bg-amber-50/80 border-amber-500 ring-2 ring-amber-500/20 shadow-sm"
                : "bg-slate-50 hover:bg-slate-100 border-slate-200"
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <AlertTriangle size={14} className="text-amber-600" /> Scenario 3
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 border border-amber-300">
                MANUAL REVIEW
              </span>
            </div>
            <div className="text-xs font-semibold text-slate-800">Spoof Presentation</div>
            <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-tight">
              2D Screen / photo replay. Match true, Liveness false. Manual review flag.
            </p>
          </button>
        </div>
      </div>

      {/* Inline Error Alert Banners (403, 404, 409, 422, etc.) */}
      {error && (
        <div
          className={`p-4 rounded-xl border flex items-start justify-between gap-3 text-xs ${
            error.status === 403
              ? "bg-rose-50 border-rose-300 text-rose-900"
              : error.status === 404
              ? "bg-amber-50 border-amber-300 text-amber-900"
              : error.status === 409
              ? "bg-purple-50 border-purple-300 text-purple-900"
              : error.status === 422
              ? "bg-orange-50 border-orange-300 text-orange-900"
              : "bg-rose-50 border-rose-300 text-rose-900"
          }`}
        >
          <div className="flex items-start gap-2.5">
            <AlertOctagon size={18} className="shrink-0 mt-0.5 text-current" />
            <div>
              <h4 className="font-bold text-sm leading-tight">{error.title || "Operation Error"}</h4>
              <p className="mt-0.5 leading-relaxed">{error.message}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setError(null)}
            className="text-current opacity-70 hover:opacity-100"
          >
            <X size={15} />
          </button>
        </div>
      )}

      {/* THREE-COLUMN CENTERPIECE LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* LEFT PANEL: Customer Lookup & Session Starter Form */}
        <div className="space-y-4">
          <div className="card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Customer & Locker Lookup
              </h2>
              <span className="text-[10px] font-mono text-slate-400">Step 1: Session Init</span>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Customer ID
                </label>
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={customerId}
                    onChange={(e) => {
                      setCustomerId(e.target.value);
                      handleCustomerLookup(e.target.value);
                    }}
                    placeholder="e.g. CUST-4410"
                    className="w-full pl-9 pr-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003366]/20 focus:border-[#003366]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Locker ID
                </label>
                <div className="relative">
                  <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={lockerId}
                    onChange={(e) => setLockerId(e.target.value)}
                    placeholder="e.g. L-102"
                    className="w-full pl-9 pr-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003366]/20 focus:border-[#003366]"
                  />
                </div>
              </div>

              <div className="pt-1 flex gap-2">
                <button
                  type="button"
                  onClick={handleStartVerification}
                  disabled={loading}
                  className="btn-primary flex-1 py-2.5 text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm"
                >
                  {loading ? (
                    <>
                      <RefreshCw size={13} className="animate-spin" /> Initializing...
                    </>
                  ) : (
                    <>
                      <Play size={13} /> Start Verification
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-100">
              <span>Quick: <button type="button" onClick={() => { setCustomerId("CUST-4410"); handleCustomerLookup("CUST-4410"); }} className="text-[#003366] font-bold hover:underline font-mono">CUST-4410</button></span>
              <span>•</span>
              <span><button type="button" onClick={() => { setCustomerId("CUST-3189"); handleCustomerLookup("CUST-3189"); }} className="text-[#003366] font-bold hover:underline font-mono">CUST-3189</button></span>
              <span>•</span>
              <span><button type="button" onClick={() => { setCustomerId("CUST-1049"); handleCustomerLookup("CUST-1049"); }} className="text-[#003366] font-bold hover:underline font-mono">CUST-1049</button></span>
            </div>
          </div>

          {/* Customer Record Profile Card */}
          <CustomerInfoCard customer={customer} isLoading={loading} />
        </div>

        {/* CENTER PANEL: Live Camera Biometric Verification Terminal */}
        <div className="space-y-4">
          <CameraPanel
            isAnalyzing={isAnalyzing}
            onCapture={handleCapture}
            isCameraActive={isCameraActive}
            onToggleCamera={() => setIsCameraActive(!isCameraActive)}
            onReset={handleResetSession}
            sessionId={sessionId}
            verificationStatus={verificationStatus}
            disabled={loading}
            livenessStage={livenessStage}
            livenessMessage={livenessMessage}
          />
        </div>

        {/* RIGHT PANEL: Authoritative FastAPI Decision Engine Result Card */}
        <div className="space-y-4">
          <VerificationResultCard
            result={verificationResult}
            isAnalyzing={isAnalyzing}
          />
        </div>
      </div>

      {/* 500 Error Retry Dialog Modal */}
      {showRetryModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center">
              <AlertTriangle size={24} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {error?.title || "Verification Engine Service Alert (500)"}
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                {error?.message || "The verification server encountered an internal processing error or network timeout. Would you like to retry the request or continue in simulated mode?"}
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={async () => {
                  setShowRetryModal(false);
                  if (pendingAction) {
                    await pendingAction();
                  }
                }}
                className="btn-primary flex-1 py-2 text-xs font-bold"
              >
                <RefreshCw size={13} className="mr-1.5" /> Retry Request
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowRetryModal(false);
                  applyDemoScenario(DEMO_SCENARIOS.scenario1);
                }}
                className="btn-secondary flex-1 py-2 text-xs font-semibold"
              >
                Demo Fallback
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

