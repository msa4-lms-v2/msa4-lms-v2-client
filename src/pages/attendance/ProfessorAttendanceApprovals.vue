<script setup>
import { computed, onMounted, ref } from 'vue';
import { downloadExcuseAttachment, reviewExcuseRequest, searchExcuseRequests } from '../../api/attendanceApi';
import MyPageContainer from '../../components/layout/MyPageContainer.vue';
import MyButton from '../../components/button/MyButton.vue';
import MyModal from '../../components/common/MyModal.vue';
import MyTable from '../../components/table/MyTable.vue';
import MyStatusBadge from '../../components/common/MyStatusBadge.vue';
import PrevNextPagination from '../../components/pagination/PrevNextPagination.vue';
import { confirmDialog, notify } from '../../composables/useDialog';
import { formatDate } from '../../util/format';

defineOptions({ name: 'ProfessorAttendanceApprovals' });

const columns = [
  { key: 'student', label: '학생' },
  { key: 'course', label: '교과목' },
  { key: 'lectureDate', label: '결석일' },
  { key: 'reason', label: '신청 사유' },
  { key: 'attachment', label: '증빙' },
  { key: 'status', label: '처리 상태' },
  { key: 'createdAt', label: '신청일' },
  { key: 'management', label: '관리' },
];

const requests = ref([]);
const selectedStatus = ref('PENDING');
const page = ref({ page: 1, size: 20, totalCount: 0, hasNext: false });
const isLoading = ref(false);
const reviewTarget = ref(null);
const rejectReason = ref('');
const isReviewing = ref(false);
const downloadingRequestId = ref(null);

const statusOptions = [
  { value: 'PENDING', label: '승인 대기' },
  { value: 'APPROVED', label: '승인 완료' },
  { value: 'REJECTED', label: '반려' },
];
const statusLabels = { PENDING: '대기', APPROVED: '승인', REJECTED: '반려' };
const statusVariants = { PENDING: 'processing', APPROVED: 'success', REJECTED: 'fail' };
const emptyMessage = computed(() => `${statusOptions.find((item) => item.value === selectedStatus.value)?.label || ''} 공결 신청이 없습니다.`);

const createIdempotencyKey = (prefix) => {
  const suffix = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}-${suffix}`;
};

const load = async (pageNumber = 1) => {
  isLoading.value = true;
  try {
    const response = await searchExcuseRequests({ status: selectedStatus.value, page: pageNumber, size: 20 });
    const data = response.data.data;
    requests.value = data.items || [];
    page.value = { page: data.page, size: data.size, totalCount: data.totalCount, hasNext: data.hasNext };
  } catch (error) {
    requests.value = [];
    await notify(error.response?.data?.message || '공결 신청 목록을 불러오지 못했습니다.');
  } finally {
    isLoading.value = false;
  }
};

const changeStatus = (status) => {
  if (selectedStatus.value === status || isLoading.value) return;
  selectedStatus.value = status;
  reviewTarget.value = null;
  rejectReason.value = '';
  load(1);
};

const openReview = (request) => {
  reviewTarget.value = request;
  rejectReason.value = '';
};

const closeReview = () => {
  if (isReviewing.value) return;
  reviewTarget.value = null;
  rejectReason.value = '';
};

const downloadAttachment = async (request) => {
  if (!request.attachmentOriginalName || downloadingRequestId.value) return;
  downloadingRequestId.value = request.id;
  try {
    const response = await downloadExcuseAttachment(request.id);
    const url = URL.createObjectURL(response.data);
    const link = document.createElement('a');
    link.href = url;
    link.download = request.attachmentOriginalName;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  } catch (error) {
    await notify(error.response?.data?.message || '증빙 파일을 다운로드하지 못했습니다.');
  } finally {
    downloadingRequestId.value = null;
  }
};

const approve = async () => {
  if (isReviewing.value || !reviewTarget.value || reviewTarget.value.status !== 'PENDING') return;
  const confirmed = await confirmDialog('이 공결 신청을 승인하시겠습니까?');
  if (!confirmed) return;

  isReviewing.value = true;
  try {
    await reviewExcuseRequest(reviewTarget.value.id, 'APPROVED', null, createIdempotencyKey('excuse-approve'));
    await notify('승인 처리되었습니다.');
    reviewTarget.value = null;
    rejectReason.value = '';
    await load(page.value.page);
  } catch (error) {
    await notify(error.response?.data?.message || '승인 처리 중 오류가 발생했습니다.');
  } finally {
    isReviewing.value = false;
  }
};

const reject = async () => {
  if (isReviewing.value || !reviewTarget.value || reviewTarget.value.status !== 'PENDING') return;
  if (!rejectReason.value.trim()) {
    await notify('반려 사유를 입력해 주세요.');
    return;
  }

  isReviewing.value = true;
  try {
    await reviewExcuseRequest(
      reviewTarget.value.id,
      'REJECTED',
      rejectReason.value.trim(),
      createIdempotencyKey('excuse-reject'),
    );
    await notify('반려 처리되었습니다.');
    reviewTarget.value = null;
    rejectReason.value = '';
    await load(page.value.page);
  } catch (error) {
    await notify(error.response?.data?.message || '반려 처리 중 오류가 발생했습니다.');
  } finally {
    isReviewing.value = false;
  }
};

onMounted(() => load());
</script>

<template>
  <MyPageContainer title="출결 승인" subtitle="담당 강의 학생의 공결 신청을 승인·반려합니다.">
    <div class="status-tabs" role="tablist" aria-label="공결 처리 상태">
      <button
        v-for="option in statusOptions"
        :key="option.value"
        type="button"
        role="tab"
        :aria-selected="selectedStatus === option.value"
        :class="['status-tab', { active: selectedStatus === option.value }]"
        @click="changeStatus(option.value)"
      >
        {{ option.label }}
      </button>
    </div>

    <MyTable
      :columns="columns"
      :loading="isLoading"
      :empty="!isLoading && requests.length === 0"
      :empty-message="emptyMessage"
    >
      <tr v-for="item in requests" :key="item.id">
        <td>{{ item.studentName }}</td>
        <td>
          <div class="course-name">{{ item.courseName }}</div>
          <div class="course-code">{{ item.courseCode }} · {{ item.sectionNo }}분반</div>
        </td>
        <td>{{ formatDate(item.lectureDate) }} {{ item.period }}교시</td>
        <td class="reason-cell" :title="item.reason">{{ item.reason }}</td>
        <td>
          <button
            v-if="item.attachmentOriginalName"
            type="button"
            class="attachment-button"
            :disabled="downloadingRequestId === item.id"
            @click="downloadAttachment(item)"
          >
            {{ downloadingRequestId === item.id ? '받는 중...' : item.attachmentOriginalName }}
          </button>
          <span v-else>-</span>
        </td>
        <td>
          <MyStatusBadge :label="statusLabels[item.status] || item.status" :variant="statusVariants[item.status] || 'processing'" />
        </td>
        <td>{{ formatDate(item.createdAt, 'YYYY-MM-DD HH:mm') }}</td>
        <td>
          <MyButton
            btn-type="button"
            :color="item.status === 'PENDING' ? 'deep-blue' : 'white'"
            size="small"
            :content="item.status === 'PENDING' ? '검토' : '상세'"
            @click="openReview(item)"
          />
        </td>
      </tr>
    </MyTable>

    <PrevNextPagination
      v-if="page.page > 1 || page.hasNext"
      :page="page.page"
      :has-next="page.hasNext"
      @page-change="load"
    />

    <MyModal :is-open="Boolean(reviewTarget)" title="공결 신청 검토" max-width="520px" @close="closeReview">
      <template v-if="reviewTarget">
        <dl class="detail-list">
          <div class="detail-row">
            <dt>학생</dt>
            <dd>{{ reviewTarget.studentName }}</dd>
          </div>
          <div class="detail-row">
            <dt>교과목</dt>
            <dd>{{ reviewTarget.courseName }} ({{ reviewTarget.sectionNo }}분반)</dd>
          </div>
          <div class="detail-row">
            <dt>결석일</dt>
            <dd>{{ formatDate(reviewTarget.lectureDate) }} {{ reviewTarget.period }}교시</dd>
          </div>
          <div class="detail-row">
            <dt>신청 사유</dt>
            <dd>{{ reviewTarget.reason }}</dd>
          </div>
          <div v-if="reviewTarget.attachmentOriginalName" class="detail-row">
            <dt>증빙 파일</dt>
            <dd>
              <button type="button" class="attachment-button" @click="downloadAttachment(reviewTarget)">
                {{ downloadingRequestId === reviewTarget.id ? '받는 중...' : reviewTarget.attachmentOriginalName }}
              </button>
            </dd>
          </div>
          <div class="detail-row">
            <dt>처리 상태</dt>
            <dd>
              <MyStatusBadge :label="statusLabels[reviewTarget.status] || reviewTarget.status" :variant="statusVariants[reviewTarget.status] || 'processing'" />
            </dd>
          </div>
          <div v-if="reviewTarget.status === 'REJECTED' && reviewTarget.rejectReason" class="detail-row">
            <dt>반려 사유</dt>
            <dd>{{ reviewTarget.rejectReason }}</dd>
          </div>
        </dl>
        <div v-if="reviewTarget.status === 'PENDING'" class="review-area">
          <textarea v-model="rejectReason" rows="2" maxlength="500" placeholder="반려 시 사유를 입력해 주세요."></textarea>
          <span class="text-counter">{{ rejectReason.length }} / 500</span>
        </div>
      </template>

      <template #footer>
        <MyButton color="gray" size="small" content="닫기" :disabled="isReviewing" @click="closeReview" />
        <MyButton v-if="reviewTarget?.status === 'PENDING'" color="red" size="small" content="반려" :disabled="isReviewing" @click="reject" />
        <MyButton v-if="reviewTarget?.status === 'PENDING'" color="deep-blue" size="small" content="승인" :disabled="isReviewing" @click="approve" />
      </template>
    </MyModal>
  </MyPageContainer>
</template>

<style scoped>
.status-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  padding: 6px;
  width: fit-content;
  border: 1px solid var(--personal-color-border-mist);
  border-radius: 8px;
  background: var(--personal-color-white);
}

.status-tab {
  min-width: 92px;
  height: 36px;
  padding: 0 16px;
  border: 0;
  border-radius: 4px;
  color: var(--personal-color-text-muted-slate);
  background: transparent;
  font: inherit;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
}

.status-tab.active {
  color: var(--personal-color-white);
  background: var(--personal-color-professor-primary-navy);
}

.course-name {
  font-weight: 600;
}

.course-code {
  margin-top: 2px;
  color: var(--personal-color-text-muted-slate);
  font-size: 0.78rem;
}

.reason-cell {
  max-width: 220px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.attachment-button {
  max-width: 180px;
  padding: 0;
  overflow: hidden;
  border: 0;
  color: var(--personal-color-secondary-blue);
  background: transparent;
  font: inherit;
  font-size: 0.82rem;
  text-decoration: underline;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: pointer;
}

.attachment-button:disabled {
  color: var(--personal-color-text-faint-fog);
  cursor: wait;
}

.detail-list {
  display: flex;
  flex-direction: column;
}

.detail-row {
  display: grid;
  grid-template-columns: minmax(88px, 0.32fr) minmax(0, 1fr);
  padding: 10px 0;
  border-bottom: 1px solid var(--personal-color-border-mist);
}

.detail-row dt {
  color: var(--personal-color-text-muted-slate);
}

.detail-row dd {
  margin: 0;
}

.review-area {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  margin-top: 16px;
}

.review-area textarea {
  width: 100%;
  box-sizing: border-box;
  padding: 8px 12px;
  border: 1px solid var(--personal-color-border-mist);
  border-radius: 4px;
  font-size: 0.9rem;
  font-family: inherit;
  resize: vertical;
}

.text-counter {
  margin-top: 4px;
  color: var(--personal-color-text-faint-fog);
  font-size: 0.75rem;
}

@media (max-width: 620px) {
  .status-tabs {
    width: 100%;
    box-sizing: border-box;
  }

  .status-tab {
    flex: 1;
    min-width: 0;
    padding: 0 8px;
  }
}
</style>
