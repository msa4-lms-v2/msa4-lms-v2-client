import myAxios from './myAxios';

const CLASSES_URL = '/api/academic/classes';
const OPENING_REQUESTS_URL = `${CLASSES_URL}/opening-requests`;
const SYLLABUS_FILES_URL = `${CLASSES_URL}/syllabus-files`;

// 교수 본인 담당 강의 조회
export const getMyLectures = (params = {}) =>
  myAxios.get(CLASSES_URL, { params });

// 강의 개설 신청 목록 조회 (교수는 본인 신청만)
export const getLectureOpeningRequests = (params = {}) =>
  myAxios.get(OPENING_REQUESTS_URL, { params });

// 강의 개설 신청 상세 조회
export const getLectureOpeningRequest = (requestId) =>
  myAxios.get(`${OPENING_REQUESTS_URL}/${requestId}`);

// 교수 강의 개설 신청
export const createLectureOpeningRequest = (payload) =>
  myAxios.post(OPENING_REQUESTS_URL, payload);

// 교수 본인 처리 대기 강의 개설 신청 보완
export const updateLectureOpeningRequest = (requestId, payload) =>
  myAxios.patch(`${OPENING_REQUESTS_URL}/${requestId}`, payload);

// 담당 강의 강의계획서 조회
export const getLectureSyllabus = (classId) =>
  myAxios.get(`${CLASSES_URL}/${classId}/syllabus`);

// 담당 강의 강의계획서 작성·수정
export const updateLectureSyllabus = (classId, payload) =>
  myAxios.put(`${CLASSES_URL}/${classId}/syllabus`, payload);

// 담당 강의 강의계획서 PDF 목록 조회
export const getSyllabusFiles = (classId) =>
  myAxios.get(SYLLABUS_FILES_URL, { params: { classId } });

// 담당 강의 강의계획서 PDF 업로드
export const uploadSyllabusFile = (classId, file) => {
  const formData = new FormData();
  formData.append('classId', new Blob([String(classId)], { type: 'application/json' }));
  formData.append('file', file);
  return myAxios.post(SYLLABUS_FILES_URL, formData);
};

// 담당 강의 강의계획서 PDF 다운로드
export const downloadSyllabusFile = (fileId) =>
  myAxios.get(`${SYLLABUS_FILES_URL}/${fileId}`, { responseType: 'blob' });
