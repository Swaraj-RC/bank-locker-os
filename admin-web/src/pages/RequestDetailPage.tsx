import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api, apiErrorMessage } from "../services/api";
import { LockerRequest, AuditEvent, Locker, FaceVerification } from "../types";
import { StatusBadge } from "../components/StatusBadge";
import { FaceVerificationPanel } from "../components/FaceVerificationPanel";
import { CheckCircle2, ShieldCheck, AlertTriangle, UserCheck, Lock, Unlock, ArrowLeft } from "lucide-react";

const MAX_FACE_ATTEMPTS = 100;

export function RequestDetailPage() {
  const { requestId } = useParams<{ requestId: string }>();
  const navigate = useNavigate();
  const [req, setReq] = useState<LockerRequest | null>(null);
  const [locker, setLocker] = useState<Locker | null>(null);
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [showReject, setShowReject] = useState(false);

  const load = useCallback(async () => {
    if (!requestId) return;
    try {
      const r = await api.get(`/api/v1/requests/${requestId}`);
      setReq(r.data.data);
      const l = await api.get("/api/v1/admin/lockers", { params: { search: "" } });
      setLocker(l.data.data.find((x: Locker) => x.id === r.data.data.locker_id) || null);
      const a = await api.get(`/api/v1/audit/timeline/${r.data.data.correlation_id}`);
      setEvents(a.data.data);
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }, [requestId]);

  useEffect(() => {
    load();
  }, [load]);

  function handleFaceResult(_result: FaceVerification) {
    load();
  }

  async function handleStart() {
    setBusy(true);
    try {
      await api.post(`/api/v1/admin/requests/${requestId}/start`);
      await load();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleComplete() {
    setBusy(true);
    try {
      await api.post(`/api/v1/admin/requests/${requestId}/complete`);
      await load();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleApproveManual() {
    setBusy(true);
    try {
      await api.post(`/api/v1/admin/requests/${requestId}/approve`);
      await load();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleReject() {
    setBusy(true);
    try {
      await api.post(`/api/v1/admin/requests/${requestId}/reject`, {
        reason: rejectReason || "Rejected by bank operator",
      });
      setShowReject(false);
      await load();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleResetState() {
    setBusy(true);
    try {
      await api.post(`/api/v1/admin/requests/${requestId}/reset?target_state=SUBMITTED`);
      await load();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  if (!req) return <div className="text-sm text-slate-400 p-6">Loading request…</div>;

  const isAccessActive = req.status === "ACCESS_ACTIVE";
  const isApproved = req.status === "APPROVED";
  const isManualReview = req.status === "MANUAL_REVIEW";
  const isBlocked = req.status === "BLOCKED";
  const isCompleted = req.status === "COMPLETED";
  const isRejected = req.status === "REJECTED";

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-primary transition-colors"
        >
          <ArrowLeft size={14} /> Back to Requests
        </button>

        {req.status !== "SUBMITTED" && (
          <button
            onClick={handleResetState}
            disabled={busy}
            title="Reset request state back to SUBMITTED to test face verification again"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg border border-slate-300 transition-colors shadow-sm"
          >
            <span>↺ Reset to Previous State (SUBMITTED)</span>
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 bg-surface p-4 rounded-xl border border-border shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-primary">Locker Request {req.id.slice(0, 12)}</h1>
            <StatusBadge status={req.status} />
          </div>
          <p className="text-sm text-slate-500 mt-0.5">
            Locker: <span className="font-semibold text-primary font-mono">{locker?.locker_number || "L-001"}</span> · 
            Customer: <span className="font-semibold text-primary font-mono">{req.customer_id}</span> · 
            Type: <span className="font-medium text-slate-700">{req.request_type}</span>
          </p>
        </div>
        {req.status !== "SUBMITTED" && (
          <button
            onClick={handleResetState}
            disabled={busy}
            className="btn-secondary text-xs flex items-center gap-1.5"
          >
            <span>↺ Re-verify Face</span>
          </button>
        )}
      </div>

      {error && (
        <div className="text-danger text-sm bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: Face Verification & Access Controls */}
        <div className="lg:col-span-2 space-y-6">

          {/* ── Face Verification Panel ── */}
          {req.status === "SUBMITTED" && (
            <FaceVerificationPanel
              requestId={req.id}
              maxAttempts={MAX_FACE_ATTEMPTS}
              onResult={handleFaceResult}
            />
          )}

          {/* ── Access Active Banner ── */}
          {isAccessActive && (
            <div className="card p-6 border-emerald-300 bg-emerald-50/60 rounded-xl space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-emerald-500 text-white rounded-full shadow-sm">
                  <Unlock size={24} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-emerald-900">Locker Access Authorized &amp; Active</h3>
                  <p className="text-xs text-emerald-700">
                    Biometric face verification confirmed. Vault locker is currently unlocked for the customer.
                  </p>
                </div>
              </div>
              <div className="flex justify-end pt-2">
                <button
                  onClick={handleComplete}
                  disabled={busy}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg shadow transition-colors flex items-center gap-2"
                >
                  <CheckCircle2 size={16} /> Complete Locker Operation
                </button>
              </div>
            </div>
          )}

          {/* ── Approved Banner ── */}
          {isApproved && (
            <div className="card p-6 border-blue-200 bg-blue-50/60 rounded-xl space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-500 text-white rounded-full shadow-sm">
                  <ShieldCheck size={24} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-blue-900">Request Approved</h3>
                  <p className="text-xs text-blue-700">
                    Identity verified via Project NPN face recognition. Click below to begin customer session.
                  </p>
                </div>
              </div>
              <div className="flex justify-end pt-2">
                <button
                  onClick={handleStart}
                  disabled={busy}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow transition-colors flex items-center gap-2"
                >
                  <Unlock size={16} /> Start Locker Operation
                </button>
              </div>
            </div>
          )}

          {/* ── Completed Banner ── */}
          {isCompleted && (
            <div className="card p-5 border-slate-200 bg-slate-50 rounded-xl flex items-center gap-3">
              <CheckCircle2 size={24} className="text-emerald-600 shrink-0" />
              <div>
                <h3 className="text-sm font-bold text-slate-800">Locker Session Completed</h3>
                <p className="text-xs text-slate-500">
                  Locker was locked and customer operation was successfully logged to audit records.
                </p>
              </div>
            </div>
          )}

          {/* ── Manual Review Required ── */}
          {isManualReview && (
            <div className="card p-5 border-orange-200 bg-orange-50 rounded-xl space-y-3">
              <div className="flex items-start gap-3">
                <AlertTriangle size={20} className="text-orange-600 shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-bold text-orange-900">Manual Review Required</h3>
                  <p className="text-xs text-orange-700 mt-0.5">
                    Face matched but confidence or liveness was below automated threshold. Operator / Manager approval is required.
                  </p>
                </div>
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <button onClick={handleApproveManual} disabled={busy} className="btn-success text-xs">
                  Approve (Manual Override)
                </button>
                <button onClick={() => setShowReject(true)} disabled={busy} className="btn-danger text-xs">
                  Reject
                </button>
              </div>
            </div>
          )}

          {/* ── Blocked ── */}
          {isBlocked && (
            <div className="card p-5 border-red-200 bg-red-50 rounded-xl flex items-start gap-3">
              <AlertTriangle size={20} className="text-red-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-bold text-red-900">Request Blocked</h3>
                <p className="text-xs text-red-700 mt-0.5">
                  Face verification attempts exceeded maximum threshold with mismatch. Request is permanently blocked.
                </p>
              </div>
            </div>
          )}

          {/* ── Rejection dialog ── */}
          {showReject && (
            <div className="card p-4 space-y-2 border-red-200 bg-red-50/50">
              <p className="text-xs font-semibold text-red-900">Reason for rejection:</p>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Enter rejection reason..."
                className="w-full text-sm border border-border rounded-md px-3 py-2"
                rows={2}
              />
              <div className="flex gap-2 justify-end">
                <button onClick={handleReject} disabled={busy} className="btn-danger text-xs">
                  Confirm Reject
                </button>
                <button onClick={() => setShowReject(false)} className="btn-secondary text-xs">
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* ── Customer Details Card ── */}
          <div className="card p-5 space-y-3">
            <div className="flex items-center gap-2">
              <UserCheck size={16} className="text-primary" />
              <h3 className="font-semibold text-primary text-sm">Verified Customer Profile</h3>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-50 p-2.5 rounded-lg border border-border">
                <span className="text-slate-400 block mb-0.5">Customer ID:</span>
                <span className="font-semibold font-mono text-primary">{req.customer_id}</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-lg border border-border">
                <span className="text-slate-400 block mb-0.5">Assigned Locker:</span>
                <span className="font-semibold font-mono text-primary">{locker?.locker_number || "L-001"}</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-lg border border-border">
                <span className="text-slate-400 block mb-0.5">Biometric Profile:</span>
                <span className="font-semibold text-emerald-600">✅ Project NPN Embedding</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-lg border border-border">
                <span className="text-slate-400 block mb-0.5">Verification Mode:</span>
                <span className="font-semibold text-primary">Webcam Facial Recognition</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right column: Chronological Audit Timeline */}
        <div className="card p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h2 className="font-bold text-primary text-sm">Live Audit Timeline</h2>
            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono">
              {events.length} event{events.length !== 1 ? "s" : ""}
            </span>
          </div>

          <ol className="space-y-4 border-l-2 border-primary/20 pl-4 text-xs">
            {events.map((e) => (
              <li key={e.id} className="relative group">
                <span className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-primary ring-4 ring-white" />
                <div className="text-[11px] text-slate-400">{new Date(e.created_at).toLocaleTimeString()}</div>
                <div className="text-xs font-semibold text-primary mt-0.5">{e.action.replace(/_/g, " ")}</div>
                {e.previous_state && e.new_state && (
                  <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                    {e.previous_state} → <span className="text-primary font-semibold">{e.new_state}</span>
                  </div>
                )}
                {e.event_metadata && Object.keys(e.event_metadata).length > 0 && (
                  <div className="mt-1 bg-slate-50 p-1.5 rounded border border-border text-[11px] text-slate-600 font-mono">
                    {JSON.stringify(e.event_metadata)}
                  </div>
                )}
              </li>
            ))}
            {events.length === 0 && <li className="text-slate-400">No audit events recorded yet.</li>}
          </ol>
        </div>
      </div>
    </div>
  );
}
