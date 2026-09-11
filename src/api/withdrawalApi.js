import myAxios from './myAxios';

const WITHDRAWAL_URL = '/api/academic/withdrawals';

export const searchWithdrawals = (params = {}) =>
  myAxios.get(WITHDRAWAL_URL, { params });

export const getWithdrawal = (withdrawalId) =>
  myAxios.get(`${WITHDRAWAL_URL}/${withdrawalId}`);

export const downloadWithdrawalAttachment = (withdrawalId) =>
  myAxios.get(`${WITHDRAWAL_URL}/${withdrawalId}/attachment`, { responseType: 'blob' });

export const reviewWithdrawalByAdvisor = (withdrawalId, payload, idempotencyKey) =>
  myAxios.patch(`${WITHDRAWAL_URL}/${withdrawalId}/advisor-review`, payload, {
    headers: { 'Idempotency-Key': idempotencyKey },
  });

export const reviewWithdrawalByAdmin = (withdrawalId, payload, idempotencyKey) =>
  myAxios.patch(`${WITHDRAWAL_URL}/${withdrawalId}/final-review`, payload, {
    headers: { 'Idempotency-Key': idempotencyKey },
  });
