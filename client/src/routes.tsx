import { createHashRouter, Navigate } from "react-router";
import { Root } from "./components/Root";
import { Messaging } from "./pages/Messaging";
import { SmsLogs } from "./pages/SmsLogs";
import { Templates } from "./pages/Templates";
import { Settings } from "./pages/Settings";
import Login from "./pages/Login";
import { ModuleGuard } from "./components/ModuleGuard";
import { Members } from "./pages/Members";
import { Automation, AutomationNew } from "./pages/Automation";

export const router = createHashRouter([
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
        element: <Navigate to="/messaging" replace />,
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
        path: "sms-logs",
        element: (
          <ModuleGuard module="messaging">
            <SmsLogs />
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
        path: "automation",
        element: (
          <ModuleGuard module="automation">
            <Automation />
          </ModuleGuard>
        ),
      },
      {
        path: "automation/new",
        element: (
          <ModuleGuard module="automation">
            <AutomationNew />
          </ModuleGuard>
        ),
      },
      {
        path: "automation/:automationId/edit",
        element: (
          <ModuleGuard module="automation">
            <AutomationNew />
          </ModuleGuard>
        ),
      },
      {
        path: "templates",
        element: (
          <ModuleGuard module="messaging">
            <Templates />
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
        path: "*",
        element: <Navigate to="/messaging" replace />,
      },
    ],
  },
]);
