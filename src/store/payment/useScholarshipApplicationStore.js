import { defineStore } from 'pinia';
import { ref } from 'vue';
import myAxios from '../../api/myAxios';

export const useScholarshipApplicationStore = defineStore('scholarshipApplicationStore', () => {
  // 1. State (ref)
  const applicationPeriod = ref(null);
  const myScholarships = ref([]);
  const isLoadingPeriod = ref(false);
  const isSubmittingApplication = ref(false);
  const isLoadingMyScholarships = ref(false);

  // 2. Getters (computed)

  // 3. Actions (function)
  const fetchApplicationPeriod = async (semesterId) => {
    isLoadingPeriod.value = true;
    try {
      const res = await myAxios.get('/api/payment/scholarship-application-periods', {
        params: { semesterId },
      });
      applicationPeriod.value = res.data.data;
    } catch (error) {
      if (error.response && error.response.status === 404) {
        applicationPeriod.value = null;
      } else {
        throw error;
      }
    } finally {
      isLoadingPeriod.value = false;
    }
  };

  const submitApplication = async ({ tuitionBillId, type, requestedAmount, reason }) => {
    isSubmittingApplication.value = true;
    try {
      const res = await myAxios.post('/api/payment/scholarship-applications', {
        tuitionBillId,
        type,
        requestedAmount,
        reason,
      });
      return res.data.data;
    } finally {
      isSubmittingApplication.value = false;
    }
  };

  const fetchMyScholarships = async () => {
    isLoadingMyScholarships.value = true;
    try {
      const res = await myAxios.get('/api/payment/me/scholarships');
      myScholarships.value = res.data.data;
    } finally {
      isLoadingMyScholarships.value = false;
    }
  };

  return {
    applicationPeriod,
    myScholarships,
    isLoadingPeriod,
    isSubmittingApplication,
    isLoadingMyScholarships,
    fetchApplicationPeriod,
    submitApplication,
    fetchMyScholarships,
  };
});
