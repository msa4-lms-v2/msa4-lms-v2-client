import myAxios from './myAxios';

const requestUrl = (type) => `/api/academic/${type}-requests`;

export const searchAcademicChangeRequests = (type, params = {}) =>
  myAxios.get(requestUrl(type), { params });

export const getAcademicChangeRequest = (type, requestId) =>
  myAxios.get(`${requestUrl(type)}/${requestId}`);

export const downloadAcademicChangeFile = (type, requestId, fileId) =>
  myAxios.get(`${requestUrl(type)}/${requestId}/files/${fileId}`, { responseType: 'blob' });

export const reviewAcademicChangeByAdvisor = (type, requestId, payload, idempotencyKey) =>
  myAxios.patch(`${requestUrl(type)}/${requestId}/advisor-review`, payload, {
    headers: { 'Idempotency-Key': idempotencyKey },
  });

export const applyAcademicChange = (type, requestId, files, idempotencyKey) => {
  const formData = new FormData();
  files.forEach((file) => formData.append('files', file));
  return myAxios.patch(`${requestUrl(type)}/${requestId}/application`, formData, {
    headers: { 'Idempotency-Key': idempotencyKey },
  });
};

export const rejectAcademicChangeByAdmin = (type, requestId, rejectReason, idempotencyKey) =>
  myAxios.patch(`${requestUrl(type)}/${requestId}/rejection`, { rejectReason }, {
    headers: { 'Idempotency-Key': idempotencyKey },
  });
