import api from './client';

export async function login(phone, password) {
  const { data } = await api.post('/auth/login', { phone, password });
  return data.data;
}

export async function register(payload) {
  const { data } = await api.post('/auth/register', payload);
  return data.data;
}

export async function fetchMe() {
  const { data } = await api.get('/auth/me');
  return data.data;
}

export async function updateProfile(payload) {
  const { data } = await api.patch('/auth/me', payload);
  return data.data;
}
