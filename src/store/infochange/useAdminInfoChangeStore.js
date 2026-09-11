import { defineStore } from 'pinia';
import { ref } from 'vue';
import {
  approveInfoChangeRequest,
  getInfoChangeRequestDetail,
  rejectInfoChangeRequest,
  searchAdminInfoChangeRequests,
} from '../../api/adminInfoChangeApi';

export const useAdminInfoChangeStore = defineStore('adminInfoChangeStore', () => {
  // 1. State (ref)
  const requests = ref([]);
  const pageInfo = ref({ totalCount: 0, page: 1, size: 20, hasNext: false });
  const currentRequest = ref(null);
  const currentRequesterType = ref(null);
  const isLoading = ref(false);
  const isLoadingDetail = ref(false);
  const isReviewing = ref(false);

  // 2. Getters (computed)

  // 3. Actions (function)
  const applyPage = (data) => {
    requests.value = data.items;
    pageInfo.value = {
      totalCount: data.totalCount,
      page: data.page,
      size: data.size,
      hasNext: data.hasNext,
    };
  };

  const fetchRequests = async (filters, page = 1) => {
    isLoading.value = true;
    try {
      const response = await searchAdminInfoChangeRequests({ ...filters, page });
      applyPage(response.data.data);
    } finally {
      isLoading.value = false;
    }
  };

  const fetchRequestDetail = async (requesterType, requestId, config = {}) => {
    isLoadingDetail.value = true;
    try {
      const response = await getInfoChangeRequestDetail(requesterType, requestId, config);
      currentRequesterType.value = requesterType;
      currentRequest.value = response.data.data;
      return currentRequest.value;
    } finally {
      isLoadingDetail.value = false;
    }
  };

  const approveRequest = async () => {
    isReviewing.value = true;
    try {
      const response = await approveInfoChangeRequest(
        currentRequesterType.value,
        currentRequest.value.id,
      );
      currentRequest.value = response.data.data;
      return currentRequest.value;
    } finally {
      isReviewing.value = false;
    }
  };

  const rejectRequest = async (rejectReason) => {
    isReviewing.value = true;
    try {
      const response = await rejectInfoChangeRequest(
        currentRequesterType.value,
        currentRequest.value.id,
        rejectReason,
      );
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
    currentRequesterType,
    isLoading,
    isLoadingDetail,
    isReviewing,
    fetchRequests,
    fetchRequestDetail,
    approveRequest,
    rejectRequest,
  };
});
