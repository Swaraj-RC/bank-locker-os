import { useState, useEffect, useRef } from "react";
import {
  Camera,
  RefreshCw,
  Scan,
  Zap,
  Radio,
  ShieldCheck,
  Video,
  VideoOff,
  AlertCircle,
  Eye,
  ArrowUp,
  ArrowDown,
  CheckCircle2,
  User,
} from "lucide-react";
import { VerificationLifecycleStatus } from "../types";

interface CameraPanelProps {
  isAnalyzing: boolean;
  onCapture: () => void;
  isCameraActive: boolean;
  onToggleCamera: () => void;
  capturedPreview?: string | null;
  onReset?: () => void;
  sessionId?: string | null;
  verificationStatus?: VerificationLifecycleStatus;
  disabled?: boolean;
  livenessStage?: number | null;
  livenessMessage?: string | null;
}

const STAGE_CONFIG: Record<
  number,
  {
    title: string;
    instruction: string;
    progress: number;
    badgeColor: string;
  }
> = {
  0: {
    title: "Stage 0",
    instruction: "Position your face inside the oval",
    progress: 15,
    badgeColor: "text-blue-300 bg-blue-950/80 border-blue-400/40",
  },
  1: {
    title: "Stage 1",
    instruction: "Blink twice",
    progress: 35,
    badgeColor: "text-amber-300 bg-amber-950/80 border-amber-400/40",
  },
  2: {
    title: "Stage 2",
    instruction: "Look Up",
    progress: 60,
    badgeColor: "text-blue-300 bg-blue-950/80 border-blue-400/40",
  },
  3: {
    title: "Stage 3",
    instruction: "Look Down",
    progress: 80,
    badgeColor: "text-blue-300 bg-blue-950/80 border-blue-400/40",
  },
  4: {
    title: "Stage 4",
    instruction: "Liveness Verified ✓",
    progress: 95,
    badgeColor: "text-emerald-300 bg-emerald-950/80 border-emerald-400/40",
  },
  5: {
    title: "FastAPI Engine",
    instruction: "Sending biometric data to FastAPI...",
    progress: 100,
    badgeColor: "text-blue-200 bg-slate-950/90 border-blue-400/40",
  },
};

export function CameraPanel({
  isAnalyzing,
  onCapture,
  isCameraActive,
  onToggleCamera,
  sessionId,
  verificationStatus,
  disabled,
  livenessStage,
  livenessMessage,
}: CameraPanelProps) {
  const [scanProgress, setScanProgress] = useState(0);
  const [hasLiveFeed, setHasLiveFeed] = useState(false);
  const [cameraNotice, setCameraNotice] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const isSessionReady = Boolean(sessionId);
  const isCompleted = verificationStatus === "COMPLETED";

  // Handle hardware webcam stream lifecycle
  useEffect(() => {
    let active = true;

    async function enableWebcam() {
      if (!isCameraActive) {
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }
        setHasLiveFeed(false);
        setCameraNotice(null);
        return;
      }

      if (navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === "function") {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
            audio: false,
          });

          if (!active) {
            stream.getTracks().forEach((t) => t.stop());
            return;
          }

          streamRef.current = stream;
          setHasLiveFeed(true);
          setCameraNotice(null);

          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play().catch(() => {});
          }
        } catch (err: any) {
          console.warn("[CameraPanel] WebCam access failed or permission denied, using simulated stream.", err);
          if (active) {
            setHasLiveFeed(false);
            setCameraNotice("Webcam denied / unavailable · Running Simulated AI Terminal");
          }
        }
      } else {
        setHasLiveFeed(false);
        setCameraNotice("Browser does not support getUserMedia · Running Simulated AI Terminal");
      }
    }

    enableWebcam();

    return () => {
      active = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, [isCameraActive]);

  // Keep video ref synced with active stream
  useEffect(() => {
    if (hasLiveFeed && isCameraActive && videoRef.current && streamRef.current) {
      if (videoRef.current.srcObject !== streamRef.current) {
        videoRef.current.srcObject = streamRef.current;
      }
      videoRef.current.play().catch(() => {});
    }
  }, [hasLiveFeed, isCameraActive]);

  // Handle scanning analysis fallback progress if stage not provided
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isAnalyzing && (livenessStage === null || livenessStage === undefined)) {
      setScanProgress(0);
      interval = setInterval(() => {
        setScanProgress((prev) => {
          if (prev >= 98) {
            clearInterval(interval);
            return 100;
          }
          return prev + Math.floor(Math.random() * 15) + 10;
        });
      }, 180);
    } else {
      setScanProgress(0);
    }
    return () => clearInterval(interval);
  }, [isAnalyzing, livenessStage]);

  const displayProgress =
    livenessStage !== null && livenessStage !== undefined
      ? STAGE_CONFIG[livenessStage]?.progress ?? scanProgress
      : scanProgress;

  return (
    <div className="card p-5 flex flex-col justify-between h-full space-y-4">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className={`w-2.5 h-2.5 rounded-full ${
              isCameraActive && isSessionReady ? "bg-emerald-500 animate-pulse" : "bg-slate-300"
            }`}
          />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
            {hasLiveFeed ? "Live Hardware Webcam Sensor" : "AI Live Biometric Sensor"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {sessionId ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold text-[#003366] bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
              <ShieldCheck size={12} className="text-[#003366]" /> {sessionId}
            </span>
          ) : (
            <span className="text-[11px] font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
              Standby
            </span>
          )}
          {isCameraActive && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
              <Radio size={12} className="animate-pulse text-emerald-600" />
              {hasLiveFeed ? "WEBCAM LIVE" : "SIMULATED FEED"}
            </span>
          )}
        </div>
      </div>

      {/* Main Camera Viewfinder */}
      <div className="relative aspect-4/3 w-full bg-[#0F172A] rounded-xl overflow-hidden flex items-center justify-center border-2 border-slate-800 shadow-inner">
        {/* Subtle grid pattern background across viewfinder */}
        <div
          className="absolute inset-0 opacity-15 pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(rgba(255, 255, 255, 0.4) 1px, transparent 1px), radial-gradient(rgba(255, 255, 255, 0.4) 1px, #0F172A 1px)",
            backgroundSize: "20px 20px",
            backgroundPosition: "0 0, 10px 10px",
          }}
        />

        {/* Viewfinder Corner Brackets */}
        <div className="absolute top-3 left-3 w-6 h-6 border-t-2 border-l-2 border-amber-400/80 z-10 pointer-events-none" />
        <div className="absolute top-3 right-3 w-6 h-6 border-t-2 border-r-2 border-amber-400/80 z-10 pointer-events-none" />
        <div className="absolute bottom-3 left-3 w-6 h-6 border-b-2 border-l-2 border-amber-400/80 z-10 pointer-events-none" />
        <div className="absolute bottom-3 right-3 w-6 h-6 border-b-2 border-r-2 border-amber-400/80 z-10 pointer-events-none" />

        {/* ML Challenge-Response Stage Stepper at Top of Viewfinder */}
        {(isAnalyzing || (livenessStage !== null && livenessStage !== undefined)) && (
          <div className="absolute top-3 inset-x-8 z-20 flex items-center justify-center pointer-events-none">
            <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700/80 px-2.5 py-1 rounded-full flex items-center gap-1 shadow-lg">
              {[
                { stage: 0, label: "0: Align" },
                { stage: 1, label: "1: Blink" },
                { stage: 2, label: "2: Look Up" },
                { stage: 3, label: "3: Look Down" },
                { stage: 4, label: "4: Verified" },
              ].map((step) => {
                const isPassed =
                  livenessStage !== null && livenessStage !== undefined && livenessStage > step.stage;
                const isCurrent = livenessStage === step.stage;
                return (
                  <div
                    key={step.stage}
                    className={`flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full transition-all duration-200 ${
                      isPassed
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-400/40"
                        : isCurrent
                        ? step.stage === 4
                          ? "bg-emerald-500 text-slate-950 font-black shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                          : "bg-amber-400 text-slate-950 font-black shadow-[0_0_10px_rgba(245,158,11,0.5)]"
                        : "bg-slate-800/80 text-slate-400 border border-slate-700"
                    }`}
                  >
                    {isPassed ? <CheckCircle2 size={10} className="text-emerald-400" /> : null}
                    <span>{step.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Center Reticle / Biometric Oval Face Guide */}
        <div className="relative z-10 flex flex-col items-center justify-center pointer-events-none">
          <div
            className={`w-52 h-64 rounded-[48%] border-2 transition-all duration-300 flex items-center justify-center relative overflow-hidden ${
              livenessStage === 4
                ? "border-emerald-400 shadow-[0_0_25px_rgba(16,185,129,0.6)] scale-105"
                : isAnalyzing
                ? "border-amber-400 shadow-[0_0_25px_rgba(245,158,11,0.5)] scale-105"
                : isCameraActive && isSessionReady
                ? "border-blue-400/90 shadow-[0_0_15px_rgba(37,99,235,0.3)]"
                : "border-slate-600 border-dashed opacity-50"
            }`}
          >
            {/* Live Mirrored HTML5 Webcam Video - Clipped strictly to the Biometric Oval */}
            {isCameraActive && hasLiveFeed && (
              <video
                ref={(el) => {
                  videoRef.current = el;
                  if (el && streamRef.current && el.srcObject !== streamRef.current) {
                    el.srcObject = streamRef.current;
                    el.play().catch(() => {});
                  }
                }}
                autoPlay
                playsInline
                muted
                className="absolute inset-0 w-full h-full object-cover scale-x-[-1] z-0"
              />
            )}

            {/* Simulated Feed / Standby Face Silhouette Background */}
            {(!isCameraActive || !hasLiveFeed) && (
              <div className="absolute inset-0 bg-[#0F172A]/90 flex items-center justify-center">
                {isCameraActive ? (
                  <div className="relative w-full h-full flex items-center justify-center">
                    <div className="w-36 h-48 rounded-[48%] border border-blue-500/30 bg-blue-950/20 flex items-center justify-center">
                      <User size={60} className="text-blue-400/30 animate-pulse" />
                    </div>
                  </div>
                ) : null}
              </div>
            )}

            {/* Horizontal & Vertical Crosshairs */}
            <div className="absolute inset-x-4 top-1/2 h-px bg-white/20 -translate-y-1/2 z-10" />
            <div className="absolute inset-y-4 left-1/2 w-px bg-white/20 -translate-x-1/2 z-10" />

            {/* Scanning Laser Line when analyzing */}
            {isAnalyzing && (
              <div className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent shadow-[0_0_12px_#f59e0b] animate-scan-line z-20" />
            )}

            {/* Stage-Specific Visual Challenge Overlays inside Oval */}
            {!isCameraActive ? (
              <div className="text-center text-slate-400 p-4 space-y-2 z-10">
                <Camera size={38} className="mx-auto text-slate-500" />
                <p className="text-xs font-medium text-slate-300">Camera Standby</p>
                <p className="text-[10px] text-slate-400">Click &ldquo;Start Camera&rdquo; below</p>
              </div>
            ) : livenessStage === 0 ? (
              <div className="absolute inset-0 bg-black/30 flex flex-col items-center justify-center p-3 text-center z-20 animate-in fade-in duration-200">
                <div className="w-12 h-12 rounded-full bg-blue-500/20 border border-blue-400 flex items-center justify-center text-blue-300 mb-2">
                  <User size={24} className="animate-pulse" />
                </div>
                <span className="text-xs font-bold text-white bg-slate-950/80 px-2.5 py-1 rounded-full border border-blue-400/40 shadow-sm">
                  Position Face
                </span>
                <span className="text-[10px] text-blue-200 mt-1 font-mono">Stage 0</span>
              </div>
            ) : livenessStage === 1 ? (
              <div className="absolute inset-0 bg-black/30 flex flex-col items-center justify-center p-3 text-center z-20 animate-in fade-in duration-200">
                <div className="w-12 h-12 rounded-full bg-amber-500/20 border border-amber-400 flex items-center justify-center text-amber-300 mb-2 animate-pulse">
                  <Eye size={24} />
                </div>
                <span className="text-xs font-bold text-amber-300 bg-slate-950/80 px-2.5 py-1 rounded-full border border-amber-400/40 shadow-sm">
                  Blink Twice
                </span>
                <span className="text-[10px] text-amber-200 mt-1 font-mono">Stage 1 of 4</span>
              </div>
            ) : livenessStage === 2 ? (
              <div className="absolute inset-0 bg-black/30 flex flex-col items-center justify-center p-3 text-center z-20 animate-in fade-in duration-200">
                <div className="w-12 h-12 rounded-full bg-blue-500/20 border border-blue-400 flex items-center justify-center text-blue-300 mb-2 animate-bounce">
                  <ArrowUp size={24} />
                </div>
                <span className="text-xs font-bold text-blue-300 bg-slate-950/80 px-2.5 py-1 rounded-full border border-blue-400/40 shadow-sm">
                  Look Up
                </span>
                <span className="text-[10px] text-blue-200 mt-1 font-mono">Stage 2 of 4</span>
              </div>
            ) : livenessStage === 3 ? (
              <div className="absolute inset-0 bg-black/30 flex flex-col items-center justify-center p-3 text-center z-20 animate-in fade-in duration-200">
                <div className="w-12 h-12 rounded-full bg-blue-500/20 border border-blue-400 flex items-center justify-center text-blue-300 mb-2 animate-bounce">
                  <ArrowDown size={24} />
                </div>
                <span className="text-xs font-bold text-blue-300 bg-slate-950/80 px-2.5 py-1 rounded-full border border-blue-400/40 shadow-sm">
                  Look Down
                </span>
                <span className="text-[10px] text-blue-200 mt-1 font-mono">Stage 3 of 4</span>
              </div>
            ) : livenessStage === 4 ? (
              <div className="absolute inset-0 bg-emerald-950/40 flex flex-col items-center justify-center p-3 text-center z-20 animate-in zoom-in-95 duration-200">
                <div className="w-14 h-14 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.5)] mb-2">
                  <CheckCircle2 size={32} />
                </div>
                <span className="text-xs font-bold text-emerald-300 bg-slate-950/80 px-3 py-1 rounded-full border border-emerald-400/40 shadow-sm">
                  Liveness Verified ✓
                </span>
                <span className="text-[10px] text-emerald-200 mt-1 font-mono">Stage 4 of 4</span>
              </div>
            ) : livenessStage === 5 ? (
              <div className="absolute inset-0 bg-slate-950/70 flex flex-col items-center justify-center p-3 text-center z-20 animate-in fade-in duration-200">
                <div className="w-12 h-12 rounded-full bg-[#003366]/60 border border-blue-400 flex items-center justify-center text-blue-300 mb-2 animate-spin">
                  <RefreshCw size={24} />
                </div>
                <span className="text-xs font-bold text-blue-200 bg-slate-950/90 px-3 py-1 rounded-full border border-blue-400/40 shadow-sm">
                  Sending to FastAPI...
                </span>
                <span className="text-[10px] text-slate-300 mt-1 font-mono">Awaiting Decision</span>
              </div>
            ) : isAnalyzing ? (
              <div className="text-center text-amber-300 space-y-2 p-2 z-10">
                <Scan size={36} className="mx-auto text-amber-400 animate-spin" />
                <p className="text-xs font-bold tracking-wide">3D BIOMETRIC SCAN</p>
                <p className="text-[10px] text-amber-200/80 font-mono">Extracting landmarks...</p>
              </div>
            ) : (
              <div className="text-center text-slate-300 space-y-1 drop-shadow-md z-10">
                <Scan size={32} className="mx-auto text-blue-400/90" />
                <span className="text-[11px] font-mono text-white/90 bg-slate-900/60 px-2 py-0.5 rounded backdrop-blur-xs block">
                  Align Face in Oval
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Camera Info Overlay */}
        <div className="absolute bottom-3 inset-x-4 flex items-center justify-between text-[11px] font-mono text-slate-400 z-10 pointer-events-none drop-shadow">
          <span className="flex items-center gap-1 text-white/80">
            <Zap size={12} className={isCameraActive ? "text-emerald-400" : "text-slate-500"} />
            ISO 400 · 60 FPS
          </span>
          <span className="text-white/80">
            {isCameraActive
              ? hasLiveFeed
                ? "HARDWARE WEBCAM SENSOR"
                : "HD 1080P SIMULATED SENSOR"
              : "FEED OFFLINE"}
          </span>
        </div>

        {/* Analyzing Overlay Banner */}
        {(isAnalyzing || (livenessStage !== null && livenessStage !== undefined)) && (
          <div className="absolute inset-x-0 bottom-0 bg-slate-900/95 backdrop-blur-xs p-3 border-t border-amber-500/40 z-20 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-amber-400">
              <span className="flex items-center gap-2">
                <RefreshCw size={13} className="animate-spin text-amber-400" />
                {livenessMessage ||
                  (livenessStage !== null &&
                    livenessStage !== undefined &&
                    STAGE_CONFIG[livenessStage]?.instruction) ||
                  "Analyzing Face & Liveness Vectors..."}
              </span>
              <span className="font-mono">{displayProgress}%</span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
              <div
                className={`h-full transition-all duration-200 ease-out ${
                  livenessStage === 4 ? "bg-emerald-400 shadow-[0_0_8px_#10b981]" : "bg-amber-400"
                }`}
                style={{ width: `${displayProgress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Camera fallback notification if permission was denied */}
      {cameraNotice && (
        <div className="px-3 py-1.5 rounded-lg bg-slate-100 border border-slate-200 text-[11px] text-slate-600 flex items-center gap-1.5">
          <AlertCircle size={13} className="text-amber-500 shrink-0" />
          <span>{cameraNotice}</span>
        </div>
      )}

      {/* Control Buttons */}
      <div className="space-y-2 pt-1">
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onToggleCamera}
            className={`py-2.5 px-4 text-xs font-semibold rounded-lg border transition-all flex items-center justify-center gap-2 ${
              isCameraActive
                ? "bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200"
                : "btn-primary"
            }`}
            disabled={isAnalyzing}
          >
            {isCameraActive ? <VideoOff size={15} /> : <Video size={15} />}
            {isCameraActive ? "Stop Camera" : "Start Camera"}
          </button>

          <button
            type="button"
            onClick={onCapture}
            disabled={!isCameraActive || isAnalyzing || !isSessionReady || isCompleted || disabled}
            className="btn-accent py-2.5 px-4 text-xs font-semibold rounded-lg shadow-sm flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Scan size={15} />
            Capture Face
          </button>
        </div>

        {/* Helper status text */}
        {!isSessionReady ? (
          <p className="text-[11px] text-amber-600 font-medium text-center bg-amber-50 py-1 rounded border border-amber-200">
            Click &ldquo;Start Verification&rdquo; on the customer profile to activate capture.
          </p>
        ) : (
          <p className="text-[11px] text-slate-500 text-center">
            Hardware-isolated in-bank capture session · No biometric data stored on customer device.
          </p>
        )}
      </div>
    </div>
  );
}


