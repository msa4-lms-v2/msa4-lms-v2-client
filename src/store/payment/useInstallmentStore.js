import { defineStore } from 'pinia';
import { ref } from 'vue';
import myAxios from '../../api/myAxios';

export const useInstallmentStore = defineStore('installmentStore', () => {
  // 1. State (ref)
  const installmentPlan = ref(null);
  const isLoadingPlan = ref(false);
  const isSubmittingPlan = ref(false);
  const isProcessingPayment = ref(false);

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

  const processInstallmentPayment = async ({ tuitionBillId, installmentPlanItemId }) => {
    isProcessingPayment.value = true;
    try {
      // 1. Initiate payment
      const initRes = await myAxios.post('/api/payment/payments', {
        tuitionBillId,
        method: 'CARD',
        installmentPlanItemId,
      });
      
      const { orderId, amount } = initRes.data.data;
      const paymentKey = 'pk_' + orderId;
      const idempotencyKey = crypto.randomUUID();

      // 2. Confirm payment
      await myAxios.post(
        '/api/payment/payments/confirm',
        { orderId, paymentKey, amount },
        { headers: { 'Idempotency-Key': idempotencyKey } }
      );

      // Refresh the plan
      await fetchInstallmentPlan(tuitionBillId);
    } finally {
      isProcessingPayment.value = false;
    }
  };

  return {
    installmentPlan,
    isLoadingPlan,
    isSubmittingPlan,
    isProcessingPayment,
    fetchInstallmentPlan,
    submitInstallmentPlan,
    processInstallmentPayment,
  };
});
