import api from './client';

export async function listNotifications() {
  const { data } = await api.get('/notifications');
  return data.data;
}

export async function unreadCount() {
  const { data } = await api.get('/notifications/unread-count');
  return data.data;
}

export async function markRead(id) {
  const { data } = await api.patch(`/notifications/${id}/read`);
  return data.data;
}

export async function markAllRead() {
  const { data } = await api.patch('/notifications/read-all');
  return data.data;
}
