import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { HttpError } from "../../utils/httpError";
import User from "../users/user.model";
import Member from "../members/member.model";
import { Program } from "../programs/programs.model";
import Attendance from "../attendance/attendance.model";
import SundayAttendance from "../attendance/sunday-attendance.model";
import Finance from "../finance/finance.model";
import Settings from "../settings/settings.model";
import SmsLog from "../sms/sms-log.model";
import { defaultModulesForRole } from "../../types/modules";
import { generateAiReply, type AiMessage } from "../../services/ai.service";

type ChatMessage = { role: "user" | "assistant"; content: string };

const summarizeMembers = async () => {
  const total = await Member.countDocuments();
  const active = await Member.countDocuments({ membershipStatus: "active" });
  const inactive = await Member.countDocuments({ membershipStatus: "inactive" });
  const departments = await Member.distinct("department");
  const latest = await Member.find()
    .sort({ createdAt: -1 })
    .limit(5)
    .select("firstName lastName department membershipStatus joinDate")
    .lean();

  return {
    total,
    active,
    inactive,
    departments,
    latestMembers: latest.map((member) => ({
      name: `${member.firstName} ${member.lastName}`.trim(),
      department: member.department,
      membershipStatus: member.membershipStatus,
      joinDate: member.joinDate,
    })),
  };
};

const summarizePrograms = async () => {
  const now = new Date();
  const upcoming = await Program.find({ date: { $gte: now } })
    .sort({ date: 1 })
    .limit(5)
    .select("title date location description")
    .lean();

  const total = await Program.countDocuments();
  return {
    total,
    upcoming: upcoming.map((program) => ({
      title: program.title,
      date: program.date,
      location: program.location,
      description: program.description,
    })),
  };
};

const summarizeAttendance = async () => {
  const year = new Date().getFullYear();
  const present = await SundayAttendance.countDocuments({ year, status: "Present" });
  const absent = await SundayAttendance.countDocuments({ year, status: "Absent" });
  const total = await SundayAttendance.countDocuments({ year });
  const programRecords = await Attendance.countDocuments();

  return {
    year,
    sundayAttendance: { total, present, absent },
    programAttendanceRecords: programRecords,
  };
};

const summarizeFinance = async () => {
  const incomeAgg = await Finance.aggregate([
    { $match: { type: { $ne: "Expense" } } },
    { $group: { _id: null, total: { $sum: "$amount" } } },
  ]);
  const expenseAgg = await Finance.aggregate([
    { $match: { type: "Expense" } },
    { $group: { _id: null, total: { $sum: "$amount" } } },
  ]);
  const recent = await Finance.find()
    .sort({ date: -1 })
    .limit(5)
    .populate("member", "firstName lastName")
    .select("type amount date note member")
    .lean();

  return {
    totalIncome: incomeAgg[0]?.total || 0,
    totalExpense: expenseAgg[0]?.total || 0,
    recentEntries: recent.map((entry) => ({
      type: entry.type,
      amount: entry.amount,
      date: entry.date,
      note: entry.note,
      memberName: entry.member
        ? `${(entry.member as any).firstName} ${(entry.member as any).lastName}`.trim()
        : undefined,
    })),
  };
};

const summarizeMessaging = async () => {
  const statusAgg = await SmsLog.aggregate([
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 },
      },
    },
  ]);
  const counts = statusAgg.reduce(
    (acc, item) => {
      acc[item._id] = item.count;
      return acc;
    },
    {} as Record<string, number>
  );
  const recent = await SmsLog.find()
    .sort({ createdAt: -1 })
    .limit(5)
    .select("recipientName status type failureReason createdAt")
    .lean();

  return {
    counts,
    recent: recent.map((log) => ({
      recipientName: log.recipientName,
      status: log.status,
      type: log.type,
      failureReason: log.failureReason,
      createdAt: log.createdAt,
    })),
  };
};

const summarizeUsers = async () => {
  const users = await User.find()
    .select("name email role isActive createdAt")
    .sort({ createdAt: -1 })
    .limit(10)
    .lean();

  return users.map((usr) => ({
    name: usr.name,
    email: usr.email,
    role: usr.role,
    isActive: usr.isActive,
    createdAt: (usr as any).createdAt,
  }));
};


export const chatWithAssistant = asyncHandler(async (req: Request, res: Response) => {
  const { message, history } = req.body as { message?: string; history?: ChatMessage[] };
  if (!message || typeof message !== "string") {
    throw new HttpError(400, "message is required");
  }

  const userId = req.user?.id;
  if (!userId) {
    throw new HttpError(401, "Not authorized");
  }

  const user = await User.findById(userId).select("name email role modules").lean();
  if (!user) {
    throw new HttpError(401, "User not found");
  }

  const allowedModules =
    Array.isArray(user.modules) && user.modules.length > 0
      ? user.modules
      : defaultModulesForRole(user.role);

  const settings = await Settings.findOne().select("churchName address phone email departments").lean();

  const context: Record<string, unknown> = {
    generatedAt: new Date().toISOString(),
    user: {
      name: user.name,
      email: user.email,
      role: user.role,
      modules: allowedModules,
    },
    church: {
      name: settings?.churchName || "Church",
      address: settings?.address,
      phone: settings?.phone,
      email: settings?.email,
      departments: settings?.departments || [],
    },
    appHelp: {
      pages: [
        "Dashboard",
        "Analytics",
        "Members",
        "Programs",
        "Attendance",
        "Messaging",
        "Finance",
        "Audit Logs",
        "Settings",
        "Notifications Configuration",
        "Profile Settings",
      ],
      tips: [
        "Use search and filters on lists to find records quickly.",
        "Attendance supports Sunday service and program attendance.",
        "Messaging supports manual SMS, templates, and birthday messages.",
      ],
    },
  };

  const loaders: Promise<void>[] = [];

  if (allowedModules.includes("members")) {
    loaders.push(
      summarizeMembers().then((summary) => {
        context.members = summary;
      })
    );
  }

  if (allowedModules.includes("programs")) {
    loaders.push(
      summarizePrograms().then((summary) => {
        context.programs = summary;
      })
    );
  }

  if (allowedModules.includes("attendance")) {
    loaders.push(
      summarizeAttendance().then((summary) => {
        context.attendance = summary;
      })
    );
  }

  if (allowedModules.includes("finance")) {
    loaders.push(
      summarizeFinance().then((summary) => {
        context.finance = summary;
      })
    );
  }

  if (allowedModules.includes("messaging")) {
    loaders.push(
      summarizeMessaging().then((summary) => {
        context.messaging = summary;
      })
    );
  }

  if (allowedModules.includes("users")) {
    loaders.push(
      summarizeUsers().then((summary) => {
        context.users = summary;
      })
    );
  }

  await Promise.all(loaders);


  const systemPrompt = [
    "You are the Church CMS assistant.",
    "Answer questions about the church application using ONLY the provided context JSON.",
    "Never expose secrets or data outside the user's allowed modules list.",
    "If asked about data you do not have access to, say you cannot access that information.",
    "If asked how to do something in the app, give clear step-by-step guidance.",
    "Be concise and action-oriented.",
  ].join(" ");

  const safeHistory = Array.isArray(history)
    ? history
        .filter((item) => item && (item.role === "user" || item.role === "assistant"))
        .slice(-12)
    : [];

  const messages: AiMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "system", content: `Context JSON:\n${JSON.stringify(context)}` },
    ...safeHistory.map((item) => ({ role: item.role, content: item.content })),
    { role: "user", content: message },
  ];

  let reply: string;
  try {
    reply = await generateAiReply(messages);
  } catch (error: any) {
    const messageText = String(error?.message || "AI request failed");
    if (messageText.includes("configured")) {
      throw new HttpError(503, "AI service is not configured");
    }
    throw new HttpError(502, messageText);
  }

  res.json({
    success: true,
    data: {
      reply,
      allowedModules,
    },
  });
});
