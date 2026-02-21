import { useEffect, useState } from "react";
import { Bell, Save } from "lucide-react";
import { useToast } from "../contexts/ToastContext";
import { fetchSettings, upsertSettings, type SettingsPayload } from "../api/backend";
import { useSidebar } from "../contexts/SidebarContext";
import { useTheme } from "../contexts/ThemeContext";

const defaults = {
  enableProgramReminders: true,
  enableMemberAddedNotifications: true,
  enableDonationNotifications: true,
  enableUserAddedNotifications: true,
  programNotificationTemplate:
    "A new church program has been added.\nProgram: {{program_title}}\nDate: {{program_date}}\nLocation: {{program_location}}\nDetails: {{program_description}}\n- {{church_name}}",
  memberAddedNotificationTemplate:
    "Hello {{member_name}}, welcome to our church family. Your membership profile has been created successfully. - {{church_name}}",
  donationNotificationTemplate:
    "A new finance entry has been recorded.\nType: {{entry_type}}\nAmount: {{amount}}\nNote: {{note}}\n- {{church_name}}",
  userAddedNotificationTemplate:
    "Hello {{user_name}},\nYour account has been created.\nEmail: {{user_email}}\nPassword: {{password}}\nRole: {{role}}\nPlease log in and change your password immediately.\n- {{church_name}}",
};

export function NotificationsConfiguration() {
  const toast = useToast();
  const { isCollapsed } = useSidebar();
  const { theme } = useTheme();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<SettingsPayload>({
    churchName: "Church",
    ...defaults,
  });

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const backendSettings = await fetchSettings();
        if (!backendSettings) return;
        setSettings((prev) => ({
          ...prev,
          ...backendSettings,
          churchName: backendSettings.churchName || prev.churchName,
          enableProgramReminders:
            backendSettings.enableProgramReminders ?? prev.enableProgramReminders,
          enableMemberAddedNotifications:
            backendSettings.enableMemberAddedNotifications ?? prev.enableMemberAddedNotifications,
          enableDonationNotifications:
            backendSettings.enableDonationNotifications ?? prev.enableDonationNotifications,
          enableUserAddedNotifications:
            backendSettings.enableUserAddedNotifications ?? prev.enableUserAddedNotifications,
          programNotificationTemplate:
            backendSettings.programNotificationTemplate || prev.programNotificationTemplate,
          memberAddedNotificationTemplate:
            backendSettings.memberAddedNotificationTemplate || prev.memberAddedNotificationTemplate,
          donationNotificationTemplate:
            backendSettings.donationNotificationTemplate || prev.donationNotificationTemplate,
          userAddedNotificationTemplate:
            backendSettings.userAddedNotificationTemplate || prev.userAddedNotificationTemplate,
        }));
      } catch (e: any) {
        toast.error(e?.response?.data?.message || e?.message || "Failed to load notification settings");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const save = async () => {
    try {
      setSaving(true);
      const saved = await upsertSettings({
        ...settings,
        churchName: settings.churchName || "Church",
      });
      setSettings((prev) => ({ ...prev, ...saved }));
      toast.success("Notification configuration saved");
    } catch (e: any) {
      toast.error(e?.response?.data?.message || e?.message || "Failed to save notification settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-neutral-900 mb-0">Notifications Configuration</h1>
        <p className="text-neutral-600">Configure the messages used for system email notifications</p>
      </div>

      <div className="space-y-6 pb-24">
        <NotificationCard
          title="Program Reminders"
          enabled={Boolean(settings.enableProgramReminders)}
          onToggle={(value) => setSettings((prev) => ({ ...prev, enableProgramReminders: value }))}
          template={settings.programNotificationTemplate || ""}
          onTemplate={(value) => setSettings((prev) => ({ ...prev, programNotificationTemplate: value }))}
          variables="{{program_title}}, {{program_date}}, {{program_location}}, {{program_description}}, {{church_name}}"
        />

        <NotificationCard
          title="New Member Notifications"
          enabled={Boolean(settings.enableMemberAddedNotifications)}
          onToggle={(value) =>
            setSettings((prev) => ({ ...prev, enableMemberAddedNotifications: value }))
          }
          template={settings.memberAddedNotificationTemplate || ""}
          onTemplate={(value) => setSettings((prev) => ({ ...prev, memberAddedNotificationTemplate: value }))}
          variables="{{member_name}}, {{church_name}}"
        />

        <NotificationCard
          title="Donation Notifications"
          enabled={Boolean(settings.enableDonationNotifications)}
          onToggle={(value) => setSettings((prev) => ({ ...prev, enableDonationNotifications: value }))}
          template={settings.donationNotificationTemplate || ""}
          onTemplate={(value) => setSettings((prev) => ({ ...prev, donationNotificationTemplate: value }))}
          variables="{{entry_type}}, {{amount}}, {{note}}, {{church_name}}"
        />

        <NotificationCard
          title="User Account Notifications"
          enabled={Boolean(settings.enableUserAddedNotifications)}
          onToggle={(value) => setSettings((prev) => ({ ...prev, enableUserAddedNotifications: value }))}
          template={settings.userAddedNotificationTemplate || ""}
          onTemplate={(value) => setSettings((prev) => ({ ...prev, userAddedNotificationTemplate: value }))}
          variables="{{user_name}}, {{user_email}}, {{password}}, {{role}}, {{church_name}}"
        />
      </div>

      <div
        className={`fixed bottom-0 right-0 backdrop-blur p-4 z-20 transition-all duration-300 ${
          theme === "dark"
            ? "bg-slate-950/90 border-t border-transparent"
            : "bg-white border-t border-neutral-200"
        } ${
          isCollapsed ? "left-20" : "left-72"
        }`}
      >
        <div className="max-w-6xl mx-auto flex items-center justify-end">
          <button
            onClick={() => save()}
            disabled={loading || saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-900 text-white hover:bg-blue-800 disabled:opacity-60"
          >
            <Save className="w-4 h-4" />
            {saving ? "Saving..." : "Save Notifications"}
          </button>
        </div>
      </div>
    </div>
  );
}

function NotificationCard({
  title,
  enabled,
  onToggle,
  template,
  onTemplate,
  variables,
}: {
  title: string;
  enabled: boolean;
  onToggle: (value: boolean) => void;
  template: string;
  onTemplate: (value: string) => void;
  variables: string;
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-cyan-100 flex items-center justify-center">
            <Bell className="w-5 h-5 text-cyan-700" />
          </div>
          <h3 className="text-base font-semibold text-neutral-900">{title}</h3>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => onToggle(e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-neutral-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-700"></div>
        </label>
      </div>

      <textarea
        value={template}
        onChange={(e) => onTemplate(e.target.value)}
        rows={5}
        className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <p className="text-xs text-neutral-500 mt-2">Available variables: {variables}</p>
    </div>
  );
}
