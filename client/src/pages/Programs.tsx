import { useState, useEffect } from 'react';
import type { ChurchProgram } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { addAuditLog } from '../utils/mockData';
import { createProgram as apiCreateProgram, deleteProgram as apiDeleteProgram, fetchPrograms, updateProgram as apiUpdateProgram } from '../api/backend';
import { 
  Calendar, 
  Plus, 
  Search, 
  MapPin, 
  Clock, 
  Edit, 
  Trash2,
  X,
  Repeat,
  Users,
  CalendarDays
} from 'lucide-react';

export function Programs() {
  const [programs, setPrograms] = useState<ChurchProgram[]>([]);
  const [filteredPrograms, setFilteredPrograms] = useState<ChurchProgram[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProgram, setEditingProgram] = useState<ChurchProgram | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    const load = async () => {
      const data = await fetchPrograms();
      setPrograms(data);
    };
    load().catch((e) => alert(e?.response?.data?.message || e?.message || 'Failed to load programs'));
  }, []);

  useEffect(() => {
    filterPrograms();
  }, [programs, searchQuery]);

  const filterPrograms = () => {
    let filtered = [...programs];

    if (searchQuery) {
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.location.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    filtered.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    setFilteredPrograms(filtered);
  };

  const deleteProgram = (id: string) => {
    if (!confirm('Are you sure you want to delete this program?')) return;
    
    apiDeleteProgram(id)
      .then(() => setPrograms((prev) => prev.filter((p) => p.id !== id)))
      .catch((e) => alert(e?.response?.data?.message || e?.message || 'Failed to delete program'));

    addAuditLog({
      id: Date.now().toString(),
      userId: user!.id,
      userName: user!.name,
      userRole: user!.role,
      action: 'program_deleted',
      resourceType: 'program',
      resourceId: id,
      details: `Deleted program`,
      timestamp: new Date().toISOString(),
    });
  };

  const upcomingPrograms = filteredPrograms.filter(p => new Date(p.date) >= new Date());
  const pastPrograms = filteredPrograms.filter(p => new Date(p.date) < new Date());

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-neutral-900 mb-0 text-2xl font-bold ">Church Programs & Events</h1>
            <p className="text-neutral-600">Manage church programs and events</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-900 from-primary-600 to-accent-600 text-white rounded-lg hover:from-primary-700 hover:to-accent-700 transition-all shadow-lg"
          >
            <Plus className="w-5 h-5" />
            Add Program
          </button>
        </div>

        <div className="flex items-center gap-4 mb-6">
          <div className="bg-white flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
            <input
              type="text"
              placeholder="Search programs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div className="flex items-center gap-2 bg-white border border-neutral-300 rounded-lg p-1">
            <button
              onClick={() => setViewMode('list')}
              className={`px-4 py-2 rounded-md transition-colors ${
                viewMode === 'list'
                  ? 'bg-gray-200 text-primary-700'
                  : 'text-neutral-600 hover:bg-neutral-100'
              }`}
            >
              List
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`px-4 py-2 rounded-md transition-colors ${
                viewMode === 'calendar'
                  ? 'bg-gray-200 text-primary-700'
                  : 'text-neutral-600 hover:bg-neutral-100'
              }`}
            >
              Calendar
            </button>
          </div>
        </div>
      </div>

      {viewMode === 'list' ? (
        <div className="space-y-6">
          {/* Upcoming Programs */}
          <div>
            <h3 className="text-neutral-800 mb-4">Upcoming Programs ({upcomingPrograms.length})</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {upcomingPrograms.map((program) => (
                <ProgramCard
                  key={program.id}
                  program={program}
                  onEdit={() => setEditingProgram(program)}
                  onDelete={() => deleteProgram(program.id)}
                />
              ))}
              {upcomingPrograms.length === 0 && (
                <div className="col-span-2 text-center py-12 bg-white rounded-xl border border-neutral-200">
                  <Calendar className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
                  <p className="text-neutral-500">No upcoming programs</p>
                </div>
              )}
            </div>
          </div>

          {/* Past Programs */}
          {pastPrograms.length > 0 && (
            <div>
              <h3 className="text-neutral-800 mb-4">Past Programs ({pastPrograms.length})</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pastPrograms.slice(0, 4).map((program) => (
                  <ProgramCard
                    key={program.id}
                    program={program}
                    isPast
                    onEdit={() => setEditingProgram(program)}
                    onDelete={() => deleteProgram(program.id)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <CalendarView programs={filteredPrograms} />
      )}

      {(showAddModal || editingProgram) && (
        <ProgramModal
          program={editingProgram}
          onClose={() => {
            setShowAddModal(false);
            setEditingProgram(null);
          }}
          onSave={async (program) => {
            try {
              if (editingProgram) {
                const saved = await apiUpdateProgram(editingProgram.id, program);
                setPrograms((prev) => prev.map((p) => (p.id === saved.id ? saved : p)));
                addAuditLog({
                  id: Date.now().toString(),
                  userId: user!.id,
                  userName: user!.name,
                  userRole: user!.role,
                  action: 'program_updated',
                  resourceType: 'program',
                  resourceId: saved.id,
                  details: `Updated program: ${saved.name}`,
                  timestamp: new Date().toISOString(),
                });
              } else {
                const saved = await apiCreateProgram(program);
                setPrograms((prev) => [saved, ...prev]);
                addAuditLog({
                  id: Date.now().toString(),
                  userId: user!.id,
                  userName: user!.name,
                  userRole: user!.role,
                  action: 'program_created',
                  resourceType: 'program',
                  resourceId: saved.id,
                  details: `Created new program: ${saved.name}`,
                  timestamp: new Date().toISOString(),
                });
              }

              setShowAddModal(false);
              setEditingProgram(null);
            } catch (e: any) {
              alert(e?.response?.data?.message || e?.message || 'Failed to save program');
            }
          }}
        />
      )}
    </div>
  );
}

function ProgramCard({ 
  program, 
  isPast = false,
  onEdit, 
  onDelete 
}: { 
  program: ChurchProgram; 
  isPast?: boolean;
  onEdit: () => void; 
  onDelete: () => void;
}) {
  return (
    <div className={`bg-white rounded-xl shadow-sm border border-neutral-200 p-6 ${isPast ? 'opacity-70' : ''}`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h4 className="text-neutral-900">{program.name}</h4>
            {program.isRecurring && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-info-50 text-info-700 text-xs rounded-full">
                <Repeat className="w-3 h-3" />
                {program.recurrencePattern}
              </span>
            )}
          </div>
          <p className="text-sm text-neutral-600 line-clamp-2">{program.description}</p>
        </div>
        <div className="flex items-center gap-1 ml-2">
          <button
            onClick={onEdit}
            className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={onDelete}
            className="p-2 text-danger-600 hover:bg-danger-50 rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-neutral-700">
          <Calendar className="w-4 h-4 text-neutral-400" />
          {new Date(program.date).toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}
        </div>
        <div className="flex items-center gap-2 text-sm text-neutral-700">
          <Clock className="w-4 h-4 text-neutral-400" />
          {program.time}
        </div>
        <div className="flex items-center gap-2 text-sm text-neutral-700">
          <MapPin className="w-4 h-4 text-neutral-400" />
          {program.location}
        </div>
        <div className="flex items-center gap-2 text-sm text-neutral-700">
          <Users className="w-4 h-4 text-neutral-400" />
          <span className="capitalize">{program.targetAudience}</span>
          {program.targetDepartments && program.targetDepartments.length > 0 && (
            <span className="text-neutral-500">({program.targetDepartments.join(', ')})</span>
          )}
        </div>
      </div>
    </div>
  );
}

function CalendarView({ programs }: { programs: ChurchProgram[] }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const daysInMonth = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth() + 1,
    0
  ).getDate();
  
  const firstDayOfMonth = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth(),
    1
  ).getDay();

  const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const getProgramsForDay = (day: number) => {
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return programs.filter(p => p.date === dateStr);
  };

  const changeMonth = (offset: number) => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1));
  };

  const days = [];
  for (let i = 0; i < firstDayOfMonth; i++) {
    days.push(<div key={`empty-${i}`} className="h-24"></div>);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const dayPrograms = getProgramsForDay(day);
    const isToday = 
      day === new Date().getDate() &&
      currentDate.getMonth() === new Date().getMonth() &&
      currentDate.getFullYear() === new Date().getFullYear();

    days.push(
      <div
        key={day}
        className={`h-24 border border-neutral-200 p-2 ${
          isToday ? 'bg-primary-50 border-primary-300' : 'bg-white'
        }`}
      >
        <div className={`text-sm mb-1 ${isToday ? 'text-primary-700 font-bold' : 'text-neutral-600'}`}>
          {day}
        </div>
        <div className="space-y-1">
          {dayPrograms.slice(0, 2).map(program => (
            <div
              key={program.id}
              className="text-xs bg-accent-100 text-accent-800 px-2 py-1 rounded truncate"
              title={program.name}
            >
              {program.name}
            </div>
          ))}
          {dayPrograms.length > 2 && (
            <div className="text-xs text-neutral-500">+{dayPrograms.length - 2} more</div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-neutral-900">{monthName}</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => changeMonth(-1)}
            className="px-3 py-1 border border-neutral-300 rounded-lg hover:bg-neutral-50 transition-colors"
          >
            Previous
          </button>
          <button
            onClick={() => setCurrentDate(new Date())}
            className="px-3 py-1 border border-neutral-300 rounded-lg hover:bg-neutral-50 transition-colors"
          >
            Today
          </button>
          <button
            onClick={() => changeMonth(1)}
            className="px-3 py-1 border border-neutral-300 rounded-lg hover:bg-neutral-50 transition-colors"
          >
            Next
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-px bg-neutral-200 border border-neutral-200">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="bg-neutral-50 px-2 py-3 text-center text-sm text-neutral-700">
            {day}
          </div>
        ))}
        {days}
      </div>
    </div>
  );
}

function ProgramModal({ program, onClose, onSave }: { program: ChurchProgram | null; onClose: () => void; onSave: (program: ChurchProgram) => void }) {
  const [formData, setFormData] = useState<Partial<ChurchProgram>>(
    program || {
      name: '',
      description: '',
      date: new Date().toISOString().split('T')[0],
      time: '09:00',
      location: '',
      isRecurring: false,
      targetAudience: 'all',
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ ...formData, updatedAt: new Date().toISOString() } as ChurchProgram);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-neutral-200 px-6 py-4 flex items-center justify-between">
          <h3 className="text-neutral-900">{program ? 'Edit Program' : 'Add New Program'}</h3>
          <button onClick={onClose} className="p-2 hover:bg-neutral-100 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm text-neutral-700 mb-2">Program Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-neutral-700 mb-2">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-neutral-700 mb-2">Date *</label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm text-neutral-700 mb-2">Time *</label>
              <input
                type="time"
                value={formData.time}
                onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-neutral-700 mb-2">Location *</label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="e.g., Main Sanctuary, Fellowship Hall"
              required
            />
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="isRecurring"
              checked={formData.isRecurring}
              onChange={(e) => setFormData({ ...formData, isRecurring: e.target.checked })}
              className="w-4 h-4 text-primary-600 border-neutral-300 rounded focus:ring-2 focus:ring-primary-500"
            />
            <label htmlFor="isRecurring" className="text-sm text-neutral-700">
              Recurring Program
            </label>
          </div>

          {formData.isRecurring && (
            <div>
              <label className="block text-sm text-neutral-700 mb-2">Recurrence Pattern</label>
              <select
                value={formData.recurrencePattern}
                onChange={(e) => setFormData({ ...formData, recurrencePattern: e.target.value as any })}
                className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm text-neutral-700 mb-2">Target Audience *</label>
            <select
              value={formData.targetAudience}
              onChange={(e) => setFormData({ ...formData, targetAudience: e.target.value as any })}
              className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              required
            >
              <option value="all">All Members</option>
              <option value="department">Specific Departments</option>
              <option value="selected">Selected Members</option>
            </select>
          </div>

          {formData.targetAudience === 'department' && (
            <div>
              <label className="block text-sm text-neutral-700 mb-2">Select Departments</label>
              <input
                type="text"
                placeholder="e.g., Choir, Youth Ministry"
                value={formData.targetDepartments?.join(', ') || ''}
                onChange={(e) => setFormData({ ...formData, targetDepartments: e.target.value.split(',').map(d => d.trim()) })}
                className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          )}

          <div className="flex items-center gap-3 pt-4">
            <button
              type="submit"
              className="flex-1 bg-blue-900 from-primary-600 to-accent-600 text-white py-2 rounded-lg hover:from-primary-700 hover:to-accent-700 transition-all"
            >
              {program ? 'Update Program' : 'Add Program'}
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