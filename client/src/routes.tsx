import { createBrowserRouter, Navigate } from "react-router";
import { Root } from "./components/Root";
import { Members } from "./pages/Members";
import { MemberProfile } from "./pages/MemberProfile";
import { Programs } from "./pages/Programs";
import { Attendance } from "./pages/Attendance";
import { Messaging } from "./pages/Messaging";
import { Finance } from "./pages/Finance";
import { AuditLogs } from "./pages/AuditLogs";
import { Settings } from "./pages/Settings";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import { UserManagement } from "./pages/UserManagement";
import { ModuleGuard } from "./components/ModuleGuard";
import { ProfileSettings } from "./pages/ProfileSettings";

export const router = createBrowserRouter([
  {
    path: "/login",
    element: <Login />,
  },
  {
    path: "/",
    element: <Root />,
    children: [
      {
        index: true,
        element: (
          <ModuleGuard module="dashboard">
            <Dashboard />
          </ModuleGuard>
        ),
      },
      {
        path: "members",
        element: (
          <ModuleGuard module="members">
            <Members />
          </ModuleGuard>
        ),
      },
      {
        path: "members/:memberId",
        element: (
          <ModuleGuard module="members">
            <MemberProfile />
          </ModuleGuard>
        ),
      },
      {
        path: "programs",
        element: (
          <ModuleGuard module="programs">
            <Programs />
          </ModuleGuard>
        ),
      },
      {
        path: "attendance",
        element: (
          <ModuleGuard module="attendance">
            <Attendance />
          </ModuleGuard>
        ),
      },
      {
        path: "messaging",
        element: (
          <ModuleGuard module="messaging">
            <Messaging />
          </ModuleGuard>
        ),
      },
      {
        path: "finance",
        element: (
          <ModuleGuard module="finance">
            <Finance />
          </ModuleGuard>
        ),
      },
      {
        path: "audit",
        element: (
          <ModuleGuard module="audit">
            <AuditLogs />
          </ModuleGuard>
        ),
      },
      {
        path: "user-management",
        element: (
          <ModuleGuard module="users">
            <UserManagement />
          </ModuleGuard>
        ),
      },
      {
        path: "settings",
        element: (
          <ModuleGuard module="settings">
            <Settings />
          </ModuleGuard>
        ),
      },
      {
        path: "profile-settings",
        element: <ProfileSettings />,
      },
      {
        path: "*",
        element: <Navigate to="/" replace />,
      },
    ],
  },
]);
