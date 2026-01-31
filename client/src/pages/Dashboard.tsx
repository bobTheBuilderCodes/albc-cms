import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { 
  Users, 
  Calendar, 
  TrendingUp, 
  DollarSign,
  MessageSquare,
  Cake,
  UserCheck,
  AlertCircle,
  ArrowUpRight,
  Clock,
  TrendingDown,
  BarChart3
} from 'lucide-react';
import type { Member, ChurchProgram, SMSLog, Donation, Attendance, Expenditure } from '../types';
import { initializeMockData } from '../utils/mockData';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function Dashboard() {
  const [members, setMembers] = useState<Member[]>([]);
  const [programs, setPrograms] = useState<ChurchProgram[]>([]);
  const [smsLogs, setSmsLogs] = useState<SMSLog[]>([]);
  const [donations, setDonations] = useState<Donation[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [expenditures, setExpenditures] = useState<Expenditure[]>([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [viewType, setViewType] = useState<'monthly' | 'quarterly'>('monthly');
  const navigate = useNavigate();

  useEffect(() => {
    initializeMockData();
    loadData();
  }, []);

  const loadData = () => {
    setMembers(JSON.parse(localStorage.getItem('cms_members') || '[]'));
    setPrograms(JSON.parse(localStorage.getItem('cms_programs') || '[]'));
    setSmsLogs(JSON.parse(localStorage.getItem('cms_sms_logs') || '[]'));
    setDonations(JSON.parse(localStorage.getItem('cms_donations') || '[]'));
    setAttendance(JSON.parse(localStorage.getItem('cms_attendance') || '[]'));
    setExpenditures(JSON.parse(localStorage.getItem('cms_expenditures') || '[]'));
  };

  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  
  const birthdaysThisMonth = members.filter(m => {
    const dob = new Date(m.dateOfBirth);
    return dob.getMonth() === currentMonth;
  }).sort((a, b) => {
    const dateA = new Date(a.dateOfBirth).getDate();
    const dateB = new Date(b.dateOfBirth).getDate();
    return dateA - dateB;
  });

  const upcomingPrograms = programs.filter(p => new Date(p.date) >= today).slice(0, 5);
  
  const totalDonations = donations.reduce((sum, d) => sum + d.amount, 0);
  const activeMembers = members.filter(m => m.membershipStatus === 'active').length;
  const attendanceRate = attendance.length > 0
    ? (attendance.filter(a => a.status === 'present').length / attendance.length) * 100
    : 0;

  const totalExpenditures = expenditures.reduce((sum, e) => sum + e.amount, 0);

  // Generate finance chart data
  const getFinanceChartData = () => {
    if (viewType === 'monthly') {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return months.map((month, index) => {
        const monthlyIncome = donations
          .filter(d => {
            const date = new Date(d.date);
            return date.getFullYear() === selectedYear && date.getMonth() === index;
          })
          .reduce((sum, d) => sum + d.amount, 0);

        const monthlyExpenditure = expenditures
          .filter(e => {
            const date = new Date(e.date);
            return date.getFullYear() === selectedYear && date.getMonth() === index;
          })
          .reduce((sum, e) => sum + e.amount, 0);

        return {
          name: month,
          Income: monthlyIncome,
          Expenditure: monthlyExpenditure,
        };
      });
    } else {
      const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];
      return quarters.map((quarter, index) => {
        const startMonth = index * 3;
        const endMonth = startMonth + 3;

        const quarterlyIncome = donations
          .filter(d => {
            const date = new Date(d.date);
            return date.getFullYear() === selectedYear && date.getMonth() >= startMonth && date.getMonth() < endMonth;
          })
          .reduce((sum, d) => sum + d.amount, 0);

        const quarterlyExpenditure = expenditures
          .filter(e => {
            const date = new Date(e.date);
            return date.getFullYear() === selectedYear && date.getMonth() >= startMonth && date.getMonth() < endMonth;
          })
          .reduce((sum, e) => sum + e.amount, 0);

        return {
          name: quarter,
          Income: quarterlyIncome,
          Expenditure: quarterlyExpenditure,
        };
      });
    }
  };

  const financeChartData = getFinanceChartData();

  // Get available years from donations and expenditures
  const availableYears = Array.from(
    new Set([
      ...donations.map(d => new Date(d.date).getFullYear()),
      ...expenditures.map(e => new Date(e.date).getFullYear()),
      new Date().getFullYear()
    ])
  ).sort((a, b) => b - a);

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-neutral-900 mb-2 font-bold">Dashboard Overview</h1>
        <p className="text-neutral-600 font-medium">Welcome to your church management system</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div 
          onClick={() => navigate('/members')}
          className="group bg-white rounded-2xl p-6 border border-neutral-200 hover:border-primary-300 cursor-pointer transition-all duration-200 hover:shadow-lg hover:shadow-primary-500/10"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 bg-primary-50 rounded-xl flex items-center justify-center group-hover:bg-primary-100 transition-colors">
              <Users className="w-6 h-6 text-primary-600" />
            </div>
            <ArrowUpRight className="w-5 h-5 text-neutral-400 group-hover:text-primary-500 transition-colors" />
          </div>
          <p className="text-3xl text-neutral-900 mb-1 font-bold">{members.length}</p>
          <p className="text-sm text-neutral-600 font-medium mb-2">Total Members</p>
          <p className="text-xs text-neutral-500 font-medium">{activeMembers} active members</p>
        </div>

        <div 
          onClick={() => navigate('/programs')}
          className="group bg-white rounded-2xl p-6 border border-neutral-200 hover:border-accent-300 cursor-pointer transition-all duration-200 hover:shadow-lg hover:shadow-accent-500/10"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 bg-accent-50 rounded-xl flex items-center justify-center group-hover:bg-accent-100 transition-colors">
              <Calendar className="w-6 h-6 text-accent-600" />
            </div>
            <ArrowUpRight className="w-5 h-5 text-neutral-400 group-hover:text-accent-500 transition-colors" />
          </div>
          <p className="text-3xl text-neutral-900 mb-1 font-bold">{upcomingPrograms.length}</p>
          <p className="text-sm text-neutral-600 font-medium mb-2">Upcoming Programs</p>
          <p className="text-xs text-neutral-500 font-medium">{programs.length} total programs</p>
        </div>

        <div 
          onClick={() => navigate('/finance')}
          className="group bg-white rounded-2xl p-6 border border-neutral-200 hover:border-success-300 cursor-pointer transition-all duration-200 hover:shadow-lg hover:shadow-success-500/10"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 bg-success-50 rounded-xl flex items-center justify-center group-hover:bg-success-100 transition-colors">
              <DollarSign className="w-6 h-6 text-success-600" />
            </div>
            <ArrowUpRight className="w-5 h-5 text-neutral-400 group-hover:text-success-500 transition-colors" />
          </div>
          <p className="text-3xl text-neutral-900 mb-1 font-bold">GH₵ {totalDonations.toLocaleString()}</p>
          <p className="text-sm text-neutral-600 font-medium mb-2">Total Income</p>
          <p className="text-xs text-neutral-500 font-medium">{donations.length} transactions</p>
        </div>

        <div 
          onClick={() => navigate('/finance')}
          className="group bg-white rounded-2xl p-6 border border-neutral-200 hover:border-danger-300 cursor-pointer transition-all duration-200 hover:shadow-lg hover:shadow-danger-500/10"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 bg-danger-50 rounded-xl flex items-center justify-center group-hover:bg-danger-100 transition-colors">
              <TrendingDown className="w-6 h-6 text-danger-600" />
            </div>
            <ArrowUpRight className="w-5 h-5 text-neutral-400 group-hover:text-danger-500 transition-colors" />
          </div>
          <p className="text-3xl text-neutral-900 mb-1 font-bold">GH₵ {totalExpenditures.toLocaleString()}</p>
          <p className="text-sm text-neutral-600 font-medium mb-2">Total Expenses</p>
          <p className="text-xs text-neutral-500 font-medium">{expenditures.length} transactions</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Upcoming Programs */}
        <div className="bg-white rounded-2xl border border-neutral-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-accent-50 rounded-xl flex items-center justify-center">
                <Calendar className="w-5 h-5 text-accent-600" />
              </div>
              <h3 className="text-neutral-900 font-semibold">Upcoming Programs</h3>
            </div>
            <button
              onClick={() => navigate('/programs')}
              className="text-sm text-primary-600 hover:text-primary-700 font-semibold flex items-center gap-1"
            >
              View All
              <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
            {upcomingPrograms.length > 0 ? (
              upcomingPrograms.map((program) => (
                <div key={program.id} className="flex items-start gap-4 p-4 bg-neutral-50 rounded-xl hover:bg-neutral-100 transition-colors">
                  <div className="w-12 h-12 bg-gradient-to-br from-accent-400 to-accent-500 rounded-xl flex flex-col items-center justify-center text-white flex-shrink-0">
                    <span className="text-xs font-semibold">{new Date(program.date).toLocaleDateString('en-US', { month: 'short' })}</span>
                    <span className="text-lg font-bold leading-none">{new Date(program.date).getDate()}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-neutral-900 font-semibold truncate">{program.name}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-neutral-600 font-medium flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {program.time}
                      </span>
                      <span className="text-xs text-neutral-500 font-medium">{program.location}</span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-neutral-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Calendar className="w-8 h-8 text-neutral-400" />
                </div>
                <p className="text-sm text-neutral-500 font-medium">No upcoming programs</p>
              </div>
            )}
          </div>
        </div>

        {/* Birthdays This Month */}
        <div className="bg-white rounded-2xl border border-neutral-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-warning-50 rounded-xl flex items-center justify-center">
                <Cake className="w-5 h-5 text-warning-600" />
              </div>
              <h3 className="text-neutral-900 font-semibold">Birthdays This Month</h3>
            </div>
            {birthdaysThisMonth.length > 0 && (
              <span className="inline-flex items-center px-2.5 py-1 bg-warning-50 text-warning-700 text-xs font-semibold rounded-lg">
                {birthdaysThisMonth.length} {birthdaysThisMonth.length === 1 ? 'birthday' : 'birthdays'}
              </span>
            )}
          </div>
          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
            {birthdaysThisMonth.length > 0 ? (
              birthdaysThisMonth.map((member) => {
                const dob = new Date(member.dateOfBirth);
                const birthDate = dob.getDate();
                const birthMonth = dob.toLocaleDateString('en-US', { month: 'short' });
                const isToday = dob.getDate() === today.getDate() && dob.getMonth() === today.getMonth();
                
                return (
                  <div key={member.id} className={`flex items-center gap-4 p-4 rounded-xl ${
                    isToday ? 'bg-gradient-to-r from-warning-100 to-accent-100 border-2 border-warning-300' : 'bg-gradient-to-r from-warning-50 to-accent-50'
                  }`}>
                    <div className="w-12 h-12 bg-gradient-to-br from-warning-400 to-warning-500 rounded-xl flex flex-col items-center justify-center text-white flex-shrink-0">
                      <span className="text-xs font-semibold">{birthMonth}</span>
                      <span className="text-lg font-bold leading-none">{birthDate}</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-neutral-900 font-semibold">{member.fullName}</p>
                      <p className="text-xs text-neutral-600 font-medium">{member.department}</p>
                    </div>
                    {isToday && (
                      <div className="flex items-center gap-1 px-2.5 py-1 bg-warning-200 rounded-lg">
                        <Cake className="w-4 h-4 text-warning-700" />
                        <span className="text-xs font-semibold text-warning-700">Today</span>
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-neutral-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Cake className="w-8 h-8 text-neutral-400" />
                </div>
                <p className="text-sm text-neutral-500 font-medium">No birthdays this month</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl border border-neutral-200 p-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-success-50 rounded-xl flex items-center justify-center">
              <UserCheck className="w-7 h-7 text-success-600" />
            </div>
            <div>
              <p className="text-sm text-neutral-600 font-medium mb-1">Attendance Rate</p>
              <p className="text-2xl text-neutral-900 font-bold">{attendanceRate.toFixed(0)}%</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-neutral-200 p-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-primary-50 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-7 h-7 text-primary-600" />
            </div>
            <div>
              <p className="text-sm text-neutral-600 font-medium mb-1">Active Members</p>
              <p className="text-2xl text-neutral-900 font-bold">{activeMembers}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-neutral-200 p-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-danger-50 rounded-xl flex items-center justify-center">
              <AlertCircle className="w-7 h-7 text-danger-600" />
            </div>
            <div>
              <p className="text-sm text-neutral-600 font-medium mb-1">Failed Messages</p>
              <p className="text-2xl text-neutral-900 font-bold">{smsLogs.filter(s => s.status === 'failed').length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Income vs Expenditure Chart */}
      <div className="bg-white rounded-2xl border border-neutral-200 p-6 mt-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-primary-600" />
            </div>
            <h3 className="text-neutral-900 font-semibold">Income vs Expenditure</h3>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="px-3 py-1.5 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm font-medium"
            >
              {availableYears.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
            <div className="flex gap-1 p-1 bg-neutral-100 rounded-lg">
              <button
                onClick={() => setViewType('monthly')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                  viewType === 'monthly'
                    ? 'bg-white text-primary-600 shadow-sm'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setViewType('quarterly')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                  viewType === 'quarterly'
                    ? 'bg-white text-primary-600 shadow-sm'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                Quarterly
              </button>
            </div>
            <button
              onClick={() => navigate('/finance')}
              className="text-sm text-primary-600 hover:text-primary-700 font-semibold flex items-center gap-1"
            >
              View Details
              <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div>
          {financeChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={350}>
              <BarChart
                data={financeChartData}
                margin={{
                  top: 10,
                  right: 30,
                  left: 20,
                  bottom: 5,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="name" 
                  tick={{ fill: '#6b7280', fontSize: 12, fontWeight: 500 }}
                  axisLine={{ stroke: '#e5e7eb' }}
                />
                <YAxis 
                  tick={{ fill: '#6b7280', fontSize: 12, fontWeight: 500 }}
                  axisLine={{ stroke: '#e5e7eb' }}
                  tickFormatter={(value) => `GH₵${value.toLocaleString()}`}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  }}
                  formatter={(value: number) => [`GH₵${value.toLocaleString()}`, '']}
                  labelStyle={{ fontWeight: 600, color: '#111827' }}
                />
                <Legend 
                  wrapperStyle={{ paddingTop: '20px' }}
                  iconType="circle"
                />
                <Bar dataKey="Income" fill="#10b981" radius={[8, 8, 0, 0]} />
                <Bar dataKey="Expenditure" fill="#ef4444" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-16">
              <div className="w-16 h-16 bg-neutral-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <BarChart3 className="w-8 h-8 text-neutral-400" />
              </div>
              <p className="text-sm text-neutral-500 font-medium mb-1">No financial data available</p>
              <p className="text-xs text-neutral-400 font-medium">Start recording income and expenditures to see analytics</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}