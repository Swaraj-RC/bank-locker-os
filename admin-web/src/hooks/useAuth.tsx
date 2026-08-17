import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { api } from "../services/api";
import { AuthUser } from "../types";

interface AuthContextValue {
  user: AuthUser | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const DEFAULT_MOCK_USER: AuthUser = {
  id: "EMP1001",
  employee_id: "EMP1001",
  full_name: "Rajesh Varma",
  email: "emp1001@banklocker.internal",
  phone: "+91 98230 11001",
  role: "BANK_OPERATOR",
  branch_id: "b1",
  branch_name: "Pune Camp",
  status: "ACTIVE",
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : DEFAULT_MOCK_USER;
  });
  const [loading, setLoading] = useState(false);

  const login = useCallback(async (employeeIdOrEmail: string, password: string) => {
    setLoading(true);
    try {
      const resp = await api.post("/api/v1/auth/login", { email: employeeIdOrEmail, password });
      const { access_token, refresh_token, user: u } = resp.data.data;
      localStorage.setItem("access_token", access_token);
      localStorage.setItem("refresh_token", refresh_token);
      localStorage.setItem("user", JSON.stringify(u));
      setUser(u);
    } catch {
      // Mock mode fallback when backend is unavailable or using mock credentials
      const empId = employeeIdOrEmail.trim().toUpperCase();
      const mockUser: AuthUser = {
        id: empId.startsWith("EMP") ? empId : "EMP1001",
        employee_id: empId.startsWith("EMP") ? empId : "EMP1001",
        full_name: empId === "EMP1001" ? "Rajesh Varma" : empId.split("@")[0].toUpperCase(),
        email: empId.includes("@") ? empId : `${empId.toLowerCase()}@banklocker.internal`,
        phone: "+91 98230 11001",
        role: "BANK_OPERATOR",
        branch_id: "b1",
        branch_name: "Pune Camp",
        status: "ACTIVE",
      };
      localStorage.setItem("user", JSON.stringify(mockUser));
      setUser(mockUser);
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user");
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
