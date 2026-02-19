import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import API from "../api/axios";
import type { User } from "../types";

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);
const AUTH_USER_STORAGE_KEY = "auth_user";

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const mapRole = (role?: string): User["role"] => {
    const lower = String(role || "").toLowerCase();
    if (lower === "admin") return "admin";
    if (lower === "finance") return "finance";
    if (lower === "staff") return "staff";
    return "pastor";
  };

  const modulesByRole: Record<User["role"], User["modules"]> = {
    admin: ["dashboard", "members", "programs", "attendance", "messaging", "finance", "audit", "settings", "users"],
    pastor: ["dashboard", "members", "programs", "attendance", "messaging", "audit"],
    finance: ["dashboard", "finance", "audit", "members"],
    staff: ["dashboard", "members", "programs", "attendance", "messaging"],
  };

  const hydrateFromToken = (token: string): User | null => {
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      const role = mapRole(payload.role);
      const now = new Date().toISOString();

      return {
        id: payload.id,
        name: payload.name || "User",
        email: payload.email || "",
        role,
        modules: modulesByRole[role],
        isActive: true,
        createdAt: now,
        updatedAt: now,
      };
    } catch {
      return null;
    }
  };

  const normalizeUser = (raw: any): User => {
    const role = mapRole(raw?.role);
    const now = new Date().toISOString();

    return {
      id: String(raw?.id || ""),
      name: String(raw?.name || "User"),
      email: String(raw?.email || ""),
      role,
      modules: Array.isArray(raw?.modules) && raw.modules.length > 0 ? raw.modules : modulesByRole[role],
      isActive: raw?.isActive === undefined ? true : Boolean(raw.isActive),
      createdAt: raw?.createdAt || now,
      updatedAt: raw?.updatedAt || now,
    };
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    const storedUser = localStorage.getItem(AUTH_USER_STORAGE_KEY);
    if (!token) {
      setIsLoading(false);
      return;
    }

    const restored = storedUser ? normalizeUser(JSON.parse(storedUser)) : hydrateFromToken(token);
    if (restored) {
      setUser(restored);
    } else {
      localStorage.removeItem("token");
      localStorage.removeItem(AUTH_USER_STORAGE_KEY);
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    const res = await API.post("/auth/login", { email, password });

    const token = res.data?.data?.token;
    const apiUser = res.data?.data?.user;
    if (!token) {
      throw new Error("Token missing from login response");
    }
    if (!apiUser) {
      throw new Error("User missing from login response");
    }

    localStorage.setItem("token", token);
    const loggedInUser = normalizeUser(apiUser);
    localStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(loggedInUser));
    setUser(loggedInUser);
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem(AUTH_USER_STORAGE_KEY);
    setUser(null);
  };

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isLoading,
      login,
      logout,
    }),
    [user, isLoading]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};
