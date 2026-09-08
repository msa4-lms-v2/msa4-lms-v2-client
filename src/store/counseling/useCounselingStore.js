import { defineStore } from 'pinia';
import { ref } from 'vue';
import {
  createCounseling,
  getCounseling,
  getCounselingProfessor,
  getCounselings,
  answerCounseling,
} from '../../api/counselingApi';

export const useCounselingStore = defineStore('counselingStore', () => {
  const professors = ref([]);
  const counselings = ref([]);
  const selected = ref(null);
  const page = ref({ page: 1, size: 20, totalCount: 0, hasNext: false });

  const fetchProfessors = async () => {
    const response = await getCounselingProfessor();
    professors.value = response.data.data ? [response.data.data] : [];
    return professors.value;
  };

  const fetchCounselings = async (params = {}) => {
    const response = await getCounselings({ page: 1, size: 100, ...params });
    const data = response.data.data;
    counselings.value = data.items || [];
    page.value = {
      page: data.page,
      size: data.size,
      totalCount: data.totalCount,
      hasNext: data.hasNext,
    };
    return counselings.value;
  };

  const fetchCounseling = async (id) => {
    const response = await getCounseling(id);
    selected.value = response.data.data;
    return selected.value;
  };

  const submitCounseling = async (payload) => {
    const response = await createCounseling(payload);
    const created = response.data.data;
    counselings.value = [created, ...counselings.value.filter((item) => item.id !== created.id)];
    return created;
  };

  const submitAnswer = async (id, answer) => {
    const response = await answerCounseling(id, answer);
    selected.value = response.data.data;
    const index = counselings.value.findIndex((item) => item.id === selected.value.id);
    if (index >= 0) counselings.value[index] = selected.value;
    return selected.value;
  };

  return { professors, counselings, selected, page, fetchProfessors, fetchCounselings, fetchCounseling, submitCounseling, submitAnswer };
});
