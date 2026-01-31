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
        element: <Dashboard />,
      },
      {
        path: "members",
        element: <Members />,
      },
      {
        path: "members/:memberId",
        element: <MemberProfile />,
      },
      {
        path: "programs",
        element: <Programs />,
      },
      {
        path: "attendance",
        element: <Attendance />,
      },
      {
        path: "messaging",
        element: <Messaging />,
      },
      {
        path: "finance",
        element: <Finance />,
      },
      {
        path: "audit",
        element: <AuditLogs />,
      },
      {
        path: "settings",
        element: <Settings />,
      },
      {
        path: "*",
        element: <Navigate to="/" replace />,
      },
    ],
  },
]);