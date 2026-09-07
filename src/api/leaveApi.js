import myAxios from './myAxios';

const LEAVE_REQUESTS_URL = '/api/academic/leave-requests';

// 휴·복학 신청 목록 조회
// 주의: 백엔드 LeaveRequestController는 STUDENT 본인과 ADMIN 역할만 허용한다(PreAuthorize
// hasAnyRole('STUDENT','ADMIN')). PROFESSOR 역할은 이 API에 대한 접근 권한이 없다.
export const searchLeaveRequests = (params = {}) =>
  myAxios.get(LEAVE_REQUESTS_URL, { params });

// 휴·복학 신청 승인·반려·취소
export const changeLeaveRequestStatus = (requestId, status, reason, idempotencyKey) =>
  myAxios.patch(`${LEAVE_REQUESTS_URL}/${requestId}/status`, { status, reason }, {
    headers: { 'Idempotency-Key': idempotencyKey },
  });
