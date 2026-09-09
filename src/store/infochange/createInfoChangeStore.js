import { defineStore } from 'pinia';
import { ref } from 'vue';
import myAxios from '../../api/myAxios';

export const createInfoChangeStore = (storeId, resourcePath) => defineStore(storeId, () => {
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
  const applyPage = (target, pageTarget, data) => {
    target.value = data.items;
    pageTarget.value = {
      totalCount: data.totalCount,
      page: data.page,
      size: data.size,
      hasNext: data.hasNext,
    };
  };

  const fetchMyRequests = async (page = 1) => {
    isLoadingMyRequests.value = true;
    try {
      const res = await myAxios.get(resourcePath, { params: { page } });
      applyPage(myRequests, myRequestsPage, res.data.data);
    } finally {
      isLoadingMyRequests.value = false;
    }
  };

  const fetchAdminRequests = async (page = 1) => {
    isLoadingAdminRequests.value = true;
    try {
      const res = await myAxios.get(resourcePath, { params: { page } });
      applyPage(adminRequests, adminRequestsPage, res.data.data);
    } finally {
      isLoadingAdminRequests.value = false;
    }
  };

  const fetchRequestDetail = async (requestId) => {
    isLoadingCurrentRequest.value = true;
    try {
      const res = await myAxios.get(`${resourcePath}/${requestId}`);
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

      const res = await myAxios.post(resourcePath, formData, {
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
      const res = await myAxios.patch(`${resourcePath}/${requestId}/approve`);
      currentRequest.value = res.data.data;
      return res.data.data;
    } finally {
      isReviewing.value = false;
    }
  };

  const rejectRequest = async (requestId, rejectReason) => {
    isReviewing.value = true;
    try {
      const res = await myAxios.patch(`${resourcePath}/${requestId}/reject`, { rejectReason });
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
