import { defineStore } from 'pinia';
import { ref } from 'vue';
import {
  changeLeaveRequestStatus,
  getLeaveRequest,
  searchLeaveRequests,
} from '../../api/leaveApi';

export const useLeaveRequestStore = defineStore('leaveRequestStore', () => {
  // 1. State (ref)
  const requests = ref([]);
  const pageInfo = ref({ totalCount: 0, page: 1, size: 20, hasNext: false });
  const currentRequest = ref(null);
  const isLoading = ref(false);
  const isLoadingDetail = ref(false);
  const isReviewing = ref(false);

  // 2. Getters (computed)

  // 3. Actions (function)
  const fetchRequests = async (filters = {}, page = 1) => {
    isLoading.value = true;
    try {
      const response = await searchLeaveRequests({ ...filters, page });
      const data = response.data.data;
      requests.value = data.items || [];
      pageInfo.value = {
        totalCount: data.totalCount || 0,
        page: data.page || page,
        size: data.size || filters.size || 20,
        hasNext: Boolean(data.hasNext),
      };
    } finally {
      isLoading.value = false;
    }
  };

  const fetchRequest = async (requestId) => {
    isLoadingDetail.value = true;
    try {
      const response = await getLeaveRequest(requestId);
      currentRequest.value = response.data.data;
      return currentRequest.value;
    } finally {
      isLoadingDetail.value = false;
    }
  };

  const reviewRequest = async (requestId, status, reason, idempotencyKey) => {
    isReviewing.value = true;
    try {
      const response = await changeLeaveRequestStatus(requestId, status, reason, idempotencyKey);
      currentRequest.value = response.data.data;
      return currentRequest.value;
    } finally {
      isReviewing.value = false;
    }
  };

  return {
    requests,
    pageInfo,
    currentRequest,
    isLoading,
    isLoadingDetail,
    isReviewing,
    fetchRequests,
    fetchRequest,
    reviewRequest,
  };
});
