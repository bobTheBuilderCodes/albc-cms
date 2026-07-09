import API from "./axios";
import { buildCacheKey, cacheGet } from "../utils/offline";
import type { Attendance, Automation, ChurchProgram, Donation, Expenditure, Member, Pledge, SMSLog, SoulCenterVisitor, User } from "../types";
import type { Notification } from "../types/notifications";

type ApiEnvelope<T> = { success: boolean; data: T };

const isoDate = (value?: string | Date): string => {
  if (!value) return new Date().toISOString();
  if (value instanceof Date) return value.toISOString();
  return new Date(value).toISOString();
};

const offlineId = () => `offline-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
const offlineNow = () => new Date().toISOString();

async function getCachedMember(memberId: string): Promise<ApiMember | null> {
  const byId = await cacheGet<ApiEnvelope<ApiMember>>(buildCacheKey(`/members/${memberId}`));
  if (byId?.data) return byId.data;
  const list = await cacheGet<ApiEnvelope<ApiMember[]>>(buildCacheKey("/members"));
  return list?.data?.find((m) => m._id === memberId) ?? null;
}

async function getCachedProgram(programId: string): Promise<ApiProgram | null> {
  const byId = await cacheGet<ApiEnvelope<ApiProgram>>(buildCacheKey(`/programs/${programId}`));
  if (byId?.data) return byId.data;
  const list = await cacheGet<ApiEnvelope<ApiProgram[]>>(buildCacheKey("/programs"));
  return list?.data?.find((p) => p._id === programId) ?? null;
}

async function getCachedVisitor(visitorId: string): Promise<ApiSoulCenterVisitor | null> {
  const byId = await cacheGet<ApiEnvelope<ApiSoulCenterVisitor>>(buildCacheKey(`/soul-center/${visitorId}`));
  if (byId?.data) return byId.data;
  const list = await cacheGet<ApiEnvelope<ApiSoulCenterVisitor[]>>(buildCacheKey("/soul-center"));
  return list?.data?.find((v) => v._id === visitorId) ?? null;
}

const roleModules: Record<User["role"], User["modules"]> = {
  admin: ["members", "messaging", "automation", "settings"],
  pastor: ["members", "messaging"],
  finance: ["members", "messaging"],
  staff: ["members", "messaging"],
};

// ---------- Members ----------
type ApiMember = {
  _id: string;
  firstName: string;
  lastName: string;
  gender?: "male" | "female";
  maritalStatus?: "single" | "married" | "widowed" | "divorced";
  membershipStatus?: "active" | "inactive";
  department?: string;
  departments?: string[];
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
  const departments = (m.departments || [m.department || "General"])
    .map((dept) => String(dept || "").trim())
    .filter(Boolean);
  return {
    id: m._id,
    fullName: `${m.firstName} ${m.lastName}`.trim(),
    phoneNumber: m.phone ?? "",
    email: m.email ?? "",
    dateOfBirth: m.dateOfBirth ? isoDate(m.dateOfBirth).slice(0, 10) : "",
    gender: m.gender ?? "male",
    maritalStatus: m.maritalStatus ?? "single",
    department: departments[0] || "General",
    departments,
    membershipStatus: m.membershipStatus ?? "active",
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
  const departments = Array.from(
    new Set(
      (input.departments?.length ? input.departments : input.department ? [input.department] : [])
        .map((dept) => String(dept || "").trim())
        .filter(Boolean)
    )
  );

  const payload = {
    firstName: firstName || "Member",
    lastName: lastName || "Name",
    phone: input.phoneNumber || undefined,
    email: input.email || undefined,
    gender: input.gender || undefined,
    maritalStatus: input.maritalStatus || undefined,
    membershipStatus: input.membershipStatus || undefined,
    department: departments[0] || input.department || undefined,
    departments,
    address: input.address || undefined,
    dateOfBirth: input.dateOfBirth || undefined,
    joinDate: input.joinDate || undefined,
  };

  const offlinePayload: ApiMember = {
    _id: offlineId(),
    firstName: payload.firstName,
    lastName: payload.lastName,
    gender: payload.gender as ApiMember["gender"],
    maritalStatus: payload.maritalStatus as ApiMember["maritalStatus"],
    membershipStatus: payload.membershipStatus as ApiMember["membershipStatus"],
    department: payload.department,
    departments: payload.departments,
    phone: payload.phone,
    email: payload.email,
    address: payload.address,
    dateOfBirth: payload.dateOfBirth,
    joinDate: payload.joinDate,
    createdAt: offlineNow(),
    updatedAt: offlineNow(),
  };

  const res = await API.post<ApiEnvelope<ApiMember>>("/members", payload, { offlineData: offlinePayload });
  return mapMember(res.data.data);
}

export async function updateMember(memberId: string, input: Partial<Member>): Promise<Member> {
  const [firstName, ...rest] = (input.fullName || "").trim().split(/\s+/);
  const lastName = rest.join(" ");
  const departments = Array.from(
    new Set(
      (input.departments?.length ? input.departments : input.department ? [input.department] : [])
        .map((dept) => String(dept || "").trim())
        .filter(Boolean)
    )
  );

  const payload: Record<string, unknown> = {};
  if (input.fullName) {
    payload.firstName = firstName || "Member";
    payload.lastName = lastName || "Name";
  }
  if (input.phoneNumber !== undefined) payload.phone = input.phoneNumber || undefined;
  if (input.email !== undefined) payload.email = input.email || undefined;
  if (input.gender !== undefined) payload.gender = input.gender || undefined;
  if (input.maritalStatus !== undefined) payload.maritalStatus = input.maritalStatus || undefined;
  if (input.membershipStatus !== undefined) payload.membershipStatus = input.membershipStatus || undefined;
  if (input.department !== undefined || input.departments !== undefined) {
    payload.departments = departments;
    payload.department = departments[0] || input.department || undefined;
  }
  if (input.address !== undefined) payload.address = input.address || undefined;
  if (input.dateOfBirth !== undefined) payload.dateOfBirth = input.dateOfBirth || undefined;
  if (input.joinDate !== undefined) payload.joinDate = input.joinDate || undefined;

  const cached = await getCachedMember(memberId);
  const fallback: ApiMember = {
    _id: memberId,
    firstName: input.fullName ? firstName || "Member" : cached?.firstName || "Member",
    lastName: input.fullName ? lastName || "Name" : cached?.lastName || "Name",
    gender: (input.gender ?? cached?.gender) as ApiMember["gender"],
    maritalStatus: (input.maritalStatus ?? cached?.maritalStatus) as ApiMember["maritalStatus"],
    membershipStatus: (input.membershipStatus ?? cached?.membershipStatus) as ApiMember["membershipStatus"],
    department: departments[0] ?? input.department ?? cached?.department,
    departments: departments.length > 0 ? departments : cached?.departments || (cached?.department ? [cached.department] : undefined),
    phone: input.phoneNumber ?? cached?.phone,
    email: input.email ?? cached?.email,
    address: input.address ?? cached?.address,
    dateOfBirth: input.dateOfBirth ?? cached?.dateOfBirth,
    joinDate: input.joinDate ?? cached?.joinDate,
    createdAt: cached?.createdAt ?? offlineNow(),
    updatedAt: offlineNow(),
  };

  const res = await API.put<ApiEnvelope<ApiMember>>(`/members/${memberId}`, payload, { offlineData: fallback });
  return mapMember(res.data.data);
}

export async function deleteMember(memberId: string): Promise<void> {
  await API.delete(`/members/${memberId}`);
}

// ---------- Soul Center ----------
type ApiSoulCenterVisitor = {
  _id: string;
  firstName: string;
  lastName: string;
  phone?: string;
  email?: string;
  visitDate: string;
  invitedBy?: any;
  description?: string;
  status: "pending" | "converted";
  convertedMemberId?: string;
  createdAt?: string;
};

const mapSoulCenterVisitor = (v: ApiSoulCenterVisitor): SoulCenterVisitor => {
  const invitedById = v.invitedBy?._id ? String(v.invitedBy._id) : undefined;
  const invitedByName = v.invitedBy
    ? `${v.invitedBy.firstName ?? ""} ${v.invitedBy.lastName ?? ""}`.trim()
    : undefined;
  return {
    id: v._id,
    firstName: v.firstName,
    lastName: v.lastName,
    phone: v.phone,
    email: v.email,
    visitDate: isoDate(v.visitDate).slice(0, 10),
    invitedById,
    invitedByName: invitedByName || undefined,
    description: v.description,
    status: v.status,
    convertedMemberId: v.convertedMemberId,
    createdAt: v.createdAt ?? new Date().toISOString(),
  };
};

export async function fetchSoulCenterVisitors(): Promise<SoulCenterVisitor[]> {
  const res = await API.get<ApiEnvelope<ApiSoulCenterVisitor[]>>("/soul-center");
  return res.data.data.map(mapSoulCenterVisitor);
}

export async function createSoulCenterVisitor(input: Partial<SoulCenterVisitor>): Promise<SoulCenterVisitor> {
  const payload = {
    firstName: input.firstName || "Visitor",
    lastName: input.lastName || "Name",
    phone: input.phone || undefined,
    email: input.email || undefined,
    visitDate: input.visitDate || new Date().toISOString(),
    invitedBy: input.invitedById || undefined,
    description: input.description || undefined,
  };
  const offlinePayload: ApiSoulCenterVisitor = {
    _id: offlineId(),
    firstName: payload.firstName,
    lastName: payload.lastName,
    phone: payload.phone,
    email: payload.email,
    visitDate: payload.visitDate,
    invitedBy: input.invitedById ? { _id: input.invitedById } : undefined,
    description: payload.description,
    status: "pending",
    createdAt: offlineNow(),
  };
  const res = await API.post<ApiEnvelope<ApiSoulCenterVisitor>>("/soul-center", payload, { offlineData: offlinePayload });
  return mapSoulCenterVisitor(res.data.data);
}

export async function updateSoulCenterVisitor(id: string, input: Partial<SoulCenterVisitor>): Promise<SoulCenterVisitor> {
  const payload: Record<string, unknown> = {};
  if (input.firstName !== undefined) payload.firstName = input.firstName;
  if (input.lastName !== undefined) payload.lastName = input.lastName;
  if (input.phone !== undefined) payload.phone = input.phone || undefined;
  if (input.email !== undefined) payload.email = input.email || undefined;
  if (input.visitDate !== undefined) payload.visitDate = input.visitDate;
  if (input.invitedById !== undefined) payload.invitedBy = input.invitedById || undefined;
  if (input.description !== undefined) payload.description = input.description || undefined;
  if (input.status !== undefined) payload.status = input.status;

  const cached = await getCachedVisitor(id);
  const offlinePayload: ApiSoulCenterVisitor = {
    _id: id,
    firstName: input.firstName ?? cached?.firstName ?? "Visitor",
    lastName: input.lastName ?? cached?.lastName ?? "Name",
    phone: input.phone ?? cached?.phone,
    email: input.email ?? cached?.email,
    visitDate: input.visitDate ?? cached?.visitDate ?? offlineNow(),
    invitedBy: input.invitedById ? { _id: input.invitedById } : cached?.invitedBy,
    description: input.description ?? cached?.description,
    status: input.status ?? cached?.status ?? "pending",
    convertedMemberId: cached?.convertedMemberId,
    createdAt: cached?.createdAt ?? offlineNow(),
  };
  const res = await API.put<ApiEnvelope<ApiSoulCenterVisitor>>(`/soul-center/${id}`, payload, { offlineData: offlinePayload });
  return mapSoulCenterVisitor(res.data.data);
}

export async function deleteSoulCenterVisitor(id: string): Promise<void> {
  await API.delete(`/soul-center/${id}`);
}

export async function convertSoulCenterVisitor(
  id: string,
  payload?: Partial<Member>
): Promise<{ visitor: SoulCenterVisitor; member: Member }> {
  const [firstName, ...rest] = (payload?.fullName || "").trim().split(/\s+/);
  const lastName = rest.join(" ");
  const offlineMember: ApiMember = {
    _id: offlineId(),
    firstName: firstName || "Member",
    lastName: lastName || "Name",
    phone: payload?.phoneNumber,
    email: payload?.email,
    gender: payload?.gender as ApiMember["gender"],
    maritalStatus: payload?.maritalStatus as ApiMember["maritalStatus"],
    membershipStatus: payload?.membershipStatus as ApiMember["membershipStatus"],
    department: payload?.department,
    address: payload?.address,
    dateOfBirth: payload?.dateOfBirth,
    joinDate: payload?.joinDate,
    createdAt: offlineNow(),
    updatedAt: offlineNow(),
  };
  const cached = await getCachedVisitor(id);
  const offlineVisitor: ApiSoulCenterVisitor = {
    _id: id,
    firstName: cached?.firstName ?? "Visitor",
    lastName: cached?.lastName ?? "Name",
    phone: cached?.phone,
    email: cached?.email,
    visitDate: cached?.visitDate ?? offlineNow(),
    invitedBy: cached?.invitedBy,
    description: cached?.description,
    status: "converted",
    convertedMemberId: offlineMember._id,
    createdAt: cached?.createdAt ?? offlineNow(),
  };
  const res = await API.post<ApiEnvelope<{ visitor: ApiSoulCenterVisitor; member: ApiMember }>>(
    `/soul-center/${id}/convert`,
    payload || {},
    { offlineData: { visitor: offlineVisitor, member: offlineMember } }
  );
  return {
    visitor: mapSoulCenterVisitor(res.data.data.visitor),
    member: mapMember(res.data.data.member),
  };
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
  const offlinePayload: ApiProgram = {
    _id: offlineId(),
    title: payload.title,
    description: payload.description,
    date: payload.date,
    location: payload.location,
    createdAt: offlineNow(),
    updatedAt: offlineNow(),
  };
  const res = await API.post<ApiEnvelope<ApiProgram>>("/programs", payload, { offlineData: offlinePayload });
  return mapProgram(res.data.data);
}

export async function updateProgram(programId: string, input: Partial<ChurchProgram>): Promise<ChurchProgram> {
  const payload: Record<string, unknown> = {};
  if (input.name !== undefined) payload.title = input.name;
  if (input.description !== undefined) payload.description = input.description || undefined;
  if (input.date !== undefined) payload.date = input.date;
  if (input.location !== undefined) payload.location = input.location || undefined;

  const cached = await getCachedProgram(programId);
  const offlinePayload: ApiProgram = {
    _id: programId,
    title: input.name ?? cached?.title ?? "Program",
    description: input.description ?? cached?.description,
    date: input.date ?? cached?.date ?? offlineNow(),
    location: input.location ?? cached?.location,
    createdAt: cached?.createdAt ?? offlineNow(),
    updatedAt: offlineNow(),
  };
  const res = await API.put<ApiEnvelope<ApiProgram>>(`/programs/${programId}`, payload, { offlineData: offlinePayload });
  return mapProgram(res.data.data);
}

export async function deleteProgram(programId: string): Promise<void> {
  await API.delete(`/programs/${programId}`);
}

// ---------- Automations ----------
const readLocalAutomations = (): Automation[] => {
  try {
    return JSON.parse(localStorage.getItem('cms_automations') || '[]');
  } catch {
    return [];
  }
};

const writeLocalAutomations = (items: Automation[]) => {
  localStorage.setItem('cms_automations', JSON.stringify(items));
};

const mapAutomation = (automation: Automation): Automation => ({
  ...automation,
  dayOfWeek: Array.isArray(automation.dayOfWeek) ? automation.dayOfWeek : [],
  lastRunAt: automation.lastRunAt ?? null,
});

const automationPriority = (automation: Automation): number => {
  const baseTime = new Date(automation.lastRunAt || automation.updatedAt || automation.createdAt || 0).getTime();
  const runBonus = automation.lastRunAt ? 1_000_000_000_000_000 : 0;
  const keyBonus = automation.lastRunKey ? 1_000_000_000_000 : 0;
  return runBonus + keyBonus + baseTime;
};

const mergeAutomations = (...sources: Automation[][]): Automation[] => {
  const merged = new Map<string, Automation>();

  for (const source of sources) {
    for (const automation of source) {
      if (!automation?.id) continue;
      const normalized = mapAutomation(automation);
      const existing = merged.get(normalized.id);
      if (!existing || automationPriority(normalized) >= automationPriority(existing)) {
        merged.set(normalized.id, normalized);
      }
    }
  }

  return Array.from(merged.values()).sort(
    (a, b) =>
      new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime()
  );
};

const getAutomationSettings = async (): Promise<SettingsPayload | null> => {
  const settings = await fetchSettings();
  if (!settings) return null;

  const localAutomations = readLocalAutomations();
  const mergedAutomations = mergeAutomations(localAutomations, settings.automations || []);
  writeLocalAutomations(mergedAutomations);

  return {
    ...settings,
    automations: mergedAutomations,
  };
};

export async function fetchAutomations(): Promise<Automation[]> {
  const settings = await getAutomationSettings();
  const localAutomations = readLocalAutomations();
  if (!settings) return localAutomations.map(mapAutomation);

  const mergedAutomations = mergeAutomations(localAutomations, settings.automations || []);
  const hasLocalOnlyAutomation = localAutomations.some(
    (automation) => automation?.id && !(settings.automations || []).some((item) => item.id === automation.id)
  );
  const hasNewerLocalAutomation = localAutomations.some((automation) => {
    if (!automation?.id) return false;
    const matchingRemote = (settings.automations || []).find((item) => item.id === automation.id);
    if (!matchingRemote) return false;
    return automationPriority(automation) > automationPriority(matchingRemote as Automation);
  });

  if (hasLocalOnlyAutomation || hasNewerLocalAutomation) {
    void upsertSettings({ ...settings, automations: mergedAutomations }).catch(() => undefined);
  }
  return mergedAutomations;
}

export async function createAutomation(input: Omit<Automation, 'id' | 'createdAt' | 'updatedAt'>): Promise<Automation> {
  const automation: Automation = mapAutomation({
    ...input,
    id: offlineId(),
    dayOfWeek: input.dayOfWeek || [],
    lastRunAt: input.lastRunAt ?? null,
    createdAt: offlineNow(),
    updatedAt: offlineNow(),
  } as Automation);

  const settings = await getAutomationSettings();
  if (!settings) {
    const updated = [automation, ...readLocalAutomations().filter((item) => item.id !== automation.id)];
    writeLocalAutomations(updated);
    return automation;
  }

  const finalList = mergeAutomations(settings.automations || [], [automation]);
  await upsertSettings({ ...settings, automations: finalList });
  writeLocalAutomations(finalList);
  return automation;
}

export async function updateAutomation(id: string, input: Partial<Automation>): Promise<Automation> {
  const settings = await getAutomationSettings();
  const source = settings ? mergeAutomations(readLocalAutomations(), settings.automations || []) : readLocalAutomations();
  const existing = source.find((item) => item.id === id);
  if (!existing) {
    throw new Error('Automation not found');
  }

  const updatedAutomation: Automation = mapAutomation({
    ...existing,
    ...input,
    id,
    dayOfWeek: input.dayOfWeek ?? existing.dayOfWeek ?? [],
    lastRunAt: input.lastRunAt ?? existing.lastRunAt ?? null,
    createdAt: existing.createdAt,
    updatedAt: offlineNow(),
  } as Automation);

  const updatedList = mergeAutomations(source.filter((item) => item.id !== id), [updatedAutomation]);
  if (settings) {
    await upsertSettings({ ...settings, automations: updatedList });
  }
  writeLocalAutomations(updatedList);
  return updatedAutomation;
}

export async function deleteAutomation(id: string): Promise<void> {
  const settings = await getAutomationSettings();
  const source = settings ? mergeAutomations(readLocalAutomations(), settings.automations || []) : readLocalAutomations();
  const updated = source.filter((item) => item.id !== id);
  if (settings) {
    await upsertSettings({ ...settings, automations: updated });
  }
  writeLocalAutomations(updated);
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
  const offlinePayload: ApiAttendance = {
    _id: offlineId(),
    program: input.programId,
    member: input.memberId,
    status: input.status === "present" ? "Present" : "Absent",
    createdAt: offlineNow(),
    updatedAt: offlineNow(),
  };
  const res = await API.post<ApiEnvelope<ApiAttendance>>("/attendance", payload, { offlineData: offlinePayload });
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
  const payload = {
    memberId: input.memberId,
    sundayKey: input.sundayKey,
    status: input.status === "present" ? "Present" : "Absent",
  };
  const offlinePayload: ApiSundayAttendance = {
    _id: offlineId(),
    year: input.year,
    sundayKey: input.sundayKey,
    sundayDate: input.sundayKey,
    member: input.memberId,
    status: input.status === "present" ? "Present" : "Absent",
    createdAt: offlineNow(),
    updatedAt: offlineNow(),
  };
  const res = await API.put<ApiEnvelope<ApiSundayAttendance>>(`/attendance/sunday/${input.year}`, payload, { offlineData: offlinePayload });
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

// ---------- Pledges ----------
type ApiPledge = {
  _id: string;
  member: any;
  amount: number;
  pledgeDate: string;
  expectedDate?: string;
  description?: string;
  status: "pending" | "paid" | "cancelled";
  paidAt?: string;
  createdAt?: string;
};

const mapPledge = (p: ApiPledge): Pledge => {
  const memberName = p.member
    ? `${p.member.firstName ?? ""} ${p.member.lastName ?? ""}`.trim()
    : "";
  return {
    id: p._id,
    memberId: String(p.member?._id || ""),
    memberName,
    amount: p.amount,
    pledgeDate: isoDate(p.pledgeDate).slice(0, 10),
    expectedDate: p.expectedDate ? isoDate(p.expectedDate).slice(0, 10) : undefined,
    description: p.description,
    status: p.status,
    paidAt: p.paidAt,
    createdAt: p.createdAt ?? new Date().toISOString(),
  };
};

export async function fetchPledges(): Promise<Pledge[]> {
  const res = await API.get<ApiEnvelope<ApiPledge[]>>("/pledges");
  return res.data.data.map(mapPledge);
}

export async function createPledge(input: {
  memberId: string;
  amount: number;
  pledgeDate: string;
  expectedDate?: string;
  description?: string;
}): Promise<Pledge> {
  const payload = {
    member: input.memberId,
    amount: input.amount,
    pledgeDate: input.pledgeDate,
    expectedDate: input.expectedDate || undefined,
    description: input.description || undefined,
  };
  const offlinePayload: ApiPledge = {
    _id: offlineId(),
    member: { _id: input.memberId },
    amount: input.amount,
    pledgeDate: input.pledgeDate,
    expectedDate: input.expectedDate,
    description: input.description,
    status: "pending",
    createdAt: offlineNow(),
  };
  const res = await API.post<ApiEnvelope<ApiPledge>>("/pledges", payload, { offlineData: offlinePayload });
  return mapPledge(res.data.data);
}

export async function updatePledge(id: string, input: Partial<Pledge>): Promise<Pledge> {
  const payload: Record<string, unknown> = {};
  if (input.amount !== undefined) payload.amount = input.amount;
  if (input.pledgeDate !== undefined) payload.pledgeDate = input.pledgeDate;
  if (input.expectedDate !== undefined) payload.expectedDate = input.expectedDate || undefined;
  if (input.description !== undefined) payload.description = input.description || undefined;
  if (input.status !== undefined) payload.status = input.status;

  const offlinePayload: ApiPledge = {
    _id: id,
    member: { _id: input.memberId || "" },
    amount: input.amount ?? 0,
    pledgeDate: input.pledgeDate ?? offlineNow(),
    expectedDate: input.expectedDate,
    description: input.description,
    status: input.status ?? "pending",
    createdAt: offlineNow(),
  };
  const res = await API.put<ApiEnvelope<ApiPledge>>(`/pledges/${id}`, payload, { offlineData: offlinePayload });
  return mapPledge(res.data.data);
}

export async function deletePledge(id: string): Promise<void> {
  await API.delete(`/pledges/${id}`);
}

export async function convertPledgeToIncome(id: string): Promise<Pledge> {
  const offlinePayload: ApiPledge = {
    _id: id,
    member: { _id: "" },
    amount: 0,
    pledgeDate: offlineNow(),
    status: "paid",
    paidAt: offlineNow(),
    createdAt: offlineNow(),
  };
  const res = await API.post<ApiEnvelope<ApiPledge>>(`/pledges/${id}/convert`, undefined, { offlineData: offlinePayload });
  return mapPledge(res.data.data);
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
type ApiUserModules =
  | "dashboard"
  | "members"
  | "programs"
  | "attendance"
  | "messaging"
  | "finance"
  | "soulcenter"
  | "audit"
  | "settings"
  | "users";
type ApiUser = { _id: string; name: string; email: string; role: string; modules?: ApiUserModules[]; isActive?: boolean; createdAt?: string; updatedAt?: string };

const toApiUserModules = (modules: User["modules"] | undefined): ApiUserModules[] => {
  const allowed: ApiUserModules[] = ["members", "messaging", "settings"];
  return (modules || []).filter((module): module is ApiUserModules => allowed.includes(module as ApiUserModules));
};

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

  const payload = {
    name: input.name,
    email: input.email,
    password: input.password,
    role: apiRole,
    modules: input.modules,
    isActive: input.isActive ?? true,
  };

  const offlinePayload = {
    id: offlineId(),
    name: input.name,
    email: input.email,
    role: apiRole,
  };

  const res = await API.post<ApiEnvelope<{ id: string; name: string; email: string; role: string }>>("/users", payload, {
    offlineData: offlinePayload,
  });

  // createUser returns {id,...} not {_id,...}
  const created: ApiUser = {
    _id: res.data.data.id,
    name: res.data.data.name,
    email: res.data.data.email,
    role: res.data.data.role,
    modules: toApiUserModules(input.modules),
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

  const offlinePayload: ApiUser = {
    _id: userId,
    name: input.name || "User",
    email: input.email || "",
    role: input.role ? (input.role === "admin" ? "Admin" : input.role === "finance" ? "Finance" : input.role === "staff" ? "Staff" : "Pastor") : "Staff",
    modules: toApiUserModules(input.modules),
    isActive: input.isActive ?? true,
    createdAt: offlineNow(),
    updatedAt: offlineNow(),
  };
  const res = await API.put<ApiEnvelope<ApiUser>>(`/users/${userId}`, payload, { offlineData: offlinePayload });
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
  birthdayCongregationSmsTemplate?: string;
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
  automations?: Automation[];
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
  birthdayCongregationSmsTemplate?: string;
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
  automations?: Automation[];
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
    birthdayCongregationSmsTemplate: settings.birthdayCongregationSmsTemplate,
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
    automations: settings.automations || [],
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
    birthdayCongregationSmsTemplate: payload.birthdayCongregationSmsTemplate,
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
    automations: payload.automations,
  };

  if (payload.id) {
    const offlinePayload: ApiSettings = {
      _id: payload.id,
      churchName: payload.churchName,
      address: payload.address,
      phone: payload.phone,
      email: payload.email,
      smsEnabled: payload.smsEnabled,
      smsProvider: payload.smsProvider,
      smsApiKey: payload.smsApiKey,
      smsSenderId: payload.smsSenderId,
      departments: payload.departments || [],
      enableBirthdayNotifications: payload.enableBirthdayNotifications,
      birthdayMessageTemplate: payload.birthdayMessageTemplate,
      birthdayCongregationSmsTemplate: payload.birthdayCongregationSmsTemplate,
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
      automations: payload.automations,
      createdAt: offlineNow(),
      updatedAt: offlineNow(),
    };
    const res = await API.put<ApiEnvelope<ApiSettings>>(`/settings/${payload.id}`, body, { offlineData: offlinePayload });
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
      birthdayCongregationSmsTemplate: res.data.data.birthdayCongregationSmsTemplate,
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
      automations: res.data.data.automations || [],
    };
  }

  const offlinePayload: ApiSettings = {
    _id: offlineId(),
    churchName: payload.churchName,
    address: payload.address,
    phone: payload.phone,
    email: payload.email,
    smsEnabled: payload.smsEnabled,
    smsProvider: payload.smsProvider,
    smsApiKey: payload.smsApiKey,
    smsSenderId: payload.smsSenderId,
    departments: payload.departments || [],
    enableBirthdayNotifications: payload.enableBirthdayNotifications,
    birthdayMessageTemplate: payload.birthdayMessageTemplate,
    birthdayCongregationSmsTemplate: payload.birthdayCongregationSmsTemplate,
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
    automations: payload.automations,
    createdAt: offlineNow(),
    updatedAt: offlineNow(),
  };
  const res = await API.post<ApiEnvelope<ApiSettings>>("/settings", body, { offlineData: offlinePayload });
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
    birthdayCongregationSmsTemplate: res.data.data.birthdayCongregationSmsTemplate,
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
    automations: res.data.data.automations || [],
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

type ApiSmsLog = {
  id: string;
  recipientId: string;
  recipientName: string;
  recipientPhone: string;
  message: string;
  type: "program_reminder" | "birthday" | "birthday_broadcast" | "manual" | "announcement" | "automation";
  status: "sent" | "failed" | "pending" | "skipped";
  sentAt?: string;
  failureReason?: string;
  programId?: string;
  createdBy: string;
  createdAt: string;
};

type ApiSmsBalance = {
  smsBalance: number | string | null;
  mainBalance: number | string | null;
  raw?: unknown;
  endpoint?: string;
  apiKeySource?: "configured" | "fallback";
  apiKeyPreview?: string;
};

export async function sendSmsBroadcast(payload: {
  message: string;
  recipients: SendSmsRecipient[];
  sender?: string;
  type?: "manual" | "automation";
}) {
  const res = await API.post<ApiEnvelope<ApiSmsSendResponse>>("/sms/send", payload);
  return res.data.data;
}

export async function fetchSmsLogs(): Promise<SMSLog[]> {
  const res = await API.get<ApiEnvelope<ApiSmsLog[]>>("/sms/logs");
  return res.data.data.map((log) => ({
    id: log.id,
    recipientId: log.recipientId,
    recipientName: log.recipientName,
    recipientPhone: log.recipientPhone,
    message: log.message,
    type: log.type,
    status: log.status,
    sentAt: log.sentAt,
    failureReason: log.failureReason,
    programId: log.programId,
    createdBy: log.createdBy,
    createdAt: log.createdAt,
  }));
}

export async function fetchSmsBalance(): Promise<ApiSmsBalance> {
  const res = await API.get<ApiEnvelope<ApiSmsBalance>>("/sms/balance");
  return res.data.data;
}

// ---------- In-app Notifications ----------
type ApiNotification = {
  id: string;
  type: Notification["type"];
  title: string;
  message: string;
  actionUrl?: string;
  timestamp: string;
  isRead: boolean;
};

type NotificationsEnvelope = {
  success: boolean;
  data: ApiNotification[];
  unreadCount: number;
};

export async function fetchMyNotifications(): Promise<{ notifications: Notification[]; unreadCount: number }> {
  const res = await API.get<NotificationsEnvelope>("/notifications/me");
  return {
    notifications: res.data.data.map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      message: n.message,
      timestamp: n.timestamp,
      isRead: n.isRead,
      actionUrl: n.actionUrl,
    })),
    unreadCount: res.data.unreadCount,
  };
}

export async function markNotificationAsRead(notificationId: string): Promise<void> {
  await API.patch(`/notifications/${notificationId}/read`);
}

export async function markAllNotificationsAsRead(): Promise<void> {
  await API.patch("/notifications/read-all");
}

// ---------- AI Assistant ----------
export async function chatWithAssistant(payload: {
  message: string;
  history?: Array<{ role: "user" | "assistant"; content: string }>;
}): Promise<{ reply: string; allowedModules: string[] }> {
  const res = await API.post<ApiEnvelope<{ reply: string; allowedModules: string[] }>>("/ai/chat", payload);
  return res.data.data;
}
