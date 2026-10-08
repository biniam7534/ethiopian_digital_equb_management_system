import api from './client';

export async function listMyEqubs() {
  const { data } = await api.get('/equbs/mine');
  return data.data;
}

export async function listOpenEqubs() {
  const { data } = await api.get('/equbs/open');
  return data.data;
}

export async function getEqub(id) {
  const { data } = await api.get(`/equbs/${id}`);
  return data.data;
}

export async function createEqub(payload) {
  const { data } = await api.post('/equbs', payload);
  return data.data;
}

export async function joinEqub(inviteCode) {
  const { data } = await api.post('/equbs/join', { inviteCode });
  return data.data;
}

export async function startEqub(id) {
  const { data } = await api.post(`/equbs/${id}/start`);
  return data.data;
}
