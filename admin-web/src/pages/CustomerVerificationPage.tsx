import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { CustomerInfoCard } from "../components/CustomerInfoCard";
import { CameraPanel } from "../components/CameraPanel";
import { VerificationResultCard } from "../components/VerificationResultCard";
import {
  MOCK_CUSTOMERS,
  DEFAULT_CUSTOMER,
  DEMO_SCENARIOS,
  DemoScenario,
} from "../services/mockData";
import { CustomerContract, AIResultContract, DecisionEngineContract } from "../types";
import {
  Search,
  ScanFace,
  Sparkles,
  ShieldCheck,
  RotateCcw,
  CheckCircle,
  AlertTriangle,
  XCircle,
  ArrowRight,
  Info,
} from "lucide-react";

export function CustomerVerificationPage() {
  const [searchParams] = useSearchParams();
  const initialCustId = searchParams.get("cust") || "CUST-4410";

  const [searchId, setSearchId] = useState(initialCustId);
  const [customer, setCustomer] = useState<CustomerContract | null>(
    MOCK_CUSTOMERS[initialCustId] || DEFAULT_CUSTOMER
  );
  const [isSearching, setIsSearching] = useState(false);

  // Camera & Verification State
  const [isCameraActive, setIsCameraActive] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeScenarioId, setActiveScenarioId] = useState<string | null>("scenario1");

  // AI & Decision States (initialized with Legitimate Customer scenario)
  const [aiResult, setAiResult] = useState<AIResultContract | null>(
    DEMO_SCENARIOS.scenario1.aiResult
  );
  const [decisionEngine, setDecisionEngine] = useState<DecisionEngineContract | null>(
    DEMO_SCENARIOS.scenario1.decisionEngine
  );

  // Sync if URL param changes
  useEffect(() => {
    const custId = searchParams.get("cust");
    if (custId && MOCK_CUSTOMERS[custId]) {
      setSearchId(custId);
      setCustomer(MOCK_CUSTOMERS[custId]);
    }
  }, [searchParams]);

  // Handle Customer Lookup Search
  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = searchId.trim().toUpperCase();
    setIsSearching(true);

    setTimeout(() => {
      if (MOCK_CUSTOMERS[query]) {
        setCustomer(MOCK_CUSTOMERS[query]);
      } else {
        // Fallback realistic record for any searched ID
        setCustomer({
          customerId: query || "CUST-4410",
          name: query === "CUST-4410" ? "Rajesh Kumar" : `Account Holder (${query})`,
          lockerId: "L-102",
          branch: "Pune Camp",
          status: "ACTIVE",
          mobile: "+91 98230 44102",
          lockerStatus: "OCCUPIED",
        });
      }
      setIsSearching(false);
    }, 250);
  };

  // Trigger simulated camera scan
  const handleCapture = () => {
    setIsAnalyzing(true);
    setTimeout(() => {
      // Apply current active scenario or default legitimate
      const current = activeScenarioId
        ? DEMO_SCENARIOS[activeScenarioId]
        : DEMO_SCENARIOS.scenario1;
      setAiResult(current.aiResult);
      setDecisionEngine(current.decisionEngine);
      setIsAnalyzing(false);
    }, 1600);
  };

  // Handle Demo Mode Scenarios (Instant or Simulated)
  const applyDemoScenario = (scenario: DemoScenario) => {
    setActiveScenarioId(scenario.id);
    setCustomer(scenario.customer);
    setSearchId(scenario.customer.customerId);
    setAiResult(scenario.aiResult);
    setDecisionEngine(scenario.decisionEngine);
    setIsCameraActive(true);
  };

  const handleResetSession = () => {
    setAiResult(null);
    setDecisionEngine(null);
    setActiveScenarioId(null);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner with Session Identifier */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              In-Bank Customer Verification
            </h1>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#003366] bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
              Terminal SES-9821
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Step 3-9: Biometric acquisition, passive liveness analysis, and backend authorization engine
          </p>
        </div>

        <button
          type="button"
          onClick={handleResetSession}
          className="btn-secondary text-xs font-semibold py-1.5 px-3 flex items-center gap-1.5 self-start md:self-auto"
        >
          <RotateCcw size={13} /> Reset Verification Session
        </button>
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

      {/* THREE-COLUMN CENTERPIECE LAYOUT (Prompt Specification) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* LEFT PANEL: Customer Lookup & Info */}
        <div className="space-y-4">
          <div className="card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Customer Lookup
              </h2>
              <span className="text-[10px] font-mono text-slate-400">Step 3-4</span>
            </div>

            <form onSubmit={handleSearch} className="space-y-2">
              <label className="block text-xs font-medium text-slate-600">
                Customer ID
              </label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchId}
                    onChange={(e) => setSearchId(e.target.value)}
                    placeholder="e.g. CUST-4410"
                    className="w-full pl-9 pr-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003366]/20 focus:border-[#003366]"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSearching}
                  className="btn-primary py-2 px-3 text-xs"
                >
                  {isSearching ? "Searching..." : "Search"}
                </button>
              </div>
            </form>

            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
              <span>Try: <button type="button" onClick={() => { setSearchId("CUST-4410"); handleSearch(); }} className="text-[#003366] font-bold hover:underline font-mono">CUST-4410</button></span>
              <span>or <button type="button" onClick={() => { setSearchId("CUST-3189"); handleSearch(); }} className="text-[#003366] font-bold hover:underline font-mono">CUST-3189</button></span>
            </div>
          </div>

          {/* Customer Record Card */}
          <CustomerInfoCard customer={customer} isLoading={isSearching} />
        </div>

        {/* CENTER PANEL: Live Camera Biometric Verification */}
        <div className="space-y-4">
          <CameraPanel
            isAnalyzing={isAnalyzing}
            onCapture={handleCapture}
            isCameraActive={isCameraActive}
            onToggleCamera={() => setIsCameraActive(!isCameraActive)}
            onReset={handleResetSession}
          />
        </div>

        {/* RIGHT PANEL: Verification Result & Decision Engine */}
        <div className="space-y-4">
          <VerificationResultCard
            aiResult={aiResult}
            decisionEngine={decisionEngine}
            isAnalyzing={isAnalyzing}
          />
        </div>
      </div>
    </div>
  );
}
