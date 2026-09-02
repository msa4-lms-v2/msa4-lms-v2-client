import { defineStore } from 'pinia';
import { ref } from 'vue';
import myAxios from '../../api/myAxios';

export const usePaymentHealthStore = defineStore('paymentHealthStore', () => {
  // 1. State (ref)
  const pgHealth = ref(null);
  const virtualAccountHealth = ref(null);
  const isLoading = ref(false);

  // 2. Getters (computed)

  // 3. Actions (function)
  const fetchHealth = async () => {
    isLoading.value = true;
    try {
      const [pgRes, vaRes] = await Promise.all([
        myAxios.get('/api/payment/pg-sandbox-health'),
        myAxios.get('/api/payment/virtual-account-health'),
      ]);
      pgHealth.value = pgRes.data.data;
      virtualAccountHealth.value = vaRes.data.data;
    } finally {
      isLoading.value = false;
    }
  };

  return { pgHealth, virtualAccountHealth, isLoading, fetchHealth };
});
