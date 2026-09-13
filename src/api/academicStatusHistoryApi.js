import myAxios from './myAxios';

const STATUS_HISTORIES_URL = '/api/academic/status-histories';

// 학적 변경 이력 검색 (학생 본인/교수 담당 범위/관리자 전체, 역할별로 서버가 범위를 제한)
export const searchAcademicStatusHistories = (params = {}) =>
  myAxios.get(STATUS_HISTORIES_URL, { params });
