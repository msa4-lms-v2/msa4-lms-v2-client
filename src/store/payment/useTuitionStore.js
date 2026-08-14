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

  const TOSS_METHOD_LABEL = {
    CARD: '카드',
    VIRTUAL_ACCOUNT: '가상계좌',
    TRANSFER: '계좌이체',
  };

  // 결제 수단 선택 -> 체크아웃 세션 생성까지는 우리 서버가 하고, 그 뒤 실제 승인은 토스 결제창(SDK)으로 넘긴다.
  // 토스가 successUrl/failUrl로 브라우저를 이동시키므로 이 함수는 정상 반환 없이 페이지를 떠난다(리다이렉트).
  const initiateTossPayment = async ({ tuitionBillId, method, amount }) => {
    isPaymentLoading.value = true;
    isPaymentError.value = false;
    currentPayment.value = null;

    try {
      const validationRes = await myAxios.post('/api/payment/payment-amount-validation', {
        tuitionBillId,
        amount,
      });
      const validation = validationRes.data.data;
      if (!validation.valid || Number(validation.expectedAmount) !== Number(amount)) {
        throw new Error('결제 금액이 서버 계산값과 일치하지 않습니다.');
      }

      const checkoutRes = await myAxios.post('/api/payment/payments', {
        tuitionBillId,
        method,
      });
      const checkoutSession = checkoutRes.data.data;

      const tossPayments = window.TossPayments(import.meta.env.VITE_TOSS_CLIENT_KEY);
      await tossPayments.requestPayment(TOSS_METHOD_LABEL[method], {
        amount: checkoutSession.amount,
        orderId: checkoutSession.orderId,
        orderName: checkoutSession.orderName,
        successUrl: `${window.location.origin}/payments/toss/success?tuitionBillId=${tuitionBillId}`,
        failUrl: `${window.location.origin}/payments/toss/fail?tuitionBillId=${tuitionBillId}`,
      });
    } catch (error) {
      isPaymentError.value = true;
      isPaymentLoading.value = false;
      throw error;
    }
  };

  // 토스 결제창이 successUrl로 돌아온 뒤(paymentKey/orderId/amount 쿼리 파라미터) 실제 승인을 확정한다.
  const confirmTossPayment = async ({ tuitionBillId, orderId, paymentKey, amount }) => {
    isPaymentLoading.value = true;
    isPaymentError.value = false;
    currentPayment.value = null;

    try {
      const confirmRes = await myAxios.post(
        '/api/payment/payments/confirm',
        { orderId, paymentKey, amount },
        { headers: { 'Idempotency-Key': crypto.randomUUID() } },
      );

      currentPayment.value = confirmRes.data.data;
      await myAxios.patch('/api/payment/payment-status', { tuitionBillId });
      await Promise.all([fetchStatus(tuitionBillId), fetchAllocation(tuitionBillId)]);

      return currentPayment.value;
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
    initiateTossPayment,
    confirmTossPayment,
    fetchWithdrawalEstimate,
  };
});
