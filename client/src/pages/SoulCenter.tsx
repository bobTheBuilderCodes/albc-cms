import { useEffect, useRef, useState } from "react";
import { Calendar, MoreVertical, Plus, UserCheck, UserPlus, X, Search } from "lucide-react";
import { useToast } from "../contexts/ToastContext";
import { createSoulCenterVisitor, convertSoulCenterVisitor, deleteSoulCenterVisitor, fetchMembers, fetchSettings, fetchSoulCenterVisitors, updateSoulCenterVisitor } from "../api/backend";
import type { Member, SoulCenterVisitor } from "../types";
import { Pagination } from "../components/Pagination";
import { useConfirm } from "../contexts/ConfirmContext";

export function SoulCenter() {
  const toast = useToast();
  const { confirm } = useConfirm();
  const [visitors, setVisitors] = useState<SoulCenterVisitor[]>([]);
  const [filtered, setFiltered] = useState<SoulCenterVisitor[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<SoulCenterVisitor | null>(null);
  const [converting, setConverting] = useState<SoulCenterVisitor | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<{ id: string; top: number; left: number } | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  useEffect(() => {
    fetchSoulCenterVisitors()
      .then((data) => setVisitors(data))
      .catch((e) => toast.error(e?.response?.data?.message || e?.message || "Failed to load visitors"));
    fetchMembers()
      .then((data) => setMembers(data))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    const query = searchQuery.toLowerCase();
    const filteredData = visitors.filter((v) => {
      const fullName = `${v.firstName} ${v.lastName}`.toLowerCase();
      return fullName.includes(query) || (v.phone || "").toLowerCase().includes(query) || (v.email || "").toLowerCase().includes(query);
    });
    setFiltered(filteredData);
    setCurrentPage(1);
  }, [visitors, searchQuery]);

  const currentVisitors = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleConvert = async (id: string, payload?: Partial<Member>) => {
    await convertSoulCenterVisitor(id, payload);
    const data = await fetchSoulCenterVisitors();
    setVisitors(data);
    toast.success("Visitor converted to member");
  };

  const handleDelete = async (id: string) => {
    const confirmed = await confirm({
      title: "Delete Visitor",
      message: "Are you sure you want to delete this visitor?",
      confirmText: "Delete",
      cancelText: "Cancel",
    });
    if (!confirmed) return;

    await deleteSoulCenterVisitor(id);
    setVisitors((prev) => prev.filter((v) => v.id !== id));
    toast.success("Visitor deleted");
  };

  const openMenu = (id: string, event: React.MouseEvent<HTMLButtonElement>) => {
    if (menuAnchor?.id === id) {
      setMenuAnchor(null);
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    const width = 176;
    const margin = 8;
    const left = Math.max(margin, Math.min(rect.right - width, window.innerWidth - width - margin));
    const top = Math.min(rect.bottom + margin, window.innerHeight - margin);
    setMenuAnchor({ id, top, left });
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuAnchor(null);
      }
    };
    const handleScroll = () => setMenuAnchor(null);
    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("scroll", handleScroll, true);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, []);

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-neutral-900">Soul Center</h1>
          <p className="text-sm text-neutral-600">Track first-time visitors and convert them to members</p>
        </div>
        <button
          onClick={() => {
            setEditing(null);
            setShowModal(true);
          }}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-900 text-white rounded-lg font-semibold"
        >
          <Plus className="w-4 h-4" />
          Add Visitor
        </button>
      </div>

      <div className="bg-white rounded-xl border border-neutral-200 p-4 mb-5">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search visitors..."
            className="w-full pl-10 pr-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
      </div>

      <div className="md:hidden space-y-3">
        {currentVisitors.map((visitor) => (
          <div key={visitor.id} className="rounded-xl border border-neutral-200 p-3 bg-white">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-neutral-900">{visitor.firstName} {visitor.lastName}</p>
                <p className="text-xs text-neutral-500">{visitor.email || "-"}</p>
              </div>
              <span
                className={`text-xs font-semibold px-2 py-1 rounded-full ${
                  visitor.status === "converted"
                    ? "bg-emerald-100 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-200 dark:border-emerald-500/30"
                    : "bg-amber-100 text-amber-700 border border-amber-200 dark:bg-amber-500/20 dark:text-amber-200 dark:border-amber-500/30"
                }`}
              >
                {visitor.status}
              </span>
            </div>
            <div className="mt-2 text-xs text-neutral-600">
              <div className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {new Date(visitor.visitDate).toLocaleDateString()}
              </div>
              <div>{visitor.phone || "No phone"}</div>
              <div>Invited by: {visitor.invitedByName || "None"}</div>
            </div>
            <div className="mt-3 flex items-center justify-end gap-2">
              <button
                onClick={(e) => openMenu(visitor.id, e)}
                className="p-1.5 text-neutral-600 hover:bg-neutral-50 rounded-lg"
                title="Actions"
              >
                <MoreVertical className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
        {currentVisitors.length === 0 && (
          <div className="rounded-xl border border-neutral-200 bg-white p-8 text-center">
            <UserPlus className="w-10 h-10 text-neutral-300 mx-auto mb-3" />
            <p className="text-sm font-semibold text-neutral-700">
              {searchQuery ? "No visitors match your search" : "No visitors recorded yet"}
            </p>
            <p className="text-xs text-neutral-500 mt-1">
              {searchQuery ? "Try a different name or phone number." : "Add new visitors to keep track of first timers."}
            </p>
          </div>
        )}
      </div>

      <div className="hidden md:block bg-white rounded-xl border border-neutral-200 overflow-visible relative">
        <div className="overflow-x-auto">
          <table className="w-full">
          <thead className="bg-neutral-50 border-b border-neutral-200">
            <tr>
              <th className="text-left px-6 py-3 text-sm text-neutral-700 font-semibold">Name</th>
              <th className="text-left px-6 py-3 text-sm text-neutral-700 font-semibold">Contact</th>
              <th className="text-left px-6 py-3 text-sm text-neutral-700 font-semibold">Visit Date</th>
              <th className="text-left px-6 py-3 text-sm text-neutral-700 font-semibold">Invited By</th>
              <th className="text-left px-6 py-3 text-sm text-neutral-700 font-semibold">Status</th>
              <th className="text-right px-6 py-3 text-sm text-neutral-700 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200">
            {currentVisitors.map((visitor) => (
              <tr key={visitor.id} className="hover:bg-neutral-50">
                <td className="px-6 py-4 text-sm text-neutral-900 font-medium">
                  {visitor.firstName} {visitor.lastName}
                </td>
                <td className="px-6 py-4 text-sm text-neutral-600">
                  <div>{visitor.email || "-"}</div>
                  <div>{visitor.phone || "-"}</div>
                </td>
                <td className="px-6 py-4 text-sm text-neutral-600">
                  {new Date(visitor.visitDate).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 text-sm text-neutral-600">
                  {visitor.invitedByName || "None"}
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                      visitor.status === "converted"
                        ? "bg-emerald-100 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-200 dark:border-emerald-500/30"
                        : "bg-amber-100 text-amber-700 border border-amber-200 dark:bg-amber-500/20 dark:text-amber-200 dark:border-amber-500/30"
                    }`}
                  >
                    {visitor.status}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center justify-end">
                    <button
                      onClick={(e) => openMenu(visitor.id, e)}
                      className="p-1.5 text-neutral-600 hover:bg-neutral-50 rounded-lg"
                      title="Actions"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
          </table>
        </div>
        <Pagination
          totalItems={filtered.length}
          itemsPerPage={itemsPerPage}
          currentPage={currentPage}
          totalPages={Math.ceil(filtered.length / itemsPerPage)}
          onPageChange={setCurrentPage}
        />
      </div>

      {filtered.length === 0 && (
        <div className="hidden md:block mt-6 rounded-xl border border-neutral-200 bg-white p-10 text-center">
          <UserPlus className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
          <p className="text-sm font-semibold text-neutral-700">
            {searchQuery ? "No visitors match your search" : "No visitors recorded yet"}
          </p>
          <p className="text-xs text-neutral-500 mt-1">
            {searchQuery ? "Try a different name or phone number." : "Add new visitors to keep track of first timers."}
          </p>
        </div>
      )}

      <div className="md:hidden">
        <Pagination
          totalItems={filtered.length}
          itemsPerPage={itemsPerPage}
          currentPage={currentPage}
          totalPages={Math.ceil(filtered.length / itemsPerPage)}
          onPageChange={setCurrentPage}
        />
      </div>

      {showModal && (
        <SoulCenterModal
          visitor={editing}
          members={members}
          onClose={() => {
            setEditing(null);
            setShowModal(false);
          }}
          onSave={async (payload) => {
            try {
              if (editing) {
                const updated = await updateSoulCenterVisitor(editing.id, payload);
                setVisitors((prev) => prev.map((v) => (v.id === updated.id ? updated : v)));
                toast.success("Visitor updated");
              } else {
                const created = await createSoulCenterVisitor(payload);
                setVisitors((prev) => [created, ...prev]);
                toast.success("Visitor added");
              }
              setShowModal(false);
              setEditing(null);
            } catch (e: any) {
              toast.error(e?.response?.data?.message || e?.message || "Failed to save visitor");
            }
          }}
        />
      )}

      {menuAnchor && (
        <div className="fixed inset-0 z-50">
          <div
            ref={menuRef}
            style={{ top: menuAnchor.top, left: menuAnchor.left, width: 176 }}
            className="fixed rounded-xl border border-neutral-200 bg-white shadow-lg"
          >
            {visitors.find((v) => v.id === menuAnchor.id)?.status !== "converted" && (
              <button
                onClick={() => {
                  const visitor = visitors.find((v) => v.id === menuAnchor.id);
                  setMenuAnchor(null);
                  if (visitor) setConverting(visitor);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-success-700 hover:bg-success-50 rounded-xl"
              >
                <UserCheck className="w-4 h-4" />
                Convert to member
              </button>
            )}
            <button
              onClick={() => {
                const visitor = visitors.find((v) => v.id === menuAnchor.id);
                setMenuAnchor(null);
                if (visitor) {
                  setEditing(visitor);
                  setShowModal(true);
                }
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-primary-700 hover:bg-neutral-50 rounded-xl"
            >
              <UserPlus className="w-4 h-4" />
              Edit
            </button>
            <button
              onClick={() => {
                const visitor = visitors.find((v) => v.id === menuAnchor.id);
                setMenuAnchor(null);
                if (visitor) {
                  handleDelete(visitor.id).catch((e) =>
                    toast.error(e?.response?.data?.message || e?.message || "Failed to delete")
                  );
                }
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-danger-600 hover:bg-danger-50 rounded-xl"
            >
              <X className="w-4 h-4" />
              Delete
            </button>
          </div>
        </div>
      )}

      {converting && (
        <ConvertVisitorModal
          visitor={converting}
          onClose={() => setConverting(null)}
          onConvert={async (payload) => {
            try {
              await handleConvert(converting.id, payload);
              setConverting(null);
            } catch (e: any) {
              toast.error(e?.response?.data?.message || e?.message || "Failed to convert");
            }
          }}
        />
      )}
    </div>
  );
}

function SoulCenterModal({
  visitor,
  members,
  onClose,
  onSave,
}: {
  visitor: SoulCenterVisitor | null;
  members: Member[];
  onClose: () => void;
  onSave: (payload: Partial<SoulCenterVisitor>) => void;
}) {
      const [form, setForm] = useState<Partial<SoulCenterVisitor>>(
        visitor || {
          firstName: "",
          lastName: "",
          phone: "",
          email: "",
          visitDate: new Date().toISOString().slice(0, 10),
          invitedById: "",
          description: "",
        }
      );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl w-full max-w-lg shadow-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-200">
          <h3 className="text-neutral-900 font-semibold">{visitor ? "Edit Visitor" : "Add Visitor"}</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-neutral-100">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-neutral-700 mb-2 font-semibold">First name *</label>
              <input
                value={form.firstName || ""}
                onChange={(e) => setForm((prev) => ({ ...prev, firstName: e.target.value }))}
                placeholder="First name"
                className="border border-neutral-300 rounded-lg px-3 py-2 w-full"
              />
            </div>
            <div>
              <label className="block text-sm text-neutral-700 mb-2 font-semibold">Last name *</label>
              <input
                value={form.lastName || ""}
                onChange={(e) => setForm((prev) => ({ ...prev, lastName: e.target.value }))}
                placeholder="Last name"
                className="border border-neutral-300 rounded-lg px-3 py-2 w-full"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm text-neutral-700 mb-2 font-semibold">Phone number</label>
            <input
              value={form.phone || ""}
              onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
              placeholder="Phone number"
              className="border border-neutral-300 rounded-lg px-3 py-2 w-full"
            />
          </div>
          <div>
            <label className="block text-sm text-neutral-700 mb-2 font-semibold">Email address</label>
            <input
              value={form.email || ""}
              onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
              placeholder="Email address"
              className="border border-neutral-300 rounded-lg px-3 py-2 w-full"
            />
          </div>
          <div>
            <label className="block text-sm text-neutral-700 mb-2 font-semibold">Visit date *</label>
            <input
              type="date"
              value={form.visitDate || ""}
              onChange={(e) => setForm((prev) => ({ ...prev, visitDate: e.target.value }))}
              className="border border-neutral-300 rounded-lg px-3 py-2 w-full"
            />
          </div>
          <div>
            <label className="block text-sm text-neutral-700 mb-2 font-semibold">Invited by</label>
            <select
              value={form.invitedById || ""}
              onChange={(e) => setForm((prev) => ({ ...prev, invitedById: e.target.value }))}
              className="border border-neutral-300 rounded-lg px-3 py-2 w-full"
            >
              <option value="">No one</option>
              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.fullName}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-neutral-700 mb-2 font-semibold">Notes / description</label>
            <textarea
              value={form.description || ""}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Notes / description"
              className="border border-neutral-300 rounded-lg px-3 py-2 w-full"
              rows={3}
            />
          </div>
        </div>
        <div className="px-5 py-4 border-t border-neutral-200 flex items-center justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-neutral-200 text-neutral-600">
            Cancel
          </button>
          <button
            onClick={() => onSave(form)}
            className="px-4 py-2 rounded-lg bg-blue-900 text-white font-semibold"
          >
            {visitor ? "Update Visitor" : "Add Visitor"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ConvertVisitorModal({
  visitor,
  onClose,
  onConvert,
}: {
  visitor: SoulCenterVisitor;
  onClose: () => void;
  onConvert: (payload: Record<string, unknown>) => void;
}) {
  const [departments, setDepartments] = useState<string[]>([]);
  const [form, setForm] = useState({
    firstName: visitor.firstName,
    lastName: visitor.lastName,
    phone: visitor.phone || "",
    email: visitor.email || "",
    department: "",
    gender: "male",
    maritalStatus: "single",
    membershipStatus: "active",
    address: "",
    dateOfBirth: "",
    joinDate: visitor.visitDate,
  });

  useEffect(() => {
    fetchSettings()
      .then((settings) => {
        if (settings?.departments && settings.departments.length > 0) {
          setDepartments(settings.departments);
        }
      })
      .catch(() => undefined);
  }, []);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl w-full max-w-2xl shadow-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-200">
          <h3 className="text-neutral-900 font-semibold">Convert to Member</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-neutral-100">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-neutral-700 mb-2 font-semibold">First name *</label>
              <input
                value={form.firstName}
                onChange={(e) => setForm((prev) => ({ ...prev, firstName: e.target.value }))}
                className="border border-neutral-300 rounded-lg px-3 py-2 w-full"
              />
            </div>
            <div>
              <label className="block text-sm text-neutral-700 mb-2 font-semibold">Last name *</label>
              <input
                value={form.lastName}
                onChange={(e) => setForm((prev) => ({ ...prev, lastName: e.target.value }))}
                className="border border-neutral-300 rounded-lg px-3 py-2 w-full"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-neutral-700 mb-2 font-semibold">Phone</label>
              <input
                value={form.phone}
                onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                className="border border-neutral-300 rounded-lg px-3 py-2 w-full"
              />
            </div>
            <div>
              <label className="block text-sm text-neutral-700 mb-2 font-semibold">Email</label>
              <input
                value={form.email}
                onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                className="border border-neutral-300 rounded-lg px-3 py-2 w-full"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-neutral-700 mb-2 font-semibold">Gender</label>
              <select
                value={form.gender || "male"}
                onChange={(e) => setForm((prev) => ({ ...prev, gender: e.target.value as any }))}
                className="border border-neutral-300 rounded-lg px-3 py-2 w-full"
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-neutral-700 mb-2 font-semibold">Marital status</label>
              <select
                value={form.maritalStatus || "single"}
                onChange={(e) => setForm((prev) => ({ ...prev, maritalStatus: e.target.value as any }))}
                className="border border-neutral-300 rounded-lg px-3 py-2 w-full"
              >
                <option value="single">Single</option>
                <option value="married">Married</option>
                <option value="widowed">Widowed</option>
                <option value="divorced">Divorced</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-neutral-700 mb-2 font-semibold">Membership status</label>
              <select
                value={form.membershipStatus || "active"}
                onChange={(e) => setForm((prev) => ({ ...prev, membershipStatus: e.target.value as any }))}
                className="border border-neutral-300 rounded-lg px-3 py-2 w-full"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-neutral-700 mb-2 font-semibold">Department</label>
              <select
                value={form.department}
                onChange={(e) => setForm((prev) => ({ ...prev, department: e.target.value }))}
                className="border border-neutral-300 rounded-lg px-3 py-2 w-full"
              >
                <option value="">Select department</option>
                {departments.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-neutral-700 mb-2 font-semibold">Date of birth</label>
              <input
                type="date"
                value={form.dateOfBirth}
                onChange={(e) => setForm((prev) => ({ ...prev, dateOfBirth: e.target.value }))}
                className="border border-neutral-300 rounded-lg px-3 py-2 w-full"
              />
            </div>
            <div>
              <label className="block text-sm text-neutral-700 mb-2 font-semibold">Join date</label>
              <input
                type="date"
                value={form.joinDate}
                onChange={(e) => setForm((prev) => ({ ...prev, joinDate: e.target.value }))}
                className="border border-neutral-300 rounded-lg px-3 py-2 w-full"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm text-neutral-700 mb-2 font-semibold">Address</label>
            <textarea
              value={form.address}
              onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
              className="border border-neutral-300 rounded-lg px-3 py-2 w-full"
              rows={2}
            />
          </div>
        </div>
        <div className="px-5 py-4 border-t border-neutral-200 flex items-center justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-neutral-200 text-neutral-600">
            Cancel
          </button>
          <button
            onClick={() => onConvert(form)}
            className="px-4 py-2 rounded-lg bg-blue-900 text-white font-semibold"
          >
            Convert to member
          </button>
        </div>
      </div>
    </div>
  );
}
