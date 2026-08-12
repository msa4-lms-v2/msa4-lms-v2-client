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
  const isLoadingAdminBills = ref(false);
  const isLoadingMyBills = ref(false);
  const isLoadingStatus = ref(false);
  const isLoadingAllocation = ref(false);
  const isSubmittingScholarship = ref(false);

  // 2. Getters (computed)

  // 3. Actions (function)
  const fetchAdminBills = async ({ status = null, page = 1, size = 20 } = {}) => {
    isLoadingAdminBills.value = true;
    try {
      const res = await myAxios.get('/api/payment/admin-tuition-bills', {
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
      const res = await myAxios.get('/api/payment/student-tuition');
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

  return {
    adminBills,
    adminBillsPage,
    myBills,
    currentStatus,
    currentAllocation,
    isLoadingAdminBills,
    isLoadingMyBills,
    isLoadingStatus,
    isLoadingAllocation,
    isSubmittingScholarship,
    fetchAdminBills,
    fetchMyBills,
    fetchStatus,
    fetchAllocation,
    applyScholarship,
  };
});
