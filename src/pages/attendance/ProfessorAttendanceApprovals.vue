<script setup>
import { computed, onMounted, ref } from 'vue';
import { downloadExcuseAttachment, reviewExcuseRequest, searchExcuseRequests } from '../../api/attendanceApi';
import MyButton from '../../components/button/MyButton.vue';
import MyModal from '../../components/common/MyModal.vue';
import MyPageContainer from '../../components/layout/MyPageContainer.vue';
import MyTable from '../../components/table/MyTable.vue';
import PrevNextPagination from '../../components/pagination/PrevNextPagination.vue';
import { confirmDialog, notify } from '../../composables/useDialog';
import { formatDate } from '../../util/format';

defineOptions({ name: 'ProfessorAttendanceApprovals' });

const STATUS_LABELS = {
  PENDING: '대기',
  APPROVED: '승인',
  REJECTED: '반려',
};

const statusOptions = [
  { value: 'PENDING', label: '승인 대기' },
  { value: 'APPROVED', label: '승인 완료' },
  { value: 'REJECTED', label: '반려' },
];

const columns = [
  { key: 'studentName', label: '학생' },
  { key: 'enrollmentId', label: '수강 ID' },
  { key: 'courseName', label: '과목' },
  { key: 'lectureDate', label: '신청 날짜' },
  { key: 'reason', label: '사유' },
  { key: 'attachment', label: '첨부파일' },
  { key: 'action', label: '처리' },
];

const requests = ref([]);
const selectedStatus = ref('PENDING');
const page = ref({ page: 1, size: 20, totalCount: 0, hasNext: false });
const isLoading = ref(false);
const isReviewing = ref(false);
const downloadingRequestId = ref(null);
const rejectTarget = ref(null);
const rejectReason = ref('');

const emptyMessage = computed(() => {
  const label = statusOptions.find((option) => option.value === selectedStatus.value)?.label || '';
  return `${label} 공결 신청이 없습니다.`;
});

const createIdempotencyKey = (prefix) => {
  const suffix = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}-${suffix}`;
};

const load = async (pageNumber = 1) => {
  isLoading.value = true;
  try {
    const response = await searchExcuseRequests({
      status: selectedStatus.value,
      page: pageNumber,
      size: 20,
    });
    const data = response.data.data;
    requests.value = data.items || [];
    page.value = {
      page: data.page,
      size: data.size,
      totalCount: data.totalCount,
      hasNext: data.hasNext,
    };
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
  load(1);
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

const approve = async (request) => {
  if (isReviewing.value || request.status !== 'PENDING') return;
  const confirmed = await confirmDialog('이 공결 신청을 승인하시겠습니까? 승인하면 실제 출결 기록도 공결로 변경됩니다.');
  if (!confirmed) return;

  isReviewing.value = true;
  try {
    await reviewExcuseRequest(request.id, 'APPROVED', null, createIdempotencyKey('excuse-approve'));
    await notify('공결 신청을 승인했습니다.');
    await load(page.value.page);
  } catch (error) {
    await notify(error.response?.data?.message || '공결 승인 중 오류가 발생했습니다.');
  } finally {
    isReviewing.value = false;
  }
};

const openReject = (request) => {
  rejectTarget.value = request;
  rejectReason.value = '';
};

const closeReject = () => {
  if (isReviewing.value) return;
  rejectTarget.value = null;
  rejectReason.value = '';
};

const reject = async () => {
  if (isReviewing.value || !rejectTarget.value) return;
  if (!rejectReason.value.trim()) {
    await notify('반려 사유를 입력해 주세요.');
    return;
  }

  isReviewing.value = true;
  try {
    await reviewExcuseRequest(
      rejectTarget.value.id,
      'REJECTED',
      rejectReason.value.trim(),
      createIdempotencyKey('excuse-reject'),
    );
    await notify('공결 신청을 반려했습니다.');
    rejectTarget.value = null;
    rejectReason.value = '';
    await load(page.value.page);
  } catch (error) {
    await notify(error.response?.data?.message || '공결 반려 중 오류가 발생했습니다.');
  } finally {
    isReviewing.value = false;
  }
};

onMounted(() => load());
</script>

<template>
  <MyPageContainer title="출결 승인">
    <section class="approval-section">
      <div class="section-heading">
        <div>
          <h3>확인 대기 공결 신청</h3>
          <p>승인은 종료된 출석 세션의 실제 출결 기록을 공결로 변경합니다.</p>
        </div>
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
      </div>

      <MyTable
        :columns="columns"
        :loading="isLoading"
        :empty="!isLoading && requests.length === 0"
        :empty-message="emptyMessage"
      >
        <tr v-for="item in requests" :key="item.id">
          <td>{{ item.studentName }}</td>
          <td>{{ item.enrollmentId }}</td>
          <td>
            <div class="course-name">{{ item.courseName }}</div>
            <div class="course-detail">{{ item.courseCode }} · {{ item.sectionNo }}분반</div>
          </td>
          <td>
            {{ formatDate(item.lectureDate) }}
            <span class="period-label">{{ item.period }}교시</span>
          </td>
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
            <span v-else>없음</span>
          </td>
          <td>
            <div v-if="item.status === 'PENDING'" class="action-buttons">
              <MyButton
                btn-type="button"
                color="green"
                size="small"
                content="승인"
                :disabled="isReviewing"
                @click="approve(item)"
              />
              <MyButton
                btn-type="button"
                color="red"
                size="small"
                content="반려"
                :disabled="isReviewing"
                @click="openReject(item)"
              />
            </div>
            <span v-else :class="['status-label', item.status.toLowerCase()]">
              {{ STATUS_LABELS[item.status] || item.status }}
            </span>
          </td>
        </tr>
      </MyTable>

      <PrevNextPagination
        v-if="page.page > 1 || page.hasNext"
        :page="page.page"
        :has-next="page.hasNext"
        @page-change="load"
      />
    </section>

    <MyModal :is-open="Boolean(rejectTarget)" title="공결 신청 반려" max-width="460px" @close="closeReject">
      <template v-if="rejectTarget">
        <p class="reject-target">
          {{ rejectTarget.studentName }} · {{ rejectTarget.courseName }} · {{ formatDate(rejectTarget.lectureDate) }} {{ rejectTarget.period }}교시
        </p>
        <label class="reject-field" for="excuse-reject-reason">
          <span>반려 사유</span>
          <textarea
            id="excuse-reject-reason"
            v-model="rejectReason"
            rows="3"
            maxlength="500"
            placeholder="반려 사유를 입력해 주세요."
          ></textarea>
        </label>
      </template>

      <template #footer>
        <MyButton color="white" size="middle" content="취소" :disabled="isReviewing" @click="closeReject" />
        <MyButton color="red" size="middle" :content="isReviewing ? '처리 중...' : '반려'" :disabled="isReviewing" @click="reject" />
      </template>
    </MyModal>
  </MyPageContainer>
</template>

<style scoped>
.approval-section {
  max-width: 800px;
}

.section-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}

.section-heading h3 {
  margin: 0;
  color: var(--personal-color-primary-text-navy);
  font-size: 1rem;
}

.section-heading p {
  display: none;
}

.status-tabs {
  display: flex;
  gap: 6px;
}

:deep(.page-container) {
  max-width: 980px;
  padding: 18px 16px 40px;
}

:deep(.page-heading h2) {
  margin: 0 0 26px;
  font-size: 1.35rem;
}

:deep(.my-table th) {
  padding: 11px 8px;
  font-size: 0.74rem;
}

:deep(.my-table td) {
  padding: 11px 8px;
  font-size: 0.75rem;
}

.status-tab {
  min-width: 76px;
  min-height: 32px;
  padding: 0 10px;
  border: 1px solid var(--personal-color-border-mist);
  border-radius: 4px;
  color: var(--personal-color-text-secondary-steel);
  background: var(--personal-color-white);
  font: inherit;
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
}

.status-tab.active {
  border-color: var(--personal-color-professor-primary-navy);
  color: var(--personal-color-white);
  background: var(--personal-color-professor-primary-navy);
}

.course-name {
  color: var(--personal-color-primary-text-navy);
  font-weight: 600;
}

.course-detail,
.period-label {
  color: var(--personal-color-text-muted-slate);
  font-size: 0.76rem;
}

.course-detail {
  margin-top: 3px;
}

.period-label {
  display: block;
  margin-top: 2px;
}

.reason-cell {
  min-width: 160px;
  max-width: 250px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.attachment-button {
  max-width: 150px;
  padding: 0;
  overflow: hidden;
  border: 0;
  color: var(--personal-color-secondary-blue);
  background: transparent;
  font: inherit;
  font-size: 0.8rem;
  text-align: left;
  text-decoration: underline;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: pointer;
}

.attachment-button:disabled {
  color: var(--personal-color-text-faint-fog);
  cursor: wait;
}

.action-buttons {
  display: flex;
  justify-content: center;
  gap: 6px;
}

.status-label.approved {
  color: var(--personal-color-status-success-text-forest);
}

.status-label.rejected {
  color: var(--personal-color-status-fail-text-maroon);
}

.reject-target {
  margin: 0 0 16px;
  color: var(--personal-color-text-secondary-steel);
  font-size: 0.84rem;
  line-height: 1.5;
}

.reject-field {
  display: flex;
  flex-direction: column;
  gap: 7px;
  color: var(--personal-color-primary-text-navy);
  font-size: 0.84rem;
  font-weight: 600;
}

.reject-field textarea {
  box-sizing: border-box;
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--personal-color-border-mist);
  border-radius: 4px;
  color: var(--personal-color-primary-text-navy);
  font: inherit;
  font-weight: 400;
  line-height: 1.5;
  resize: vertical;
}

.reject-field textarea:focus {
  border-color: var(--personal-color-professor-primary-navy);
  outline: none;
}

@media (max-width: 760px) {
  .section-heading {
    align-items: stretch;
    flex-direction: column;
  }

  .status-tabs {
    flex-wrap: wrap;
  }
}
</style>
