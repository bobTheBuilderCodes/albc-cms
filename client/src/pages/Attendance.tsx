import { useState, useEffect } from 'react';
import type { Attendance as AttendanceType, Member, ChurchProgram } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { addAuditLog } from '../utils/mockData';
import { fetchAttendance, fetchMembers, fetchPrograms, markAttendance as apiMarkAttendance } from '../api/backend';
import { 
  UserCheck, 
  Calendar, 
  Search, 
  Plus, 
  Download,
  CheckCircle2,
  XCircle,
  TrendingUp
} from 'lucide-react';

export function Attendance() {
  const [attendance, setAttendance] = useState<AttendanceType[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [programs, setPrograms] = useState<ChurchProgram[]>([]);
  const [selectedProgram, setSelectedProgram] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showMarkModal, setShowMarkModal] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    const load = async () => {
      const [att, mem, pro] = await Promise.all([fetchAttendance(), fetchMembers(), fetchPrograms()]);
      setAttendance(att);
      setMembers(mem);
      setPrograms(pro);
    };
    load().catch((e) => alert(e?.response?.data?.message || e?.message || 'Failed to load attendance'));
  }, []);

  const programAttendance = selectedProgram
    ? attendance.filter(a => a.programId === selectedProgram)
    : [];

  const attendanceRate = programAttendance.length > 0
    ? (programAttendance.filter(a => a.status === 'present').length / programAttendance.length) * 100
    : 0;

  const overallAttendanceRate = attendance.length > 0
    ? (attendance.filter(a => a.status === 'present').length / attendance.length) * 100
    : 0;

  const exportAttendance = () => {
    const program = programs.find(p => p.id === selectedProgram);
    const headers = ['Member Name', 'Status', 'Date'];
    const rows = programAttendance.map(a => {
      const member = members.find(m => m.id === a.memberId);
      return [
        member?.fullName || 'Unknown',
        a.status,
        new Date(a.date).toLocaleDateString(),
      ];
    });

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance-${program?.name || 'all'}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-neutral-900 mb-0 text-2xl font-bold">Attendance Management</h1>
            <p className="text-neutral-600">Track member attendance for programs and events</p>
          </div>
          <button
            onClick={() => setShowMarkModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-900 from-primary-600 to-accent-600 text-white rounded-lg hover:from-primary-700 hover:to-accent-700 transition-all shadow-lg"
          >
            <Plus className="w-5 h-5" />
            Mark Attendance
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className=" border border-gray-200 from-info-500 to-info-600  p-6 text-gray-700 bg-white rounded-xl hover:bg-neutral-100 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <UserCheck className="w-8 h-8 text-gray-500" />
            </div>
            <p className="text-3xl mb-1">{attendance.length}</p>
            <p className="text-sm text-gray-500">Total Records</p>
          </div>

          <div className="border border-gray-200 from-info-500 to-info-600  p-6 text-gray-700 bg-white rounded-xl hover:bg-neutral-100 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <CheckCircle2 className="w-8 h-8 text-gray-500" />
            </div>
            <p className="text-3xl mb-1">{attendance.filter(a => a.status === 'present').length}</p>
            <p className="text-sm text-gray-500">Present</p>
          </div>

          <div className="border border-gray-200 from-info-500 to-info-600  p-6 text-gray-700 bg-white rounded-xl hover:bg-neutral-100 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <XCircle className="w-8 h-8 text-gray-500" />
            </div>
            <p className="text-3xl mb-1">{attendance.filter(a => a.status === 'absent').length}</p>
            <p className="text-sm text-gray-500">Absent</p>
          </div>

          <div className="border border-gray-200 from-info-500 to-info-600  p-6 text-gray-700 bg-white rounded-xl hover:bg-neutral-100 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="w-8 h-8 text-gray-500" />
            </div>
            <p className="text-3xl mb-1">{overallAttendanceRate.toFixed(0)}%</p>
            <p className="text-sm text-gray-500">Attendance Rate</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="flex-1">
            <label className="block text-sm text-neutral-700 mb-2">Select Program</label>
            <select
              value={selectedProgram}
              onChange={(e) => setSelectedProgram(e.target.value)}
              className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">-- Select a program --</option>
              {programs.map(program => (
                <option key={program.id} value={program.id}>
                  {program.name} - {new Date(program.date).toLocaleDateString()}
                </option>
              ))}
            </select>
          </div>

          {selectedProgram && (
            <button
              onClick={exportAttendance}
              className="mt-6 flex items-center gap-2 px-4 py-2 border border-neutral-300 rounded-lg hover:bg-neutral-50 transition-colors"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
          )}
        </div>

        {selectedProgram ? (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-neutral-800">
                Attendance: {programAttendance.length} records ({attendanceRate.toFixed(0)}% present)
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-neutral-50 border-b border-neutral-200">
                  <tr>
                    <th className="text-left px-6 py-3 text-sm text-neutral-700">Member</th>
                    <th className="text-left px-6 py-3 text-sm text-neutral-700">Status</th>
                    <th className="text-left px-6 py-3 text-sm text-neutral-700">Date</th>
                    <th className="text-left px-6 py-3 text-sm text-neutral-700">Notes</th>
                    <th className="text-left px-6 py-3 text-sm text-neutral-700">Recorded By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {programAttendance.map((att) => {
                    const member = members.find(m => m.id === att.memberId);
                    return (
                      <tr key={att.id} className="hover:bg-neutral-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-accent-500 rounded-full flex items-center justify-center">
                              <span className="text-white text-sm">{member?.fullName.charAt(0) || '?'}</span>
                            </div>
                            <span className="text-sm text-neutral-900">{member?.fullName || 'Unknown'}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs ${
                            att.status === 'present'
                              ? 'bg-success-50 text-success-700'
                              : 'bg-danger-50 text-danger-700'
                          }`}>
                            {att.status === 'present' && <CheckCircle2 className="w-3 h-3" />}
                            {att.status === 'absent' && <XCircle className="w-3 h-3" />}
                            {att.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-neutral-700">
                          {new Date(att.date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-sm text-neutral-600">
                          {att.notes || '-'}
                        </td>
                        <td className="px-6 py-4 text-sm text-neutral-600">
                          {att.recordedBy}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <Calendar className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
            <p className="text-neutral-500">Select a program to view attendance records</p>
          </div>
        )}
      </div>

      {showMarkModal && (
        <MarkAttendanceModal
          programs={programs}
          members={members}
          onClose={() => setShowMarkModal(false)}
          onSave={async (newAttendance) => {
            try {
              await Promise.all(
                newAttendance.map((att) =>
                  apiMarkAttendance({
                    programId: att.programId,
                    memberId: att.memberId,
                    status: att.status === 'present' ? 'present' : 'absent',
                  })
                )
              );

              const refreshed = await fetchAttendance();
              setAttendance(refreshed);

              addAuditLog({
                id: Date.now().toString() + Math.random(),
                userId: user!.id,
                userName: user!.name,
                userRole: user!.role,
                action: 'attendance_recorded',
                resourceType: 'attendance',
                details: `Recorded attendance for program ${selectedProgram}`,
                timestamp: new Date().toISOString(),
              });

              setShowMarkModal(false);
            } catch (e: any) {
              alert(e?.response?.data?.message || e?.message || 'Failed to record attendance');
            }
          }}
        />
      )}
    </div>
  );
}

function MarkAttendanceModal({ 
  programs, 
  members, 
  onClose, 
  onSave 
}: { 
  programs: ChurchProgram[]; 
  members: Member[]; 
  onClose: () => void; 
  onSave: (attendance: AttendanceType[]) => void;
}) {
  const [selectedProgram, setSelectedProgram] = useState('');
  const [attendanceData, setAttendanceData] = useState<Map<string, 'present' | 'absent'>>(new Map());
  const [searchQuery, setSearchQuery] = useState('');
  const { user } = useAuth();

  const filteredMembers = members.filter(m =>
    m.fullName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProgram) return;

    const newAttendance: AttendanceType[] = Array.from(attendanceData.entries()).map(([memberId, status]) => ({
      id: `att-${Date.now()}-${memberId}`,
      programId: selectedProgram,
      memberId,
      date: new Date().toISOString().split('T')[0],
      status,
      recordedBy: user!.name,
      recordedAt: new Date().toISOString(),
    }));

    onSave(newAttendance);
  };

  const toggleStatus = (memberId: string) => {
    const current = attendanceData.get(memberId) || 'absent';
    const next = current === 'absent' ? 'present' : 'absent';
    const newData = new Map(attendanceData);
    newData.set(memberId, next);
    setAttendanceData(newData);
  };

  const markAllPresent = () => {
    const newData = new Map<string, 'present' | 'absent'>();
    filteredMembers.forEach(m => newData.set(m.id, 'present'));
    setAttendanceData(newData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="bg-white border-b border-neutral-200 px-6 py-4">
          <h3 className="text-neutral-900">Mark Attendance</h3>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-6 space-y-4 border-b border-neutral-200">
            <div>
              <label className="block text-sm text-neutral-700 mb-2">Select Program *</label>
              <select
                value={selectedProgram}
                onChange={(e) => setSelectedProgram(e.target.value)}
                className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                required
              >
                <option value="">-- Select a program --</option>
                {programs.map(program => (
                  <option key={program.id} value={program.id}>
                    {program.name} - {new Date(program.date).toLocaleDateString()}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                <input
                  type="text"
                  placeholder="Search members..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <button
                type="button"
                onClick={markAllPresent}
                className="px-4 py-2 bg-success-600 text-white rounded-lg hover:bg-success-700 transition-colors"
              >
                Mark All Present
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            <div className="space-y-2">
              {filteredMembers.map(member => {
                const status = attendanceData.get(member.id) || 'absent';
                return (
                  <div
                    key={member.id}
                    onClick={() => toggleStatus(member.id)}
                    className="flex items-center justify-between p-4 border border-neutral-200 rounded-lg hover:bg-neutral-50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-accent-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-sm">{member.fullName.charAt(0)}</span>
                      </div>
                      <div>
                        <p className="text-sm text-neutral-900">{member.fullName}</p>
                        <p className="text-xs text-neutral-500">{member.department}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs ${
                        status === 'present'
                          ? 'bg-success-50 text-success-700'
                          : 'bg-danger-50 text-danger-700'
                      }`}>
                        {status === 'present' && <CheckCircle2 className="w-3 h-3" />}
                        {status === 'absent' && <XCircle className="w-3 h-3" />}
                        {status}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="p-6 border-t border-neutral-200 flex items-center gap-3">
            <button
              type="submit"
              className="flex-1 bg-blue-900 from-primary-600 to-accent-600 text-white py-2 rounded-lg hover:from-primary-700 hover:to-accent-700 transition-all"
            >
              Save Attendance ({attendanceData.size} records)
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