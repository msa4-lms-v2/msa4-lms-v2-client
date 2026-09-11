import myAxios from './myAxios';

const BASE_URL = '/api/academic/academic-schedules';

export const getAcademicScheduleTemplates = (config = {}) => myAxios.get(`${BASE_URL}/templates`, config);

export const searchAcademicSchedules = (params) => myAxios.get(BASE_URL, { params });

export const getAcademicSchedule = (scheduleId, config = {}) => myAxios.get(`${BASE_URL}/${scheduleId}`, config);

export const createAcademicSchedule = (payload) => myAxios.post(BASE_URL, payload);

export const updateAcademicSchedule = (scheduleId, payload) => myAxios.put(`${BASE_URL}/${scheduleId}`, payload);
