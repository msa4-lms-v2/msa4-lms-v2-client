import myAxios from './myAxios';

const WITHDRAWALS_URL = '/api/academic/withdrawals';

// 자퇴 신청 목록 조회 (학생 본인/교수 지도학생/관리자 전체, 역할별로 서버가 범위를 제한)
export const searchWithdrawals = (params = {}) =>
  myAxios.get(WITHDRAWALS_URL, { params });

// 자퇴 신청 상세 조회
export const getWithdrawal = (withdrawalId) =>
  myAxios.get(`${WITHDRAWALS_URL}/${withdrawalId}`);

// 관리자 자퇴 신청 최종 검토 (ADVISOR_APPROVED 상태만 처리 가능)
export const reviewWithdrawalByAdmin = (withdrawalId, payload, idempotencyKey) =>
  myAxios.patch(`${WITHDRAWALS_URL}/${withdrawalId}/final-review`, payload, {
    headers: { 'Idempotency-Key': idempotencyKey },
  });

// 자퇴 증빙 다운로드
export const downloadWithdrawalAttachment = (withdrawalId) =>
  myAxios.get(`${WITHDRAWALS_URL}/${withdrawalId}/attachment`, { responseType: 'blob' });

// 지도교수 자퇴 신청 검토 (PENDING 상태만 처리 가능)
export const reviewWithdrawalByAdvisor = (withdrawalId, payload, idempotencyKey) =>
  myAxios.patch(`${WITHDRAWALS_URL}/${withdrawalId}/advisor-review`, payload, {
    headers: { 'Idempotency-Key': idempotencyKey },
  });
