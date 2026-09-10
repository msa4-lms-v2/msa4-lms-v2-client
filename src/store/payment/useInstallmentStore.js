import { defineStore } from 'pinia';
import { ref } from 'vue';
import myAxios from '../../api/myAxios';

export const useInstallmentStore = defineStore('installmentStore', () => {
  // 1. State (ref)
  const installmentPlan = ref(null);
  const isLoadingPlan = ref(false);
  const isSubmittingPlan = ref(false);
  const isReviewingPlan = ref(false);

  // 2. Getters (computed)

  // 3. Actions (function)
  const fetchInstallmentPlan = async (tuitionBillId) => {
    isLoadingPlan.value = true;
    try {
      const res = await myAxios.get('/api/payment/installment-plans', {
        params: { tuitionBillId },
      });
      installmentPlan.value = res.data.data;
    } catch (error) {
      if (error.response && error.response.status === 404) {
        installmentPlan.value = null;
      } else {
        throw error;
      }
    } finally {
      isLoadingPlan.value = false;
    }
  };

  const submitInstallmentPlan = async ({ tuitionBillId, totalRounds }) => {
    isSubmittingPlan.value = true;
    try {
      const res = await myAxios.post('/api/payment/installment-plans', {
        tuitionBillId,
        totalRounds,
      });
      installmentPlan.value = res.data.data;
      return res.data.data;
    } finally {
      isSubmittingPlan.value = false;
    }
  };

  // ADMIN이 REQUESTED 상태의 분할납부 신청을 승인·반려한다.
  const reviewInstallmentPlan = async ({ planId, decision, rejectReason }) => {
    isReviewingPlan.value = true;
    try {
      const res = await myAxios.patch(`/api/payment/installment-plans/${planId}/review`, {
        decision,
        rejectReason: rejectReason || undefined,
      });
      installmentPlan.value = res.data.data;
      return installmentPlan.value;
    } finally {
      isReviewingPlan.value = false;
    }
  };

  return {
    installmentPlan,
    isLoadingPlan,
    isSubmittingPlan,
    isReviewingPlan,
    fetchInstallmentPlan,
    submitInstallmentPlan,
    reviewInstallmentPlan,
  };
});
