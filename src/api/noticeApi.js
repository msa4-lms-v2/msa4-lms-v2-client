import myAxios from './myAxios';

const NOTICE_URL = '/api/academic/catalog/notices';

const requestHeaders = () => ({
  'X-Request-Id': `notice-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
});

export const searchNotices = (params = {}) => myAxios.get(NOTICE_URL, { params });

export const getNotice = (noticeId, config = {}) => myAxios.get(`${NOTICE_URL}/${noticeId}`, config);

export const createNotice = (payload) => myAxios.post(NOTICE_URL, payload, { headers: requestHeaders() });

export const updateNotice = (noticeId, payload) => myAxios.patch(`${NOTICE_URL}/${noticeId}`, payload, { headers: requestHeaders() });

export const deactivateNotice = (noticeId) => myAxios.patch(`${NOTICE_URL}/${noticeId}/status`, null, { headers: requestHeaders() });
