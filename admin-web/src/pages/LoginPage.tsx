import { useState, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { apiErrorMessage } from "../services/api";
import { ShieldCheck, Lock, UserCheck, KeyRound, Building2, ArrowRight } from "lucide-react";

export function LoginPage() {
  const { login, loading } = useAuth();
  const navigate = useNavigate();
  const [employeeId, setEmployeeId] = useState("EMP1001");
  const [password, setPassword] = useState("admin123");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await login(employeeId, password);
      navigate("/dashboard");
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  const fillMockCredentials = () => {
    setEmployeeId("EMP1001");
    setPassword("admin123");
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      {/* Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center space-y-2">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-[#003366] border border-blue-400/40 flex items-center justify-center text-white shadow-md">
          <ShieldCheck size={32} className="text-blue-300" />
        </div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">
          SMART<span className="text-[#2563EB]">LOCKER</span>
        </h1>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          AI-Assisted Bank Locker Verification OS
        </p>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-xs text-slate-600 font-medium mt-1">
          <Building2 size={13} className="text-[#003366]" /> Pune Camp Branch Terminal #01
        </div>
      </div>

      {/* Main Login Card */}
      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="card p-8 space-y-6">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-base font-bold text-slate-900">Staff Secure Sign-In</h2>
            <p className="text-xs text-slate-500 mt-0.5">Enter bank employee credentials to authorize verification console</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Employee ID
              </label>
              <div className="relative">
                <UserCheck size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  placeholder="e.g. EMP1001"
                  className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#003366]/20 focus:border-[#003366] transition-all"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <KeyRound size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#003366]/20 focus:border-[#003366] transition-all"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="text-rose-700 text-xs bg-rose-50 border border-rose-200 rounded-lg p-3 font-medium">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-2.5 text-sm font-bold flex items-center justify-center gap-2"
            >
              {loading ? "Authenticating..." : "Access Verification Console"}
              <ArrowRight size={16} />
            </button>
          </form>

          {/* Quick Mock Credentials Card */}
          <div className="pt-4 border-t border-slate-100 bg-slate-50/80 -mx-8 -mb-8 p-5 rounded-b-[12px] space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                Demo Credentials
              </span>
              <button
                type="button"
                onClick={fillMockCredentials}
                className="text-[11px] text-[#2563EB] font-bold hover:underline"
              >
                Auto-fill
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="bg-white p-2 rounded border border-slate-200">
                <span className="text-slate-400 text-[10px] block">EMP ID</span>
                <span className="font-bold text-slate-900">EMP1001</span>
              </div>
              <div className="bg-white p-2 rounded border border-slate-200">
                <span className="text-slate-400 text-[10px] block">PASSWORD</span>
                <span className="font-bold text-slate-900">admin123</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

