import type { Notification, NotificationType } from '../types/notifications';
import type { Member, ChurchProgram, SMSLog, Donation } from '../types';

export function generateNotifications(): Notification[] {
  const notifications: Notification[] = [];
  const now = new Date();
  
  // Get data from localStorage
  const members: Member[] = JSON.parse(localStorage.getItem('cms_members') || '[]');
  const programs: ChurchProgram[] = JSON.parse(localStorage.getItem('cms_programs') || '[]');
  const smsLogs: SMSLog[] = JSON.parse(localStorage.getItem('cms_sms_logs') || '[]');
  const donations: Donation[] = JSON.parse(localStorage.getItem('cms_donations') || '[]');

  // Check for birthdays today
  const todayStr = `${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const birthdaysToday = members.filter(m => {
    const dob = new Date(m.dateOfBirth);
    const memberBirthday = `${String(dob.getMonth() + 1).padStart(2, '0')}-${String(dob.getDate()).padStart(2, '0')}`;
    return memberBirthday === todayStr;
  });

  birthdaysToday.forEach((member, index) => {
    notifications.push({
      id: `birthday-${member.id}`,
      type: 'birthday',
      title: '🎂 Birthday Today!',
      message: `${member.fullName} is celebrating their birthday today`,
      timestamp: new Date(now.getTime() - index * 60000).toISOString(),
      isRead: false,
      actionUrl: `/members/${member.id}`,
    });
  });

  // Check for upcoming programs (next 3 days)
  const threeDaysFromNow = new Date(now);
  threeDaysFromNow.setDate(now.getDate() + 3);
  
  const upcomingPrograms = programs.filter(p => {
    const programDate = new Date(p.date);
    return programDate >= now && programDate <= threeDaysFromNow;
  });

  upcomingPrograms.forEach((program, index) => {
    const daysUntil = Math.ceil((new Date(program.date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    notifications.push({
      id: `program-${program.id}`,
      type: 'program_reminder',
      title: '📅 Upcoming Program',
      message: `${program.name} is ${daysUntil === 0 ? 'today' : daysUntil === 1 ? 'tomorrow' : `in ${daysUntil} days`}`,
      timestamp: new Date(now.getTime() - (index + birthdaysToday.length) * 60000).toISOString(),
      isRead: false,
      actionUrl: '/programs',
    });
  });

  // Check for recent donations (last 24 hours)
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const recentDonations = donations
    .filter(d => new Date(d.createdAt) >= oneDayAgo)
    .slice(0, 3);

  recentDonations.forEach((donation, index) => {
    notifications.push({
      id: `donation-${donation.id}`,
      type: 'donation_received',
      title: '💰 New Donation',
      message: `${donation.memberName} gave GH₵${donation.amount.toFixed(2)} (${donation.type})`,
      timestamp: donation.createdAt,
      isRead: false,
      actionUrl: '/donations',
    });
  });

  // Check for failed SMS
  const recentFailedSMS = smsLogs
    .filter(s => s.status === 'failed' && new Date(s.createdAt) >= oneDayAgo)
    .slice(0, 2);

  recentFailedSMS.forEach((sms, index) => {
    notifications.push({
      id: `sms-failed-${sms.id}`,
      type: 'sms_failed',
      title: '⚠️ SMS Delivery Failed',
      message: `Failed to send SMS to ${sms.recipientName}`,
      timestamp: sms.createdAt,
      isRead: false,
      actionUrl: '/messaging',
    });
  });

  // Check for new members (last 7 days)
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const newMembers = members
    .filter(m => new Date(m.createdAt) >= sevenDaysAgo)
    .slice(0, 3);

  newMembers.forEach((member, index) => {
    notifications.push({
      id: `member-${member.id}`,
      type: 'member_added',
      title: '👤 New Member',
      message: `${member.fullName} joined the church`,
      timestamp: member.createdAt,
      isRead: false,
      actionUrl: `/members/${member.id}`,
    });
  });

  // Sort by timestamp (most recent first)
  notifications.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  // Limit to 15 most recent notifications
  return notifications.slice(0, 15);
}

export function getUnreadCount(notifications: Notification[]): number {
  return notifications.filter(n => !n.isRead).length;
}

export function markAsRead(notificationId: string) {
  const stored = localStorage.getItem('cms_notifications_read') || '[]';
  const readIds = JSON.parse(stored);
  if (!readIds.includes(notificationId)) {
    readIds.push(notificationId);
    localStorage.setItem('cms_notifications_read', JSON.stringify(readIds));
  }
}

export function markAllAsRead(notifications: Notification[]) {
  const allIds = notifications.map(n => n.id);
  localStorage.setItem('cms_notifications_read', JSON.stringify(allIds));
}

export function isNotificationRead(notificationId: string): boolean {
  const stored = localStorage.getItem('cms_notifications_read') || '[]';
  const readIds = JSON.parse(stored);
  return readIds.includes(notificationId);
}
