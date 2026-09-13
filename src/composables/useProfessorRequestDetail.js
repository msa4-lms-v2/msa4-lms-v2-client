import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

// Keep detail navigation refreshable without losing the list's filters and page.
export function useProfessorRequestDetail({ fetchRequest, resetForm, onError }) {
  const route = useRoute();
  const router = useRouter();
  const pagePath = route.path;
  const selectedRequest = ref(null);
  const isLoadingDetail = ref(false);
  const detailError = ref('');
  const detailId = computed(() => {
    const value = route.query.requestId;
    return route.path === pagePath && typeof value === 'string' && value.length ? value : null;
  });
  let revision = 0;
  watch(detailId, async (id) => {
    const current = ++revision;
    selectedRequest.value = null;
    detailError.value = '';
    resetForm();
    isLoadingDetail.value = Boolean(id);
    if (!id) return;
    try {
      const response = await fetchRequest(id);
      if (current === revision) {
        selectedRequest.value = response.data.data;
        if (!selectedRequest.value) detailError.value = '신청 정보를 찾을 수 없습니다.';
      }
    } catch (error) {
      if (current === revision) {
        detailError.value = error.response?.data?.message || '신청 정보를 불러오지 못했습니다.';
        if (onError) await onError(error);
      }
    } finally {
      if (current === revision) isLoadingDetail.value = false;
    }
  }, { immediate: true });
  onBeforeUnmount(() => { revision += 1; });
  const openDetail = (id) => router.push({ path: pagePath, query: { ...route.query, requestId: String(id) } });
  const closeDetail = () => {
    const query = { ...route.query };
    delete query.requestId;
    return router.push({ path: pagePath, query });
  };
  return { detailId, selectedRequest, isLoadingDetail, detailError, openDetail, closeDetail };
}
