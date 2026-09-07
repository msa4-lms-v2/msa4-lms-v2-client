import myAxios from './myAxios';

const TIMETABLE_URL = '/api/academic/timetables';
const ENROLLMENTS_URL = '/api/academic/enrollments';
const CART_URL = '/api/academic/enrollment-cart-items';

// 학생 본인 시간표 조회
export const getMyTimetable = (academicYear, term) =>
  myAxios.get(TIMETABLE_URL, { params: { academicYear, term } });

// 학생 본인 수강 내역 조회 (academicYear/term 생략 시 전체 조회)
export const getMyEnrollments = (params = {}) =>
  myAxios.get(ENROLLMENTS_URL, { params });

// 학생 본인 수강신청
export const createEnrollment = (lectureId, idempotencyKey) =>
  myAxios.post(ENROLLMENTS_URL, { lectureId }, {
    headers: { 'Idempotency-Key': idempotencyKey },
  });

// 학생 본인 수강 취소
export const cancelEnrollment = (enrollmentId) =>
  myAxios.delete(`${ENROLLMENTS_URL}/${enrollmentId}`);

// 학생 본인 수강 장바구니 조회 (academicYear/term 생략 시 전체 조회)
export const getMyCart = (params = {}) =>
  myAxios.get(CART_URL, { params });

// 학생 본인 수강 장바구니에 개설 강의 추가
export const addCartItem = (lectureId) =>
  myAxios.post(CART_URL, { lectureId });

// 학생 본인 수강 장바구니 항목 삭제
export const removeCartItem = (cartItemId) =>
  myAxios.delete(`${CART_URL}/${cartItemId}`);
