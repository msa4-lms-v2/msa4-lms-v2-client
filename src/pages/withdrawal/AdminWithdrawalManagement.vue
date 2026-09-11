<script setup>
import { computed, onMounted, ref } from 'vue';
import {
  downloadWithdrawalAttachment,
  getWithdrawal,
  reviewWithdrawalByAdmin,
  searchWithdrawals,
} from '../../api/withdrawalApi';
import MyButton from '../../components/button/MyButton.vue';
import MySelect from '../../components/input/MySelect.vue';
import MyPageContainer from '../../components/layout/MyPageContainer.vue';
import PrevNextPagination from '../../components/pagination/PrevNextPagination.vue';
import MyTable from '../../components/table/MyTable.vue';
import { confirmDialog, notify } from '../../composables/useDialog';
import { ACADEMIC_CHANGE_STATUS_LABEL } from '../../util/academic/academicChangeLabels';
import { formatDate } from '../../util/format';

defineOptions({ name: 'AdminWithdrawalManagement' });

const STATUS_OPTIONS = [
  { value: '', label: '전체' },
  ...['PENDING', 'ADVISOR_APPROVED', 'ADVISOR_REJECTED', 'APPROVED', 'REJECTED', 'CANCELLED']
    .map((value) => ({ value, label: ACADEMIC_CHANGE_STATUS_LABEL[value] || value })),
];

const columns = [
  { key: 'student', label: '학생' },
  { key: 'reason', label: '신청 사유' },
  { key: 'requestedEffectiveDate', label: '희망일' },
  { key: 'status', label: '처리 상태' },
  { key: 'createdAt', label: '신청일' },
  { key: 'management', label: '관리' },
];

const allRequests = ref([]);
const page = ref({ page: 1, size: 20, totalCount: 0, hasNext: false });
const statusFilter = ref('');
const selectedRequest = ref(null);
const rejectReason = ref('');
const effectiveDate = ref('');
const formError = ref('');
const isLoading = ref(false);
const isLoadingDetail = ref(false);
const isProcessing = ref(false);

const createIdempotencyKey = (prefix) => {
  const suffix = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}-${suffix}`;
};

const filteredRequests = computed(() => (
  statusFilter.value ? allRequests.value.filter((item) => item.status === statusFilter.value) : allRequests.value
));

const load = async () => {
  isLoading.value = true;
  try {
    const response = await searchWithdrawals({ page: 1, size: 100 });
    const data = response.data.data;
    allRequests.value = data.items || [];
    page.value = { page: 1, size: data.size, totalCount: data.totalCount, hasNext: false };
  } catch (error) {
    allRequests.value = [];
    await notify(error.response?.data?.message || '자퇴 신청 목록을 불러오지 못했습니다.');
  } finally {
    isLoading.value = false;
  }
};

const selectRequest = async (withdrawalId) => {
  isLoadingDetail.value = true;
  rejectReason.value = '';
  effectiveDate.value = new Date().toISOString().slice(0, 10);
  formError.value = '';
  try {
    const response = await getWithdrawal(withdrawalId);
    selectedRequest.value = response.data.data;
  } catch (error) {
    await notify(error.response?.data?.message || '자퇴 신청 상세를 불러오지 못했습니다.');
  } finally {
    isLoadingDetail.value = false;
  }
};

const downloadAttachment = async () => {
  try {
    const response = await downloadWithdrawalAttachment(selectedRequest.value.id);
    const url = URL.createObjectURL(response.data);
    const link = document.createElement('a');
    link.href = url;
    link.download = selectedRequest.value.attachmentOriginalName;
    link.click();
    URL.revokeObjectURL(url);
  } catch {
    await notify('증빙 파일을 다운로드하지 못했습니다.');
  }
};

const decide = async (approved) => {
  if (!approved && !rejectReason.value.trim()) {
    formError.value = '반려 사유를 입력해 주세요.';
    return;
  }
  if (approved && !effectiveDate.value) {
    formError.value = '승인 처리일을 선택해 주세요.';
    return;
  }
  const action = approved ? '승인' : '반려';
  const confirmed = await confirmDialog(`이 자퇴 신청을 최종 ${action}하시겠습니까?`);
  if (!confirmed) return;

  isProcessing.value = true;
  try {
    await reviewWithdrawalByAdmin(
      selectedRequest.value.id,
      approved
        ? { approved: true, effectiveDate: effectiveDate.value }
        : { approved: false, rejectReason: rejectReason.value.trim() },
      createIdempotencyKey(`withdrawal-final-${approved ? 'approve' : 'reject'}`),
    );
    formError.value = '';
    await notify(`자퇴 신청을 최종 ${action}했습니다.`);
    await selectRequest(selectedRequest.value.id);
    await load();
  } catch (error) {
    await notify(error.response?.data?.message || `자퇴 최종 ${action} 처리 중 오류가 발생했습니다.`);
  } finally {
    isProcessing.value = false;
  }
};

onMounted(load);
</script>

<template>
  <MyPageContainer title="자퇴 관리" subtitle="지도교수 승인이 끝난 자퇴 신청을 최종 승인·반려합니다.">
    <section class="filter-card">
      <label>처리 상태<MySelect v-model="statusFilter" :options="STATUS_OPTIONS" /></label>
    </section>

    <div class="management-grid">
      <section class="list-card">
        <div class="section-title">
          <h3>자퇴 신청 목록</h3><span>총 {{ filteredRequests.length }}건</span>
        </div>
        <div class="table-scroll">
          <MyTable
            :columns="columns"
            :loading="isLoading"
            :empty="!isLoading && !filteredRequests.length"
            empty-message="자퇴 신청이 없습니다."
          >
            <tr
              v-for="item in filteredRequests"
              :key="item.id"
              :class="{ selected: selectedRequest?.id === item.id }"
            >
              <td>{{ item.studentName }}</td>
              <td class="reason-cell">{{ item.reason }}</td>
              <td>{{ item.requestedEffectiveDate || '-' }}</td>
              <td :class="{ rejected: ['ADVISOR_REJECTED', 'REJECTED'].includes(item.status) }">
                {{ ACADEMIC_CHANGE_STATUS_LABEL[item.status] || item.status }}
              </td>
              <td>{{ formatDate(item.createdAt) }}</td>
              <td>
                <MyButton color="white" size="small" content="선택" :disabled="isLoadingDetail" @click="selectRequest(item.id)" />
              </td>
            </tr>
          </MyTable>
        </div>
      </section>

      <aside class="detail-column">
        <section class="detail-card">
          <h3>선택한 신청 정보</h3>
          <p v-if="!selectedRequest" class="empty-detail">목록에서 신청을 선택해 주세요.</p>
          <dl v-else class="detail-list">
            <div><dt>신청자</dt><dd>{{ selectedRequest.studentName }}</dd></div>
            <div class="block"><dt>신청 사유</dt><dd>{{ selectedRequest.reason }}</dd></div>
            <div><dt>희망일</dt><dd>{{ selectedRequest.requestedEffectiveDate || '-' }}</dd></div>
            <div><dt>신청일</dt><dd>{{ formatDate(selectedRequest.createdAt) }}</dd></div>
            <div>
              <dt>현재 상태</dt>
              <dd :class="{ rejected: ['ADVISOR_REJECTED', 'REJECTED'].includes(selectedRequest.status) }">
                {{ ACADEMIC_CHANGE_STATUS_LABEL[selectedRequest.status] || selectedRequest.status }}
              </dd>
            </div>
            <div v-if="selectedRequest.advisorRejectReason" class="block"><dt>지도교수 반려 사유</dt><dd>{{ selectedRequest.advisorRejectReason }}</dd></div>
            <div v-if="selectedRequest.rejectReason" class="block"><dt>최종 반려 사유</dt><dd>{{ selectedRequest.rejectReason }}</dd></div>
            <div v-if="selectedRequest.cancelReason" class="block"><dt>취소 사유</dt><dd>{{ selectedRequest.cancelReason }}</dd></div>
          </dl>
        </section>

        <section v-if="selectedRequest?.attachmentOriginalName" class="detail-card">
          <h3>제출 증빙</h3>
          <button type="button" class="file-row" @click="downloadAttachment">
            <span>{{ selectedRequest.attachmentOriginalName }}</span><strong>다운로드</strong>
          </button>
        </section>

        <section v-if="selectedRequest?.status === 'ADVISOR_APPROVED'" class="detail-card action-card">
          <h3>최종 검토</h3>
          <label class="field-label" for="effective-date">승인 처리일 (희망일 이상)</label>
          <input id="effective-date" v-model="effectiveDate" type="date" class="date-input">
          <textarea
            v-model="rejectReason"
            maxlength="500"
            rows="3"
            placeholder="반려 시 사유를 입력하세요."
          />
          <p v-if="formError" class="form-error">{{ formError }}</p>
          <div class="decision-actions">
            <MyButton color="red" size="big" content="반려" :disabled="isProcessing" @click="decide(false)" />
            <MyButton class="admin-primary" color="deep-blue" size="big" content="승인" :disabled="isProcessing" @click="decide(true)" />
          </div>
        </section>
      </aside>
    </div>
  </MyPageContainer>
</template>

<style scoped>
.filter-card { display: flex; gap: 16px; align-items: end; padding: 20px; margin-bottom: 20px; border: 1px solid var(--personal-color-border-mist); border-radius: 10px; background: white; }
.filter-card label { display: flex; flex-direction: column; gap: 6px; font-size: .78rem; font-weight: 600; }
.admin-primary { background: var(--personal-color-admin-secondary-indigo); }
.management-grid { display: grid; grid-template-columns: minmax(0, 1.75fr) minmax(300px, .85fr); gap: 18px; }
.list-card, .detail-card { padding: 18px; border: 1px solid var(--personal-color-border-mist); border-radius: 10px; background: white; }
.section-title { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; }
.section-title h3, .detail-card h3 { margin: 0; font-size: 1rem; }
.section-title span { color: var(--personal-color-admin-secondary-indigo); font-size: .8rem; font-weight: 700; }
.table-scroll { overflow-x: auto; }
.reason-cell { max-width: 220px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.selected { background: var(--personal-color-indigo-soft-lavender); }
.rejected { color: var(--personal-color-danger-coral); }
.detail-column { display: flex; flex-direction: column; gap: 14px; }
.empty-detail { margin: 24px 0; color: var(--personal-color-text-muted-slate); text-align: center; }
.detail-list { margin: 12px 0 0; }
.detail-list div { display: grid; grid-template-columns: 90px 1fr; gap: 10px; padding: 8px 0; }
.detail-list div.block { grid-template-columns: 1fr; }
.detail-list dt { color: var(--personal-color-text-muted-slate); font-size: .8rem; }
.detail-list dd { margin: 0; text-align: right; font-size: .82rem; font-weight: 400; }
.detail-list div.block dd { text-align: left; font-weight: 400; }
.file-row { width: 100%; display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 8px; padding: 10px; border: 1px solid var(--personal-color-border-mist); border-radius: 5px; background: var(--personal-color-bg-surface-frost); cursor: pointer; text-align: left; }
.file-row span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.file-row strong { color: var(--personal-color-admin-secondary-indigo); font-size: .75rem; }
.field-label { display: block; margin-bottom: 6px; color: var(--personal-color-text-muted-slate); font-size: .8rem; font-weight: 600; }
.date-input { width: 100%; height: 38px; margin-bottom: 12px; padding: 0 10px; border: 1px solid var(--personal-color-border-mist); border-radius: 4px; }
.action-card textarea { width: 100%; padding: 9px; border: 1px solid var(--personal-color-border-mist); border-radius: 4px; resize: vertical; }
.form-error { color: var(--personal-color-danger-coral); font-size: .78rem; }
.decision-actions { display: flex; gap: 10px; margin-top: 12px; justify-content: flex-end; }
.decision-actions :deep(button) { width: auto; }
@media (max-width: 1100px) { .management-grid { grid-template-columns: 1fr; } }
</style>
