import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import { AdminLayout } from "./layouts/AdminLayout";
import { LoginPage } from "./pages/LoginPage";
import { Dashboard } from "./pages/Dashboard";
import { CustomerVerificationPage } from "./pages/CustomerVerificationPage";
import { LockerGrid } from "./pages/LockerGrid";
import { VerificationSessionsPage } from "./pages/VerificationSessionsPage";
import { AuditLogs } from "./pages/AuditLogs";
import { SettingsPage } from "./pages/SettingsPage";
import { Requests } from "./pages/Requests";
import { RequestDetailPage } from "./pages/RequestDetailPage";
import { CustomersPage } from "./pages/CustomersPage";
import { BranchesPage } from "./pages/BranchesPage";
import { AnalyticsPage } from "./pages/AnalyticsPage";

function ProtectedRoute({ children }: { children: JSX.Element }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === "CUSTOMER") return <Navigate to="/login" replace />;
  return children;
}

function AppRoutes() {
  return (
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

        {/* Legacy / Auxiliary route fallbacks */}
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
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
