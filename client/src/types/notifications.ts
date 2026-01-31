export type NotificationType = 
  | 'birthday'
  | 'program_reminder'
  | 'member_added'
  | 'donation_received'
  | 'attendance_low'
  | 'sms_failed'
  | 'system';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
  actionUrl?: string;
}
