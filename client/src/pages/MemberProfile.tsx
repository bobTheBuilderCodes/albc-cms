import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import type { Member, Attendance, Donation, PrayerRequest, ChurchProgram } from '../types';
import { 
  ArrowLeft, 
  Mail, 
  Phone, 
  Calendar, 
  MapPin,
  Edit,
  UserCircle,
  Cake,
  Heart,
  TrendingUp,
  DollarSign,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  Plus,
  Flame,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';

type TabType = 'attendance' | 'donations' | 'prayers';

export function MemberProfile() {
  const { memberId } = useParams();
  const navigate = useNavigate();
  const [member, setMember] = useState<Member | null>(null);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [donations, setDonations] = useState<Donation[]>([]);
  const [prayerRequests, setPrayerRequests] = useState<PrayerRequest[]>([]);
  const [programs, setPrograms] = useState<ChurchProgram[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>('attendance');
  const [showAddPrayer, setShowAddPrayer] = useState(false);
  const [newPrayer, setNewPrayer] = useState({
    title: '',
    description: '',
    priority: 'medium' as const,
    category: ''
  });

  useEffect(() => {
    if (memberId) {
      const members = JSON.parse(localStorage.getItem('cms_members') || '[]');
      const found = members.find((m: Member) => m.id === memberId);
      setMember(found || null);

      const allAttendance = JSON.parse(localStorage.getItem('cms_attendance') || '[]');
      setAttendance(allAttendance.filter((a: Attendance) => a.memberId === memberId));

      const allDonations = JSON.parse(localStorage.getItem('cms_donations') || '[]');
      setDonations(allDonations.filter((d: Donation) => d.memberId === memberId));

      const allPrayers = JSON.parse(localStorage.getItem('cms_prayer_requests') || '[]');
      setPrayerRequests(allPrayers.filter((p: PrayerRequest) => p.memberId === memberId));

      const allPrograms = JSON.parse(localStorage.getItem('cms_programs') || '[]');
      setPrograms(allPrograms);
    }
  }, [memberId]);

  const handleAddPrayer = () => {
    if (!member || !newPrayer.title || !newPrayer.description) return;

    const prayer: PrayerRequest = {
      id: `prayer-${Date.now()}`,
      memberId: member.id,
      memberName: member.fullName,
      title: newPrayer.title,
      description: newPrayer.description,
      category: newPrayer.category || undefined,
      status: 'active',
      priority: newPrayer.priority,
      isPrivate: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const allPrayers = [...prayerRequests, prayer];
    setPrayerRequests(allPrayers);
    localStorage.setItem('cms_prayer_requests', JSON.stringify([
      ...JSON.parse(localStorage.getItem('cms_prayer_requests') || '[]'),
      prayer
    ]));

    setNewPrayer({ title: '', description: '', priority: 'medium', category: '' });
    setShowAddPrayer(false);
  };

  const updatePrayerStatus = (prayerId: string, status: 'active' | 'answered' | 'closed') => {
    const updated = prayerRequests.map(p => 
      p.id === prayerId 
        ? { ...p, status, updatedAt: new Date().toISOString(), ...(status === 'answered' ? { answeredAt: new Date().toISOString() } : {}) }
        : p
    );
    setPrayerRequests(updated);
    
    const allPrayers: PrayerRequest[] = JSON.parse(localStorage.getItem('cms_prayer_requests') || '[]');
    const updatedAll = allPrayers.map(p => 
      p.id === prayerId 
        ? { ...p, status, updatedAt: new Date().toISOString(), ...(status === 'answered' ? { answeredAt: new Date().toISOString() } : {}) }
        : p
    );
    localStorage.setItem('cms_prayer_requests', JSON.stringify(updatedAll));
  };

  if (!member) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="text-center py-12">
          <UserCircle className="w-16 h-16 text-neutral-300 mx-auto mb-4" />
          <h3 className="text-neutral-600 mb-4">Member not found</h3>
          <button
            onClick={() => navigate('/members')}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            Back to Members
          </button>
        </div>
      </div>
    );
  }

  const calculateAge = (dob: string) => {
    const today = new Date();
    const birthDate = new Date(dob);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const totalDonations = donations.reduce((sum, d) => sum + d.amount, 0);
  const attendanceRate = attendance.length > 0 
    ? (attendance.filter(a => a.status === 'present').length / attendance.length) * 100 
    : 0;

  const getProgramName = (programId: string) => {
    const program = programs.find(p => p.id === programId);
    return program ? program.name : 'Unknown Program';
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'urgent': return <Flame className="w-4 h-4 text-danger-600" />;
      case 'high': return <AlertTriangle className="w-4 h-4 text-warning-600" />;
      default: return <Clock className="w-4 h-4 text-neutral-400" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-danger-50 text-danger-700 border-danger-200';
      case 'high': return 'bg-warning-50 text-warning-700 border-warning-200';
      case 'medium': return 'bg-info-50 text-info-700 border-info-200';
      default: return 'bg-neutral-100 text-neutral-700 border-neutral-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'answered': return 'bg-success-50 text-success-700 border-success-200';
      case 'active': return 'bg-primary-50 text-primary-700 border-primary-200';
      default: return 'bg-neutral-100 text-neutral-600 border-neutral-200';
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Banner Profile Header */}
      <div className=" bg-blue-900 from-primary-500 via-primary-600 to-accent-500 relative">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjA1IiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-40"></div>
        
        <div className="max-w-7xl mx-auto px-6 py-6 relative">
          <button
            onClick={() => navigate('/members')}
            className="flex items-center gap-2 text-white/90 hover:text-white mb-6 transition-colors font-medium"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Members
          </button>

          <div className="flex items-start gap-6">
            <div className="w-28 h-28 bg-white rounded-2xl flex items-center justify-center shadow-2xl ring-4 ring-white/20">
              <span className="text-primary-600 text-4xl font-bold">{member.fullName.charAt(0)}</span>
            </div>

            <div className="flex-1">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-white mb-3 font-bold">{member.fullName}</h1>
                  <div className="flex items-center gap-3 mb-4">
                    <span className="px-3 py-1 bg-white/20 backdrop-blur-sm text-white rounded-lg text-sm font-semibold">
                      {member.department}
                    </span>
                    <span className={`px-3 py-1 rounded-lg text-sm font-semibold ${
                      member.membershipStatus === 'active'
                        ? 'bg-success-500 text-white'
                        : 'bg-neutral-100 text-neutral-700'
                    }`}>
                      {member.membershipStatus}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-x-6 gap-y-2.5 text-white/90">
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="w-4 h-4" />
                      <span className="font-medium">{member.email}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="w-4 h-4" />
                      <span className="font-medium">{member.phoneNumber}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Cake className="w-4 h-4" />
                      <span className="font-medium">
                        {new Date(member.dateOfBirth).toLocaleDateString()} ({calculateAge(member.dateOfBirth)} years)
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Heart className="w-4 h-4" />
                      <span className="font-medium capitalize">{member.maritalStatus}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="w-4 h-4" />
                      <span className="font-medium">Joined {new Date(member.joinDate).toLocaleDateString()}</span>
                    </div>
                    {member.address && (
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="w-4 h-4" />
                        <span className="font-medium">{member.address}</span>
                      </div>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => navigate(`/members?edit=${member.id}`)}
                  className="flex items-center gap-2 px-4 py-2 bg-white text-primary-600 rounded-xl hover:bg-white/90 transition-colors font-semibold shadow-lg"
                >
                  <Edit className="w-4 h-4" />
                  Edit Profile
                </button>
              </div>
            </div>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-3 gap-4 mt-6">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/20">
              <div className="flex items-center justify-between mb-2">
                <Users className="w-7 h-7 text-white/80" />
                <TrendingUp className="w-4 h-4 text-white/60" />
              </div>
              <p className="text-3xl text-white mb-0.5 font-bold">{attendance.length}</p>
              <p className="text-sm text-white/80 font-medium">Total Attendance</p>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/20">
              <div className="flex items-center justify-between mb-2">
                <CheckCircle2 className="w-7 h-7 text-white/80" />
                <TrendingUp className="w-4 h-4 text-white/60" />
              </div>
              <p className="text-3xl text-white mb-0.5 font-bold">{attendanceRate.toFixed(0)}%</p>
              <p className="text-sm text-white/80 font-medium">Attendance Rate</p>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/20">
              <div className="flex items-center justify-between mb-2">
                <DollarSign className="w-7 h-7 text-white/80" />
                <TrendingUp className="w-4 h-4 text-white/60" />
              </div>
              <p className="text-3xl text-white mb-0.5 font-bold">GH₵ {totalDonations.toLocaleString()}</p>
              <p className="text-sm text-white/80 font-medium">Total Donations</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Section */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="bg-white rounded-2xl shadow-xl border border-neutral-200">
          {/* Tab Navigation */}
          <div className="border-b border-neutral-200 px-6">
            <div className="flex gap-6">
              <button
                onClick={() => setActiveTab('attendance')}
                className={`py-3 px-6 my-3 font-semibold text-sm transition-all relative ${
                  activeTab === 'attendance'
                    ? 'text-primary-600 bg-gray-200 rounded-lg'
                    : 'text-neutral-500 hover:text-neutral-700'
                }`}
              >
                Attendance History
                {activeTab === 'attendance' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600 "></div>
                )}
              </button>
              <button
                onClick={() => setActiveTab('donations')}
                className={`py-3 px-6 my-3 font-semibold text-sm transition-all relative ${
                  activeTab === 'donations'
                    ? 'text-primary-600 text-primary-600 bg-gray-200 rounded-lg'
                    : 'text-neutral-500 hover:text-neutral-700'
                }`}
              >
                Donation History
                {activeTab === 'donations' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600"></div>
                )}
              </button>
              <button
                onClick={() => setActiveTab('prayers')}
                className={`py-3 px-6 my-3 font-semibold text-sm transition-all relative ${
                  activeTab === 'prayers'
                    ? 'text-primary-600 text-primary-600 bg-gray-200 rounded-lg'
                    : 'text-neutral-500 hover:text-neutral-700'
                }`}
              >
                Prayer Requests
                {activeTab === 'prayers' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600"></div>
                )}
                {prayerRequests.filter(p => p.status === 'active').length > 0 && (
                  <span className="ml-2 inline-flex items-center justify-center w-5 h-5 bg-primary-500 text-white text-xs font-bold rounded-full">
                    {prayerRequests.filter(p => p.status === 'active').length}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {/* Attendance Tab */}
            {activeTab === 'attendance' && (
              <div>
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-neutral-900 font-semibold">Attendance Records</h3>
                  <span className="text-sm text-neutral-500 font-medium">
                    {attendance.length} total records
                  </span>
                </div>
                {attendance.length > 0 ? (
                  <div className="space-y-2.5">
                    {attendance.map((att) => (
                      <div key={att.id} className="flex items-center justify-between p-4 bg-neutral-50 rounded-xl hover:bg-neutral-100 transition-colors">
                        <div className="flex items-center gap-3.5">
                          {att.status === 'present' ? (
                            <div className="w-10 h-10 bg-success-100 rounded-xl flex items-center justify-center">
                              <CheckCircle2 className="w-5 h-5 text-success-600" />
                            </div>
                          ) : att.status === 'excused' ? (
                            <div className="w-10 h-10 bg-warning-100 rounded-xl flex items-center justify-center">
                              <Clock className="w-5 h-5 text-warning-600" />
                            </div>
                          ) : (
                            <div className="w-10 h-10 bg-danger-100 rounded-xl flex items-center justify-center">
                              <XCircle className="w-5 h-5 text-danger-600" />
                            </div>
                          )}
                          <div>
                            <p className="text-sm text-neutral-900 font-semibold mb-0.5">{getProgramName(att.programId)}</p>
                            <p className="text-xs text-neutral-500 font-medium">{new Date(att.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                          </div>
                        </div>
                        <span className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold ${
                          att.status === 'present' 
                            ? 'bg-success-50 text-success-700'
                            : att.status === 'excused'
                            ? 'bg-warning-50 text-warning-700'
                            : 'bg-danger-50 text-danger-700'
                        }`}>
                          {att.status}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="w-14 h-14 bg-neutral-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                      <Users className="w-7 h-7 text-neutral-400" />
                    </div>
                    <p className="text-sm text-neutral-500 font-medium">No attendance records found</p>
                  </div>
                )}
              </div>
            )}

            {/* Donations Tab */}
            {activeTab === 'donations' && (
              <div>
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-neutral-900 font-semibold">Donation History</h3>
                  <div className="text-right">
                    <p className="text-sm text-neutral-500 font-medium">{donations.length} donations</p>
                    <p className="text-lg text-primary-600 font-bold">GH₵ {totalDonations.toLocaleString()}</p>
                  </div>
                </div>
                {donations.length > 0 ? (
                  <div className="space-y-2.5">
                    {donations.map((don) => (
                      <div key={don.id} className="flex items-center justify-between p-4 bg-neutral-50 rounded-xl hover:bg-neutral-100 transition-colors">
                        <div className="flex items-center gap-3.5">
                          <div className="w-10 h-10 bg-success-100 rounded-xl flex items-center justify-center">
                            <DollarSign className="w-5 h-5 text-success-600" />
                          </div>
                          <div>
                            <p className="text-sm text-neutral-900 font-semibold capitalize mb-0.5">{don.type.replace('_', ' ')}</p>
                            <p className="text-xs text-neutral-500 font-medium">
                              {new Date(don.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                            </p>
                            {don.description && (
                              <p className="text-xs text-neutral-400 mt-0.5 font-medium">{don.description}</p>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg text-primary-600 font-bold">GH₵ {don.amount.toFixed(2)}</p>
                          <p className="text-xs text-neutral-500 font-medium capitalize">{don.paymentMethod.replace('_', ' ')}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="w-14 h-14 bg-neutral-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                      <DollarSign className="w-7 h-7 text-neutral-400" />
                    </div>
                    <p className="text-sm text-neutral-500 font-medium">No donation records found</p>
                  </div>
                )}
              </div>
            )}

            {/* Prayer Requests Tab */}
            {activeTab === 'prayers' && (
              <div>
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-neutral-900 font-semibold">Prayer Requests</h3>
                  <button
                    onClick={() => setShowAddPrayer(!showAddPrayer)}
                    className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors font-semibold text-sm"
                  >
                    <Plus className="w-4 h-4" />
                    Add Prayer Request
                  </button>
                </div>

                {/* Add Prayer Form */}
                {showAddPrayer && (
                  <div className="mb-5 p-5 bg-primary-50 rounded-xl border border-primary-200">
                    <h4 className="text-neutral-900 font-semibold mb-4 text-base">New Prayer Request</h4>
                    <div className="space-y-3.5">
                      <div>
                        <label className="block text-sm text-neutral-700 font-semibold mb-2">Title</label>
                        <input
                          type="text"
                          value={newPrayer.title}
                          onChange={(e) => setNewPrayer({ ...newPrayer, title: e.target.value })}
                          className="w-full px-4 py-2.5 border border-neutral-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 font-medium"
                          placeholder="Brief title for the prayer request"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-neutral-700 font-semibold mb-2">Description</label>
                        <textarea
                          value={newPrayer.description}
                          onChange={(e) => setNewPrayer({ ...newPrayer, description: e.target.value })}
                          className="w-full px-4 py-2.5 border border-neutral-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 font-medium resize-none"
                          rows={3}
                          placeholder="Detailed description of the prayer need"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3.5">
                        <div>
                          <label className="block text-sm text-neutral-700 font-semibold mb-2">Priority</label>
                          <select
                            value={newPrayer.priority}
                            onChange={(e) => setNewPrayer({ ...newPrayer, priority: e.target.value as any })}
                            className="w-full px-4 py-2.5 border border-neutral-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 font-medium"
                          >
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                            <option value="urgent">Urgent</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm text-neutral-700 font-semibold mb-2">Category (Optional)</label>
                          <input
                            type="text"
                            value={newPrayer.category}
                            onChange={(e) => setNewPrayer({ ...newPrayer, category: e.target.value })}
                            className="w-full px-4 py-2.5 border border-neutral-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 font-medium"
                            placeholder="e.g., Health, Family, Work"
                          />
                        </div>
                      </div>
                      <div className="flex gap-2.5 pt-1">
                        <button
                          onClick={handleAddPrayer}
                          className="px-5 py-2.5 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors font-semibold text-sm"
                        >
                          Submit Prayer Request
                        </button>
                        <button
                          onClick={() => {
                            setShowAddPrayer(false);
                            setNewPrayer({ title: '', description: '', priority: 'medium', category: '' });
                          }}
                          className="px-5 py-2.5 bg-neutral-200 text-neutral-700 rounded-xl hover:bg-neutral-300 transition-colors font-semibold text-sm"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {prayerRequests.length > 0 ? (
                  <div className="space-y-3">
                    {prayerRequests.map((prayer) => (
                      <div key={prayer.id} className="p-4 bg-neutral-50 rounded-xl border border-neutral-200 hover:border-primary-300 transition-colors">
                        <div className="flex items-start justify-between mb-2.5">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="text-neutral-900 font-semibold text-[15px]">{prayer.title}</h4>
                              {getPriorityIcon(prayer.priority)}
                            </div>
                            <p className="text-sm text-neutral-600 font-medium mb-2.5 leading-relaxed">{prayer.description}</p>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold border ${getPriorityColor(prayer.priority)}`}>
                                {prayer.priority}
                              </span>
                              <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold border ${getStatusColor(prayer.status)}`}>
                                {prayer.status}
                              </span>
                              {prayer.category && (
                                <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-neutral-100 text-neutral-700 border border-neutral-200">
                                  {prayer.category}
                                </span>
                              )}
                              <span className="text-xs text-neutral-400 font-medium ml-1">
                                {new Date(prayer.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                          
                          {prayer.status === 'active' && (
                            <div className="flex gap-2 ml-3">
                              <button
                                onClick={() => updatePrayerStatus(prayer.id, 'answered')}
                                className="p-2 bg-success-100 text-success-600 rounded-lg hover:bg-success-200 transition-colors"
                                title="Mark as Answered"
                              >
                                <CheckCircle className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => updatePrayerStatus(prayer.id, 'closed')}
                                className="p-2 bg-neutral-200 text-neutral-600 rounded-lg hover:bg-neutral-300 transition-colors"
                                title="Close Request"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </div>
                        {prayer.answeredAt && (
                          <div className="mt-2.5 pt-2.5 border-t border-neutral-200">
                            <p className="text-xs text-success-600 font-semibold">
                              ✓ Answered on {new Date(prayer.answeredAt).toLocaleDateString()}
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="w-14 h-14 bg-neutral-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                      <Heart className="w-7 h-7 text-neutral-400" />
                    </div>
                    <p className="text-sm text-neutral-500 font-medium mb-1.5">No prayer requests yet</p>
                    <p className="text-xs text-neutral-400 font-medium">Click "Add Prayer Request" to create one</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}