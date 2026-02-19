import API from "./axios";
import type { Attendance, ChurchProgram, Donation, Expenditure, Member, User } from "../types";

type ApiEnvelope<T> = { success: boolean; data: T };

const isoDate = (value?: string | Date): string => {
  if (!value) return new Date().toISOString();
  if (value instanceof Date) return value.toISOString();
  return new Date(value).toISOString();
};

const roleModules: Record<User["role"], User["modules"]> = {
  admin: ["dashboard", "members", "programs", "attendance", "messaging", "finance", "audit", "settings", "users"],
  pastor: ["dashboard", "members", "programs", "attendance", "messaging", "audit"],
  finance: ["dashboard", "finance", "audit", "members"],
  staff: ["dashboard", "members", "programs", "attendance", "messaging"],
};

// ---------- Members ----------
type ApiMember = {
  _id: string;
  firstName: string;
  lastName: string;
  department?: string;
  phone?: string;
  email?: string;
  address?: string;
  dateOfBirth?: string;
  joinDate?: string;
  createdAt?: string;
  updatedAt?: string;
};

const mapMember = (m: ApiMember): Member => {
  const createdAt = m.createdAt ?? new Date().toISOString();
  const updatedAt = m.updatedAt ?? createdAt;
  return {
    id: m._id,
    fullName: `${m.firstName} ${m.lastName}`.trim(),
    phoneNumber: m.phone ?? "",
    email: m.email ?? "",
    dateOfBirth: m.dateOfBirth ? isoDate(m.dateOfBirth).slice(0, 10) : "",
    gender: "male",
    maritalStatus: "single",
    department: m.department || "General",
    membershipStatus: "active",
    joinDate: (m.joinDate ? isoDate(m.joinDate) : createdAt).slice(0, 10),
    address: m.address,
    createdAt,
    updatedAt,
  };
};

export async function fetchMembers(): Promise<Member[]> {
  const res = await API.get<ApiEnvelope<ApiMember[]>>("/members");
  return res.data.data.map(mapMember);
}

export async function fetchMember(memberId: string): Promise<Member> {
  const res = await API.get<ApiEnvelope<ApiMember>>(`/members/${memberId}`);
  return mapMember(res.data.data);
}

export async function createMember(input: Partial<Member>): Promise<Member> {
  const [firstName, ...rest] = (input.fullName || "").trim().split(/\s+/);
  const lastName = rest.join(" ");

  const payload = {
    firstName: firstName || "Member",
    lastName: lastName || "Name",
    phone: input.phoneNumber || undefined,
    email: input.email || undefined,
    department: input.department || undefined,
    address: input.address || undefined,
    dateOfBirth: input.dateOfBirth || undefined,
    joinDate: input.joinDate || undefined,
  };

  const res = await API.post<ApiEnvelope<ApiMember>>("/members", payload);
  return mapMember(res.data.data);
}

export async function updateMember(memberId: string, input: Partial<Member>): Promise<Member> {
  const [firstName, ...rest] = (input.fullName || "").trim().split(/\s+/);
  const lastName = rest.join(" ");

  const payload: Record<string, unknown> = {};
  if (input.fullName) {
    payload.firstName = firstName || "Member";
    payload.lastName = lastName || "Name";
  }
  if (input.phoneNumber !== undefined) payload.phone = input.phoneNumber || undefined;
  if (input.email !== undefined) payload.email = input.email || undefined;
  if (input.department !== undefined) payload.department = input.department || undefined;
  if (input.address !== undefined) payload.address = input.address || undefined;
  if (input.dateOfBirth !== undefined) payload.dateOfBirth = input.dateOfBirth || undefined;
  if (input.joinDate !== undefined) payload.joinDate = input.joinDate || undefined;

  const res = await API.put<ApiEnvelope<ApiMember>>(`/members/${memberId}`, payload);
  return mapMember(res.data.data);
}

export async function deleteMember(memberId: string): Promise<void> {
  await API.delete(`/members/${memberId}`);
}

// ---------- Programs ----------
type ApiProgram = {
  _id: string;
  title: string;
  description?: string;
  date: string;
  location?: string;
  createdAt?: string;
  updatedAt?: string;
};

const mapProgram = (p: ApiProgram): ChurchProgram => {
  const createdAt = p.createdAt ?? new Date().toISOString();
  const updatedAt = p.updatedAt ?? createdAt;
  return {
    id: p._id,
    name: p.title,
    description: p.description ?? "",
    date: isoDate(p.date).slice(0, 10),
    time: "09:00",
    location: p.location ?? "",
    isRecurring: false,
    targetAudience: "all",
    createdBy: "",
    createdAt,
    updatedAt,
  };
};

export async function fetchPrograms(): Promise<ChurchProgram[]> {
  const res = await API.get<ApiEnvelope<ApiProgram[]>>("/programs");
  return res.data.data.map(mapProgram);
}

export async function createProgram(input: Partial<ChurchProgram>): Promise<ChurchProgram> {
  const payload = {
    title: input.name || "Program",
    description: input.description || undefined,
    date: input.date || new Date().toISOString(),
    location: input.location || undefined,
  };
  const res = await API.post<ApiEnvelope<ApiProgram>>("/programs", payload);
  return mapProgram(res.data.data);
}

export async function updateProgram(programId: string, input: Partial<ChurchProgram>): Promise<ChurchProgram> {
  const payload: Record<string, unknown> = {};
  if (input.name !== undefined) payload.title = input.name;
  if (input.description !== undefined) payload.description = input.description || undefined;
  if (input.date !== undefined) payload.date = input.date;
  if (input.location !== undefined) payload.location = input.location || undefined;

  const res = await API.put<ApiEnvelope<ApiProgram>>(`/programs/${programId}`, payload);
  return mapProgram(res.data.data);
}

export async function deleteProgram(programId: string): Promise<void> {
  await API.delete(`/programs/${programId}`);
}

// ---------- Attendance ----------
type ApiAttendance = {
  _id: string;
  program: any;
  member: any;
  status: "Present" | "Absent";
  createdAt?: string;
  updatedAt?: string;
};

type ApiSundayAttendance = {
  _id: string;
  year: number;
  sundayKey: string;
  sundayDate: string;
  member: any;
  status: "Present" | "Absent";
  createdAt?: string;
  updatedAt?: string;
};

type ApiSundayAttendanceByYear = {
  year: number;
  sundayDates: string[];
  records: ApiSundayAttendance[];
  editWindow?: {
    previousSundayKey: string;
    submissionDeadlineUtc: string;
    canEditPreviousSunday: boolean;
    serverNowUtc: string;
  };
};

const mapAttendance = (a: ApiAttendance): Attendance => {
  const createdAt = a.createdAt ?? new Date().toISOString();
  const programId = typeof a.program === "string" ? a.program : a.program?._id;
  const memberId = typeof a.member === "string" ? a.member : a.member?._id;
  return {
    id: a._id,
    programId: String(programId || ""),
    memberId: String(memberId || ""),
    date: createdAt.slice(0, 10),
    status: a.status === "Present" ? "present" : "absent",
    recordedBy: "System",
    recordedAt: createdAt,
  };
};

export async function fetchAttendance(): Promise<Attendance[]> {
  const res = await API.get<ApiEnvelope<ApiAttendance[]>>("/attendance");
  return res.data.data.map(mapAttendance);
}

export async function fetchAttendanceByProgram(programId: string): Promise<Attendance[]> {
  const res = await API.get<ApiEnvelope<ApiAttendance[]>>(`/attendance/program/${programId}`);
  return res.data.data.map(mapAttendance);
}

export async function markAttendance(input: { programId: string; memberId: string; status: "present" | "absent" }): Promise<Attendance> {
  const payload = {
    program: input.programId,
    member: input.memberId,
    status: input.status === "present" ? "Present" : "Absent",
  };
  const res = await API.post<ApiEnvelope<ApiAttendance>>("/attendance", payload);
  return mapAttendance(res.data.data);
}

export type SundayAttendanceRecord = {
  id: string;
  year: number;
  sundayKey: string;
  sundayDate: string;
  memberId: string;
  status: "present" | "absent";
  recordedAt: string;
};

export type SundayEditWindow = {
  previousSundayKey: string;
  submissionDeadlineUtc: string;
  canEditPreviousSunday: boolean;
  serverNowUtc: string;
};

const mapSundayAttendance = (a: ApiSundayAttendance): SundayAttendanceRecord => {
  const updatedAt = a.updatedAt ?? a.createdAt ?? new Date().toISOString();
  const memberId = typeof a.member === "string" ? a.member : a.member?._id;
  return {
    id: a._id,
    year: a.year,
    sundayKey: a.sundayKey,
    sundayDate: isoDate(a.sundayDate).slice(0, 10),
    memberId: String(memberId || ""),
    status: a.status === "Present" ? "present" : "absent",
    recordedAt: updatedAt,
  };
};

export async function fetchSundayAttendanceYears(): Promise<number[]> {
  const res = await API.get<ApiEnvelope<number[]>>("/attendance/sunday/years");
  return res.data.data;
}

export async function fetchSundayAttendanceByYear(
  year: number
): Promise<{ year: number; sundayDates: string[]; records: SundayAttendanceRecord[]; editWindow?: SundayEditWindow }> {
  const res = await API.get<ApiEnvelope<ApiSundayAttendanceByYear>>(`/attendance/sunday/${year}`);
  return {
    year: res.data.data.year,
    sundayDates: res.data.data.sundayDates,
    records: res.data.data.records.map(mapSundayAttendance),
    editWindow: res.data.data.editWindow,
  };
}

export async function markSundayAttendance(input: {
  year: number;
  memberId: string;
  sundayKey: string;
  status: "present" | "absent";
}): Promise<SundayAttendanceRecord> {
  const res = await API.put<ApiEnvelope<ApiSundayAttendance>>(`/attendance/sunday/${input.year}`, {
    memberId: input.memberId,
    sundayKey: input.sundayKey,
    status: input.status === "present" ? "Present" : "Absent",
  });
  return mapSundayAttendance(res.data.data);
}

// ---------- Finance (Donations/Expenses) ----------
type ApiFinance = {
  _id: string;
  type: "Tithe" | "Offering" | "Donation" | "Expense";
  amount: number;
  member?: any;
  note?: string;
  date: string;
  createdAt?: string;
  updatedAt?: string;
};

export async function fetchFinance(): Promise<{ donations: Donation[]; expenditures: Expenditure[] }> {
  const res = await API.get<ApiEnvelope<ApiFinance[]>>("/finance");
  const tx = res.data.data;

  const donations: Donation[] = tx
    .filter((t) => t.type !== "Expense")
    .map((t) => {
      const createdAt = t.createdAt ?? new Date().toISOString();
      const memberName =
        typeof t.member === "object" && t.member
          ? `${t.member.firstName ?? ""} ${t.member.lastName ?? ""}`.trim() || "Member"
          : "Anonymous";

      const memberId = typeof t.member === "object" && t.member?._id ? String(t.member._id) : undefined;

      return {
        id: t._id,
        memberId,
        memberName,
        amount: t.amount,
        currency: "GHS",
        type: t.type === "Tithe" ? "tithe" : t.type === "Offering" ? "offering" : "other",
        description: t.note,
        category: undefined,
        date: isoDate(t.date).slice(0, 10),
        paymentMethod: "cash",
        receiptNumber: undefined,
        recordedBy: "System",
        createdAt,
      };
    });

  const expenditures: Expenditure[] = tx
    .filter((t) => t.type === "Expense")
    .map((t) => {
      const createdAt = t.createdAt ?? new Date().toISOString();
      return {
        id: t._id,
        category: "other",
        amount: t.amount,
        currency: "GHS",
        description: t.note || "Expense",
        vendor: undefined,
        date: isoDate(t.date).slice(0, 10),
        paymentMethod: "cash",
        approvedBy: "System",
        receiptNumber: undefined,
        recordedBy: "System",
        createdAt,
      };
    });

  return { donations, expenditures };
}

export async function createFinanceTransaction(input: {
  type: "Tithe" | "Offering" | "Donation" | "Expense";
  amount: number;
  memberId?: string;
  note?: string;
  date?: string;
}): Promise<void> {
  await API.post("/finance", {
    type: input.type,
    amount: input.amount,
    member: input.memberId,
    note: input.note,
    date: input.date,
  });
}

// ---------- Users ----------
type ApiUserModules = "dashboard" | "members" | "programs" | "attendance" | "messaging" | "finance" | "audit" | "settings" | "users";
type ApiUser = { _id: string; name: string; email: string; role: string; modules?: ApiUserModules[]; isActive?: boolean; createdAt?: string; updatedAt?: string };

const mapUser = (u: ApiUser): User => {
  const createdAt = u.createdAt ?? new Date().toISOString();
  const updatedAt = u.updatedAt ?? createdAt;
  const role = String(u.role || "").toLowerCase();
  const mappedRole: User["role"] =
    role === "admin" ? "admin" : role === "finance" ? "finance" : role === "staff" ? "staff" : "pastor";
  return {
    id: u._id,
    name: u.name,
    email: u.email,
    role: mappedRole,
    modules: u.modules && u.modules.length > 0 ? (u.modules as User["modules"]) : roleModules[mappedRole],
    isActive: u.isActive ?? true,
    createdAt,
    updatedAt,
  };
};

export async function fetchUsers(): Promise<User[]> {
  const res = await API.get<ApiEnvelope<ApiUser[]>>("/users");
  return res.data.data.map(mapUser);
}

export async function createUser(input: { name: string; email: string; password: string; role: User["role"]; modules: User["modules"]; isActive?: boolean }): Promise<User> {
  const apiRole =
    input.role === "admin"
      ? "Admin"
      : input.role === "finance"
      ? "Finance"
      : input.role === "staff"
      ? "Staff"
      : "Pastor";

  const res = await API.post<ApiEnvelope<{ id: string; name: string; email: string; role: string }>>("/users", {
    name: input.name,
    email: input.email,
    password: input.password,
    role: apiRole,
    modules: input.modules,
    isActive: input.isActive ?? true,
  });

  // createUser returns {id,...} not {_id,...}
  const created: ApiUser = {
    _id: res.data.data.id,
    name: res.data.data.name,
    email: res.data.data.email,
    role: res.data.data.role,
    modules: input.modules,
    isActive: input.isActive ?? true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  return mapUser(created);
}

export async function updateUser(userId: string, input: Partial<{ name: string; email: string; password: string; role: User["role"]; modules: User["modules"]; isActive: boolean }>): Promise<User> {
  const payload: Record<string, unknown> = {};
  if (input.name !== undefined) payload.name = input.name;
  if (input.email !== undefined) payload.email = input.email;
  if (input.password) payload.password = input.password;
  if (input.role !== undefined) {
    payload.role =
      input.role === "admin"
        ? "Admin"
        : input.role === "finance"
        ? "Finance"
        : input.role === "staff"
        ? "Staff"
        : "Pastor";
  }
  if (input.modules !== undefined) payload.modules = input.modules;
  if (input.isActive !== undefined) payload.isActive = input.isActive;

  const res = await API.put<ApiEnvelope<ApiUser>>(`/users/${userId}`, payload);
  return mapUser(res.data.data);
}

export async function deleteUser(userId: string): Promise<void> {
  await API.delete(`/users/${userId}`);
}

// ---------- Settings ----------
type ApiSettings = {
  _id: string;
  churchName: string;
  address?: string;
  phone?: string;
  email?: string;
  smsEnabled?: boolean;
  smsProvider?: string;
  smsApiKey?: string;
  smsSenderId?: string;
  departments?: string[];
  enableBirthdayNotifications?: boolean;
  birthdayMessageTemplate?: string;
  birthdaySendDaysBefore?: number;
  birthdaySendTime?: string;
  enableProgramReminders?: boolean;
  enableMemberAddedNotifications?: boolean;
  enableDonationNotifications?: boolean;
  enableUserAddedNotifications?: boolean;
  programNotificationTemplate?: string;
  memberAddedNotificationTemplate?: string;
  donationNotificationTemplate?: string;
  userAddedNotificationTemplate?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type SettingsPayload = {
  id?: string;
  churchName: string;
  address?: string;
  phone?: string;
  email?: string;
  smsEnabled?: boolean;
  smsProvider?: string;
  smsApiKey?: string;
  smsSenderId?: string;
  departments?: string[];
  enableBirthdayNotifications?: boolean;
  birthdayMessageTemplate?: string;
  birthdaySendDaysBefore?: number;
  birthdaySendTime?: string;
  enableProgramReminders?: boolean;
  enableMemberAddedNotifications?: boolean;
  enableDonationNotifications?: boolean;
  enableUserAddedNotifications?: boolean;
  programNotificationTemplate?: string;
  memberAddedNotificationTemplate?: string;
  donationNotificationTemplate?: string;
  userAddedNotificationTemplate?: string;
};

export async function fetchSettings(): Promise<SettingsPayload | null> {
  const res = await API.get<ApiEnvelope<ApiSettings | null>>("/settings");
  const settings = res.data.data;
  if (!settings) return null;

  return {
    id: settings._id,
    churchName: settings.churchName,
    address: settings.address,
    phone: settings.phone,
    email: settings.email,
    smsEnabled: settings.smsEnabled,
    smsProvider: settings.smsProvider,
    smsApiKey: settings.smsApiKey,
    smsSenderId: settings.smsSenderId,
    departments: settings.departments || [],
    enableBirthdayNotifications: settings.enableBirthdayNotifications,
    birthdayMessageTemplate: settings.birthdayMessageTemplate,
    birthdaySendDaysBefore: settings.birthdaySendDaysBefore,
    birthdaySendTime: settings.birthdaySendTime,
    enableProgramReminders: settings.enableProgramReminders,
    enableMemberAddedNotifications: settings.enableMemberAddedNotifications,
    enableDonationNotifications: settings.enableDonationNotifications,
    enableUserAddedNotifications: settings.enableUserAddedNotifications,
    programNotificationTemplate: settings.programNotificationTemplate,
    memberAddedNotificationTemplate: settings.memberAddedNotificationTemplate,
    donationNotificationTemplate: settings.donationNotificationTemplate,
    userAddedNotificationTemplate: settings.userAddedNotificationTemplate,
  };
}

export async function upsertSettings(payload: SettingsPayload): Promise<SettingsPayload> {
  const body = {
    churchName: payload.churchName,
    address: payload.address,
    phone: payload.phone,
    email: payload.email,
    smsEnabled: payload.smsEnabled,
    smsProvider: payload.smsProvider,
    smsApiKey: payload.smsApiKey,
    smsSenderId: payload.smsSenderId,
    departments: payload.departments,
    enableBirthdayNotifications: payload.enableBirthdayNotifications,
    birthdayMessageTemplate: payload.birthdayMessageTemplate,
    birthdaySendDaysBefore: payload.birthdaySendDaysBefore,
    birthdaySendTime: payload.birthdaySendTime,
    enableProgramReminders: payload.enableProgramReminders,
    enableMemberAddedNotifications: payload.enableMemberAddedNotifications,
    enableDonationNotifications: payload.enableDonationNotifications,
    enableUserAddedNotifications: payload.enableUserAddedNotifications,
    programNotificationTemplate: payload.programNotificationTemplate,
    memberAddedNotificationTemplate: payload.memberAddedNotificationTemplate,
    donationNotificationTemplate: payload.donationNotificationTemplate,
    userAddedNotificationTemplate: payload.userAddedNotificationTemplate,
  };

  if (payload.id) {
    const res = await API.put<ApiEnvelope<ApiSettings>>(`/settings/${payload.id}`, body);
    return {
      id: res.data.data._id,
      churchName: res.data.data.churchName,
      address: res.data.data.address,
      phone: res.data.data.phone,
      email: res.data.data.email,
      smsEnabled: res.data.data.smsEnabled,
      smsProvider: res.data.data.smsProvider,
      smsApiKey: res.data.data.smsApiKey,
      smsSenderId: res.data.data.smsSenderId,
      departments: res.data.data.departments || [],
      enableBirthdayNotifications: res.data.data.enableBirthdayNotifications,
      birthdayMessageTemplate: res.data.data.birthdayMessageTemplate,
      birthdaySendDaysBefore: res.data.data.birthdaySendDaysBefore,
      birthdaySendTime: res.data.data.birthdaySendTime,
      enableProgramReminders: res.data.data.enableProgramReminders,
      enableMemberAddedNotifications: res.data.data.enableMemberAddedNotifications,
      enableDonationNotifications: res.data.data.enableDonationNotifications,
      enableUserAddedNotifications: res.data.data.enableUserAddedNotifications,
      programNotificationTemplate: res.data.data.programNotificationTemplate,
      memberAddedNotificationTemplate: res.data.data.memberAddedNotificationTemplate,
      donationNotificationTemplate: res.data.data.donationNotificationTemplate,
      userAddedNotificationTemplate: res.data.data.userAddedNotificationTemplate,
    };
  }

  const res = await API.post<ApiEnvelope<ApiSettings>>("/settings", body);
  return {
    id: res.data.data._id,
    churchName: res.data.data.churchName,
    address: res.data.data.address,
    phone: res.data.data.phone,
    email: res.data.data.email,
    smsEnabled: res.data.data.smsEnabled,
    smsProvider: res.data.data.smsProvider,
    smsApiKey: res.data.data.smsApiKey,
    smsSenderId: res.data.data.smsSenderId,
    departments: res.data.data.departments || [],
    enableBirthdayNotifications: res.data.data.enableBirthdayNotifications,
    birthdayMessageTemplate: res.data.data.birthdayMessageTemplate,
    birthdaySendDaysBefore: res.data.data.birthdaySendDaysBefore,
    birthdaySendTime: res.data.data.birthdaySendTime,
    enableProgramReminders: res.data.data.enableProgramReminders,
    enableMemberAddedNotifications: res.data.data.enableMemberAddedNotifications,
    enableDonationNotifications: res.data.data.enableDonationNotifications,
    enableUserAddedNotifications: res.data.data.enableUserAddedNotifications,
    programNotificationTemplate: res.data.data.programNotificationTemplate,
    memberAddedNotificationTemplate: res.data.data.memberAddedNotificationTemplate,
    donationNotificationTemplate: res.data.data.donationNotificationTemplate,
    userAddedNotificationTemplate: res.data.data.userAddedNotificationTemplate,
  };
}

// ---------- SMS ----------
type SendSmsRecipient = {
  memberId?: string;
  name?: string;
  phone: string;
};

type ApiSmsSendResponse = {
  logs: Array<{
    id: string;
    recipientId: string;
    recipientName: string;
    recipientPhone: string;
    message: string;
    type: "manual";
    status: "sent" | "failed" | "pending";
    sentAt: string;
    createdBy: string;
    createdAt: string;
    failureReason?: string;
  }>;
};

export async function sendSmsBroadcast(payload: {
  message: string;
  recipients: SendSmsRecipient[];
  sender?: string;
}) {
  const res = await API.post<ApiEnvelope<ApiSmsSendResponse>>("/sms/send", payload);
  return res.data.data;
}
