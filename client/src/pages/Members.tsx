import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import type { Member } from "../types";
import { useAuth } from "../contexts/AuthContext";
import { initializeMockData, addAuditLog } from "../utils/mockData";
import {
  Users,
  Search,
  Plus,
  Edit,
  Trash2,
  Filter,
  Download,
  UserCircle,
  Mail,
  Phone,
  X,
  Upload,
  FileSpreadsheet,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { Pagination } from "../components/Pagination";

export function Members() {
  const [members, setMembers] = useState<Member[]>([]);
  const [filteredMembers, setFilteredMembers] = useState<Member[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "inactive"
  >("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBulkUploadModal, setShowBulkUploadModal] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    initializeMockData();
    loadMembers();
  }, []);

  useEffect(() => {
    filterMembers();
  }, [members, searchQuery, statusFilter, departmentFilter]);

  const loadMembers = () => {
    const data = JSON.parse(localStorage.getItem("cms_members") || "[]");
    setMembers(data);
  };

  const filterMembers = () => {
    let filtered = [...members];

    if (searchQuery) {
      filtered = filtered.filter(
        (m) =>
          m.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          m.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
          m.phoneNumber.includes(searchQuery)
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((m) => m.membershipStatus === statusFilter);
    }

    if (departmentFilter !== "all") {
      filtered = filtered.filter((m) => m.department === departmentFilter);
    }

    setFilteredMembers(filtered);
  };

  const departments = Array.from(new Set(members.map((m) => m.department)));

  const deleteMember = (id: string) => {
    if (!confirm("Are you sure you want to delete this member?")) return;

    const updated = members.filter((m) => m.id !== id);
    setMembers(updated);
    localStorage.setItem("cms_members", JSON.stringify(updated));

    addAuditLog({
      id: Date.now().toString(),
      userId: user!.id,
      userName: user!.name,
      userRole: user!.role,
      action: "member_deleted",
      resourceType: "member",
      resourceId: id,
      details: `Deleted member`,
      timestamp: new Date().toISOString(),
    });
  };

  const exportToCSV = () => {
    const headers = [
      "Full Name",
      "Email",
      "Phone",
      "Department",
      "Status",
      "Join Date",
    ];
    const rows = filteredMembers.map((m) => [
      m.fullName,
      m.email,
      m.phoneNumber,
      m.department,
      m.membershipStatus,
      m.joinDate,
    ]);

    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `members-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-neutral-900 mb-0 text-2xl font-bold">
              Member Management
            </h1>
            <p className="text-neutral-600">
              Manage church members and their information
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={exportToCSV}
              className="bg-white flex items-center gap-2 px-4 py-2 border border-neutral-300 rounded-lg hover:bg-neutral-50 transition-colors"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>

            <button
              onClick={() => setShowBulkUploadModal(true)}
              className="bg-white flex items-center gap-2 px-4 py-2 border border-gray-200 text-primary-600 rounded-lg hover:bg-primary-50 transition-colors"
            >
              <Upload className="w-5 h-5" />
              Bulk Upload
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-900 from-primary-600 to-accent-600 text-white rounded-lg hover:from-primary-700 hover:to-accent-700 transition-all shadow-lg"
            >
              <Plus className="w-5 h-5" />
              Add Member
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white md:col-span-2 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
            <input
              type="text"
              placeholder="Search members..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="bg-white px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>

          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="bg-white px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="all">All Departments</option>
            {departments.map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-neutral-50 border-b border-neutral-200">
              <tr>
                <th className="text-left px-6 py-3 text-sm text-neutral-700">
                  Member
                </th>
                <th className="text-left px-6 py-3 text-sm text-neutral-700">
                  Contact
                </th>
                <th className="text-left px-6 py-3 text-sm text-neutral-700">
                  Department
                </th>
                <th className="text-left px-6 py-3 text-sm text-neutral-700">
                  Status
                </th>
                <th className="text-left px-6 py-3 text-sm text-neutral-700">
                  Join Date
                </th>
                <th className="text-right px-6 py-3 text-sm text-neutral-700">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {filteredMembers
                .slice(
                  (currentPage - 1) * itemsPerPage,
                  currentPage * itemsPerPage
                )
                .map((member) => (
                  <tr
                    key={member.id}
                    className="hover:bg-neutral-50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-200 from-primary-500 to-accent-500 rounded-full flex items-center justify-center">
                          <span className="text-gray-700 text-sm">
                            {member.fullName.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm text-neutral-900">
                            {member.fullName}
                          </p>
                          <p className="text-xs text-neutral-500 capitalize">
                            {member.gender}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm text-neutral-700">
                          <Mail className="w-4 h-4 text-neutral-400" />
                          {member.email}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-neutral-700">
                          <Phone className="w-4 h-4 text-neutral-400" />
                          {member.phoneNumber}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-neutral-700">
                        {member.department}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs ${
                          member.membershipStatus === "active"
                            ? "bg-success-50 text-success-700"
                            : "bg-neutral-100 text-neutral-700"
                        }`}
                      >
                        {member.membershipStatus}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-neutral-700">
                        {new Date(member.joinDate).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => navigate(`/members/${member.id}`)}
                          className="p-2 text-info-600 hover:bg-info-50 rounded-lg transition-colors"
                          title="View Profile"
                        >
                          <UserCircle className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setEditingMember(member)}
                          className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteMember(member.id)}
                          className="p-2 text-danger-600 hover:bg-danger-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        <Pagination
          totalItems={filteredMembers.length}
          itemsPerPage={itemsPerPage}
          currentPage={currentPage}
          totalPages={Math.ceil(filteredMembers.length / itemsPerPage)}
          onPageChange={setCurrentPage}
        />
      </div>

      {(showAddModal || editingMember) && (
        <MemberModal
          member={editingMember}
          onClose={() => {
            setShowAddModal(false);
            setEditingMember(null);
          }}
          onSave={(member) => {
            if (editingMember) {
              const updated = members.map((m) =>
                m.id === member.id ? member : m
              );
              setMembers(updated);
              localStorage.setItem("cms_members", JSON.stringify(updated));
              addAuditLog({
                id: Date.now().toString(),
                userId: user!.id,
                userName: user!.name,
                userRole: user!.role,
                action: "member_updated",
                resourceType: "member",
                resourceId: member.id,
                details: `Updated member: ${member.fullName}`,
                timestamp: new Date().toISOString(),
              });
            } else {
              const newMember = {
                ...member,
                id: `member-${Date.now()}`,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              };
              const updated = [...members, newMember];
              setMembers(updated);
              localStorage.setItem("cms_members", JSON.stringify(updated));
              addAuditLog({
                id: Date.now().toString(),
                userId: user!.id,
                userName: user!.name,
                userRole: user!.role,
                action: "member_created",
                resourceType: "member",
                resourceId: newMember.id,
                details: `Created new member: ${newMember.fullName}`,
                timestamp: new Date().toISOString(),
              });
            }
            setShowAddModal(false);
            setEditingMember(null);
          }}
        />
      )}

      {showBulkUploadModal && (
        <BulkUploadModal
          onClose={() => setShowBulkUploadModal(false)}
          onImport={(newMembers) => {
            const updated = [...members, ...newMembers];
            setMembers(updated);
            localStorage.setItem("cms_members", JSON.stringify(updated));
            setShowBulkUploadModal(false);

            addAuditLog({
              id: Date.now().toString(),
              userId: user!.id,
              userName: user!.name,
              userRole: user!.role,
              action: "member_created",
              resourceType: "member",
              details: `Bulk imported ${newMembers.length} members`,
              timestamp: new Date().toISOString(),
            });
          }}
        />
      )}
    </div>
  );
}

function MemberModal({
  member,
  onClose,
  onSave,
}: {
  member: Member | null;
  onClose: () => void;
  onSave: (member: Member) => void;
}) {
  const [departments, setDepartments] = useState<string[]>([]);
  const [formData, setFormData] = useState<Partial<Member>>(
    member || {
      fullName: "",
      email: "",
      phoneNumber: "",
      dateOfBirth: "",
      gender: "male",
      maritalStatus: "single",
      department: "",
      membershipStatus: "active",
      joinDate: new Date().toISOString().split("T")[0],
      address: "",
    }
  );

  useEffect(() => {
    // Load departments from localStorage
    const storedDepts = localStorage.getItem("cms_departments");
    const depts = storedDepts
      ? JSON.parse(storedDepts)
      : ["Choir", "Ushering", "Media", "Prayer", "Youth", "Children"];
    setDepartments(depts);

    // Set default department if creating a new member
    if (!member && !formData.department && depts.length > 0) {
      setFormData((prev) => ({ ...prev, department: depts[0] }));
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ ...formData, updatedAt: new Date().toISOString() } as Member);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-neutral-200 px-6 py-4 flex items-center justify-between">
          <h3 className="text-neutral-900">
            {member ? "Edit Member" : "Add New Member"}
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-neutral-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm text-neutral-700 mb-2">
                Full Name *
              </label>
              <input
                type="text"
                value={formData.fullName}
                onChange={(e) =>
                  setFormData({ ...formData, fullName: e.target.value })
                }
                className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm text-neutral-700 mb-2">
                Email *
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm text-neutral-700 mb-2">
                Phone Number *
              </label>
              <input
                type="tel"
                value={formData.phoneNumber}
                onChange={(e) =>
                  setFormData({ ...formData, phoneNumber: e.target.value })
                }
                className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm text-neutral-700 mb-2">
                Date of Birth *
              </label>
              <input
                type="date"
                value={formData.dateOfBirth}
                onChange={(e) =>
                  setFormData({ ...formData, dateOfBirth: e.target.value })
                }
                className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm text-neutral-700 mb-2">
                Gender *
              </label>
              <select
                value={formData.gender}
                onChange={(e) =>
                  setFormData({ ...formData, gender: e.target.value as any })
                }
                className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                required
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>

            <div>
              <label className="block text-sm text-neutral-700 mb-2">
                Marital Status *
              </label>
              <select
                value={formData.maritalStatus}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    maritalStatus: e.target.value as any,
                  })
                }
                className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                required
              >
                <option value="single">Single</option>
                <option value="married">Married</option>
                <option value="widowed">Widowed</option>
                <option value="divorced">Divorced</option>
              </select>
            </div>

            <div>
              <label className="block text-sm text-neutral-700 mb-2">
                Department *
              </label>
              <select
                value={formData.department}
                onChange={(e) =>
                  setFormData({ ...formData, department: e.target.value })
                }
                className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                required
              >
                {departments.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm text-neutral-700 mb-2">
                Membership Status *
              </label>
              <select
                value={formData.membershipStatus}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    membershipStatus: e.target.value as any,
                  })
                }
                className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                required
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            <div>
              <label className="block text-sm text-neutral-700 mb-2">
                Join Date *
              </label>
              <input
                type="date"
                value={formData.joinDate}
                onChange={(e) =>
                  setFormData({ ...formData, joinDate: e.target.value })
                }
                className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                required
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm text-neutral-700 mb-2">
                Address
              </label>
              <textarea
                value={formData.address}
                onChange={(e) =>
                  setFormData({ ...formData, address: e.target.value })
                }
                className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                rows={2}
              />
            </div>
          </div>

          <div className="flex items-center gap-3 pt-4">
            <button
              type="submit"
              className="flex-1 bg-blue-900 from-primary-600 to-accent-600 text-white py-2 rounded-lg hover:from-primary-700 hover:to-accent-700 transition-all"
            >
              {member ? "Update Member" : "Add Member"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-neutral-100 text-neutral-700 py-2 rounded-lg hover:bg-neutral-200 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function BulkUploadModal({
  onClose,
  onImport,
}: {
  onClose: () => void;
  onImport: (newMembers: Member[]) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<Partial<Member>[]>([]);
  const [showPreview, setShowPreview] = useState(false);

  const downloadTemplate = () => {
    const headers = [
      "Full Name",
      "Email",
      "Phone",
      "Date of Birth",
      "Gender",
      "Marital Status",
      "Department",
      "Status",
      "Join Date",
      "Address",
    ];
    const sampleData = [
      [
        "John Doe",
        "john.doe@example.com",
        "+233 24 123 4567",
        "1990-01-15",
        "male",
        "married",
        "Choir",
        "active",
        "2024-01-01",
        "123 Main St, Accra",
      ],
      [
        "Jane Smith",
        "jane.smith@example.com",
        "+233 24 765 4321",
        "1985-06-20",
        "female",
        "single",
        "Ushering",
        "active",
        "2024-01-15",
        "456 Oak Ave, Kumasi",
      ],
    ];

    const csv = [headers, ...sampleData].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "members-template.csv";
    a.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.type === "text/csv") {
      setFile(selectedFile);
      setError(null);
      parseFile(selectedFile);
    } else {
      setError("Please select a valid CSV file.");
      setFile(null);
      setPreviewData([]);
      setShowPreview(false);
    }
  };

  const parseFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const rows = text
          .split("\n")
          .map((row) => row.split(",").map((cell) => cell.trim()));

        if (rows.length < 2) {
          setError("CSV file must contain at least one data row.");
          return;
        }

        const headers = rows[0];
        const dataRows = rows
          .slice(1)
          .filter((row) => row.some((cell) => cell)); // Filter out empty rows

        // Validate headers
        const requiredHeaders = [
          "Full Name",
          "Email",
          "Phone",
          "Date of Birth",
          "Gender",
          "Marital Status",
          "Department",
          "Status",
          "Join Date",
        ];
        const missingHeaders = requiredHeaders.filter(
          (h) => !headers.includes(h)
        );
        if (missingHeaders.length > 0) {
          setError(`Missing required columns: ${missingHeaders.join(", ")}`);
          return;
        }

        const parsedMembers: Partial<Member>[] = dataRows.map((row, index) => {
          const member: Partial<Member> = {
            fullName: row[headers.indexOf("Full Name")] || "",
            email: row[headers.indexOf("Email")] || "",
            phoneNumber: row[headers.indexOf("Phone")] || "",
            dateOfBirth: row[headers.indexOf("Date of Birth")] || "",
            gender: (row[headers.indexOf("Gender")] || "male") as any,
            maritalStatus: (row[headers.indexOf("Marital Status")] ||
              "single") as any,
            department: row[headers.indexOf("Department")] || "",
            membershipStatus: (row[headers.indexOf("Status")] ||
              "active") as any,
            joinDate:
              row[headers.indexOf("Join Date")] ||
              new Date().toISOString().split("T")[0],
            address: row[headers.indexOf("Address")] || "",
          };

          return member;
        });

        setPreviewData(parsedMembers);
        setShowPreview(true);
        setError(null);
      } catch (err) {
        setError("Error parsing CSV file. Please check the format.");
        setPreviewData([]);
        setShowPreview(false);
      }
    };

    reader.readAsText(file);
  };

  const handleImport = () => {
    if (previewData.length === 0) return;

    const newMembers: Member[] = previewData.map(
      (member, index) =>
        ({
          ...member,
          id: `member-${Date.now()}-${index}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        } as Member)
    );

    onImport(newMembers);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-neutral-200 px-6 py-4 flex items-center justify-between">
          <h3 className="text-neutral-900 font-semibold">
            Bulk Upload Members
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-neutral-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Instructions */}
          <div className="bg-info-50 border border-info-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <FileSpreadsheet className="w-5 h-5 text-info-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-info-800">
                <p className="font-semibold mb-2">How to upload members:</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Download the CSV template below</li>
                  <li>Fill in your member data following the format</li>
                  <li>Upload the completed CSV file</li>
                  <li>Review the preview and confirm import</li>
                </ol>
              </div>
            </div>
          </div>

          {/* Download Template */}
          <button
            onClick={downloadTemplate}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-primary-300 text-primary-600 rounded-lg hover:bg-primary-50 transition-colors"
          >
            <Download className="w-5 h-5" />
            Download CSV Template
          </button>

          {/* File Upload */}
          <div>
            <label className="block text-sm text-neutral-700 mb-2 font-medium">
              Upload CSV File *
            </label>
            <div className="relative">
              <input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-primary-50 file:text-primary-600 hover:file:bg-primary-100"
              />
            </div>
            {file && (
              <p className="text-sm text-neutral-600 mt-2">
                <CheckCircle className="w-4 h-4 inline-block mr-1 text-success-600" />
                Selected: {file.name}
              </p>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-danger-50 border border-danger-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-danger-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-danger-800">
                  <p className="font-semibold mb-1">Error</p>
                  <p>{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Preview */}
          {showPreview && previewData.length > 0 && (
            <div>
              <h4 className="text-sm text-neutral-900 font-semibold mb-3">
                Preview ({previewData.length} members)
              </h4>
              <div className="border border-neutral-200 rounded-lg overflow-hidden">
                <div className="max-h-64 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-neutral-50 border-b border-neutral-200 sticky top-0">
                      <tr>
                        <th className="text-left px-3 py-2 text-xs text-neutral-700">
                          Name
                        </th>
                        <th className="text-left px-3 py-2 text-xs text-neutral-700">
                          Email
                        </th>
                        <th className="text-left px-3 py-2 text-xs text-neutral-700">
                          Phone
                        </th>
                        <th className="text-left px-3 py-2 text-xs text-neutral-700">
                          Department
                        </th>
                        <th className="text-left px-3 py-2 text-xs text-neutral-700">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-200">
                      {previewData.slice(0, 10).map((member, index) => (
                        <tr key={index} className="hover:bg-neutral-50">
                          <td className="px-3 py-2 text-neutral-900">
                            {member.fullName}
                          </td>
                          <td className="px-3 py-2 text-neutral-700">
                            {member.email}
                          </td>
                          <td className="px-3 py-2 text-neutral-700">
                            {member.phoneNumber}
                          </td>
                          <td className="px-3 py-2 text-neutral-700">
                            {member.department}
                          </td>
                          <td className="px-3 py-2">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs ${
                                member.membershipStatus === "active"
                                  ? "bg-success-50 text-success-700"
                                  : "bg-neutral-100 text-neutral-700"
                              }`}
                            >
                              {member.membershipStatus}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {previewData.length > 10 && (
                  <div className="px-3 py-2 bg-neutral-50 border-t border-neutral-200 text-xs text-neutral-600">
                    Showing 10 of {previewData.length} members
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-4">
            <button
              type="button"
              onClick={handleImport}
              disabled={!showPreview || previewData.length === 0}
              className="flex-1 bg-blue-900 from-primary-600 to-accent-600 text-white py-3 rounded-lg hover:from-primary-700 hover:to-accent-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
            >
              Import {previewData.length} Members
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-neutral-100 text-neutral-700 py-3 rounded-lg hover:bg-neutral-200 transition-colors font-semibold"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
