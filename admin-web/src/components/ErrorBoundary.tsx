import React, { Component, ErrorInfo, ReactNode } from "react";
import { ShieldAlert, RefreshCw, LayoutDashboard } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[Banking Application ErrorBoundary caught exception]:", error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({ hasError: false });
    window.location.reload();
  };

  private handleReturnDashboard = () => {
    this.setState({ hasError: false });
    window.location.href = "/dashboard";
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6 select-none">
          <div className="bg-white rounded-2xl max-w-lg w-full p-8 shadow-xl border border-slate-200 text-center space-y-6 animate-in zoom-in-95 duration-150">
            <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto shadow-xs">
              <ShieldAlert size={32} />
            </div>

            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-[#003366] bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-md">
                SECURE TERMINAL GUARD
              </div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                Application Error Encountered
              </h1>
              <p className="text-xs text-slate-500 leading-relaxed max-w-sm mx-auto">
                The banking operational interface encountered an unexpected rendering exception. System state has been secured and logged.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-left text-[11px] text-slate-600 space-y-1 font-mono">
              <div className="flex justify-between text-slate-400">
                <span>Facility: Pune Camp</span>
                <span>Code: ERR_APP_CRASH</span>
              </div>
              <div className="text-slate-700 font-semibold">
                Reference: SES-{Date.now().toString().slice(-6)}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={this.handleRetry}
                className="btn-primary py-2.5 px-4 text-xs font-bold flex items-center justify-center gap-2"
              >
                <RefreshCw size={14} /> Retry Operation
              </button>

              <button
                type="button"
                onClick={this.handleReturnDashboard}
                className="btn-secondary py-2.5 px-4 text-xs font-semibold flex items-center justify-center gap-2"
              >
                <LayoutDashboard size={14} /> Return to Dashboard
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
