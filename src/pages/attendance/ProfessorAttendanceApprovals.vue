<script setup>
import { computed, onMounted, ref } from 'vue';
import { downloadExcuseAttachment, reviewExcuseRequest, searchExcuseRequests } from '../../api/attendanceApi';
import MyPageContainer from '../../components/layout/MyPageContainer.vue';
import MyButton from '../../components/button/MyButton.vue';
import MySelect from '../../components/input/MySelect.vue';
import MyTable from '../../components/table/MyTable.vue';
import { confirmDialog, notify } from '../../composables/useDialog';
import { formatDate } from '../../util/format';

defineOptions({ name: 'ProfessorAttendanceApprovals' });

const columns = [
  { key: 'student', label: '학생' },
  { key: 'course', label: '교과목' },
  { key: 'lectureDate', label: '수업일' },
  { key: 'reason', label: '사유' },
  { key: 'attachment', label: '첨부파일' },
  { key: 'status', label: '처리' },
];

const requests = ref([]);
const activeTab = ref('PENDING');
const statusFilter = ref('PENDING');
const classFilter = ref('');
const appliedClassId = ref('');
const applyFilters = () => {
  activeTab.value = statusFilter.value;
  appliedClassId.value = classFilter.value;
};
const resetFilters = () => {
  classFilter.value = '';
  statusFilter.value = 'PENDING';
  applyFilters();
};
const isLoading = ref(false);
const rejectTarget = ref(null);
const rejectReason = ref('');
const isReviewing = ref(false);
const downloadingRequestId = ref(null);

const tabOptions = [
  { value: 'PENDING', label: '승인 대기' },
  { value: 'COMPLETED', label: '처리 완료' },
  { value: 'ALL', label: '전체' },
];
const statusLabels = { PENDING: '대기', APPROVED: '승인', REJECTED: '반려' };
const courseOptions = computed(() => {
  const courses = new Map();
  requests.value.forEach((request) => {
    const value = String(request.classId || '');
    if (!value || courses.has(value)) return;
    courses.set(value, {
      value,
      label: `[${request.courseCode}] ${request.courseName} (${request.sectionNo}분반)`,
    });
  });
  return [...courses.values()].sort((left, right) => left.label.localeCompare(right.label, 'ko'));
});
const visibleRequests = computed(() => requests.value.filter((request) => (
  (activeTab.value === 'ALL' || (activeTab.value === 'PENDING' ? request.status === 'PENDING' : request.status !== 'PENDING'))
  && (!appliedClassId.value || String(request.classId) === appliedClassId.value)
)));
const emptyMessage = computed(() => (
  activeTab.value === 'PENDING'
    ? '승인 대기 중인 공결 신청이 없습니다.'
    : activeTab.value === 'ALL' ? '검색 조건에 맞는 공결 신청이 없습니다.' : '처리 완료된 공결 신청이 없습니다.'
));

const createIdempotencyKey = (prefix) => {
  const suffix = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}-${suffix}`;
};

const load = async () => {
  isLoading.value = true;
  try {
    const items = [];
    let pageNumber = 1;
    let hasNext = false;
    do {
      const response = await searchExcuseRequests({ page: pageNumber, size: 100 });
      const data = response.data.data;
      items.push(...(data.items || []));
      hasNext = Boolean(data.hasNext);
      pageNumber += 1;
    } while (hasNext);
    requests.value = items;
  } catch (error) {
    requests.value = [];
    await notify(error.response?.data?.message || '공결 신청 목록을 불러오지 못했습니다.');
  } finally {
    isLoading.value = false;
  }
};

const openRejectModal = (request) => {
  if (isLoading.value || isReviewing.value || request.status !== 'PENDING') return;
  rejectTarget.value = request;
  rejectReason.value = '';
};

const closeRejectModal = () => {
  if (isReviewing.value) return;
  rejectTarget.value = null;
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

const approveRequest = async (request) => {
  if (isLoading.value || isReviewing.value || request.status !== 'PENDING') return;
  isReviewing.value = true;
  try {
    const confirmed = await confirmDialog(`${request.studentName} 학생의 공결 신청을 승인하시겠습니까?`);
    if (!confirmed) return;
    await reviewExcuseRequest(request.id, 'APPROVED', null, createIdempotencyKey('excuse-approve'));
    await notify('승인 처리되었습니다.');
    await load();
  } catch (error) {
    await notify(error.response?.data?.message || '승인 처리 중 오류가 발생했습니다.');
  } finally {
    isReviewing.value = false;
  }
};

const rejectRequest = async () => {
  if (isReviewing.value || !rejectTarget.value || rejectTarget.value.status !== 'PENDING') return;
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
    await notify('반려 처리되었습니다.');
    rejectTarget.value = null;
    rejectReason.value = '';
    await load();
  } catch (error) {
    await notify(error.response?.data?.message || '반려 처리 중 오류가 발생했습니다.');
  } finally {
    isReviewing.value = false;
  }
};

onMounted(() => load());
</script>

<template>
  <MyPageContainer class="professor-page" title="출결 승인">
    <section class="approval-filters">
      <MySelect v-model="classFilter" aria-label="과목 선택">
        <option value="">전체 과목</option>
        <option v-for="course in courseOptions" :key="course.value" :value="course.value">
          {{ course.label }}
        </option>
      </MySelect>
      <MySelect v-model="statusFilter" aria-label="처리 상태" :options="tabOptions" />
      <div class="filter-actions"><MyButton color="deep-blue" size="middle" content="조회" :disabled="isLoading" @click="applyFilters" /><MyButton color="white" size="middle" content="초기화" :disabled="isLoading" @click="resetFilters" /></div>
    </section>
    <section class="attendance-section">
      <div class="common-section-header">
        <h3>{{ activeTab === 'PENDING' ? '확인 대기 공결 신청' : activeTab === 'ALL' ? '전체 공결 신청' : '처리 완료 내역' }}</h3>

      </div>

      <MyTable
        class="approval-table"
        :columns="columns"
        :loading="isLoading"
        :empty="!isLoading && visibleRequests.length === 0"
        :empty-message="emptyMessage"
      >
        <tr v-for="item in visibleRequests" :key="item.id">
          <td>{{ item.studentName }}</td>
          <td>{{ item.courseName }}</td>
          <td>
            <div>{{ formatDate(item.lectureDate) }}</div>
            <small>{{ item.period }}교시</small>
          </td>
          <td class="reason-cell">
            {{ item.reason }}
            <p v-if="item.rejectReason" class="reject-reason">반려 사유: {{ item.rejectReason }}</p>
          </td>
          <td>
            <button
              v-if="item.attachmentOriginalName"
              type="button"
              class="attachment-button"
              :disabled="downloadingRequestId !== null"
              :title="item.attachmentOriginalName"
              @click="downloadAttachment(item)"
            >
              {{ downloadingRequestId === item.id ? '받는 중...' : item.attachmentOriginalName }}
            </button>
            <span v-else class="empty-value">없음</span>
          </td>
          <td>
            <div v-if="item.status === 'PENDING'" class="button-group">
              <MyButton
                btn-type="button"
                color="red"
                size="small"
                content="반려"
                :disabled="isLoading || isReviewing"
                :aria-label="`${item.studentName} 공결 반려`"
                @click="openRejectModal(item)"
              />
              <MyButton
                btn-type="button"
                color="deep-blue"
                size="small"
                content="승인"
                :disabled="isLoading || isReviewing"
                :aria-label="`${item.studentName} 공결 승인`"
                @click="approveRequest(item)"
              />
            </div>
            <span v-else :class="['status-text', item.status.toLowerCase()]">
              {{ statusLabels[item.status] || item.status }}
            </span>
          </td>
        </tr>
      </MyTable>
    </section>

    <section v-if="rejectTarget" class="reject-panel" aria-label="선택 신청 반려">
      <h3>선택 신청 반려</h3>
      <template v-if="rejectTarget">
        <dl class="request-summary">
          <dt>학생</dt>
          <dd>{{ rejectTarget.studentName }}</dd>
          <dt>과목</dt>
          <dd>{{ rejectTarget.courseName }}</dd>
          <dt>날짜</dt>
          <dd>{{ formatDate(rejectTarget.lectureDate) }} {{ rejectTarget.period }}교시</dd>
        </dl>
        <div class="approval-form">
          <label for="reject-reason">반려 사유</label>
          <textarea
            id="reject-reason"
            v-model="rejectReason"
            :disabled="isReviewing"
            maxlength="500"
            rows="5"
            placeholder="학생에게 전달할 반려 사유를 입력해 주세요."
          />
        </div>
      </template>
      <div class="filter-actions">
        <MyButton class="secondary-button" color="white" size="middle" content="닫기" :disabled="isReviewing" @click="closeRejectModal" />
        <MyButton color="red" size="middle" content="반려" :disabled="isReviewing" @click="rejectRequest" />
      </div>
    </section>
  </MyPageContainer>
</template>

<style scoped>
.approval-filters { display: flex; gap: 16px; padding: 24px; border: 1px solid var(--personal-color-border-mist); border-radius: 8px; background: white; align-items: center; }
.approval-filters > :first-child, .approval-filters > select { width: 220px; }
.filter-actions { display: flex; justify-content: flex-end; gap: 12px; margin-left: auto; }
.reject-panel { margin-top: 32px; }
.reject-panel h3 { font-size: 16px; }
.reject-panel .approval-form { padding: 18px; background: white; margin-bottom: 16px; }
@media (max-width: 760px) { .approval-filters { flex-wrap: wrap; } }

.attendance-section {
  margin-top: 24px;
}

.common-section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.common-section-header h3 {
  margin: 0;
  color: var(--personal-color-primary-text-navy);
  font-size: 1rem;
}

.approval-table {
  overflow-x: auto;
}

.approval-table :deep(table) {
  min-width: 820px;
}

.button-group {
  display: flex;
  justify-content: center;
  gap: 8px;
}

.reason-cell {
  min-width: 220px;
  text-align: center;
  white-space: normal;
  overflow-wrap: anywhere;
}

.reject-reason {
  margin: 6px 0 0;
  color: var(--personal-color-status-fail-text-maroon);
  font-size: 0.8rem;
}

.attachment-button {
  max-width: 180px;
  padding: 0;
  overflow: hidden;
  border: 0;
  color: var(--personal-color-primary-navy);
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

.request-summary {
  display: grid;
  grid-template-columns: 70px 1fr;
  gap: 8px 12px;
  margin-bottom: 20px;
  font-size: 0.9rem;
}

.request-summary dt {
  color: var(--personal-color-text-muted-slate);
  font-weight: 600;
}

.request-summary dd {
  margin: 0;
}

.approval-form {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.approval-form label {
  color: var(--personal-color-primary-text-navy);
  font-size: 0.9rem;
  font-weight: 600;
}

.approval-form textarea {
  width: 100%;
  box-sizing: border-box;
  padding: 10px 12px;
  border: 1px solid var(--personal-color-border-mist);
  border-radius: 6px;
  font-size: 0.9rem;
  font-family: inherit;
  resize: vertical;
}

.empty-value {
  color: var(--personal-color-text-faint-fog);
}

.status-text {
  font-size: 0.85rem;
  font-weight: 700;
}

.status-text.approved {
  color: var(--personal-color-status-success-text-forest);
}

.status-text.rejected {
  color: var(--personal-color-status-fail-text-maroon);
}

@media (max-width: 760px) {
  .common-section-header {
    align-items: stretch;
    flex-direction: column;
    gap: 12px;
  }
}
</style>
