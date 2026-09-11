import myAxios from './myAxios';

const BASE_URL = '/api/academic/catalog/notices';

export const searchNotices = (params) => myAxios.get(BASE_URL, { params });

export const getNotice = (noticeId) => myAxios.get(`${BASE_URL}/${noticeId}`);

export const createNotice = (formData) => myAxios.post(BASE_URL, formData);

export const updateNotice = (noticeId, formData) => myAxios.patch(`${BASE_URL}/${noticeId}`, formData);

export const deactivateNotice = (noticeId) => myAxios.patch(`${BASE_URL}/${noticeId}/status`);
