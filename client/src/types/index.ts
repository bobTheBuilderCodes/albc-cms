export type UserRole = 'pastor' | 'admin';

export type ModulePermission = 
  | 'dashboard'
  | 'members'
  | 'programs'
  | 'attendance'
  | 'messaging'
  | 'finance'
  | 'audit'
  | 'settings'
  | 'users';

export interface User {
  id: string;
  email: string;
  password?: string;
  name: string;
  role: UserRole;
  modules: ModulePermission[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
}

export type MembershipStatus = 'active' | 'inactive';
export type Gender = 'male' | 'female';
export type MaritalStatus = 'single' | 'married' | 'widowed' | 'divorced';

export interface Member {
  id: string;
  fullName: string;
  phoneNumber: string;
  email: string;
  dateOfBirth: string;
  gender: Gender;
  maritalStatus: MaritalStatus;
  department: string;
  membershipStatus: MembershipStatus;
  joinDate: string;
  address?: string;
  photoUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChurchProgram {
  id: string;
  name: string;
  description: string;
  date: string;
  time: string;
  location: string;
  isRecurring: boolean;
  recurrencePattern?: 'weekly' | 'monthly' | 'yearly';
  targetAudience: 'all' | 'department' | 'selected';
  targetDepartments?: string[];
  targetMemberIds?: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface Attendance {
  id: string;
  programId: string;
  memberId: string;
  date: string;
  status: 'present' | 'absent' | 'excused';
  notes?: string;
  recordedBy: string;
  recordedAt: string;
}

export type SMSStatus = 'sent' | 'failed' | 'pending';
export type SMSType = 'program_reminder' | 'birthday' | 'manual' | 'announcement';

export interface SMSLog {
  id: string;
  recipientId: string;
  recipientName: string;
  recipientPhone: string;
  message: string;
  type: SMSType;
  status: SMSStatus;
  sentAt?: string;
  failureReason?: string;
  programId?: string;
  createdBy: string;
  createdAt: string;
}

export interface SMSTemplate {
  id: string;
  name: string;
  type: SMSType;
  content: string;
  variables: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type DonationType = 'tithe' | 'offering' | 'seed' | 'special' | 'other';

export interface Donation {
  id: string;
  memberId?: string;
  memberName: string;
  amount: number;
  currency: string;
  type: DonationType;
  category?: string;
  description?: string;
  date: string;
  paymentMethod: 'cash' | 'mobile_money' | 'bank_transfer' | 'check';
  receiptNumber?: string;
  recordedBy: string;
  createdAt: string;
}

export type ExpenditureCategory = 
  | 'rent' 
  | 'utilities' 
  | 'salaries' 
  | 'maintenance' 
  | 'supplies' 
  | 'ministry' 
  | 'equipment' 
  | 'transportation' 
  | 'events' 
  | 'other';

export interface Expenditure {
  id: string;
  category: ExpenditureCategory;
  amount: number;
  currency: string;
  description: string;
  vendor?: string;
  date: string;
  paymentMethod: 'cash' | 'mobile_money' | 'bank_transfer' | 'check';
  approvedBy: string;
  receiptNumber?: string;
  recordedBy: string;
  createdAt: string;
}

export type AuditAction = 
  | 'member_created' 
  | 'member_updated' 
  | 'member_deleted'
  | 'program_created'
  | 'program_updated'
  | 'program_deleted'
  | 'attendance_recorded'
  | 'sms_sent'
  | 'donation_recorded'
  | 'login'
  | 'logout';

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  action: AuditAction;
  resourceType: string;
  resourceId?: string;
  details: string;
  ipAddress?: string;
  timestamp: string;
}

export interface DashboardStats {
  totalMembers: number;
  activeMembers: number;
  inactiveMembers: number;
  upcomingPrograms: number;
  birthdaysToday: number;
  birthdaysThisWeek: number;
  totalDonations: number;
  smsSent: number;
  smsFailed: number;
  smsPending: number;
  attendanceRate: number;
}

export type PrayerRequestStatus = 'active' | 'answered' | 'closed';
export type PrayerRequestPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface PrayerRequest {
  id: string;
  memberId: string;
  memberName: string;
  title: string;
  description: string;
  category?: string;
  status: PrayerRequestStatus;
  priority: PrayerRequestPriority;
  isPrivate: boolean;
  createdAt: string;
  updatedAt: string;
  answeredAt?: string;
  answeredNote?: string;
}