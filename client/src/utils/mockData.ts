import type { Member } from '../types';

// Generate mock members
const firstNames = ['John', 'Mary', 'David', 'Sarah', 'Michael', 'Grace', 'Samuel', 'Esther', 'Joseph', 'Ruth', 'Daniel', 'Rebecca', 'Emmanuel', 'Abigail', 'Isaac', 'Hannah', 'Benjamin', 'Deborah', 'Joshua', 'Lydia'];
const lastNames = ['Mensah', 'Owusu', 'Boateng', 'Agyei', 'Asante', 'Osei', 'Adjei', 'Appiah', 'Ofori', 'Darko', 'Addo', 'Yeboah', 'Frimpong', 'Ansah', 'Bonsu'];
const departments = ['Choir', 'Ushering', 'Media', 'Youth Ministry', 'Children Ministry', 'Prayer Team', 'Welfare', 'Evangelism'];

function generateMockMembers(count: number): Member[] {
  const members: Member[] = [];
  
  for (let i = 0; i < count; i++) {
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    const gender = Math.random() > 0.5 ? 'male' : 'female';
    const year = 1950 + Math.floor(Math.random() * 55);
    const month = Math.floor(Math.random() * 12) + 1;
    const day = Math.floor(Math.random() * 28) + 1;
    
    members.push({
      id: `member-${i + 1}`,
      fullName: `${firstName} ${lastName}`,
      phoneNumber: `+233${Math.floor(100000000 + Math.random() * 900000000)}`,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@email.com`,
      dateOfBirth: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
      gender,
      maritalStatus: ['single', 'married', 'widowed', 'divorced'][Math.floor(Math.random() * 4)] as any,
      department: departments[Math.floor(Math.random() * departments.length)],
      membershipStatus: Math.random() > 0.15 ? 'active' : 'inactive',
      joinDate: `${2015 + Math.floor(Math.random() * 10)}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
      address: `${Math.floor(Math.random() * 500)} Church Street, Accra`,
      createdAt: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }
  
  return members;
}

// Initialize mock data in localStorage
export function initializeMockData() {
  if (!localStorage.getItem('cms_members')) {
    localStorage.setItem('cms_members', JSON.stringify(generateMockMembers(50)));
  }
  if (!localStorage.getItem('cms_programs')) {
    localStorage.setItem('cms_programs', JSON.stringify([]));
  }
  if (!localStorage.getItem('cms_attendance')) {
    localStorage.setItem('cms_attendance', JSON.stringify([]));
  }
  if (!localStorage.getItem('cms_sms_logs')) {
    localStorage.setItem('cms_sms_logs', JSON.stringify([]));
  }
  if (!localStorage.getItem('cms_sms_templates')) {
    const templates = [
      {
        id: '1',
        name: 'Birthday Wishes',
        type: 'birthday',
        content: 'Happy Birthday {{name}}! May God\'s blessings overflow in your life today and always. - {{church_name}}',
        variables: ['name', 'church_name'],
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: '2',
        name: 'Program Reminder',
        type: 'program_reminder',
        content: 'Reminder: {{program_name}} is scheduled for {{date}} at {{time}} at {{location}}. See you there!',
        variables: ['program_name', 'date', 'time', 'location'],
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];
    localStorage.setItem('cms_sms_templates', JSON.stringify(templates));
  }
  if (!localStorage.getItem('cms_donations')) {
    localStorage.setItem('cms_donations', JSON.stringify([]));
  }
  if (!localStorage.getItem('cms_audit_logs')) {
    localStorage.setItem('cms_audit_logs', JSON.stringify([]));
  }
  if (!localStorage.getItem('cms_prayer_requests')) {
    localStorage.setItem('cms_prayer_requests', JSON.stringify([]));
  }
}

// Helper to add audit log
export function addAuditLog(log: any) {
  const logs = JSON.parse(localStorage.getItem('cms_audit_logs') || '[]');
  logs.push(log);
  localStorage.setItem('cms_audit_logs', JSON.stringify(logs));
}