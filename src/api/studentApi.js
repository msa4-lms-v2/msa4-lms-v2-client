import myAxios from './myAxios';

const STUDENTS_URL = '/api/academic/students';

// 권한 범위 내 학생 목록 검색 (PROFESSOR: 지도학생·담당강의 수강생·같은 학과, ADMIN: 전체)
export const searchStudents = (params = {}) =>
  myAxios.get(STUDENTS_URL, { params });
