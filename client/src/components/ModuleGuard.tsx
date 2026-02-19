import { Navigate } from "react-router";
import type { ReactElement } from "react";
import { useAuth } from "../contexts/AuthContext";
import type { ModulePermission } from "../types";

type ModuleGuardProps = {
  module: ModulePermission;
  children: ReactElement;
};

export function ModuleGuard({ module, children }: ModuleGuardProps) {
  const { user, isLoading, isAuthenticated } = useAuth();
  const moduleRouteMap: Record<ModulePermission, string> = {
    dashboard: "/",
    members: "/members",
    programs: "/programs",
    attendance: "/attendance",
    messaging: "/messaging",
    finance: "/finance",
    audit: "/audit",
    settings: "/settings",
    users: "/user-management",
  };

  if (isLoading) return null;
  if (!isAuthenticated || !user) return <Navigate to="/login" replace />;
  if (!user.modules.includes(module)) {
    const fallback = user.modules.length > 0 ? moduleRouteMap[user.modules[0]] : "/login";
    return <Navigate to={fallback} replace />;
  }

  return children;
}
