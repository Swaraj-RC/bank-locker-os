import { useState, useEffect } from "react";
import { Camera, RefreshCw, Scan, CheckCircle2, ShieldAlert, Zap, Radio } from "lucide-react";

interface CameraPanelProps {
  isAnalyzing: boolean;
  onCapture: () => void;
  isCameraActive: boolean;
  onToggleCamera: () => void;
  capturedPreview?: string | null;
  onReset?: () => void;
}

export function CameraPanel({
  isAnalyzing,
  onCapture,
  isCameraActive,
  onToggleCamera,
  capturedPreview,
  onReset,
}: CameraPanelProps) {
  const [scanProgress, setScanProgress] = useState(0);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isAnalyzing) {
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
  }, [isAnalyzing]);

  return (
    <div className="card p-5 flex flex-col justify-between h-full space-y-4">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-2.5 h-2.5 rounded-full ${isCameraActive ? "bg-emerald-500 animate-pulse" : "bg-slate-300"}`} />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-700">AI Live Verification Terminal</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
            AI Vision v2.4
          </span>
          {isCameraActive && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
              <Radio size={12} className="animate-pulse text-emerald-600" /> LIVE FEED
            </span>
          )}
        </div>
      </div>

      {/* Main Camera Viewfinder Placeholder */}
      <div className="relative aspect-4/3 w-full bg-[#0F172A] rounded-xl overflow-hidden flex items-center justify-center border-2 border-slate-800 shadow-inner">
        {/* Subtle grid pattern */}
        <div
          className="absolute inset-0 opacity-15"
          style={{
            backgroundImage:
              "radial-gradient(rgba(255, 255, 255, 0.4) 1px, transparent 1px), radial-gradient(rgba(255, 255, 255, 0.4) 1px, #0F172A 1px)",
            backgroundSize: "20px 20px",
            backgroundPosition: "0 0, 10px 10px",
          }}
        />

        {/* Viewfinder Corner Brackets */}
        <div className="absolute top-3 left-3 w-6 h-6 border-t-2 border-l-2 border-amber-400/80" />
        <div className="absolute top-3 right-3 w-6 h-6 border-t-2 border-r-2 border-amber-400/80" />
        <div className="absolute bottom-3 left-3 w-6 h-6 border-b-2 border-l-2 border-amber-400/80" />
        <div className="absolute bottom-3 right-3 w-6 h-6 border-b-2 border-r-2 border-amber-400/80" />

        {/* Center Reticle / Circular Face Guide */}
        <div className="relative z-10 flex flex-col items-center justify-center">
          <div
            className={`w-52 h-64 rounded-[48%] border-2 transition-all duration-300 flex items-center justify-center relative ${
              isAnalyzing
                ? "border-amber-400 shadow-[0_0_25px_rgba(245,158,11,0.5)] scale-105"
                : isCameraActive
                ? "border-blue-400/90 shadow-[0_0_15px_rgba(37,99,235,0.3)]"
                : "border-slate-600 border-dashed opacity-50"
            }`}
          >
            {/* Horizontal & Vertical Crosshairs */}
            <div className="absolute inset-x-4 top-1/2 h-px bg-white/20 -translate-y-1/2" />
            <div className="absolute inset-y-4 left-1/2 w-px bg-white/20 -translate-x-1/2" />

            {/* Inner Face Silhouette Guide */}
            {!isCameraActive ? (
              <div className="text-center text-slate-400 p-4 space-y-2">
                <Camera size={38} className="mx-auto text-slate-500" />
                <p className="text-xs font-medium text-slate-300">Camera Standby</p>
                <p className="text-[10px] text-slate-400">Click &ldquo;Start Camera&rdquo; below</p>
              </div>
            ) : isAnalyzing ? (
              <div className="text-center text-amber-300 space-y-2 p-2">
                <Scan size={36} className="mx-auto text-amber-400 animate-spin" />
                <p className="text-xs font-bold tracking-wide">3D BIOMETRIC SCAN</p>
                <p className="text-[10px] text-amber-200/80 font-mono">Extracting landmarks...</p>
              </div>
            ) : (
              <div className="text-center text-slate-300 space-y-1">
                <Scan size={32} className="mx-auto text-blue-400/80" />
                <span className="text-[11px] font-mono text-slate-300 block">Align Face in Oval</span>
              </div>
            )}

            {/* Scanning Laser Line when analyzing */}
            {isAnalyzing && (
              <div className="absolute inset-x-2 h-0.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent shadow-[0_0_12px_#f59e0b] animate-scan-line" />
            )}
          </div>
        </div>

        {/* Camera Info Overlay */}
        <div className="absolute bottom-3 inset-x-4 flex items-center justify-between text-[11px] font-mono text-slate-400 z-10">
          <span className="flex items-center gap-1">
            <Zap size={12} className={isCameraActive ? "text-emerald-400" : "text-slate-500"} />
            ISO 400 · 60 FPS
          </span>
          <span>{isCameraActive ? "HD 1080P BIOMETRIC SENSOR" : "FEED OFFLINE"}</span>
        </div>

        {/* Analyzing Overlay Banner */}
        {isAnalyzing && (
          <div className="absolute inset-x-0 bottom-0 bg-slate-900/90 backdrop-blur-xs p-3 border-t border-amber-500/40 z-20 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-amber-400">
              <span className="flex items-center gap-2">
                <RefreshCw size={13} className="animate-spin text-amber-400" />
                Analyzing Face & Liveness Vectors...
              </span>
              <span className="font-mono">{scanProgress}%</span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-amber-400 h-full transition-all duration-150 ease-out"
                style={{ width: `${scanProgress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Control Buttons */}
      <div className="grid grid-cols-2 gap-3 pt-1">
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
          <Camera size={15} />
          {isCameraActive ? "Stop Camera" : "Start Camera"}
        </button>

        <button
          type="button"
          onClick={onCapture}
          disabled={!isCameraActive || isAnalyzing}
          className="btn-accent py-2.5 px-4 text-xs font-semibold rounded-lg shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Scan size={15} />
          Capture Face
        </button>
      </div>

      {/* Helper Note */}
      <p className="text-[11px] text-slate-500 text-center">
        Hardware-isolated in-bank capture session · No data persisted on customer mobile device.
      </p>
    </div>
  );
}
