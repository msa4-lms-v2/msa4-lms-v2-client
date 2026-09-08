import { defineStore } from 'pinia';
import { ref } from 'vue';
import myAxios from '../../api/myAxios';

export const useRefundStore = defineStore('refundStore', () => {
  // 1. State (ref)
  const refunds = ref([]);
  const billPayments = ref([]);
  const isLoadingRefunds = ref(false);
  const isLoadingBillPayments = ref(false);
  const isCreatingPgCancel = ref(false);
  const isRetrying = ref(false);
  const isExecuting = ref(false);

  // 2. Getters (computed)

  // 3. Actions (function)
  const fetchRefunds = async (tuitionBillId) => {
    isLoadingRefunds.value = true;
    try {
      const res = await myAxios.get('/api/payment/refunds', { params: { tuitionBillId } });
      refunds.value = res.data.data;
    } finally {
      isLoadingRefunds.value = false;
    }
  };

  const fetchBillPayments = async (tuitionBillId) => {
    isLoadingBillPayments.value = true;
    try {
      const res = await myAxios.get(`/api/payment/tuition-bills/${tuitionBillId}/payments`);
      billPayments.value = res.data.data;
    } finally {
      isLoadingBillPayments.value = false;
    }
  };

  const createPgCancelRefund = async ({ paymentId, amount, reason }) => {
    isCreatingPgCancel.value = true;
    try {
      await myAxios.post('/api/payment/refunds/pg-cancel-requests', {
        paymentId,
        amount: amount || undefined,
        reason,
      });
    } finally {
      isCreatingPgCancel.value = false;
    }
  };

  const retryFailedRefund = async (tuitionBillId) => {
    isRetrying.value = true;
    try {
      await myAxios.post(
        '/api/payment/refunds/retry',
        { tuitionBillId },
        { headers: { 'Idempotency-Key': crypto.randomUUID() } },
      );
    } finally {
      isRetrying.value = false;
    }
  };

  const executeRefund = async ({ refundId, cancelReason, refundBankCode, refundAccountNumber, refundHolderName }) => {
    isExecuting.value = true;
    try {
      await myAxios.post(
        `/api/payment/refunds/${refundId}/execute`,
        { cancelReason, refundBankCode: refundBankCode || undefined, refundAccountNumber: refundAccountNumber || undefined, refundHolderName: refundHolderName || undefined },
        { headers: { 'Idempotency-Key': crypto.randomUUID() } },
      );
    } finally {
      isExecuting.value = false;
    }
  };

  return {
    refunds,
    billPayments,
    isLoadingRefunds,
    isLoadingBillPayments,
    isCreatingPgCancel,
    isRetrying,
    isExecuting,
    fetchRefunds,
    fetchBillPayments,
    createPgCancelRefund,
    retryFailedRefund,
    executeRefund,
  };
});
