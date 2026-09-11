import myAxios from './myAxios';

const GRADES_URL = '/api/academic/grades';
const GRADE_CORRECTIONS_URL = `${GRADES_URL}/corrections`;
const EVALUATIONS_URL = '/api/academic/evaluations';
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

// 공개 성적 정정
export const correctOpenedGrades = (classId, corrections, idempotencyKey) =>
  myAxios.patch(GRADE_CORRECTIONS_URL, { classId, corrections }, {
    headers: { 'Idempotency-Key': idempotencyKey },
  });

// 강의별 성적 정정 이력 조회
export const getGradeCorrectionHistories = (classId, params = {}) =>
  myAxios.get(GRADE_CORRECTIONS_URL, { params: { classId, ...params } });

// 학생 본인의 과목별 수강·공개 성적 근거 조회 (졸업학점 진단용 API를 재사용)
// studentId는 Academic의 Student 엔티티 ID이며, 관리자·교수 화면에서 studentId를 이미 아는
// 경우에만 사용한다. 학생 본인 화면은 getMyGrades를 쓴다.
export const getGraduationCreditRecords = (studentId, params = {}) =>
  myAxios.get(CREDIT_RECORDS_URL(studentId), { params });

// 학생 본인 성적 조회(로그인 사용자 기준, studentId 불필요)
export const getMyGrades = (params = {}) =>
  myAxios.get(`${GRADES_URL}/me`, { params });

// 학생 본인 강의평가 제출
export const submitLectureEvaluation = (payload) =>
  myAxios.post(EVALUATIONS_URL, payload);

// 교수 본인 담당 강의의 강의평가 결과 조회
export const getProfessorLectureEvaluations = (params = {}) =>
  myAxios.get(EVALUATIONS_URL, { params });

// 역할 범위별 졸업 학점 진단 현황 조회
export const getCreditRequirementDiagnoses = (params = {}) =>
  myAxios.get('/api/academic/credit-requirement-diagnoses', { params });
