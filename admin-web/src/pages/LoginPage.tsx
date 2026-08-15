import { useState, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { apiErrorMessage } from "../services/api";

export function LoginPage() {
  const { login, loading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("operator@demo.bank");
  const [password, setPassword] = useState("Demo@1234");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await login(email, password);
      navigate("/");
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-primary font-bold text-lg tracking-wide">DIGITAL LOCKER</div>
          <div className="text-slate-500 text-sm">Bank Admin Portal</div>
        </div>
        <form onSubmit={handleSubmit} className="card p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Email</label>
            <input
              type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Password</label>
            <input
              type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              required
            />
          </div>
          {error && <div className="text-danger text-xs bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</div>}
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? "Signing in..." : "Sign In"}
          </button>
          <div className="text-xs text-slate-400 pt-2 border-t border-border">
            Demo accounts (password: <span className="font-mono">Demo@1234</span>):
            <div className="mt-1 space-y-0.5 font-mono text-slate-500">
              <div>operator@demo.bank</div>
              <div>manager@demo.bank</div>
              <div>admin@demo.bank</div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
