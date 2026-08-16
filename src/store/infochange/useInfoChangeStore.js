import { defineStore } from 'pinia';
import { ref } from 'vue';
import myAxios from '../../api/myAxios';

export const useInfoChangeStore = defineStore('infoChangeStore', () => {
  // 1. State (ref)
  const myRequests = ref([]);
  const myRequestsPage = ref({ totalCount: 0, page: 1, size: 20, hasNext: false });
  const adminRequests = ref([]);
  const adminRequestsPage = ref({ totalCount: 0, page: 1, size: 20, hasNext: false });
  const currentRequest = ref(null);
  const isLoadingMyRequests = ref(false);
  const isLoadingAdminRequests = ref(false);
  const isLoadingCurrentRequest = ref(false);
  const isSubmitting = ref(false);
  const isReviewing = ref(false);

  // 3. Actions (function)
  const fetchMyRequests = async (page = 1) => {
    isLoadingMyRequests.value = true;
    try {
      const res = await myAxios.get('/api/academic/info-change-requests', { params: { page } });
      myRequests.value = res.data.data.items;
      myRequestsPage.value = {
        totalCount: res.data.data.totalCount,
        page: res.data.data.page,
        size: res.data.data.size,
        hasNext: res.data.data.hasNext,
      };
    } finally {
      isLoadingMyRequests.value = false;
    }
  };

  const fetchAdminRequests = async (page = 1) => {
    isLoadingAdminRequests.value = true;
    try {
      const res = await myAxios.get('/api/academic/info-change-requests', { params: { page } });
      adminRequests.value = res.data.data.items;
      adminRequestsPage.value = {
        totalCount: res.data.data.totalCount,
        page: res.data.data.page,
        size: res.data.data.size,
        hasNext: res.data.data.hasNext,
      };
    } finally {
      isLoadingAdminRequests.value = false;
    }
  };

  const fetchRequestDetail = async (requestId) => {
    isLoadingCurrentRequest.value = true;
    try {
      const res = await myAxios.get(`/api/academic/info-change-requests/${requestId}`);
      currentRequest.value = res.data.data;
    } finally {
      isLoadingCurrentRequest.value = false;
    }
  };

  const submitRequest = async ({ newName, newPhoneNumber, newEmail, newAddress, profileImage, attachments, reason }) => {
    isSubmitting.value = true;
    try {
      const formData = new FormData();
      if (newName) formData.append('newName', newName);
      if (newPhoneNumber) formData.append('newPhoneNumber', newPhoneNumber);
      if (newEmail) formData.append('newEmail', newEmail);
      if (newAddress) formData.append('newAddress', newAddress);
      if (profileImage) formData.append('profileImage', profileImage);
      (attachments || []).forEach((file) => formData.append('attachments', file));
      formData.append('reason', reason);

      const res = await myAxios.post('/api/academic/info-change-requests', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data.data;
    } finally {
      isSubmitting.value = false;
    }
  };

  const approveRequest = async (requestId) => {
    isReviewing.value = true;
    try {
      const res = await myAxios.patch(`/api/academic/info-change-requests/${requestId}/approve`);
      currentRequest.value = res.data.data;
      return res.data.data;
    } finally {
      isReviewing.value = false;
    }
  };

  const rejectRequest = async (requestId, rejectReason) => {
    isReviewing.value = true;
    try {
      const res = await myAxios.patch(`/api/academic/info-change-requests/${requestId}/reject`, { rejectReason });
      currentRequest.value = res.data.data;
      return res.data.data;
    } finally {
      isReviewing.value = false;
    }
  };

  return {
    myRequests,
    myRequestsPage,
    adminRequests,
    adminRequestsPage,
    currentRequest,
    isLoadingMyRequests,
    isLoadingAdminRequests,
    isLoadingCurrentRequest,
    isSubmitting,
    isReviewing,
    fetchMyRequests,
    fetchAdminRequests,
    fetchRequestDetail,
    submitRequest,
    approveRequest,
    rejectRequest,
  };
});
