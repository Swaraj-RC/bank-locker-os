# Staff-Side Face Verification

## Overview

Face verification is a **staff-only** step that runs **before** dual-token generation for
every locker access request. A bank operator captures the customer's face via their
workstation webcam, the signal is evaluated by the AI module, and the result is fed into
the decision engine at bank-token verification time.

The customer-facing Expo app is **not involved**. No face verification happens in the
customer flow.

```
SUBMITTED  ──► face-verify (staff) ──► generate tokens ──► customer token ──► bank token
                     │                                                             │
               [face_match=True                                            decision engine
                required to                                                     │
                unblock generate]                                     ┌─────────┴────────────┐
                                                              face_match    confidence/liveness    no_match
                                                             + liveness          marginal      face_match=False
                                                             + confidence           │               │
                                                                  │          MANUAL_REVIEW       REJECTED /
                                                              APPROVED               │             BLOCKED
                                                                  │           human override          │
                                                             ACCESS_ACTIVE     ──────►          (terminal)
```

---

## Architectural Rules

1. **Backend is the sole decision-maker.** The face-recognition module returns raw signals
   (`face_match`, `confidence`, `liveness_passed`, `spoof_probability`). It never decides
   APPROVED / BLOCKED itself.

2. **State transitions go through `state_machine.py` only.** `face_verification_service`
   records a row; the decision engine in `decision_service.evaluate_and_finalize` performs
   the transition.

3. **All actions are audited** via the existing `audit_service.record_event`. Face events:
   `FACE_VERIFICATION_ATTEMPTED`, `FACE_VERIFICATION_SUCCEEDED`, `FACE_VERIFICATION_FAILED`,
   `FACE_VERIFICATION_AI_ERROR`.

4. **Generate-tokens gate**: `face_verification_passed(db, request_id)` requires
   `face_match=True` on the latest `face_verifications` row. Confidence/liveness thresholds
   are the exclusive responsibility of the decision engine at bank-token time.

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `AI_MODE` | `mock` | `mock` = canned results, `real` = real ML inference |
| `FACE_VERIFICATION_REQUIRED` | `true` | Set `false` to bypass for legacy token-only flows |
| `FACE_CONFIDENCE_THRESHOLD` | `0.8` | Minimum confidence score for an automatic APPROVED path |
| `FACE_DISTANCE_THRESHOLD` | `0.50` | Maximum Euclidean distance cutoff for a face match |
| `EMBEDDINGS_DIR` | `data/embeddings` | Directory containing enrolled customer embeddings (`.npy`) |
| `MAX_FACE_ATTEMPTS` | `3` | Per-request attempt limit; exhaustion → 429 |
| `FACE_RATE_LIMIT_PER_MINUTE` | `10` | Per-user Redis sliding-window rate limit |
| `MOCK_FACE_RESULT` | `pass` | Default mock scenario when `AI_MODE=mock` |
| `MAX_IMAGE_SIZE_BYTES` | `5242880` | Max accepted image size (5 MB) |

---

## Real Face Recognition Mode (`AI_MODE=real`)

When `AI_MODE=real`, verification uses the ML adapter (`backend/app/ai/real_face_adapter.py`) powered by `face_recognition`, `dlib`, and `opencv`.

### Pipeline Execution
1. **In-Memory Decoding**: Decodes binary JPEG/PNG payload directly into RGB numpy arrays (`(H, W, 3)`) without writing temporary files to disk.
2. **Face Detection**: Uses dlib's HOG frontal face detector. Exactly one face must be present in the frame. (0 faces or >1 faces returns `face_match=False`).
3. **128-D Embedding Generation**: Extracts a 128-dimensional biometric vector via dlib's pre-trained ResNet model.
4. **Single-Frame Landmark & Liveness Check**: Evaluates facial landmark integrity and Eye Aspect Ratio (EAR). An $EAR \ge 0.15$ with natural facial proportions confirms open, alert eyes and sets `liveness_passed=True` ($P_{\text{spoof}} = 0.03$). Occluded or closed eyes result in `liveness_passed=False` ($P_{\text{spoof}} = 0.70$).
5. **Customer Reference Matching**: Loads the enrolled reference embedding from `data/embeddings/<customer_id>.npy` and computes Euclidean distance $d = \|\mathbf{e}_{\text{live}} - \mathbf{e}_{\text{stored}}\|_2$.
6. **Confidence Mapping**:
   - For $d \le T$ ($T = 0.50$): $\text{confidence} = 1.0 - (d / T) \times 0.20 \in [0.80, 1.00]$.
   - For $d > T$: $\text{confidence} = \max(0.0, 0.80 - \frac{d - T}{1.0 - T} \times 0.80) \in [0.00, 0.79]$.

### Enrolled Customer Storage
- Enrolled customer face embeddings are stored as 128-float `np.float64` vectors in `.npy` format under `data/embeddings/<customer_id>.npy` (~1.1 KB per customer).
- Pre-seeded test fixtures: `data/embeddings/customer001.npy` and `data/embeddings/customer002.npy`.

### Running Real Mode Locally
```bash
# In .env:
AI_MODE=real
FACE_DISTANCE_THRESHOLD=0.50
EMBEDDINGS_DIR=data/embeddings
```
Restart the backend (`uvicorn app.main:app`). The `/health` endpoint will confirm `"ai_mode": "real"`.

---

## Mock Mode

Set `AI_MODE=mock` (the default) to test without a real model.

### Triggering specific scenarios

**Via payload (preferred for test automation):**
```json
POST /api/v1/verification/{id}/face-verify
{ "image": "<base64>", "mock_override": "pass" }
```

**Via HTTP header (useful for curl / integration tests):**
```
X-Mock-Face-Result: low_confidence
```

**Via URL query param (admin web dev):**
```
http://localhost:3000/requests/abc?mock_face=liveness_fail
```

| `mock_override` value | `face_match` | `confidence` | `liveness_passed` | Decision outcome |
|---|---|---|---|---|
| `pass` | `true` | `0.96` | `true` | `APPROVED → ACCESS_ACTIVE` |
| `low_confidence` | `true` | `0.61` | `true` | `MANUAL_REVIEW` |
| `liveness_fail` | `true` | `0.92` | `false` | `MANUAL_REVIEW` |
| `no_match` | `false` | `0.23` | `false` | `REJECTED` |

---

## Decision Engine Branches

Evaluated by `decision_service.evaluate_and_finalize` at bank-token verification time:

| Condition | Outcome |
|---|---|
| `face_match=True AND confidence >= threshold AND liveness_passed=True` | `APPROVED → ACCESS_ACTIVE` |
| `face_match=True AND (confidence < threshold OR liveness_passed=False)` | `MANUAL_REVIEW` |
| `face_match=False AND attempt_count < MAX_FACE_ATTEMPTS` | `REJECTED` |
| `face_match=False AND attempt_count >= MAX_FACE_ATTEMPTS` | `BLOCKED` |
| `FACE_VERIFICATION_REQUIRED=false` OR no face row exists + disabled | token-only path |

---

## API Endpoints

### `POST /api/v1/verification/{request_id}/face-verify`

**Auth:** Staff only (`BANK_OPERATOR`, `BRANCH_MANAGER`, `SUPER_ADMIN`)

**Request body:**
```json
{
  "image": "data:image/jpeg;base64,/9j/...",
  "mock_override": "pass"   // optional, mock mode only
}
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "id": "...",
    "request_id": "...",
    "actor_id": "...",
    "actor_role": "BANK_OPERATOR",
    "face_match": true,
    "confidence": 0.96,
    "liveness_passed": true,
    "spoof_probability": 0.02,
    "attempt_number": 1,
    "created_at": "2026-08-17T10:00:00Z"
  },
  "message": "Face verification recorded"
}
```

**Error codes:**
| HTTP | Code | Meaning |
|---|---|---|
| 404 | `REQUEST_NOT_FOUND` | Request ID does not exist |
| 400 | `INVALID_IMAGE_DATA` | Base64 cannot be decoded |
| 400 | `UNSUPPORTED_IMAGE_TYPE` | Not JPEG or PNG |
| 413 | `IMAGE_TOO_LARGE` | Exceeds `MAX_IMAGE_SIZE_BYTES` |
| 429 | `MAX_FACE_ATTEMPTS_EXCEEDED` | Per-request limit hit |
| 429 | `RATE_LIMITED` | Per-user rate limit hit |
| 502 | `AI_SYSTEM_ERROR` | AI module returned unexpected output |

---

## Data Handling

> **TODO (follow-up):** Encryption-at-rest for the `face_verifications` table.
> The table stores derived biometric signals (not raw images), but regulatory requirements
> (e.g., GDPR Biometric Data, RBI data localisation) may require field-level or
> table-level encryption before production deployment. Confirm with compliance.

> **TODO (follow-up):** Retention policy / purge schedule for `face_verifications` rows.
> Define the retention period (e.g., 7 years for banking audit trails vs. shorter for
> biometric-derived data) and implement a scheduled purge job. Confirm with compliance.

Raw image bytes are **never stored**. Only the derived AI signals are persisted.
The consent notice in the admin-web UI communicates this to staff.

---

## Admin Web UI

The `FaceVerificationPanel` component (`admin-web/src/components/FaceVerificationPanel.tsx`):

- Appears on `RequestDetailPage` when request status is `SUBMITTED`
- Starts live webcam via `navigator.mediaDevices.getUserMedia`
- Captures a JPEG snapshot to canvas, converts to base64, posts to the face-verify endpoint
- Shows structured result: face match ✅/❌, confidence %, liveness PASS/FAIL, attempt counter
- Disables capture after `MAX_FACE_ATTEMPTS`
- Consent notice: *"Webcam capture is processed for identity verification only. Image frames are never stored — only derived signals are retained."*

The Generate Verification Tokens button is disabled until a passing face-verify result
(`face_match=True AND liveness_passed=True AND confidence >= 0.8`) is received. The backend
independently enforces this (returns 422) as the source of truth.
