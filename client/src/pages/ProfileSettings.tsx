import { Shield, UserCircle2, Mail, KeyRound } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

const moduleLabels: Record<string, string> = {
  dashboard: "Dashboard",
  members: "Members",
  programs: "Programs",
  attendance: "Attendance",
  messaging: "Messaging",
  finance: "Finance",
  audit: "Audit Logs",
  settings: "Settings",
  users: "User Management",
};

export function ProfileSettings() {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-neutral-900 text-2xl font-bold">Profile Settings</h1>
        <p className="text-neutral-600">View your account details, access level, and assigned permissions.</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden">
        <div className="p-6 border-b border-neutral-200 bg-neutral-50">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-blue-900 text-white flex items-center justify-center">
              <UserCircle2 className="w-8 h-8" />
            </div>
            <div>
              <p className="text-lg font-semibold text-neutral-900">{user.name}</p>
              <p className="text-sm text-neutral-500">{user.email}</p>
            </div>
          </div>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border border-neutral-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2 text-neutral-700">
              <Mail className="w-4 h-4" />
              <span className="text-sm font-medium">Email</span>
            </div>
            <p className="text-neutral-900 font-semibold">{user.email}</p>
          </div>

          <div className="border border-neutral-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2 text-neutral-700">
              <Shield className="w-4 h-4" />
              <span className="text-sm font-medium">Access Level</span>
            </div>
            <p className="text-neutral-900 font-semibold capitalize">{user.role}</p>
          </div>
        </div>

        <div className="px-6 pb-6">
          <div className="border border-neutral-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3 text-neutral-700">
              <KeyRound className="w-4 h-4" />
              <span className="text-sm font-medium">Assigned Permissions</span>
            </div>

            {user.modules.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {user.modules.map((module) => (
                  <span
                    key={module}
                    className="inline-flex items-center px-2.5 py-1 rounded-full text-xs bg-primary-50 text-primary-700 font-medium"
                  >
                    {moduleLabels[module] || module}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-neutral-500">No permissions assigned.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
