import myAxios from './myAxios';

const BASE_URL = '/api/academic/academic-schedules';

export const getAcademicScheduleTemplates = () => myAxios.get(`${BASE_URL}/templates`);

export const searchAcademicSchedules = (params) => myAxios.get(BASE_URL, { params });

export const getAcademicSchedule = (scheduleId) => myAxios.get(`${BASE_URL}/${scheduleId}`);

export const createAcademicSchedule = (payload) => myAxios.post(BASE_URL, payload);

export const updateAcademicSchedule = (scheduleId, payload) => myAxios.put(`${BASE_URL}/${scheduleId}`, payload);
