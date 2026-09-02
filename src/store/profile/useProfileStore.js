import { defineStore } from 'pinia';
import { ref } from 'vue';
import myAxios from '../../api/myAxios';

export const useProfileStore = defineStore('profileStore', () => {
  // 1. State (ref)
  const profile = ref(null);
  const isLoading = ref(false);

  // 3. Actions (function)
  const fetchStudentProfile = async () => {
    isLoading.value = true;
    try {
      const res = await myAxios.get('/api/academic/students/me');
      profile.value = res.data.data;
    } finally {
      isLoading.value = false;
    }
  };

  return {
    profile,
    isLoading,
    fetchStudentProfile,
  };
});
