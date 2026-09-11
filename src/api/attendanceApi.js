import myAxios from './myAxios';

const BASE_URL = '/api/academic/attendance';
const RECORDS_URL = `${BASE_URL}/records`;
const EXCUSES_URL = `${BASE_URL}/excuses`;

export const getProfessorLectures = (config = {}) =>
    myAxios.get('/api/academic/classes', {
        params: { page: 1, size: 100, current: true, status: 'OPEN' },
        ...config,
    });

export const getCurrentAttendanceSession = (classId) =>
    myAxios.get(`${BASE_URL}/sessions/current`, { params: { classId } });

export const getAttendanceSessions = (config = {}) =>
    myAxios.get(`${BASE_URL}/sessions`, { params: { page: 1, size: 100 }, ...config });

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

// 출결 기록 조회 (학생 본인/교수 담당 강의/관리자 전체, 역할별로 서버가 범위를 제한)
export const searchAttendanceRecords = (params = {}) =>
    myAxios.get(RECORDS_URL, { params });

// 출결 기록 수정 (담당 교수·관리자)
export const updateAttendanceRecord = (attendanceId, status, remarks, reason) =>
    myAxios.patch(`${RECORDS_URL}/${attendanceId}`, { status, remarks, reason });

// 공결 처리 상태 조회
export const searchExcuseRequests = (params = {}) =>
    myAxios.get(EXCUSES_URL, { params });

// 학생 공결 신청
export const createExcuseRequest = (payload) =>
    myAxios.post(EXCUSES_URL, payload);

// 담당 교수 공결 승인·반려
export const reviewExcuseRequest = (requestId, status, rejectReason, idempotencyKey) =>
    myAxios.patch(`${EXCUSES_URL}/${requestId}`, { status, rejectReason }, {
        headers: { 'Idempotency-Key': idempotencyKey },
    });

// 공결 증빙 다운로드 (학생 본인·담당 교수·관리자)
export const downloadExcuseAttachment = (requestId) =>
    myAxios.get(`${EXCUSES_URL}/${requestId}/attachment`, { responseType: 'blob' });

// 공결 증빙 등록·교체 (10MB 이하 PDF)
export const uploadExcuseAttachment = (requestId, file) => {
    const formData = new FormData();
    formData.append('file', file);
    return myAxios.put(`${EXCUSES_URL}/${requestId}/attachment`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
};
