import myAxios from './myAxios';

const DISMISSAL_URL = '/api/academic/dismissals';

const idempotencyHeaders = (prefix) => ({
  'Idempotency-Key': `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
});

export const searchDismissals = (params = {}) => myAxios.get(DISMISSAL_URL, { params });

export const getDismissal = (dismissalId) => myAxios.get(`${DISMISSAL_URL}/${dismissalId}`);

export const createDismissal = (payload) => myAxios.post(DISMISSAL_URL, payload, { headers: idempotencyHeaders('dismissal-create') });

export const updateDismissal = (dismissalId, payload) => myAxios.put(`${DISMISSAL_URL}/${dismissalId}`, payload, { headers: idempotencyHeaders('dismissal-update') });

export const changeDismissalStatus = (dismissalId, payload) => myAxios.patch(`${DISMISSAL_URL}/${dismissalId}/status`, payload, { headers: idempotencyHeaders(`dismissal-${payload.status?.toLowerCase?.() || 'status'}`) });
