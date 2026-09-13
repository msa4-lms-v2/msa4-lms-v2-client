import myAxios from './myAxios';

const LEAVE_REQUESTS_URL = '/api/academic/leave-requests';

export const searchLeaveRequests = (params = {}) =>
  myAxios.get(LEAVE_REQUESTS_URL, { params });

export const getLeaveRequest = (requestId) =>
  myAxios.get(`${LEAVE_REQUESTS_URL}/${requestId}`);

export const changeLeaveRequestStatus = (requestId, status, reason, idempotencyKey) =>
  myAxios.patch(`${LEAVE_REQUESTS_URL}/${requestId}/status`, { status, reason }, {
    headers: { 'Idempotency-Key': idempotencyKey },
  });

export const downloadLeaveRequestFile = (requestId, fileId) =>
  myAxios.get(`${LEAVE_REQUESTS_URL}/${requestId}/files/${fileId}`, {
    responseType: 'blob',
  });
