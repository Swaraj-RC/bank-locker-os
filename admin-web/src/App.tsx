import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import { AdminLayout } from "./layouts/AdminLayout";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { ShieldCheck, RefreshCw } from "lucide-react";

// Lazy-loaded route components for code splitting & fast initial paint
const LoginPage = lazy(() =>
  import("./pages/LoginPage").then((m) => ({ default: m.LoginPage }))
);
const Dashboard = lazy(() =>
  import("./pages/Dashboard").then((m) => ({ default: m.Dashboard }))
);
const CustomerVerificationPage = lazy(() =>
  import("./pages/CustomerVerificationPage").then((m) => ({
    default: m.CustomerVerificationPage,
  }))
);
const LockerGrid = lazy(() =>
  import("./pages/LockerGrid").then((m) => ({ default: m.LockerGrid }))
);
const VerificationSessionsPage = lazy(() =>
  import("./pages/VerificationSessionsPage").then((m) => ({
    default: m.VerificationSessionsPage,
  }))
);
const AuditLogs = lazy(() =>
  import("./pages/AuditLogs").then((m) => ({ default: m.AuditLogs }))
);
const SettingsPage = lazy(() =>
  import("./pages/SettingsPage").then((m) => ({ default: m.SettingsPage }))
);
const Requests = lazy(() =>
  import("./pages/Requests").then((m) => ({ default: m.Requests }))
);
const RequestDetailPage = lazy(() =>
  import("./pages/RequestDetailPage").then((m) => ({
    default: m.RequestDetailPage,
  }))
);
const CustomersPage = lazy(() =>
  import("./pages/CustomersPage").then((m) => ({ default: m.CustomersPage }))
);
const BranchesPage = lazy(() =>
  import("./pages/BranchesPage").then((m) => ({ default: m.BranchesPage }))
);
const AnalyticsPage = lazy(() =>
  import("./pages/AnalyticsPage").then((m) => ({ default: m.AnalyticsPage }))
);

function PageLoadingFallback() {
  return (
    <div className="h-full min-h-[50vh] flex flex-col items-center justify-center p-8 space-y-3">
      <div className="w-10 h-10 rounded-xl bg-[#003366] text-white flex items-center justify-center shadow-md animate-pulse">
        <ShieldCheck size={22} className="text-blue-400" />
      </div>
      <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
        <RefreshCw size={14} className="animate-spin text-[#003366]" />
        <span>Loading secure terminal interface...</span>
      </div>
    </div>
  );
}

function ProtectedRoute({ children }: { children: JSX.Element }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === "CUSTOMER") return <Navigate to="/login" replace />;
  return children;
}

function AppRoutes() {
  return (
    <Suspense fallback={<PageLoadingFallback />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="verification" element={<CustomerVerificationPage />} />
          <Route path="lockers" element={<LockerGrid />} />
          <Route path="sessions" element={<VerificationSessionsPage />} />
          <Route path="audit-logs" element={<AuditLogs />} />
          <Route path="settings" element={<SettingsPage />} />

          {/* Auxiliary & Administration routes */}
          <Route path="vault" element={<LockerGrid />} />
          <Route path="requests" element={<Requests />} />
          <Route path="requests/:requestId" element={<RequestDetailPage />} />
          <Route path="compliance" element={<AuditLogs />} />
          <Route path="customers" element={<CustomersPage />} />
          <Route path="branches" element={<BranchesPage />} />
          <Route path="analytics" element={<AnalyticsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Suspense>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </ErrorBoundary>
  );
}

