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
    members: "/members",
    messaging: "/messaging",
    automation: "/automation",
    settings: "/settings",
    dashboard: "/messaging",
    analytics: "/messaging",
    programs: "/messaging",
    attendance: "/messaging",
    finance: "/messaging",
    soulcenter: "/messaging",
    audit: "/messaging",
    users: "/messaging",
  };

  if (isLoading) return null;
  if (!isAuthenticated || !user) return <Navigate to="/login" replace />;
  if (!user.modules.includes(module)) {
    const fallback = user.modules.length > 0 && moduleRouteMap[user.modules[0]] ? moduleRouteMap[user.modules[0]] : "/messaging";
    return <Navigate to={fallback} replace />;
  }

  return children;
}
