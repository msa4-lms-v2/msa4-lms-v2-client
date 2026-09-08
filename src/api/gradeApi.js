import myAxios from './myAxios';

const GRADES_URL = '/api/academic/grades';
const CREDIT_RECORDS_URL = (studentId) => `/api/academic/students/${studentId}/graduation-credit-records`;

// 담당 교수·관리자의 강의 성적 입력 현황 조회
export const getManagedGrades = (classId) =>
  myAxios.get(GRADES_URL, { params: { classId } });

// 성적 최초 입력(임시저장)
export const createGradeDraft = (classId, grades, idempotencyKey) =>
  myAxios.post(GRADES_URL, { classId, grades }, {
    headers: { 'Idempotency-Key': idempotencyKey },
  });

// 임시저장 성적 수정
export const updateGradeDraft = (classId, grades, idempotencyKey) =>
  myAxios.patch(GRADES_URL, { classId, grades }, {
    headers: { 'Idempotency-Key': idempotencyKey },
  });

// 강의 성적 확정(DRAFT -> OPENED)
export const finalizeGrades = (classId, idempotencyKey) =>
  myAxios.patch(`${GRADES_URL}/classes/${classId}/status`, { status: 'OPENED' }, {
    headers: { 'Idempotency-Key': idempotencyKey },
  });

// 학생 본인의 과목별 수강·공개 성적 근거 조회 (졸업학점 진단용 API를 재사용)
// studentId는 Academic의 Student 엔티티 ID이며, 현재 학생 본인이 이 값을 직접 조회할 수 있는
// API가 없어 자기 자신을 대상으로는 호출할 수 없다. 관리자·교수 화면에서 studentId를 이미 아는
// 경우에만 사용한다.
export const getGraduationCreditRecords = (studentId, params = {}) =>
  myAxios.get(CREDIT_RECORDS_URL(studentId), { params });
