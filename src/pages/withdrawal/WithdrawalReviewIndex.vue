<script setup>
import { computed, onMounted, ref } from 'vue';
import {
  downloadWithdrawalAttachment,
  getWithdrawal,
  reviewWithdrawalByAdmin,
  reviewWithdrawalByAdvisor,
  searchWithdrawals,
} from '../../api/withdrawalApi';
import ProfessorApplicationDetail from '../../components/academic/ProfessorApplicationDetail.vue';
import { useProfessorRequestDetail } from '../../composables/useProfessorRequestDetail';
import MyButton from '../../components/button/MyButton.vue';
import MySelect from '../../components/input/MySelect.vue';
import MyPageContainer from '../../components/layout/MyPageContainer.vue';
import NumberedPagination from '../../components/pagination/NumberedPagination.vue';
import MyTable from '../../components/table/MyTable.vue';
import { confirmDialog, notify } from '../../composables/useDialog';
import { useAuthStore } from '../../store/auth/useAuthStore';
import { formatDate } from '../../util/format';

defineOptions({ name: 'WithdrawalReviewIndex' });

const PAGE_SIZE = 20;
const FETCH_SIZE = 100;
const columns = [
  { key: 'id', label: '신청번호' },
  { key: 'studentId', label: '학생 ID' },
  { key: 'studentName', label: '이름' },
  { key: 'createdAt', label: '신청일' },
  { key: 'requestedEffectiveDate', label: '희망 처리일' },
  { key: 'status', label: '처리 상태' },
  { key: 'management', label: '관리' },
];
const statusOptions = [
  { value: '', label: '전체' },
  { value: 'PENDING', label: '지도교수 검토 대기' },
  { value: 'ADVISOR_APPROVED', label: '최종 승인 대기' },
  { value: 'ADVISOR_REJECTED', label: '지도교수 반려' },
  { value: 'APPROVED', label: '승인 완료' },
  { value: 'REJECTED', label: '최종 반려' },
  { value: 'CANCELLED', label: '신청 취소' },
];
const statusLabels = Object.fromEntries(statusOptions.filter((item) => item.value).map((item) => [item.value, item.label]));

const authStore = useAuthStore();
const requests = ref([]);
const filters = ref({ keyword: '', status: '' });
const appliedFilters = ref({ keyword: '', status: '' });
const page = ref(1);
const isLoading = ref(false);
const isProcessing = ref(false);
const rejectReason = ref('');
const formError = ref('');

const isAdmin = computed(() => authStore.userInfo?.role === 'ADMIN');
const pageTitle = computed(() => (isAdmin.value ? '자퇴 신청 관리' : detailId.value ? '자퇴 지도교수 검토 · 상세' : '자퇴 지도교수 검토'));
const filteredRequests = computed(() => {
  const keyword = appliedFilters.value.keyword.trim().toLowerCase();
  return requests.value.filter((item) => {
    const matchesStatus = !appliedFilters.value.status || item.status === appliedFilters.value.status;
    const matchesKeyword = !keyword
      || item.studentName?.toLowerCase().includes(keyword)
      || String(item.studentId).includes(keyword);
    return matchesStatus && matchesKeyword;
  });
});
const visibleRequests = computed(() => {
  const start = (page.value - 1) * PAGE_SIZE;
  return filteredRequests.value.slice(start, start + PAGE_SIZE);
});

const statusLabel = (status) => statusLabels[status] || status || '-';
const statusClass = (status) => ({
  'status-approved': ['ADVISOR_APPROVED', 'APPROVED'].includes(status),
  'status-rejected': ['ADVISOR_REJECTED', 'REJECTED', 'CANCELLED'].includes(status),
  'status-pending': status === 'PENDING',
});
const advisorReviewClass = (request) => ({
  'status-approved': !request.advisorRejectReason,
  'status-rejected': Boolean(request.advisorRejectReason),
});
const formatFileSize = (size) => {
  if (!Number.isFinite(Number(size))) return '-';
  if (Number(size) < 1024) return `${size} B`;
  if (Number(size) < 1024 * 1024) return `${(Number(size) / 1024).toFixed(1)} KB`;
  return `${(Number(size) / (1024 * 1024)).toFixed(1)} MB`;
};
const currentKoreanDate = () => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
};
const canApproveToday = computed(() => {
  const requestedDate = selectedRequest.value?.requestedEffectiveDate;
  return !requestedDate || requestedDate <= currentKoreanDate();
});
const canReview = computed(() => {
  if (!selectedRequest.value) return false;
  return isAdmin.value
    ? selectedRequest.value.status === 'ADVISOR_APPROVED'
    : selectedRequest.value.status === 'PENDING';
});

const getWithdrawalId = (request) => request?.id ?? request?.withdrawalId ?? request?.withdrawalRequestId;

const createIdempotencyKey = (prefix) => {
  const suffix = globalThis.crypto?.randomUUID?.()
    || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}-${suffix}`;
};

const loadRequests = async () => {
  isLoading.value = true;
  try {
    const firstResponse = await searchWithdrawals({ page: 1, size: FETCH_SIZE });
    const firstPage = firstResponse.data.data;
    const totalPages = Math.ceil(firstPage.totalCount / FETCH_SIZE);
    const remainingResponses = totalPages > 1
      ? await Promise.all(Array.from({ length: totalPages - 1 }, (_, index) =>
        searchWithdrawals({ page: index + 2, size: FETCH_SIZE })))
      : [];
    requests.value = [
      ...(firstPage.items || []),
      ...remainingResponses.flatMap((response) => response.data.data.items || []),
    ];
  } catch (error) {
    requests.value = [];
    await notify(error.response?.data?.message || '자퇴 신청 목록을 불러오지 못했습니다.');
  } finally {
    isLoading.value = false;
  }
};

const applyFilters = () => {
  appliedFilters.value = { ...filters.value };
  page.value = 1;
};

const resetFilters = () => {
  filters.value = { keyword: '', status: '' };
  appliedFilters.value = { keyword: '', status: '' };
  page.value = 1;
};

const resetReviewForm = () => {
  rejectReason.value = '';
  formError.value = '';
};

const { detailId, selectedRequest, isLoadingDetail, detailError, openDetail, closeDetail } = useProfessorRequestDetail({
  fetchRequest: getWithdrawal,
  resetForm: resetReviewForm,
});
const studentFields = computed(() => {
  const item = selectedRequest.value || {};
  return [
    { label: '이름', value: item.studentName }, { label: '학번', value: item.studentNumber }, { label: '소속 단과대학', value: item.collegeName },
    { label: '소속 학과', value: item.departmentName }, { label: '학년', value: item.gradeLevel ? item.gradeLevel + '학년' : undefined },
    { label: '학적 상태', value: item.academicStatusName },
  ];
});
const applicationFields = computed(() => {
  const item = selectedRequest.value || {};
  return [
    { label: '신청 유형', value: '자퇴' }, { label: '신청번호', value: item.id }, { label: '신청일', value: formatDate(item.createdAt) },
    { label: '희망 처리일', value: formatDate(item.requestedEffectiveDate) }, { label: '희망 학과', value: '해당 없음' },
    { label: '처리 상태', value: statusLabel(item.status) },
  ];
});

const selectRequest = async (withdrawalId) => {
  if (!isAdmin.value) return openDetail(withdrawalId);
  isLoadingDetail.value = true;
  resetReviewForm();
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
  const requestId = getWithdrawalId(selectedRequest.value);
  if (!requestId || !selectedRequest.value?.attachmentOriginalName) return;
  try {
    const response = await downloadWithdrawalAttachment(requestId);
    const url = URL.createObjectURL(response.data);
    const link = document.createElement('a');
    link.href = url;
    link.download = selectedRequest.value.attachmentOriginalName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  } catch (error) {
    await notify(error.response?.data?.message || '증빙 파일을 다운로드하지 못했습니다.');
  }
};

const updateLocalRequest = (updated) => {
  const updatedId = getWithdrawalId(updated);
  const index = requests.value.findIndex((item) => getWithdrawalId(item) === updatedId);
  if (index >= 0) requests.value.splice(index, 1, updated);
  if (getWithdrawalId(selectedRequest.value) === updatedId) selectedRequest.value = updated;
};

const processReview = async (approved) => {
  if (!selectedRequest.value || isProcessing.value) return;
  const requestId = getWithdrawalId(selectedRequest.value);
  if (!requestId) {
    formError.value = '신청 번호를 확인할 수 없습니다. 목록에서 다시 선택해 주세요.';
    return;
  }

  const reason = rejectReason.value.trim();
  if (!approved && !reason) {
    formError.value = '반려 사유를 입력해 주세요.';
    return;
  }
  if (isAdmin.value && approved && !canApproveToday.value) {
    formError.value = `희망 처리일인 ${selectedRequest.value.requestedEffectiveDate}부터 승인할 수 있습니다.`;
    return;
  }

  const actionName = approved ? '승인' : '반려';
  const targetName = isAdmin.value ? '최종 처리' : '지도교수 검토';
  if (!await confirmDialog(`이 자퇴 신청을 ${actionName}하시겠습니까?`)) return;
  if (isProcessing.value || getWithdrawalId(selectedRequest.value) !== requestId) return;
  if (!canReview.value) {
    formError.value = '현재 상태에서는 검토할 수 없습니다.';
    return;
  }

  isProcessing.value = true;
  formError.value = '';
  try {
    const response = isAdmin.value
      ? await reviewWithdrawalByAdmin(
        requestId,
        {
          approved,
          effectiveDate: approved ? currentKoreanDate() : null,
          rejectReason: approved ? null : reason,
        },
        createIdempotencyKey('withdrawal-final-review'),
      )
      : await reviewWithdrawalByAdvisor(
        requestId,
        { approved, rejectReason: approved ? null : reason },
        createIdempotencyKey('withdrawal-advisor-review'),
      );
    updateLocalRequest(response.data.data);
    resetReviewForm();
    await notify(`${targetName} ${actionName}이 완료되었습니다.`);
  } catch (error) {
    await notify(error.response?.data?.message || `자퇴 신청 ${actionName} 처리 중 오류가 발생했습니다.`);
  } finally {
    isProcessing.value = false;
  }
};

onMounted(loadRequests);
</script>

<template>
  <MyPageContainer
    :title="pageTitle"
    :class="{ 'professor-review professor-page': !isAdmin }"
  >
    <section v-if="isAdmin || !detailId" class="filter-card">
      <label>
        신청자
        <input
          v-model="filters.keyword"
          type="search"
          placeholder="이름·학생 ID"
          @keyup.enter="applyFilters"
        >
      </label>
      <label>
        진행 상태
        <MySelect
          v-model="filters.status"
          :options="statusOptions"
        />
      </label>
      <div class="filter-actions">
        <MyButton
          :class="isAdmin ? 'admin-primary' : 'professor-primary'"
          color="deep-blue"
          size="middle"
          content="조회"
          @click="applyFilters"
        />
        <MyButton
          :class="['reset-action', isAdmin ? 'admin-secondary' : 'professor-secondary']"
          color="white"
          size="middle"
          content="초기화"
          @click="resetFilters"
        />
      </div>
    </section>

    <div class="review-grid">
      <section v-if="isAdmin || !detailId" class="list-card">
        <div class="section-title">
          <h3>자퇴 신청 목록</h3>
          <span :class="isAdmin ? 'admin-text' : 'professor-text'">총 {{ filteredRequests.length }}건</span>
        </div>
        <div class="table-scroll">
          <MyTable
            :columns="columns"
            :loading="isLoading"
            :empty="!isLoading && !visibleRequests.length"
            empty-message="조건에 맞는 자퇴 신청이 없습니다."
          >
            <tr
              v-for="item in visibleRequests"
              :key="item.id"
              :class="{ selected: selectedRequest?.id === item.id }"
            >
              <td>{{ item.id }}</td>
              <td>{{ item.studentId }}</td>
              <td>{{ item.studentName }}</td>
              <td>{{ formatDate(item.createdAt) }}</td>
              <td>{{ formatDate(item.requestedEffectiveDate) }}</td>
              <td>
                <span :class="statusClass(item.status)">{{ statusLabel(item.status) }}</span>
              </td>
              <td>
                <MyButton
                  :class="isAdmin ? 'admin-secondary' : 'professor-secondary'"
                  color="white"
                  size="small"
                  :content="isAdmin ? '선택' : '상세'"
                  :disabled="isLoadingDetail"
                  @click="selectRequest(item.id)"
                />
              </td>
            </tr>
          </MyTable>
        </div>
        <NumberedPagination
          v-if="filteredRequests.length > PAGE_SIZE"
          :page="page"
          :total-count="filteredRequests.length"
          :size="PAGE_SIZE"
          :color="isAdmin ? 'admin-indigo' : 'professor-navy'"
          @page-change="page = $event"
        />
      </section>

      <aside v-if="isAdmin" class="detail-column">
        <section class="detail-card">
          <h3>선택한 신청 정보</h3>
          <p
            v-if="!selectedRequest"
            class="empty-detail"
          >
            목록에서 신청을 선택해 주세요.
          </p>
          <template v-else>
            <dl class="detail-list">
              <div><dt>신청자</dt><dd>{{ selectedRequest.studentName }} (ID {{ selectedRequest.studentId }})</dd></div>
              <div><dt>신청일</dt><dd>{{ formatDate(selectedRequest.createdAt, 'YYYY-MM-DD HH:mm') }}</dd></div>
              <div><dt>희망 처리일</dt><dd>{{ formatDate(selectedRequest.requestedEffectiveDate) }}</dd></div>
              <div><dt>현재 상태</dt><dd><span :class="statusClass(selectedRequest.status)">{{ statusLabel(selectedRequest.status) }}</span></dd></div>
            </dl>
            <div class="reason-box">
              <strong>신청 사유</strong>
              <p>{{ selectedRequest.reason }}</p>
            </div>
          </template>
        </section>

        <section
          v-if="selectedRequest?.attachmentOriginalName"
          class="detail-card"
        >
          <h3>증빙 파일</h3>
          <button
            type="button"
            class="file-row"
            @click="downloadAttachment"
          >
            <span>{{ selectedRequest.attachmentOriginalName }}</span>
            <small>{{ formatFileSize(selectedRequest.attachmentSize) }}</small>
            <strong :class="isAdmin ? 'admin-text' : 'professor-text'">다운로드</strong>
          </button>
        </section>

        <section
          v-if="selectedRequest?.advisorReviewedAt"
          class="detail-card"
        >
          <h3>지도교수 검토 내역</h3>
          <dl class="detail-list">
            <div>
              <dt>처리 상태</dt>
              <dd><span :class="advisorReviewClass(selectedRequest)">{{ selectedRequest.advisorRejectReason ? '반려' : '승인' }}</span></dd>
            </div>
            <div><dt>검토자 ID</dt><dd>{{ selectedRequest.advisorReviewedBy || '-' }}</dd></div>
            <div><dt>검토 시각</dt><dd>{{ formatDate(selectedRequest.advisorReviewedAt, 'YYYY-MM-DD HH:mm') }}</dd></div>
          </dl>
          <div
            v-if="selectedRequest.advisorRejectReason"
            class="reason-box"
          >
            <strong>반려 사유</strong>
            <p>{{ selectedRequest.advisorRejectReason }}</p>
          </div>
        </section>

        <section
          v-if="selectedRequest?.processedAt || selectedRequest?.cancelledAt"
          class="detail-card"
        >
          <h3>{{ selectedRequest.cancelledAt ? '신청 취소 내역' : '최종 처리 내역' }}</h3>
          <dl class="detail-list">
            <div><dt>처리 상태</dt><dd><span :class="statusClass(selectedRequest.status)">{{ statusLabel(selectedRequest.status) }}</span></dd></div>
            <div v-if="selectedRequest.processedBy">
              <dt>처리자 ID</dt>
              <dd>{{ selectedRequest.processedBy }}</dd>
            </div>
            <div v-if="selectedRequest.effectiveDate">
              <dt>자퇴 적용일</dt>
              <dd>{{ formatDate(selectedRequest.effectiveDate) }}</dd>
            </div>
            <div><dt>처리 시각</dt><dd>{{ formatDate(selectedRequest.processedAt || selectedRequest.cancelledAt, 'YYYY-MM-DD HH:mm') }}</dd></div>
          </dl>
          <div
            v-if="selectedRequest.rejectReason || selectedRequest.cancelReason"
            class="reason-box"
          >
            <strong>{{ selectedRequest.cancelReason ? '취소 사유' : '반려 사유' }}</strong>
            <p>{{ selectedRequest.cancelReason || selectedRequest.rejectReason }}</p>
          </div>
        </section>

        <section
          v-if="canReview"
          class="detail-card action-card"
        >
          <h3>{{ isAdmin ? '최종 승인 처리' : '지도교수 검토' }}</h3>
          <p v-if="isAdmin">
            승인하면 오늘 날짜로 자퇴가 적용됩니다. 학생의 학적과 진행 중인 휴·복학 신청을 함께 확인해 주세요.
          </p>
          <p v-else>
            자퇴 전 상담 내용을 확인한 뒤 승인하거나 반려해 주세요.
          </p>
          <p
            v-if="isAdmin && !canApproveToday"
            class="approval-guide"
          >
            희망 처리일인 {{ selectedRequest.requestedEffectiveDate }}부터 승인할 수 있습니다.
          </p>
          <textarea
            v-model="rejectReason"
            maxlength="500"
            rows="3"
            placeholder="반려하는 경우 사유를 입력해 주세요."
          />
          <p
            v-if="formError"
            class="form-error"
            role="alert"
          >
            {{ formError }}
          </p>
          <div class="decision-actions">
            <MyButton
              color="red"
              size="big"
              content="반려"
              :disabled="isProcessing"
              @click="processReview(false)"
            />
            <MyButton
              :class="isAdmin ? 'admin-primary' : 'professor-primary'"
              color="deep-blue"
              size="big"
              content="승인"
              :disabled="isProcessing || (isAdmin && !canApproveToday)"
              @click="processReview(true)"
            />
          </div>
        </section>
      </aside>
      <div v-if="!isAdmin && detailId" :aria-busy="isLoadingDetail">
        <p v-if="isLoadingDetail" role="status">신청 정보를 불러오는 중입니다.</p>
        <template v-else-if="detailError"><p class="form-error" role="alert">{{ detailError }}</p><MyButton color="white" size="middle" content="목록" @click="closeDetail" /></template>
        <ProfessorApplicationDetail v-else-if="selectedRequest" v-model:review-reason="rejectReason" :student-fields="studentFields" :application-fields="applicationFields" :reason="selectedRequest.reason" :reviewable="canReview" :busy="isProcessing" :error="formError" @back="closeDetail" @approve="processReview(true)" @reject="processReview(false)">
          <template #files><button v-if="selectedRequest.attachmentOriginalName" type="button" class="file-row" @click="downloadAttachment"><span>{{ selectedRequest.attachmentOriginalName }}</span><small>{{ formatFileSize(selectedRequest.attachmentSize) }}</small><strong>다운로드</strong></button><p v-else>첨부된 증빙 서류가 없습니다.</p></template>
          <template v-if="selectedRequest.advisorReviewedAt" #history><section class="detail-card"><h3>지도교수 검토 내역</h3><p>{{ formatDate(selectedRequest.advisorReviewedAt, 'YYYY-MM-DD HH:mm') }}</p><p>{{ selectedRequest.advisorRejectReason || '승인' }}</p></section></template>
        </ProfessorApplicationDetail>
      </div>
    </div>
  </MyPageContainer>
</template>

<style scoped>
.professor-review .review-grid { grid-template-columns: minmax(0, 1fr); }
.professor-review .list-card {
  padding: 0;
  border: 0;
  border-radius: 0;
  background: transparent;
}
.filter-card {
  display: grid;
  grid-template-columns: 1.2fr 1fr auto;
  gap: 16px;
  align-items: end;
  padding: 20px;
  border: 1px solid var(--personal-color-border-mist);
  border-radius: 8px;
  background: var(--personal-color-white);
}
.filter-card label { display: flex; flex-direction: column; gap: 6px; font-size: .78rem; font-weight: 600; }
.filter-card input { height: 38px; padding: 0 12px; border: 1px solid var(--personal-color-border-mist); border-radius: 4px; background: var(--personal-color-white); }
.filter-actions { display: flex; gap: 8px; }
.professor-review .filter-card { grid-template-columns: repeat(2, minmax(140px, 220px)) 1fr; }
.professor-review .filter-actions { justify-content: flex-end; }
@media (max-width: 620px) {
  .professor-review .filter-card { grid-template-columns: 1fr; }
}
.professor-primary { background: var(--personal-color-primary-navy); }
.admin-primary { background: var(--personal-color-admin-secondary-indigo); }
.professor-text { color: var(--personal-color-professor-primary-navy); }
.admin-text { color: var(--personal-color-admin-secondary-indigo); }
.review-grid { display: grid; grid-template-columns: minmax(0, 1.75fr) minmax(310px, .85fr); gap: 18px; margin-top: 20px; }
.list-card, .detail-card { padding: 18px; border: 1px solid var(--personal-color-border-mist); border-radius: 8px; background: var(--personal-color-white); }
.section-title { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; }
.section-title h3, .detail-card h3 { margin: 0; font-size: 1rem; }
.section-title span { font-size: .8rem; font-weight: 700; }
.table-scroll { overflow-x: auto; }
.selected { background: var(--personal-color-indigo-soft-lavender); }
.status-approved { color: var(--personal-color-status-success-text-forest); font-weight: 600; }
.status-rejected { color: var(--personal-color-status-fail-text-maroon); font-weight: 600; }
.status-pending { color: var(--personal-color-status-processing-text-navy); font-weight: 600; }
.detail-column { display: flex; flex-direction: column; gap: 14px; }
.empty-detail { margin: 24px 0; color: var(--personal-color-text-muted-slate); text-align: center; }
.detail-list { margin: 12px 0 0; }
.detail-list div { display: grid; grid-template-columns: 90px 1fr; gap: 10px; padding: 8px 0; }
.detail-list dt { color: var(--personal-color-text-muted-slate); font-size: .8rem; }
.detail-list dd { margin: 0; text-align: right; font-size: .82rem; font-weight: 600; }
.reason-box { margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--personal-color-border-mist); }
.reason-box strong { font-size: .8rem; }
.reason-box p { margin: 7px 0 0; color: var(--personal-color-text-secondary-steel); font-size: .82rem; line-height: 1.55; white-space: pre-wrap; overflow-wrap: anywhere; }
.file-row { width: 100%; display: grid; grid-template-columns: minmax(0, 1fr) auto auto; gap: 8px; margin-top: 10px; padding: 10px; border: 1px solid var(--personal-color-border-mist); border-radius: 5px; background: var(--personal-color-bg-surface-frost); cursor: pointer; text-align: left; }
.file-row span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.file-row small { color: var(--personal-color-text-muted-slate); }
.file-row strong { font-size: .75rem; }
.action-card > p { color: var(--personal-color-text-muted-slate); font-size: .8rem; line-height: 1.5; }
.action-card .approval-guide, .form-error { color: var(--personal-color-danger-coral); }
.action-card textarea { width: 100%; margin-top: 8px; padding: 9px; border: 1px solid var(--personal-color-border-mist); border-radius: 4px; resize: vertical; }
.form-error { margin: 8px 0 0; font-size: .78rem; }
.decision-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 12px; }
@media (max-width: 1050px) { .review-grid { grid-template-columns: 1fr; } }
@media (max-width: 620px) { .filter-card { grid-template-columns: 1fr; } .filter-actions { justify-content: flex-end; } }
</style>
