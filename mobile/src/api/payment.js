import api from './client';

export async function contribute(payload) {
  const { data } = await api.post('/payments/contribute', payload);
  return data.data;
}

export async function confirmContribution(id, status, notes) {
  const { data } = await api.patch(`/payments/contributions/${id}/confirm`, {
    status,
    notes,
  });
  return data.data;
}

export async function processPayout(payload) {
  const { data } = await api.post('/payments/payout', payload);
  return data.data;
}

export async function listMyContributions(equbId) {
  const { data } = await api.get('/payments/contributions/mine', {
    params: equbId ? { equbId } : undefined,
  });
  return data.data;
}

export async function listCycleContributions(cycleId) {
  const { data } = await api.get(`/payments/cycles/${cycleId}/contributions`);
  return data.data;
}
