import api from './api';

// Notification types
export interface AppNotification {
  id: string;
  type: 'battle' | 'message' | 'project' | 'review' | 'sale' | 'task' | 'battleResult' | 'general';
  title: string;
  message: string;
  read: boolean;
  data?: any;
  createdAt: string;
}

export async function getNotifications(): Promise<AppNotification[]> {
  const res = await api.get('/notifications');
  return res.data;
}

export async function markNotificationRead(id: string): Promise<void> {
  await api.put(`/notifications/${id}/read`);
}

export async function markAllNotificationsRead(): Promise<void> {
  await api.put('/notifications/read-all');
}

export async function getUnreadCount(): Promise<number> {
  const res = await api.get('/notifications/unread-count');
  return res.data.count;
}

// Query/Q&A
export async function getQueries(): Promise<any[]> {
  const res = await api.get('/queries');
  return res.data;
}

export async function submitQuery(question: string): Promise<any> {
  const res = await api.post('/queries', { question });
  return res.data;
}

// Project Invites
export async function getMyInvites(): Promise<any[]> {
  const res = await api.get('/project-invites/my-invites');
  return res.data;
}

export async function respondToInvite(inviteId: string, response: 'accept' | 'decline'): Promise<any> {
  const res = await api.put(`/project-invites/${inviteId}/respond`, { response });
  return res.data;
}
