import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api, apiErrorMessage } from "../services/api";
import { LockerRequest, AuditEvent, Locker } from "../types";
import { StatusBadge } from "../components/StatusBadge";
import { CheckCircle2, Circle, ShieldCheck, Loader2 } from "lucide-react";

export function RequestDetailPage() {
  const { requestId } = useParams<{ requestId: string }>();
  const navigate = useNavigate();
  const [req, setReq] = useState<LockerRequest | null>(null);
  const [locker, setLocker] = useState<Locker | null>(null);
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [tokens, setTokens] = useState<{ demo_customer_token: string; demo_bank_token: string; expires_at: string } | null>(null);
  const [customerInput, setCustomerInput] = useState("");
  const [bankInput, setBankInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [showReject, setShowReject] = useState(false);

  const load = useCallback(async () => {
    if (!requestId) return;
    const r = await api.get(`/api/v1/requests/${requestId}`);
    setReq(r.data.data);
    const l = await api.get("/api/v1/admin/lockers", { params: { search: "" } });
    setLocker(l.data.data.find((x: Locker) => x.id === r.data.data.locker_id) || null);
    const a = await api.get(`/api/v1/audit/timeline/${r.data.data.correlation_id}`);
    setEvents(a.data.data);
  }, [requestId]);

  useEffect(() => { load(); }, [load]);

  async function handleGenerate() {
    setError(null); setBusy(true);
    try {
      const resp = await api.post(`/api/v1/verification/${requestId}/generate`);
      setTokens(resp.data.data);
      await load();
    } catch (err) { setError(apiErrorMessage(err)); }
    finally { setBusy(false); }
  }

  async function handleVerifyCustomer() {
    setError(null); setBusy(true);
    try {
      await api.post(`/api/v1/verification/${requestId}/verify/customer`, { token: customerInput });
      await load();
    } catch (err) { setError(apiErrorMessage(err)); }
    finally { setBusy(false); }
  }

  async function handleVerifyBank() {
    setError(null); setBusy(true);
    try {
      await api.post(`/api/v1/verification/${requestId}/verify/bank`, { token: bankInput });
      await load();
    } catch (err) { setError(apiErrorMessage(err)); }
    finally { setBusy(false); }
  }

  async function handleStart() {
    setBusy(true);
    try { await api.post(`/api/v1/admin/requests/${requestId}/start`); await load(); }
    catch (err) { setError(apiErrorMessage(err)); }
    finally { setBusy(false); }
  }

  async function handleComplete() {
    setBusy(true);
    try { await api.post(`/api/v1/admin/requests/${requestId}/complete`); await load(); }
    catch (err) { setError(apiErrorMessage(err)); }
    finally { setBusy(false); }
  }

  async function handleReject() {
    setBusy(true);
    try {
      await api.post(`/api/v1/admin/requests/${requestId}/reject`, { reason: rejectReason || "Rejected by bank operator" });
      setShowReject(false);
      await load();
    } catch (err) { setError(apiErrorMessage(err)); }
    finally { setBusy(false); }
  }

  if (!req) return <div className="text-sm text-slate-400">Loading request…</div>;

  const customerVerified = ["TOKEN_A_VERIFIED", "TOKEN_B_VERIFIED", "APPROVED", "ACCESS_ACTIVE", "COMPLETED"].includes(req.status);
  const bankVerified = ["TOKEN_B_VERIFIED", "APPROVED", "ACCESS_ACTIVE", "COMPLETED"].includes(req.status);
  const accessAuthorized = ["APPROVED", "ACCESS_ACTIVE", "COMPLETED"].includes(req.status);

  return (
    <div className="space-y-6">
      <button onClick={() => navigate(-1)} className="text-xs text-slate-500 hover:text-primary">← Back</button>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-primary">Request {req.id.slice(0, 8)}</h1>
          <p className="text-sm text-slate-500">Locker {locker?.locker_number || "…"} · {req.request_type}</p>
        </div>
        <StatusBadge status={req.status} />
      </div>

      {error && <div className="text-danger text-sm bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Dual control verification panel */}
        <div className="lg:col-span-2 card p-6">
          <div className="flex items-center gap-2 mb-4">
            <ShieldCheck size={18} className="text-primary" />
            <h2 className="font-semibold text-primary">Dual Control Verification</h2>
          </div>

          {req.status === "SUBMITTED" && (
            <button onClick={handleGenerate} disabled={busy} className="btn-primary">
              {busy ? <Loader2 className="animate-spin" size={14} /> : "Generate Verification Tokens"}
            </button>
          )}

          {tokens && (
            <div className="mb-4 text-xs bg-amber-50 border border-amber-200 rounded-md p-3 space-y-1">
              <div className="font-semibold text-amber-800">Demo tokens (simulating out-of-band delivery):</div>
              <div>Customer token: <span className="font-mono font-bold">{tokens.demo_customer_token}</span></div>
              <div>Bank token: <span className="font-mono font-bold">{tokens.demo_bank_token}</span></div>
              <div className="text-amber-600">Expires {new Date(tokens.expires_at).toLocaleTimeString()}</div>
            </div>
          )}

          {req.status !== "SUBMITTED" && (
            <div className="space-y-5">
              <VerificationStep
                title="Customer Verification"
                verified={customerVerified}
                inputValue={customerInput}
                onChange={setCustomerInput}
                onVerify={handleVerifyCustomer}
                disabled={customerVerified || req.status !== "VERIFICATION_PENDING" || busy}
              />
              <VerificationStep
                title="Bank Authorization"
                verified={bankVerified}
                inputValue={bankInput}
                onChange={setBankInput}
                onVerify={handleVerifyBank}
                disabled={bankVerified || req.status !== "TOKEN_A_VERIFIED" || busy}
              />

              <div className="border-t border-border pt-4">
                {accessAuthorized ? (
                  <div className="flex items-center gap-2 text-success font-semibold">
                    <CheckCircle2 size={20} /> ACCESS AUTHORIZED
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-slate-400 text-sm">
                    <Circle size={18} /> Awaiting dual verification
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex gap-2 mt-6 pt-4 border-t border-border">
            {req.status === "APPROVED" && (
              <button onClick={handleStart} disabled={busy} className="btn-success">Start Operation</button>
            )}
            {req.status === "ACCESS_ACTIVE" && (
              <button onClick={handleComplete} disabled={busy} className="btn-success">Complete Operation</button>
            )}
            {["SUBMITTED", "VERIFICATION_PENDING"].includes(req.status) && (
              <button onClick={() => setShowReject(true)} disabled={busy} className="btn-danger">Reject</button>
            )}
          </div>

          {showReject && (
            <div className="mt-4 space-y-2">
              <textarea
                value={rejectReason} onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Reason for rejection..."
                className="w-full text-sm border border-border rounded-md px-3 py-2"
                rows={2}
              />
              <div className="flex gap-2">
                <button onClick={handleReject} disabled={busy} className="btn-danger">Confirm Reject</button>
                <button onClick={() => setShowReject(false)} className="btn-secondary">Cancel</button>
              </div>
            </div>
          )}
        </div>

        {/* Audit timeline */}
        <div className="card p-6">
          <h2 className="font-semibold text-primary mb-4 text-sm">Audit Timeline</h2>
          <ol className="space-y-4 border-l border-border pl-4">
            {events.map((e) => (
              <li key={e.id} className="relative">
                <span className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-primary" />
                <div className="text-xs text-slate-400">{new Date(e.created_at).toLocaleTimeString()}</div>
                <div className="text-sm text-primary font-medium">{e.action.replace(/_/g, " ")}</div>
                {e.previous_state && e.new_state && (
                  <div className="text-xs text-slate-500">{e.previous_state} → {e.new_state}</div>
                )}
              </li>
            ))}
            {events.length === 0 && <li className="text-xs text-slate-400">No events yet.</li>}
          </ol>
        </div>
      </div>
    </div>
  );
}

function VerificationStep({
  title, verified, inputValue, onChange, onVerify, disabled,
}: {
  title: string; verified: boolean; inputValue: string;
  onChange: (v: string) => void; onVerify: () => void; disabled: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-2">
        {verified ? <CheckCircle2 className="text-success" size={20} /> : <Circle className="text-slate-300" size={20} />}
        <span className={`text-sm font-medium ${verified ? "text-success" : "text-primary"}`}>{title}</span>
        {verified && <span className="text-xs text-success">VERIFIED</span>}
      </div>
      {!verified && (
        <div className="flex gap-2">
          <input
            value={inputValue} onChange={(e) => onChange(e.target.value)} placeholder="6-digit token"
            maxLength={6}
            className="w-28 text-sm border border-border rounded-md px-2 py-1 font-mono"
          />
          <button onClick={onVerify} disabled={disabled} className="btn-secondary text-xs">Verify</button>
        </div>
      )}
    </div>
  );
}
