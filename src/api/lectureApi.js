import myAxios from './myAxios';

const CLASSES_URL = '/api/academic/classes';
const OPENING_REQUESTS_URL = `${CLASSES_URL}/opening-requests`;

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
