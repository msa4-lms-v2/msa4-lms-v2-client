import myAxios from './myAxios';

const requestUrl = (type) => `/api/academic/${type}-requests`;

export const searchAcademicChangeRequests = (type, params = {}) =>
  myAxios.get(requestUrl(type), { params });

export const getAcademicChangeRequest = (type, requestId) =>
  myAxios.get(`${requestUrl(type)}/${requestId}`);

export const downloadAcademicChangeFile = async (type, requestId, fileId) => {
  try { return await myAxios.get(`${requestUrl(type)}/${requestId}/files/${fileId}`, { responseType: 'blob' }); }
  catch(error) {
    if(error.response?.data instanceof Blob) {
      try { error.response.data=JSON.parse(await error.response.data.text()); } catch { /* 파일 응답이 아닌 오류는 기본 안내를 유지한다. */ }
    }
    throw error;
  }
};

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
