import myAxios from './myAxios';

const urls = {
  admission: '/api/academic/admission-candidates',
  professor: '/api/academic/faculty-management',
};
export const searchPeople = (kind, params) => myAxios.get(urls[kind], { params });
export const getPerson = (kind, id) => myAxios.get(`${urls[kind]}/${id}`);
export const updatePerson = (kind, id, data) => myAxios.patch(`${urls[kind]}/${id}`, data);
export const getAdmissionAccount = id => myAxios.get(`/api/auth/accounts/admission-candidates/${id}`);
export const retryAdmissionProvisioning = id => myAxios.post(`${urls.admission}/${id}/provisioning/retry`);
export const cancelAdmissionProvisioning = id => myAxios.post(`${urls.admission}/${id}/provisioning/cancel`);
export const getAccount = id => myAxios.get(`/api/auth/accounts/${id}`);
export const createPerson = (kind, data) => myAxios.post(
  kind === 'professor' ? '/api/auth/accounts/professors' : urls[kind], data,
);
export const getDepartments = async () => {
  const items = [];
  let page = 1;
  let hasNext;
  do {
    const response = await myAxios.get('/api/academic/catalog/departments', {
      params: { page, size: 100, active: true },
    });
    items.push(...response.data.data.items);
    hasNext = response.data.data.hasNext;
    page += 1;
  } while (hasNext);
  return items;
};
export const getProfessorsByDepartment = async departmentId => {
  const response = await myAxios.get('/api/academic/faculty-management', {
    params: { page: 1, size: 100, departmentId, status: 'ACTIVE' },
  });
  return response.data.data.items;
};
export const peopleStatuses = {
  admission: { PROVISIONING: '계정 생성 중', REGISTERED: '등록 완료', CONFIRMED: '입학 확정', PROVISIONED: '학생 계정 생성 완료', CANCELLED: '등록 취소' },
  professor: { ACTIVE: '활성', INACTIVE: '비활성', LOCKED: '잠김', PENDING: '대기' },
};
