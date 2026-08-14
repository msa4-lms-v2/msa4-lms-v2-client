import { defineStore } from 'pinia';
import { ref } from 'vue';
import myAxios from '../../api/myAxios';

export const useTuitionStore = defineStore('tuitionStore', () => {
  // 1. State (ref)
  const adminBills = ref([]);
  const adminBillsPage = ref({ totalCount: 0, page: 1, size: 20, hasNext: false });
  const myBills = ref([]);
  const currentStatus = ref(null);
  const currentAllocation = ref(null);
  const currentPayment = ref(null);
  const currentRefundEstimate = ref(null);
  const isLoadingAdminBills = ref(false);
  const isLoadingMyBills = ref(false);
  const isLoadingStatus = ref(false);
  const isLoadingAllocation = ref(false);
  const isSubmittingScholarship = ref(false);
  const isPaymentLoading = ref(false);
  const isPaymentError = ref(false);
  const isRefundEstimateLoading = ref(false);
  const isRefundEstimateError = ref(false);
  const hasNoWithdrawalRequest = ref(false);

  // 2. Getters (computed)

  // 3. Actions (function)
  const fetchAdminBills = async ({ status = null, page = 1, size = 20 } = {}) => {
    isLoadingAdminBills.value = true;
    try {
      const res = await myAxios.get('/api/payment/tuition-bills', {
        params: { status, page, size },
      });
      adminBills.value = res.data.data.items;
      adminBillsPage.value = {
        totalCount: res.data.data.totalCount,
        page: res.data.data.page,
        size: res.data.data.size,
        hasNext: res.data.data.hasNext,
      };
    } finally {
      isLoadingAdminBills.value = false;
    }
  };

  const fetchMyBills = async () => {
    isLoadingMyBills.value = true;
    try {
      const res = await myAxios.get('/api/payment/me/tuition-bills');
      myBills.value = res.data.data;
    } finally {
      isLoadingMyBills.value = false;
    }
  };

  const fetchStatus = async (tuitionBillId) => {
    isLoadingStatus.value = true;
    try {
      const res = await myAxios.get('/api/payment/tuition-payment-status', {
        params: { tuitionBillId },
      });
      currentStatus.value = res.data.data;
    } finally {
      isLoadingStatus.value = false;
    }
  };

  const fetchAllocation = async (tuitionBillId) => {
    isLoadingAllocation.value = true;
    try {
      const res = await myAxios.post('/api/payment/payment-scholarship-allocation', {
        tuitionBillId,
      });
      currentAllocation.value = res.data.data;
    } finally {
      isLoadingAllocation.value = false;
    }
  };

  const applyScholarship = async ({ tuitionBillId, type, amount, reason }) => {
    isSubmittingScholarship.value = true;
    try {
      await myAxios.post('/api/payment/scholarship-discounts', { tuitionBillId, type, amount, reason });
      await fetchAllocation(tuitionBillId);
    } finally {
      isSubmittingScholarship.value = false;
    }
  };

  const submitPayment = async ({ tuitionBillId, method, amount }) => {
    isPaymentLoading.value = true;
    isPaymentError.value = false;
    currentPayment.value = null;
    let validationWarning = '';

    try {
      try {
        const validationRes = await myAxios.post('/api/payment/payment-amount-validation', {
          tuitionBillId,
          amount,
        });
        const validation = validationRes.data.data;
        if (!validation.valid || Number(validation.expectedAmount) !== Number(amount)) {
          validationWarning = '화면의 결제 금액과 서버 계산 금액이 다릅니다. 결제를 계속 진행했습니다.';
        }
      } catch {
        validationWarning = '결제 금액을 확인하지 못했습니다. 결제를 계속 진행했습니다.';
      }

      const checkoutRes = await myAxios.post('/api/payment/payments', {
        tuitionBillId,
        method,
      });
      const checkoutSession = checkoutRes.data.data;
      const confirmRes = await myAxios.post(
        '/api/payment/payments/confirm',
        {
          orderId: checkoutSession.orderId,
          paymentKey: `pk_${checkoutSession.orderId}`,
          amount: checkoutSession.amount,
        },
        {
          headers: { 'Idempotency-Key': crypto.randomUUID() },
        },
      );

      currentPayment.value = confirmRes.data.data;
      await myAxios.patch('/api/payment/payment-status', { tuitionBillId });
      await Promise.all([fetchStatus(tuitionBillId), fetchAllocation(tuitionBillId)]);

      return { payment: currentPayment.value, validationWarning };
    } catch (error) {
      isPaymentError.value = true;
      throw error;
    } finally {
      isPaymentLoading.value = false;
    }
  };

  // /api/payment/refunds/withdrawal-estimate는 tuitionBillId와 함께 withdrawalId도 요구한다(IDOR 방지 -
  // 본인의 어떤 자퇴 신청인지 명시). Payment는 자퇴 신청 목록을 갖고 있지 않으므로, 먼저 Academic에서
  // 본인 자퇴 신청 목록을 조회해 withdrawalId를 구한 뒤에만 Payment의 예상 환불액 조회를 호출한다.
  const fetchWithdrawalEstimate = async (tuitionBillId) => {
    isRefundEstimateLoading.value = true;
    isRefundEstimateError.value = false;
    hasNoWithdrawalRequest.value = false;
    currentRefundEstimate.value = null;

    try {
      const withdrawalsRes = await myAxios.get('/api/academic/withdrawals', {
        params: { page: 1, size: 1 },
      });
      const withdrawals = withdrawalsRes.data.data.items;
      if (!withdrawals || withdrawals.length === 0) {
        hasNoWithdrawalRequest.value = true;
        return null;
      }

      const withdrawalId = withdrawals[0].id;
      const res = await myAxios.get('/api/payment/refunds/withdrawal-estimate', {
        params: { tuitionBillId, withdrawalId },
      });
      currentRefundEstimate.value = res.data.data;
      return currentRefundEstimate.value;
    } catch (error) {
      if (error.response?.status === 404) {
        hasNoWithdrawalRequest.value = true;
        return null;
      }
      isRefundEstimateError.value = true;
      throw error;
    } finally {
      isRefundEstimateLoading.value = false;
    }
  };

  // 환불률 확정(PATCH /api/payment/refunds/withdrawal-rate)은 자퇴 승인 화면 완성 후 연동 예정.

  return {
    adminBills,
    adminBillsPage,
    myBills,
    currentStatus,
    currentAllocation,
    currentPayment,
    currentRefundEstimate,
    isLoadingAdminBills,
    isLoadingMyBills,
    isLoadingStatus,
    isLoadingAllocation,
    isSubmittingScholarship,
    isPaymentLoading,
    isPaymentError,
    isRefundEstimateLoading,
    isRefundEstimateError,
    hasNoWithdrawalRequest,
    fetchAdminBills,
    fetchMyBills,
    fetchStatus,
    fetchAllocation,
    applyScholarship,
    submitPayment,
    fetchWithdrawalEstimate,
  };
});
