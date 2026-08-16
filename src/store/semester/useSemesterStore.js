import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import myAxios from '../../api/myAxios';

export const useSemesterStore = defineStore('semesterStore', () => {
  // 1. State (ref)
  const semesters = ref([]);
  const isLoading = ref(false);

  // 2. Getters (computed)
  const semesterLabelMap = computed(() => {
    const map = {};
    semesters.value.forEach((semester) => {
      map[semester.id] = `${semester.academicYear}학년도 ${semester.term === 'FIRST' ? '1' : '2'}학기`;
    });
    return map;
  });

  const academicYears = computed(() => {
    const years = new Set(semesters.value.map((semester) => semester.academicYear));
    return Array.from(years).sort((a, b) => b - a);
  });

  // 3. Actions (function)
  const fetchSemesters = async () => {
    if (semesters.value.length > 0) return;
    isLoading.value = true;
    try {
      const res = await myAxios.get('/api/academic/catalog/semesters', { params: { size: 100 } });
      semesters.value = res.data.data.items;
    } finally {
      isLoading.value = false;
    }
  };

  const getSemesterLabel = (semesterId) => semesterLabelMap.value[semesterId] || `${semesterId}학기`;

  return {
    semesters,
    isLoading,
    semesterLabelMap,
    academicYears,
    fetchSemesters,
    getSemesterLabel,
  };
});
