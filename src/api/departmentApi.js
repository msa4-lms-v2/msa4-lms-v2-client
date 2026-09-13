import myAxios from './myAxios';

const DEPARTMENT_URL = '/api/academic/catalog/departments';

export const searchDepartments = (params) => myAxios.get(DEPARTMENT_URL, { params });
export const getDepartment = (departmentId) => myAxios.get(`${DEPARTMENT_URL}/${departmentId}`);
export const createDepartment = (payload) => myAxios.post(DEPARTMENT_URL, payload);
export const updateDepartment = (departmentId, payload) => myAxios.patch(`${DEPARTMENT_URL}/${departmentId}`, payload);

export const getCollegeOptions = async () => {
  const colleges = new Map();
  let page = 1;
  let hasNext = true;

  while (hasNext) {
    const { data } = await searchDepartments({ page, size: 100 });
    const result = data.data;

    (result.items || []).forEach((department) => {
      if (department.college) {
        colleges.set(department.college.id, department.college);
      }
    });

    hasNext = result.hasNext;
    page += 1;
  }

  return [...colleges.values()].sort((first, second) => first.name.localeCompare(second.name, 'ko'));
};
