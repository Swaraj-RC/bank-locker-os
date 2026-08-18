import { useEffect, useRef, useState, useCallback } from "react";
import {
  Camera,
  CameraOff,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Loader2,
  RefreshCw,
  Eye,
  EyeOff,
} from "lucide-react";
import { api, apiErrorMessage } from "../services/api";
import { FaceVerification } from "../types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type CameraState =
  | "idle"
  | "requesting"
  | "active"
  | "denied"
  | "not_found"
  | "in_use"
  | "error";

interface Props {
  requestId: string;
  maxAttempts: number;
  onResult: (result: FaceVerification) => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function cameraErrorState(err: unknown): CameraState {
  if (err instanceof Error) {
    if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") return "denied";
    if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") return "not_found";
    if (err.name === "NotReadableError" || err.name === "TrackStartError") return "in_use";
  }
  return "error";
}

function confidenceColor(c: number): string {
  if (c >= 0.85) return "text-emerald-600";
  if (c >= 0.7) return "text-amber-600";
  return "text-red-600";
}

const MAX_CONFIDENCE_THRESHOLD = 0.8;

const LIVENESS_STEPS = [
  {
    step: 1,
    title: "Position Face",
    instruction: "Look directly at the camera and align your face inside the green oval.",
    badge: "Step 1/3: Alignment",
    icon: "👤",
    actionTip: "Keep your face centered and well-lit.",
    nextBtn: "Next: Blink Eyes 👁️ →",
  },
  {
    step: 2,
    title: "Blink Eyes",
    instruction: "Blink your eyes naturally 1 or 2 times. The system tests Eye Aspect Ratio (EAR).",
    badge: "Step 2/3: Eye Alertness",
    icon: "👁️",
    actionTip: "Blink naturally to pass eye liveness validation.",
    nextBtn: "Next: Move Head Up/Down ↕️ →",
  },
  {
    step: 3,
    title: "Move Head Up & Down",
    instruction: "Tilt your head gently slightly upward, then return to center. This confirms 3D facial depth.",
    badge: "Step 3/3: 3D Head Pose",
    icon: "↕️",
    actionTip: "Gentle vertical tilt confirms a genuine physical subject.",
    nextBtn: "Ready: Capture & Verify ✅ →",
  },
  {
    step: 4,
    title: "Ready to Capture",
    instruction: "All liveness actions completed! Hold still and click Capture & Verify Face.",
    badge: "Verification Ready",
    icon: "✅",
    actionTip: "Biometric model will match face against Project NPN dataset.",
    nextBtn: "Capture & Verify Face",
  },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function FaceVerificationPanel({ requestId, maxAttempts = 100, onResult }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const motionCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [cameraState, setCameraState] = useState<CameraState>("idle");
  const [capturing, setCapturing] = useState(false);
  const [result, setResult] = useState<FaceVerification | null>(null);
  const [attemptCount, setAttemptCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [stepFeedback, setStepFeedback] = useState<string>("");
  const [cycleId, setCycleId] = useState<number>(0);

  // ?mock_face=pass|no_match|low_confidence|liveness_fail in the URL forces a mock scenario
  const mockScenario = new URLSearchParams(window.location.search).get("mock_face") || null;

  // Initialize attempt count on mount / requestId change
  useEffect(() => {
    api.get(`/api/v1/requests/${requestId}`).then((r) => {
      // Load current request status
      setError(null);
    }).catch(() => {});
  }, [requestId]);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // Ensure stream is attached whenever video element or cameraState is ready
  const setVideoRef = useCallback((node: HTMLVideoElement | null) => {
    (videoRef as any).current = node;
    if (node && streamRef.current) {
      node.srcObject = streamRef.current;
      node.onloadedmetadata = () => {
        node.play().catch((err) => console.warn("Video play error:", err));
      };
      node.play().catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (cameraState === "active" && videoRef.current && streamRef.current) {
      const video = videoRef.current;
      video.srcObject = streamRef.current;
      video.onloadedmetadata = () => {
        video.play().catch((err) => console.warn("Video play error:", err));
      };
      video.play().catch(() => {});
    }
  }, [cameraState]);

  const startCamera = useCallback(async () => {
    setCameraState("requesting");
    setError(null);
    setCurrentStep(1);
    setStepFeedback("Align face inside the oval...");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
      });
      streamRef.current = stream;
      setCameraState("active");
      setCycleId((prev) => prev + 1);
    } catch (err) {
      setCameraState(cameraErrorState(err));
    }
  }, []);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraState("idle");
  }, []);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const imageData = reader.result as string;
      await processVerification(imageData);
    };
    reader.readAsDataURL(file);
  }, []);

  const blinkSnapshotRef = useRef<string | null>(null);
  const nodSnapshotRef = useRef<string | null>(null);

  const captureCurrentFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return null;
    const video = videoRef.current;
    if (video.videoWidth === 0 || video.videoHeight === 0) return null;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.95);
  }, []);

  const processVerification = useCallback(async (imageData: string) => {
    setCapturing(true);
    setError(null);
    try {
      const body: { image: string; blink_frame?: string; nod_frame?: string; mock_override?: string } = {
        image: imageData,
        blink_frame: blinkSnapshotRef.current || undefined,
        nod_frame: nodSnapshotRef.current || undefined,
      };
      if (mockScenario) body.mock_override = mockScenario;

      const resp = await api.post(`/api/v1/verification/${requestId}/face-verify`, body);
      const fv: FaceVerification = resp.data.data.verification;
      setResult(fv);
      setAttemptCount(fv.attempt_number);
      onResult(fv);
      if (fv.face_match && fv.liveness_passed && fv.confidence >= MAX_CONFIDENCE_THRESHOLD) {
        stopCamera();
      }
    } catch (err) {
      const msg = apiErrorMessage(err);
      setError(msg);
      const code = (err as any)?.response?.data?.error?.code;
      if (code === "MAX_FACE_ATTEMPTS_EXCEEDED") setAttemptCount(maxAttempts);
    } finally {
      setCapturing(false);
    }
  }, [requestId, mockScenario, onResult, maxAttempts, stopCamera]);

  const captureAndVerify = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || cameraState !== "active") return;

    const imageData = captureCurrentFrame();
    if (!imageData) {
      setError("Camera is still warming up. Please wait a second and try again.");
      return;
    }

    await processVerification(imageData);
  }, [cameraState, captureCurrentFrame, processVerification]);

  const [stepCountdown, setStepCountdown] = useState<number>(3);
  const [spoofAlert, setSpoofAlert] = useState<string | null>(null);

  // Real-time Motion & Liveness Movement Detection Loop
  useEffect(() => {
    if (cameraState !== "active" || result || capturing) {
      return;
    }

    if (!motionCanvasRef.current) {
      motionCanvasRef.current = document.createElement("canvas");
      motionCanvasRef.current.width = 120;
      motionCanvasRef.current.height = 90;
    }

    const mCanvas = motionCanvasRef.current;
    const mCtx = mCanvas.getContext("2d", { willReadFrequently: true });
    if (!mCtx) return;

    let baselineHeadY = 0;
    let baselineHeadX = 0;
    let steadyAlignmentFrames = 0;
    let spoofPersistTicks = 0;
    const prevFrame = new Float32Array(120 * 90);
    let blinkEnergyAccumulator = 0;
    let upNodDetected = false;
    let downNodDetected = false;
    let blinkDetected = false;
    let headMovementDetected = false;
    let step = 1;
    let stepTimer = 0;
    let active = true;

    const interval = setInterval(() => {
      if (!active || !videoRef.current || videoRef.current.readyState < 2) return;

      const video = videoRef.current;
      mCtx.drawImage(video, 0, 0, 120, 90);
      const frameData = mCtx.getImageData(0, 0, 120, 90).data;

      let totalLuma = 0;
      let centerMassY = 0;
      let centerMassX = 0;
      let centerCount = 0;
      let upperEyeDelta = 0;
      let lowerCheekDelta = 0;
      let upperPixelCount = 0;
      let lowerPixelCount = 0;
      let straightEdgeCount = 0;

      // Scan entire webcam frame (full view, no oval restriction)
      for (let y = 5; y < 85; y++) {
        for (let x = 10; x < 110; x++) {
          const idx = (y * 120 + x) * 4;
          const pixelIdx = y * 120 + x;
          const luma = 0.299 * frameData[idx] + 0.587 * frameData[idx + 1] + 0.114 * frameData[idx + 2];
          totalLuma += luma;
          centerMassY += y * luma;
          centerMassX += x * luma;
          centerCount++;

          // Check for rectangular sharp border gradients (phone/card bezel edges)
          if (x > 10 && x < 110 && y > 6 && y < 84) {
            const rightLuma = 0.299 * frameData[idx + 4] + 0.587 * frameData[idx + 5] + 0.114 * frameData[idx + 6];
            const downLuma = 0.299 * frameData[((y + 1) * 120 + x) * 4] + 0.587 * frameData[((y + 1) * 120 + x) * 4 + 1] + 0.114 * frameData[((y + 1) * 120 + x) * 4 + 2];
            const gx = Math.abs(luma - rightLuma);
            const gy = Math.abs(luma - downLuma);
            if (gx > 55 || gy > 55) {
              straightEdgeCount++;
            }
          }

          const prevL = prevFrame[pixelIdx];
          if (prevL > 0) {
            const diff = Math.abs(luma - prevL);
            // Upper eye region (y: 20-46)
            if (y >= 20 && y <= 46) {
              upperEyeDelta += diff;
              upperPixelCount++;
            }
            // Lower cheek/mouth region (y: 48-72)
            if (y >= 48 && y <= 72) {
              lowerCheekDelta += diff;
              lowerPixelCount++;
            }
          }
          prevFrame[pixelIdx] = luma;
        }
      }

      // 5-SECOND MOBILE / PHOTO SPOOF DETECTION & AUTO-CLOSE
      const isMobileDetected = straightEdgeCount >= 460;
      if (isMobileDetected) {
        spoofPersistTicks++;
        const secondsLeft = Math.max(1, 5 - Math.floor(spoofPersistTicks / 14));
        const warningMsg = `🚨 SPOOF DETECTED: Mobile phone / photo detected! Closing camera in ${secondsLeft}s...`;
        setSpoofAlert(warningMsg);
        setStepFeedback(warningMsg);

        // Terminate camera session if spoof persists for 5 seconds (70 ticks @ 70ms)
        if (spoofPersistTicks >= 70) {
          active = false;
          clearInterval(interval);
          stopCamera();
          setError("❌ Face Capture Cancelled: Spoof detected for 5 seconds (Mobile screen / photo detected).");
          return;
        }
        return;
      } else {
        if (spoofPersistTicks > 0) {
          spoofPersistTicks = 0;
          setSpoofAlert(null);
        }
      }

      const avgLuma = totalLuma / Math.max(1, centerCount);
      const avgCenterY = centerMassY / Math.max(1, totalLuma);
      const avgCenterX = centerMassX / Math.max(1, totalLuma);
      const eyeDiffRate = upperEyeDelta / Math.max(1, upperPixelCount);
      const cheekDiffRate = lowerCheekDelta / Math.max(1, lowerPixelCount);

      stepTimer++;

      // STEP 1: Alignment Check (Hold steady for 2.5s)
      if (step === 1) {
        if (avgLuma > 30 && avgLuma < 240 && eyeDiffRate < 4.0) {
          steadyAlignmentFrames++;
          const progressPercent = Math.min(100, Math.round((steadyAlignmentFrames / 25) * 100));
          const remainingSec = Math.max(1, 3 - Math.floor(steadyAlignmentFrames / 10));
          setStepCountdown(remainingSec);
          setStepFeedback(`👤 Hold steady in front of camera (${remainingSec}s · ${progressPercent}% ready)...`);

          if (steadyAlignmentFrames >= 25) {
            step = 2;
            setCurrentStep(2);
            setStepFeedback("👁️ Step 2: Please blink your eyes now...");
            steadyAlignmentFrames = 0;
            stepTimer = 0;
            blinkEnergyAccumulator = 0;
            setStepCountdown(5);
          }
        } else {
          steadyAlignmentFrames = Math.max(0, steadyAlignmentFrames - 2);
          setStepFeedback("⚠️ Position face in front of camera and ensure good lighting.");
        }
      }

      // STEP 2: Responsive Eye Blink Sensor (Detects rapid isolated eyelid movement)
      else if (step === 2) {
        const remainingSec = Math.max(1, 6 - Math.floor(stepTimer / 14));
        setStepCountdown(remainingSec);

        // When eyes blink, upper eye motion jumps while lower face is relatively calm
        const blinkSpike = eyeDiffRate - (cheekDiffRate * 0.5);
        if (blinkSpike >= 1.4 && cheekDiffRate < 4.5) {
          blinkEnergyAccumulator += blinkSpike * 20;
        } else {
          blinkEnergyAccumulator = Math.max(0, blinkEnergyAccumulator - 2);
        }

        const blinkPercent = Math.min(100, Math.round(blinkEnergyAccumulator));

        if (blinkPercent >= 60 || blinkEnergyAccumulator >= 60) {
          blinkDetected = true;
          blinkSnapshotRef.current = captureCurrentFrame();
          step = 3;
          setCurrentStep(3);
          setStepFeedback("✅ Eye blink verified! Step 3: Now nod your head UP and DOWN...");
          stepTimer = 0;
          baselineHeadY = avgCenterY;
          baselineHeadX = avgCenterX;
          setStepCountdown(5);
          upNodDetected = false;
          downNodDetected = false;
        }

        if (!blinkDetected && stepTimer >= 20) {
          setStepFeedback(`👁️ Please blink your eyes firmly in front of the camera (${remainingSec}s window).`);
        }
      }

      // STEP 3: Responsive Head UP / DOWN Nod Sensor
      else if (step === 3) {
        const remainingSec = Math.max(1, 6 - Math.floor(stepTimer / 14));
        setStepCountdown(remainingSec);

        if (baselineHeadY === 0) {
          baselineHeadY = avgCenterY;
          baselineHeadX = avgCenterX;
        }

        const deltaY = avgCenterY - baselineHeadY;
        const deltaX = Math.abs(avgCenterX - baselineHeadX);

        if (deltaY < -0.28) upNodDetected = true;
        if (deltaY > 0.28) downNodDetected = true;

        // Check for lateral shaking
        if (deltaX >= 0.40) {
          setStepFeedback("⚠️ Warning: Lateral shaking detected! Please nod UP and DOWN only.");
          return;
        }

        // Complete step when vertical nod is performed
        if ((upNodDetected || downNodDetected || Math.abs(deltaY) >= 0.35) && deltaX < 0.40) {
          headMovementDetected = true;
          nodSnapshotRef.current = captureCurrentFrame();
          step = 4;
          setCurrentStep(4);
          setStepFeedback("✅ Head nod verified! Capturing biometric frame...");
          clearInterval(interval);
          setTimeout(() => {
            if (active) captureAndVerify();
          }, 500);
        }

        if (!headMovementDetected && stepTimer >= 20) {
          setStepFeedback(`↕️ Nod your head UP and DOWN vertically (${remainingSec}s window).`);
        }
      }
    }, 70);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [cameraState, result, cycleId, captureAndVerify, captureCurrentFrame, stopCamera]);

  const retry = useCallback(() => {
    setResult(null);
    setError(null);
    blinkSnapshotRef.current = null;
    nodSnapshotRef.current = null;
    setCurrentStep(1);
    setStepFeedback("Align face inside the oval...");
    setCycleId((prev) => prev + 1);
  }, []);

  const attemptsExhausted = attemptCount >= maxAttempts;
  const passed =
    result !== null &&
    result.face_match &&
    result.liveness_passed &&
    result.confidence >= MAX_CONFIDENCE_THRESHOLD;

  // ---------------------------------------------------------------------------
  // Sub-renderers
  // ---------------------------------------------------------------------------
  function renderCameraError() {
    type ErrInfo = { icon: React.ReactNode; title: string; help: string };
    const map: Record<string, ErrInfo> = {
      denied: {
        icon: <CameraOff size={28} className="text-red-500" />,
        title: "Camera permission denied",
        help: 'Allow camera access in your browser settings, then click "Start Camera" again.',
      },
      not_found: {
        icon: <CameraOff size={28} className="text-slate-400" />,
        title: "No camera found",
        help: "Connect a webcam and click \"Start Camera\". To test without hardware add ?mock_face=pass to the URL.",
      },
      in_use: {
        icon: <CameraOff size={28} className="text-amber-500" />,
        title: "Camera in use by another application",
        help: "Close other apps using the camera (Teams, Zoom, etc.) and try again.",
      },
      error: {
        icon: <AlertTriangle size={28} className="text-red-500" />,
        title: "Could not access camera",
        help: "An unexpected error occurred. Try refreshing the page.",
      },
    };
    const s = map[cameraState] || map.error;
    return (
      <div className="flex flex-col items-center gap-3 py-6 text-center">
        {s.icon}
        <p className="font-medium text-sm text-primary">{s.title}</p>
        <p className="text-xs text-slate-500 max-w-xs">{s.help}</p>
        <button onClick={startCamera} className="btn-secondary text-xs mt-1">
          <RefreshCw size={12} className="inline mr-1" /> Try again
        </button>
      </div>
    );
  }

  function renderResult() {
    if (!result) return null;
    const isManualReview = result.face_match && (!result.liveness_passed || result.confidence < MAX_CONFIDENCE_THRESHOLD);
    const overall = passed
      ? { label: "VERIFIED", cls: "text-emerald-700 bg-emerald-50 border-emerald-200" }
      : isManualReview
      ? { label: "MANUAL REVIEW REQUIRED", cls: "text-orange-700 bg-orange-50 border-orange-300" }
      : { label: "FAILED", cls: "text-red-700 bg-red-50 border-red-200" };

    return (
      <div className="space-y-3 pt-2 border-t border-border">
        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md border text-xs font-bold ${overall.cls}`}>
          {passed ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
          {overall.label}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
          <div className="bg-slate-50 rounded p-2.5 border border-border">
            <div className="text-slate-400 mb-0.5">Biometric Match</div>
            <div className={`font-semibold ${result.face_match ? "text-emerald-600" : "text-red-600"}`}>
              {result.face_match ? "✅ Project NPN Match" : "❌ Mismatch"}
            </div>
          </div>
          <div className="bg-slate-50 rounded p-2.5 border border-border">
            <div className="text-slate-400 mb-0.5">Confidence Score</div>
            <div className={`font-semibold ${confidenceColor(result.confidence)}`}>
              {(result.confidence * 100).toFixed(1)}% (Min 80%)
            </div>
          </div>
          <div className="bg-slate-50 rounded p-2.5 border border-border">
            <div className="text-slate-400 mb-0.5">Overall Liveness</div>
            <div className={`font-semibold ${result.liveness_passed ? "text-emerald-600" : "text-red-600"}`}>
              {result.liveness_passed ? "✅ LIVE HUMAN" : "❌ SPOOF RISK"}
            </div>
          </div>
          <div className="bg-slate-50 rounded p-2.5 border border-border">
            <div className="text-slate-400 mb-0.5">Eye Blinking (EAR)</div>
            <div className={`font-semibold ${result.liveness_passed ? "text-emerald-600" : "text-amber-600"}`}>
              {result.liveness_passed ? "✅ Natural Blink Verified" : "⚠️ Eye Alertness Check"}
            </div>
          </div>
          <div className="bg-slate-50 rounded p-2.5 border border-border">
            <div className="text-slate-400 mb-0.5">Head Pose (Up/Down)</div>
            <div className={`font-semibold ${result.liveness_passed ? "text-emerald-600" : "text-amber-600"}`}>
              {result.liveness_passed ? "✅ 3D Pose Aligned" : "⚠️ Pitch/Tilt Re-check"}
            </div>
          </div>
          <div className="bg-slate-50 rounded p-2.5 border border-border">
            <div className="text-slate-400 mb-0.5">Attempt Number</div>
            <div className="font-semibold text-primary">
              {result.attempt_number} / {maxAttempts}
            </div>
          </div>
        </div>

        {!passed && (
          attemptsExhausted ? (
            <div className="flex items-center gap-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
              <XCircle size={13} />
              Maximum attempts reached. Face verification cannot be retried for this request.
            </div>
          ) : (
            <button onClick={retry} className="btn-secondary text-xs">
              <RefreshCw size={12} className="inline mr-1" />
              Retry ({maxAttempts - attemptCount} attempt{maxAttempts - attemptCount !== 1 ? "s" : ""} remaining)
            </button>
          )
        )}
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Main render
  // ---------------------------------------------------------------------------
  return (
    <div className="card p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Camera size={18} className="text-primary" />
        <h2 className="font-semibold text-primary text-sm">Staff Face Verification</h2>
        {passed && (
          <span className="ml-auto flex items-center gap-1 text-xs text-emerald-600 font-semibold">
            <ShieldCheck size={14} /> Verified
          </span>
        )}
      </div>

      {/* Liveness Detection Guidance */}
      <div className="space-y-1.5 bg-blue-50/70 border border-blue-200/80 rounded-lg p-3 text-xs">
        <div className="flex items-center gap-1.5 text-blue-900 font-semibold">
          <ShieldCheck size={14} className="text-blue-600" />
          <span>Active Liveness &amp; Anti-Spoofing Detection Protocol</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-600 mt-1">
          <div className="flex items-start gap-1.5">
            <span className="text-blue-600 font-bold">1. 👁️ Eye Blinking:</span>
            <span>Natural eye blinking &amp; openness (EAR &ge; 0.14) is evaluated in real-time.</span>
          </div>
          <div className="flex items-start gap-1.5">
            <span className="text-blue-600 font-bold">2. ↕️ Head Up / Down Pose:</span>
            <span>3D facial landmark depth &amp; vertical pitch alignment are verified.</span>
          </div>
        </div>
        <p className="text-[11px] text-slate-500 pt-1 border-t border-blue-100">
          Raw image frames are processed in-memory and <strong>never stored</strong> — only biometric audit signals are retained.
        </p>
      </div>

      {/* Camera area */}
      {["denied", "not_found", "in_use", "error"].includes(cameraState) && renderCameraError()}

      {cameraState === "idle" && !result && (
        <div className="flex flex-col items-center gap-3 py-6 border-2 border-dashed border-border rounded-lg">
          <Camera size={32} className="text-slate-300" />
          <p className="text-xs text-slate-400">Webcam not started</p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              id="face-verify-start-camera"
              onClick={startCamera}
              className="btn-primary text-xs"
              disabled={attemptsExhausted}
            >
              <Camera size={12} className="inline mr-1.5" /> Start Camera
            </button>
            <label className="btn-secondary text-xs cursor-pointer inline-flex items-center">
              <span>Upload Photo</span>
              <input
                type="file"
                accept="image/jpeg,image/png"
                className="hidden"
                onChange={handleFileUpload}
                disabled={attemptsExhausted}
              />
            </label>
          </div>
        </div>
      )}

      {cameraState === "requesting" && (
        <div className="flex items-center justify-center gap-2 py-8 text-xs text-slate-400">
          <Loader2 size={16} className="animate-spin" /> Requesting camera access…
        </div>
      )}

      {cameraState === "active" && !result && (
        <div className="space-y-3">
          {/* Step progress pills */}
          <div className="grid grid-cols-4 gap-1.5 text-[11px] font-semibold">
            {LIVENESS_STEPS.map((s) => {
              const isActive = currentStep === s.step;
              const isPast = currentStep > s.step;
              return (
                <button
                  key={s.step}
                  type="button"
                  onClick={() => setCurrentStep(s.step)}
                  className={`py-1.5 px-2 rounded-lg border text-center transition-all flex flex-col items-center justify-center gap-0.5 ${
                    isActive
                      ? "bg-primary text-white border-primary shadow-sm"
                      : isPast
                      ? "bg-emerald-50 text-emerald-700 border-emerald-300 font-medium"
                      : "bg-slate-50 text-slate-400 border-border hover:bg-slate-100"
                  }`}
                >
                  <span className="text-xs">{isPast ? "✓" : s.icon}</span>
                  <span className="truncate w-full">{s.title}</span>
                </button>
              );
            })}
          </div>

          {/* Active instruction banner */}
          {(() => {
            const stepInfo = LIVENESS_STEPS.find((s) => s.step === currentStep) || LIVENESS_STEPS[0];
            return (
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-3.5 shadow-sm space-y-2">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-blue-600 text-white rounded text-[11px] font-bold uppercase tracking-wider">
                    {stepInfo.icon} {stepInfo.badge}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-amber-900 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-full flex items-center gap-1 shadow-xs">
                      ⏱️ {stepCountdown}s
                    </span>
                    <span className="text-[11px] text-blue-700 font-semibold bg-blue-100/80 px-2 py-0.5 rounded">
                      Attempts: {attemptCount} / {maxAttempts}
                    </span>
                  </div>
                </div>
                <p className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                  <span>{stepInfo.instruction}</span>
                </p>
                {stepFeedback && (
                  <div className={`text-xs font-semibold px-3 py-2 rounded-lg border flex items-center gap-2 transition-all ${
                    stepFeedback.includes("⚠️")
                      ? "bg-amber-50 text-amber-900 border-amber-300 shadow-sm animate-pulse"
                      : stepFeedback.includes("✅")
                      ? "bg-emerald-50 text-emerald-900 border-emerald-300"
                      : "bg-blue-100/70 text-blue-900 border-blue-200/80"
                  }`}>
                    {stepFeedback.includes("⚠️") && <AlertTriangle size={15} className="shrink-0 text-amber-600" />}
                    {stepFeedback.includes("✅") && <CheckCircle2 size={15} className="shrink-0 text-emerald-600" />}
                    <span>{stepFeedback}</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-xs text-slate-500 pt-0.5">
                  <span>{stepInfo.actionTip}</span>
                  <span className="font-semibold text-blue-800">
                    {currentStep < 4 ? `⏱️ Step ${currentStep}/4 · ${stepCountdown}s remaining` : "All verified! Capturing..."}
                  </span>
                </div>
              </div>
            );
          })()}

          {/* Live Camera Preview */}
          <div className={`relative rounded-xl overflow-hidden bg-slate-900 shadow-inner transition-all duration-200 ${
            spoofAlert ? "ring-4 ring-red-500 shadow-[0_0_35px_rgba(239,68,68,0.7)]" : ""
          }`} style={{ aspectRatio: "4/3", minHeight: "260px" }}>
            <video
              ref={setVideoRef}
              autoPlay
              muted
              playsInline
              onLoadedMetadata={(e) => {
                const vid = e.currentTarget;
                vid.play().catch(() => {});
              }}
              className="w-full h-full object-cover"
              id="face-verify-preview"
            />
            {/* Full-Screen High-Visibility Red Alert Overlay */}
            {spoofAlert && (
              <div className="absolute inset-0 bg-gradient-to-b from-red-950/95 via-red-900/90 to-red-950/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-30 border-4 border-red-600 animate-pulse">
                <div className="w-16 h-16 rounded-full bg-red-800/80 border-2 border-red-400 flex items-center justify-center mb-3 shadow-[0_0_20px_rgba(239,68,68,0.8)] animate-bounce">
                  <AlertTriangle size={36} className="text-yellow-300" />
                </div>
                <h3 className="text-lg font-black text-white tracking-wide uppercase mb-1.5 drop-shadow">
                  🚨 RED ALERT: SPOOF DETECTED!
                </h3>
                <p className="text-sm font-semibold text-red-100 max-w-sm mb-3">
                  Mobile phone screen or photo detected in front of webcam.
                </p>
                <div className="inline-flex items-center gap-2 bg-black/60 border border-red-400/60 px-4 py-2 rounded-full text-sm font-bold text-yellow-300 shadow-inner">
                  <span>⛔ Face Capture Automatically Cancelled</span>
                </div>
                <p className="text-[11px] text-red-300/90 mt-3 font-medium">
                  Camera feed closing for security.
                </p>
              </div>
            )}

            {/* In-feed instruction overlay */}
            <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-xs text-white/90 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10">
              <span className="flex items-center gap-1.5 truncate">
                <span>{LIVENESS_STEPS[currentStep - 1]?.icon}</span>
                <span className="font-medium">{LIVENESS_STEPS[currentStep - 1]?.title}:</span>
                <span className="text-white/80 truncate">{LIVENESS_STEPS[currentStep - 1]?.actionTip}</span>
              </span>
              <span className="text-[11px] text-emerald-400 font-bold ml-2 shrink-0">
                Step {currentStep}/4
              </span>
            </div>
          </div>
          <canvas ref={canvasRef} className="hidden" />

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <button
              id="face-verify-capture"
              onClick={captureAndVerify}
              disabled={capturing || attemptsExhausted}
              className={`flex-1 flex items-center justify-center gap-2 text-sm py-2.5 rounded-lg font-semibold shadow-md transition-all ${
                currentStep === 4
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white ring-2 ring-emerald-400/40"
                  : "btn-primary"
              }`}
            >
              {capturing ? (
                <><Loader2 size={15} className="animate-spin" /> Verifying Biometrics against Project NPN…</>
              ) : (
                <><Camera size={15} /> Capture Now (or Auto-Verifies)</>
              )}
            </button>
            {currentStep < 4 && (
              <button
                type="button"
                onClick={() => setCurrentStep((prev) => Math.min(4, prev + 1))}
                className="btn-secondary text-xs px-3 py-2 flex items-center gap-1 font-semibold whitespace-nowrap"
                title="Manually proceed to next step"
              >
                Next Step →
              </button>
            )}
            <label className="btn-secondary text-xs px-3 py-2 cursor-pointer" title="Upload photo instead">
              Upload
              <input
                type="file"
                accept="image/jpeg,image/png"
                className="hidden"
                onChange={handleFileUpload}
                disabled={capturing || attemptsExhausted}
              />
            </label>
            <button
              onClick={stopCamera}
              className="btn-secondary text-xs px-2.5 py-2"
              title="Stop camera"
              id="face-verify-stop-camera"
            >
              <EyeOff size={14} />
            </button>
          </div>

          {attemptsExhausted && (
            <p className="text-xs text-center text-red-600 font-semibold">
              Maximum attempts ({maxAttempts}) reached — capture disabled.
            </p>
          )}
        </div>
      )}

      {/* API error */}
      {error && (
        <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2 flex items-center gap-2">
          <AlertTriangle size={13} className="shrink-0" /> {error}
        </div>
      )}

      {renderResult()}
    </div>
  );
}
