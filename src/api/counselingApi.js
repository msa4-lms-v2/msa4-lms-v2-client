import myAxios from './myAxios';

const BASE_URL = '/api/academic/counseling';

export const getCounselingProfessor = () => myAxios.get(`${BASE_URL}/professor`);
export const createCounseling = (payload) => myAxios.post(BASE_URL, payload);
export const getCounselings = (params) => myAxios.get(BASE_URL, { params });
export const getCounseling = (counselingId) => myAxios.get(`${BASE_URL}/${counselingId}`);
export const answerCounseling = (counselingId, answer) =>
  myAxios.patch(`${BASE_URL}/${counselingId}/answer`, { answer });
