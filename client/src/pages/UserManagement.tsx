import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useConfirm } from '../contexts/ConfirmContext';
import { useToast } from '../contexts/ToastContext';
import { addAuditLog } from '../utils/mockData';
import { Pagination } from '../components/Pagination';
import { createUser as apiCreateUser, deleteUser as apiDeleteUser, fetchUsers, updateUser as apiUpdateUser } from '../api/backend';
import { 
  UserCog, 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  X,
  Shield,
  Mail,
  CheckCircle,
  XCircle,
  Eye,
  EyeOff
} from 'lucide-react';
import type { ModulePermission, User } from '../types';

const allModules: Array<{ id: ModulePermission; label: string; description: string }> = [
  { id: 'dashboard', label: 'Dashboard', description: 'View system overview and statistics' },
  { id: 'members', label: 'Members', description: 'Manage church members' },
  { id: 'programs', label: 'Programs', description: 'Manage church programs and events' },
  { id: 'attendance', label: 'Attendance', description: 'Track attendance records' },
  { id: 'messaging', label: 'Messaging', description: 'Send SMS messages and notifications' },
  { id: 'finance', label: 'Finance', description: 'Manage donations and expenditures' },
  { id: 'audit', label: 'Audit Logs', description: 'View system activity logs' },
  { id: 'users', label: 'User Management', description: 'Manage system users and permissions' },
  { id: 'settings', label: 'Settings', description: 'Configure system settings' },
];

export function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'pastor' | 'admin' | 'finance' | 'staff'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  const { user } = useAuth();
  const { confirm } = useConfirm();
  const toast = useToast();

  useEffect(() => {
    loadUsers().catch((e) => toast.error(e?.response?.data?.message || e?.message || 'Failed to load users'));
  }, []);

  useEffect(() => {
    filterUsers();
  }, [users, searchQuery, roleFilter, statusFilter]);

  const loadUsers = async () => {
    const data = await fetchUsers();
    setUsers(data);
  };

  const filterUsers = () => {
    let filtered = [...users];

    if (searchQuery) {
      filtered = filtered.filter(u =>
        u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (roleFilter !== 'all') {
      filtered = filtered.filter(u => u.role === roleFilter);
    }

    if (statusFilter !== 'all') {
      const isActive = statusFilter === 'active';
      filtered = filtered.filter(u => u.isActive === isActive);
    }

    setFilteredUsers(filtered);
  };

  const deleteUser = async (id: string) => {
    if (id === user?.id) {
      toast.info('You cannot delete your own account');
      return;
    }

    const confirmed = await confirm({
      title: "Delete User",
      message: "Are you sure you want to delete this user?",
      confirmText: "Delete",
      danger: true,
    });
    if (!confirmed) return;

    await apiDeleteUser(id);
    const updated = users.filter((u) => u.id !== id);
    setUsers(updated);
    toast.success("User deleted");

    addAuditLog({
      id: Date.now().toString(),
      userId: user!.id,
      userName: user!.name,
      userRole: user!.role,
      action: 'member_deleted',
      resourceType: 'user',
      resourceId: id,
      details: `Deleted user`,
      timestamp: new Date().toISOString(),
    });
  };

  const toggleUserStatus = () => {
    toast.info('User activation/deactivation is not supported by the backend yet');
  };

  const indexOfLastUser = currentPage * itemsPerPage;
  const indexOfFirstUser = indexOfLastUser - itemsPerPage;
  const currentUsers = filteredUsers.slice(indexOfFirstUser, indexOfLastUser);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-neutral-900 mb-0 text-2xl font-bold">User Management</h1>
            <p className="text-neutral-600">Manage system users and their permissions</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-900 from-primary-600 to-accent-600 text-white rounded-lg hover:from-primary-700 hover:to-accent-700 transition-all shadow-lg"
          >
            <Plus className="w-5 h-5" />
            Add User
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="border border-gray-200 bg-white from-primary-500 to-primary-600 rounded-xl p-6 text-gray-700">
            <div className="flex items-center justify-between mb-2">
              <UserCog className="w-8 h-8 text-gray-500" />
            </div>
            <p className="text-3xl mb-1">{users.length}</p>
            <p className="text-sm text-gray-500">Total Users</p>
          </div>

          <div className="border border-gray-200 bg-white from-success-500 to-success-600 rounded-xl p-6 text-gray-700">
            <div className="flex items-center justify-between mb-2">
              <CheckCircle className="w-8 h-8 text-gray-500" />
            </div>
            <p className="text-3xl mb-1">{users.filter(u => u.isActive).length}</p>
            <p className="text-sm text-gray-500">Active Users</p>
          </div>

          <div className="border border-gray-200 bg-white from-danger-500 to-danger-600 rounded-xl p-6 text-gray-700">
            <div className="flex items-center justify-between mb-2">
              <XCircle className="w-8 h-8 text-gray-500" />
            </div>
            <p className="text-3xl mb-1">{users.filter(u => !u.isActive).length}</p>
            <p className="text-sm text-gray-500">Inactive Users</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
            <input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-white w-full pl-10 pr-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as any)}
            className="bg-white px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="all">All Roles</option>
            <option value="pastor">Pastor</option>
            <option value="admin">Admin</option>
            <option value="finance">Finance</option>
            <option value="staff">Staff</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="bg-white px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-neutral-50 border-b border-neutral-200">
              <tr>
                <th className="text-left px-6 py-3 text-sm text-neutral-700">User</th>
                <th className="text-left px-6 py-3 text-sm text-neutral-700">Email</th>
                <th className="text-left px-6 py-3 text-sm text-neutral-700">Role</th>
                <th className="text-left px-6 py-3 text-sm text-neutral-700">Modules</th>
                <th className="text-left px-6 py-3 text-sm text-neutral-700">Status</th>
                <th className="text-right px-6 py-3 text-sm text-neutral-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {currentUsers.length > 0 ? (
                currentUsers.map((usr) => (
                <tr key={usr.id} className="hover:bg-neutral-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-200 from-primary-500 to-accent-500 rounded-full flex items-center justify-center">
                        <span className="text-gray-700 text-sm">{usr.name.charAt(0)}</span>
                      </div>
                      <div>
                        <p className="text-sm text-neutral-900 font-medium">{usr.name}</p>
                        {usr.id === user?.id && (
                          <span className="text-xs text-primary-600 font-semibold">(You)</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-sm text-neutral-700">
                      <Mail className="w-4 h-4 text-neutral-400" />
                      {usr.email}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs bg-accent-50 text-accent-700 capitalize font-semibold">
                      <Shield className="w-3 h-3" />
                      {usr.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {usr.modules.slice(0, 3).map(mod => (
                        <span key={mod} className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-50 text-primary-700 font-medium">
                          {allModules.find(m => m.id === mod)?.label}
                        </span>
                      ))}
                      {usr.modules.length > 3 && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-neutral-100 text-neutral-600 font-medium">
                          +{usr.modules.length - 3} more
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => toggleUserStatus()}
                      disabled={usr.id === user?.id}
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs ${
                        usr.isActive
                          ? 'bg-success-50 text-success-700'
                          : 'bg-neutral-100 text-neutral-700'
                      } ${usr.id === user?.id ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:opacity-80'}`}
                    >
                      {usr.isActive ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setEditingUser(usr)}
                        className="p-2 text-primary-600 hover:bg-gray-50 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                      onClick={() => deleteUser(usr.id).catch((e) => toast.error(e?.response?.data?.message || e?.message || 'Failed to delete user'))}
                        disabled={usr.id === user?.id}
                        className="p-2 text-danger-600 hover:bg-danger-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Search className="w-8 h-8 text-neutral-300" />
                      <p className="text-sm text-neutral-700 font-medium">
                        {searchQuery ? "No users match your search" : "No users found"}
                      </p>
                      <p className="text-xs text-neutral-500">
                        {searchQuery
                          ? "Try a different name or email."
                          : "Create users to see them listed here."}
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination
          totalItems={filteredUsers.length}
          itemsPerPage={itemsPerPage}
          currentPage={currentPage}
          totalPages={Math.ceil(filteredUsers.length / itemsPerPage)}
          onPageChange={setCurrentPage}
        />
      </div>

      {(showAddModal || editingUser) && (
        <UserModal
          user={editingUser}
          onClose={() => {
            setShowAddModal(false);
            setEditingUser(null);
          }}
          onSave={async (newUser) => {
            if (editingUser) {
              const saved = await apiUpdateUser(newUser.id, {
                name: newUser.name,
                email: newUser.email,
                password: newUser.password || undefined,
                role: newUser.role,
                modules: newUser.modules,
                isActive: newUser.isActive,
              });
              const updated = users.map((u) => (u.id === saved.id ? saved : u));
              setUsers(updated);
              toast.success("User updated");
              addAuditLog({
                id: Date.now().toString(),
                userId: user!.id,
                userName: user!.name,
                userRole: user!.role,
                action: 'member_updated',
                resourceType: 'user',
                resourceId: saved.id,
                details: `Updated user: ${saved.name}`,
                timestamp: new Date().toISOString(),
              });
            } else {
              const userToAdd = await apiCreateUser({
                name: newUser.name,
                email: newUser.email,
                password: newUser.password || '',
                role: newUser.role,
                modules: newUser.modules,
                isActive: newUser.isActive,
              });
              const updated = [...users, userToAdd];
              setUsers(updated);
              toast.success("User created");
              addAuditLog({
                id: Date.now().toString(),
                userId: user!.id,
                userName: user!.name,
                userRole: user!.role,
                action: 'member_created',
                resourceType: 'user',
                resourceId: userToAdd.id,
                details: `Created new user: ${userToAdd.name}`,
                timestamp: new Date().toISOString(),
              });
            }
            setShowAddModal(false);
            setEditingUser(null);
          }}
        />
      )}
    </div>
  );
}

function UserModal({ user, onClose, onSave }: { user: User | null; onClose: () => void; onSave: (user: User) => Promise<void> }) {
  const [formData, setFormData] = useState<Partial<User>>(
    user || {
      name: '',
      email: '',
      password: '',
      role: 'admin',
      modules: ['dashboard'],
      isActive: true,
    }
  );
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      await onSave({ ...formData, updatedAt: new Date().toISOString() } as User);
    } finally {
      setSaving(false);
    }
  };

  const toggleModule = (module: ModulePermission) => {
    const currentModules = formData.modules || [];
    if (currentModules.includes(module)) {
      setFormData({ ...formData, modules: currentModules.filter(m => m !== module) });
    } else {
      setFormData({ ...formData, modules: [...currentModules, module] });
    }
  };

  const selectAllModules = () => {
    setFormData({ ...formData, modules: allModules.map(m => m.id) });
  };

  const deselectAllModules = () => {
    setFormData({ ...formData, modules: [] });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-neutral-200 px-6 py-4 flex items-center justify-between">
          <h3 className="text-neutral-900">{user ? 'Edit User' : 'Add New User'}</h3>
          <button onClick={onClose} className="p-2 hover:bg-neutral-100 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm text-neutral-700 mb-2 font-medium">Full Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm text-neutral-700 mb-2 font-medium">Email *</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm text-neutral-700 mb-2 font-medium">Password {!user && '*'}</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password || ''}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required={!user}
                  placeholder={user ? 'Leave blank to keep current' : ''}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm text-neutral-700 mb-2 font-medium">Role *</label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                required
              >
                <option value="admin">Admin</option>
                <option value="pastor">Pastor</option>
                <option value="finance">Finance</option>
                <option value="staff">Staff</option>
              </select>
            </div>

            <div>
              <label className="block text-sm text-neutral-700 mb-2 font-medium">Status *</label>
              <select
                value={formData.isActive ? 'active' : 'inactive'}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.value === 'active' })}
                className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                required
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm text-neutral-700 font-medium">Module Permissions *</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={selectAllModules}
                  className="text-xs text-primary-600 hover:text-primary-700 font-medium"
                >
                  Select All
                </button>
                <span className="text-neutral-300">|</span>
                <button
                  type="button"
                  onClick={deselectAllModules}
                  className="text-xs text-neutral-600 hover:text-neutral-700 font-medium"
                >
                  Deselect All
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 p-4 border border-neutral-200 rounded-lg bg-neutral-50 max-h-64 overflow-y-auto">
              {allModules.map((module) => (
                <label
                  key={module.id}
                  className="flex items-start gap-3 p-3 bg-white border border-neutral-200 rounded-lg hover:border-primary-300 cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={formData.modules?.includes(module.id) || false}
                    onChange={() => toggleModule(module.id)}
                    className="mt-0.5 w-4 h-4 text-primary-600 border-neutral-300 rounded focus:ring-2 focus:ring-primary-500"
                  />
                  <div className="flex-1">
                    <p className="text-sm text-neutral-900 font-medium">{module.label}</p>
                    <p className="text-xs text-neutral-500 mt-0.5">{module.description}</p>
                  </div>
                </label>
              ))}
            </div>
            {(!formData.modules || formData.modules.length === 0) && (
              <p className="text-xs text-danger-600 mt-2">Please select at least one module</p>
            )}
          </div>

          <div className="flex items-center gap-3 pt-4 border-t border-neutral-200">
            <button
              type="submit"
              disabled={saving || !formData.modules || formData.modules.length === 0}
              className="flex-1 bg-blue-900 from-primary-600 to-accent-600 text-white py-2.5 rounded-lg hover:from-primary-700 hover:to-accent-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {saving ? 'Saving...' : user ? 'Update User' : 'Add User'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-neutral-100 text-neutral-700 py-2.5 rounded-lg hover:bg-neutral-200 transition-colors font-medium"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
