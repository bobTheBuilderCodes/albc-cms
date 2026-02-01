import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { addAuditLog } from '../utils/mockData';
import { 
  Settings as SettingsIcon, 
  Bell, 
  Shield, 
  Database,
  AlertTriangle,
  Save,
  RefreshCw,
  Layers,
  Plus,
  Trash2,
  Edit2,
  Check,
  X
} from 'lucide-react';

export function Settings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('cms_settings');
    return saved ? JSON.parse(saved) : {
      churchName: 'Grace Church',
      email: 'info@gracechurch.com',
      phone: '+233 24 123 4567',
      address: '123 Church Street, Accra, Ghana',
      enableBirthdayNotifications: true,
      enableProgramReminders: true,
      enableMemberAddedNotifications: true,
      enableDonationNotifications: true,
      reminderDaysBefore: 1,
      smsProvider: 'arkesel',
      smsApiKey: 'YOUR_API_KEY_HERE',
    };
  });

  const [departments, setDepartments] = useState<string[]>(() => {
    const stored = localStorage.getItem('cms_departments');
    return stored ? JSON.parse(stored) : ['Choir', 'Ushering', 'Media', 'Prayer', 'Youth', 'Children'];
  });

  const [newDepartment, setNewDepartment] = useState('');
  const [editingDepartment, setEditingDepartment] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    localStorage.setItem('cms_settings', JSON.stringify(settings));
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);

    addAuditLog({
      id: Date.now().toString(),
      userId: user!.id,
      userName: user!.name,
      userRole: user!.role,
      action: 'member_updated',
      resourceType: 'settings',
      details: 'Updated church settings',
      timestamp: new Date().toISOString(),
    });
  };

  const handleAddDepartment = () => {
    if (!newDepartment.trim()) return;
    if (departments.includes(newDepartment.trim())) {
      alert('Department already exists!');
      return;
    }
    const updated = [...departments, newDepartment.trim()];
    setDepartments(updated);
    localStorage.setItem('cms_departments', JSON.stringify(updated));
    setNewDepartment('');

    addAuditLog({
      id: Date.now().toString(),
      userId: user!.id,
      userName: user!.name,
      userRole: user!.role,
      action: 'member_created',
      resourceType: 'department',
      resourceId: newDepartment,
      details: `Added department: ${newDepartment}`,
      timestamp: new Date().toISOString(),
    });
  };

  const handleEditDepartment = (oldName: string) => {
    if (!editValue.trim() || editValue === oldName) {
      setEditingDepartment(null);
      return;
    }
    if (departments.includes(editValue.trim())) {
      alert('Department already exists!');
      return;
    }
    const updated = departments.map(d => d === oldName ? editValue.trim() : d);
    setDepartments(updated);
    localStorage.setItem('cms_departments', JSON.stringify(updated));
    setEditingDepartment(null);

    addAuditLog({
      id: Date.now().toString(),
      userId: user!.id,
      userName: user!.name,
      userRole: user!.role,
      action: 'member_updated',
      resourceType: 'department',
      resourceId: oldName,
      details: `Renamed department from "${oldName}" to "${editValue}"`,
      timestamp: new Date().toISOString(),
    });
  };

  const handleDeleteDepartment = (name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}" department?`)) return;
    const updated = departments.filter(d => d !== name);
    setDepartments(updated);
    localStorage.setItem('cms_departments', JSON.stringify(updated));

    addAuditLog({
      id: Date.now().toString(),
      userId: user!.id,
      userName: user!.name,
      userRole: user!.role,
      action: 'member_deleted',
      resourceType: 'department',
      resourceId: name,
      details: `Deleted department: ${name}`,
      timestamp: new Date().toISOString(),
    });
  };

  const clearAllData = () => {
    if (!confirm('Are you sure you want to clear all data? This action cannot be undone!')) return;
    
    const keys = [
      'cms_members',
      'cms_programs',
      'cms_attendance',
      'cms_sms_logs',
      'cms_donations',
      'cms_audit_logs'
    ];
    
    keys.forEach(key => localStorage.removeItem(key));
    alert('All data has been cleared. Please refresh the page.');
    window.location.reload();
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-neutral-900 mb-0 text-2xl font-bold">Settings</h1>
        <p className="text-neutral-600">Manage your church management system settings</p>
      </div>

      <div className="space-y-6">
        {/* Church Information */}
        <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
              <SettingsIcon className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <h3 className="text-neutral-900 font-semibold">Church Information</h3>
              <p className="text-sm text-neutral-600">Basic information about your church</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-neutral-700 mb-2">Church Name</label>
              <input
                type="text"
                value={settings.churchName}
                onChange={(e) => setSettings({ ...settings, churchName: e.target.value })}
                className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm text-neutral-700 mb-2">Email Address</label>
              <input
                type="email"
                value={settings.email}
                onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm text-neutral-700 mb-2">Phone Number</label>
              <input
                type="tel"
                value={settings.phone}
                onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm text-neutral-700 mb-2">Address</label>
              <input
                type="text"
                value={settings.address}
                onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>
        </div>

        {/* Notification Settings */}
        <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-info-100 rounded-lg flex items-center justify-center">
              <Bell className="w-5 h-5 text-info-600" />
            </div>
            <div>
              <h3 className="text-neutral-900 font-semibold">Notification Settings</h3>
              <p className="text-sm text-neutral-600">Configure automatic SMS notifications</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-neutral-50 rounded-lg">
              <div>
                <p className="text-sm text-neutral-900">Birthday Notifications</p>
                <p className="text-xs text-neutral-600">Automatically send birthday wishes to members</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.enableBirthdayNotifications}
                  onChange={(e) => setSettings({ ...settings, enableBirthdayNotifications: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-neutral-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-700"></div>
              </label>
            </div>

            <div className="flex items-center justify-between p-4 bg-neutral-50 rounded-lg">
              <div>
                <p className="text-sm text-neutral-900">Program Reminders</p>
                <p className="text-xs text-neutral-600">Send reminders for upcoming programs</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.enableProgramReminders}
                  onChange={(e) => setSettings({ ...settings, enableProgramReminders: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-neutral-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-700"></div>
              </label>
            </div>

            <div className="flex items-center justify-between p-4 bg-neutral-50 rounded-lg">
              <div>
                <p className="text-sm text-neutral-900">New Member Notifications</p>
                <p className="text-xs text-neutral-600">Notify when a new member is added to the system</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.enableMemberAddedNotifications}
                  onChange={(e) => setSettings({ ...settings, enableMemberAddedNotifications: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-neutral-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-700"></div>
              </label>
            </div>

            <div className="flex items-center justify-between p-4 bg-neutral-50 rounded-lg">
              <div>
                <p className="text-sm text-neutral-900">Donation Notifications</p>
                <p className="text-xs text-neutral-600">Notify when a donation is recorded for a member</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.enableDonationNotifications}
                  onChange={(e) => setSettings({ ...settings, enableDonationNotifications: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-neutral-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-700"></div>
              </label>
            </div>

            {settings.enableProgramReminders && (
              <div>
                <label className="block text-sm text-neutral-700 mb-2">Send reminder (days before)</label>
                <select
                  value={settings.reminderDaysBefore}
                  onChange={(e) => setSettings({ ...settings, reminderDaysBefore: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="0">Same day</option>
                  <option value="1">1 day before</option>
                  <option value="2">2 days before</option>
                  <option value="3">3 days before</option>
                  <option value="7">1 week before</option>
                </select>
              </div>
            )}
          </div>
        </div>

        {/* SMS Gateway Settings */}
        <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-accent-100 rounded-lg flex items-center justify-center">
              <Shield className="w-5 h-5 text-accent-600" />
            </div>
            <div>
              <h3 className="text-neutral-900 font-semibold">SMS Gateway Configuration</h3>
              <p className="text-sm text-neutral-600">Configure your SMS service provider</p>
            </div>
          </div>

          <div className="bg-warning-50 border border-warning-200 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-warning-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-warning-800">
                <p className="font-semibold mb-1">Demo Mode</p>
                <p>SMS integration requires a backend server. In this demo, SMS messages are simulated locally. For production, integrate with services like Arkesel or Twilio.</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-neutral-700 mb-2">SMS Provider</label>
              <select
                value={settings.smsProvider}
                onChange={(e) => setSettings({ ...settings, smsProvider: e.target.value })}
                className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="arkesel">Arkesel (Ghana)</option>
                <option value="twilio">Twilio</option>
                <option value="africastalking">Africa's Talking</option>
                <option value="hubtel">Hubtel (Ghana)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm text-neutral-700 mb-2">API Key</label>
              <input
                type="password"
                value={settings.smsApiKey}
                onChange={(e) => setSettings({ ...settings, smsApiKey: e.target.value })}
                className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Enter your API key"
              />
            </div>
          </div>
        </div>

        {/* Department Management */}
        <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
              <Layers className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <h3 className="text-neutral-900 font-semibold">Department Management</h3>
              <p className="text-sm text-neutral-600">Configure departments for member categorization</p>
            </div>
          </div>

          <div className="space-y-3 mb-4">
            {departments.map((dept) => (
              <div key={dept} className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg">
                {editingDepartment === dept ? (
                  <input
                    type="text"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleEditDepartment(dept)}
                    className="flex-1 px-3 py-1.5 border border-primary-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 font-medium"
                    autoFocus
                  />
                ) : (
                  <span className="text-sm text-neutral-900 font-medium">{dept}</span>
                )}
                <div className="flex items-center gap-2">
                  {editingDepartment === dept ? (
                    <>
                      <button
                        onClick={() => handleEditDepartment(dept)}
                        className="p-1.5 hover:bg-success-100 text-success-600 rounded-lg transition-colors"
                        title="Save"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setEditingDepartment(null)}
                        className="p-1.5 hover:bg-neutral-200 text-neutral-600 rounded-lg transition-colors"
                        title="Cancel"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => {
                          setEditingDepartment(dept);
                          setEditValue(dept);
                        }}
                        className="p-1.5 hover:bg-primary-100 text-primary-600 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteDepartment(dept)}
                        className="p-1.5 hover:bg-danger-100 text-danger-600 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newDepartment}
              onChange={(e) => setNewDepartment(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddDepartment()}
              placeholder="Enter new department name"
              className="flex-1 px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 font-medium"
            />
            <button
              onClick={handleAddDepartment}
              className="flex items-center gap-2 px-4 py-2 bg-blue-900 hover:bg-primary-700 text-white rounded-lg transition-colors font-semibold"
            >
              <Plus className="w-4 h-4" />
              Add
            </button>
          </div>
        </div>

     

        {/* Save Button */}
        <div className="flex items-center gap-4">
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-6 py-3 bg-blue-900 from-primary-600 to-accent-600 text-white rounded-lg hover:from-primary-700 hover:to-accent-700 transition-all shadow-lg"
          >
            <Save className="w-5 h-5" />
            Save Settings
          </button>
          {saved && (
            <span className="text-sm text-success-600 flex items-center gap-2">
              <div className="w-2 h-2 bg-success-600 rounded-full animate-pulse"></div>
              Settings saved successfully!
            </span>
          )}
        </div>
      </div>
    </div>
  );
}