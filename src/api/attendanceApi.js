import myAxios from './myAxios';

const BASE_URL = '/api/academic/attendance';

export const getProfessorLectures = () =>
    myAxios.get('/api/academic/classes', {
        params: { page: 1, size: 100, current: true, status: 'OPEN' },
    });

export const getCurrentAttendanceSession = (classId) =>
    myAxios.get(`${BASE_URL}/sessions/current`, { params: { classId } });

export const getAttendanceSessions = () =>
    myAxios.get(`${BASE_URL}/sessions`, { params: { page: 1, size: 100 } });

export const openAttendanceSession = (classId) =>
    myAxios.post(`${BASE_URL}/sessions`, { classId });

export const renewAttendanceQr = (sessionId) =>
    myAxios.post(`${BASE_URL}/sessions/${sessionId}/qr-tokens`);

export const getAttendanceSessionSummary = (sessionId) =>
    myAxios.get(`${BASE_URL}/sessions/${sessionId}/summary`);

export const closeAttendanceSession = (sessionId) =>
    myAxios.post(`${BASE_URL}/sessions/${sessionId}/close`);

export const checkInAttendance = (sessionId, token) =>
    myAxios.post(`${BASE_URL}/check-ins`, { sessionId, token });
