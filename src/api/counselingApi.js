import myAxios from './myAxios';

const BASE_URL = '/api/academic/counseling';

export const getCounselingProfessor = () => myAxios.get(`${BASE_URL}/professor`);
export const createCounseling = (payload) => myAxios.post(BASE_URL, payload);
export const getCounselings = (params, config = {}) => myAxios.get(BASE_URL, { params, ...config });
export const getCounseling = (counselingId, config = {}) => myAxios.get(`${BASE_URL}/${counselingId}`, config);
export const answerCounseling = (counselingId, answer) =>
  myAxios.patch(`${BASE_URL}/${counselingId}/answer`, { answer });
