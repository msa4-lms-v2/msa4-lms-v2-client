<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue';
import MyButton from '../../components/button/MyButton.vue';
import MyStatusBadge from '../../components/common/MyStatusBadge.vue';
import MyInput from '../../components/input/MyInput.vue';
import MySelect from '../../components/input/MySelect.vue';
import MyPageContainer from '../../components/layout/MyPageContainer.vue';
import PrevNextPagination from '../../components/pagination/PrevNextPagination.vue';
import MyTable from '../../components/table/MyTable.vue';
import myAxios from '../../api/myAxios';
import { confirmDialog, notify } from '../../composables/useDialog';
import { formatDate } from '../../util/format';

defineOptions({ name: 'StudentLeaveReturnPage' });

const PDF_MAX_SIZE = 10 * 1024 * 1024;
const ATTACHMENTS_MAX_COUNT = 5;
const GENERAL_LEAVE = 'GENERAL_LEAVE';
const GENERAL_RETURN = 'GENERAL_RETURN';

const columns = [
  { key: 'type', label: '유형' },
  { key: 'targetSemester', label: '적용 학기' },
  { key: 'reason', label: '신청 사유' },
  { key: 'status', label: '진행 상태' },
  { key: 'rejectReason', label: '반려 사유' },
  { key: 'createdAt', label: '신청일' },
];

const requestTypeLabels = {
  GENERAL_LEAVE: '일반휴학',
  GENERAL_RETURN: '일반복학',
  MILITARY_LEAVE: '군휴학',
  MILITARY_RETURN: '군복학',
};

const statusLabels = {
  PENDING: '대기',
  APPROVED: '승인',
  REJECTED: '반려',
  CANCELLED: '취소',
};

const statusVariants = {
  PENDING: 'processing',
  APPROVED: 'success',
  REJECTED: 'fail',
  CANCELLED: 'warning',
};

const form = reactive({
  requestType: GENERAL_LEAVE,
  reason: '',
});

const fileInput = ref(null);
const attachments = ref([]);
const periods = ref([]);
const requests = ref([]);
const requestPage = ref({ page: 1, size: 20, totalCount: 0, hasNext: false });
const isLoadingPeriods = ref(false);
const isLoadingRequests = ref(false);
const isSubmitting = ref(false);
const formError = ref('');

const isLeave = computed(() => form.requestType === GENERAL_LEAVE);

const applicablePeriodTypes = computed(() => (
  isLeave.value ? [GENERAL_LEAVE] : [GENERAL_RETURN, 'MILITARY_RETURN']
));

const selectedPeriod = computed(() => periods.value.find(
  (period) => period.open && applicablePeriodTypes.value.includes(period.requestType),
) || null);

const targetSemester = computed(() => {
  if (!selectedPeriod.value) return null;
  return {
    year: selectedPeriod.value.academicYear,
    semester: selectedPeriod.value.term === 'FIRST' ? 1 : 2,
  };
});

const returnSemester = computed(() => {
  if (!isLeave.value || !targetSemester.value) return null;
  if (targetSemester.value.semester === 1) {
    return { year: targetSemester.value.year, semester: 2 };
  }
  return { year: targetSemester.value.year + 1, semester: 1 };
});

const formatSemester = (year, semester) => (
  year && semester ? `${year}학년도 ${semester}학기` : '-'
);

const targetSemesterLabel = computed(() => (
  targetSemester.value
    ? formatSemester(targetSemester.value.year, targetSemester.value.semester)
    : '접수 가능 기간 없음'
));

const returnSemesterLabel = computed(() => (
  returnSemester.value
    ? formatSemester(returnSemester.value.year, returnSemester.value.semester)
    : '-'
));

const visibleRequests = computed(() => requests.value.filter(
  (request) => request.requestType !== 'MILITARY_LEAVE',
));

const resetAttachment = () => {
  attachments.value = [];
  if (fileInput.value) fileInput.value.value = '';
};

const openFilePicker = () => fileInput.value?.click();

const validatePdf = (file, documentName) => {
  if (!file) return `${documentName} PDF를 첨부해 주세요.`;
  if (file.type !== 'application/pdf' || !file.name.toLowerCase().endsWith('.pdf')) {
    return `${documentName}는 PDF 형식만 선택할 수 있습니다.`;
  }
  if (file.size > PDF_MAX_SIZE) return `${documentName}는 10MB 이하만 선택할 수 있습니다.`;
  return '';
};

const onFileChange = (event) => {
  const selected = Array.from(event.target.files || []);
  const validationMessage = selected.map(validatePdf).find(Boolean) || '';
  if (validationMessage) {
    formError.value = validationMessage;
    event.target.value = '';
    return;
  }
  const combined = [...attachments.value, ...selected].filter(
    (file, index, files) => files.findIndex((candidate) => (
      candidate.name === file.name
      && candidate.size === file.size
      && candidate.lastModified === file.lastModified
    )) === index,
  );
  if (combined.length > ATTACHMENTS_MAX_COUNT) {
    formError.value = '증빙 파일은 최대 5개까지 첨부할 수 있습니다.';
    event.target.value = '';
    return;
  }
  attachments.value = combined;
  event.target.value = '';
  formError.value = '';
};

const removeAttachment = (index) => attachments.value.splice(index, 1);

const loadPeriods = async () => {
  isLoadingPeriods.value = true;
  try {
    const response = await myAxios.get('/api/academic/leave-request-periods', {
      params: { page: 1, size: 100, active: true },
    });
    periods.value = response.data.data.items || [];
  } catch (error) {
    periods.value = [];
    await notify(error.response?.data?.message || '휴학·복학 접수 기간을 불러오지 못했습니다.');
  } finally {
    isLoadingPeriods.value = false;
  }
};

const loadRequests = async (page = 1) => {
  isLoadingRequests.value = true;
  try {
    const response = await myAxios.get('/api/academic/leave-requests', {
      params: { page, size: 20, sort: 'CREATED_AT_DESC' },
    });
    const data = response.data.data;
    requests.value = data.items || [];
    requestPage.value = {
      page: data.page,
      size: data.size,
      totalCount: data.totalCount,
      hasNext: data.hasNext,
    };
  } catch (error) {
    requests.value = [];
    await notify(error.response?.data?.message || '휴학·복학 신청 내역을 불러오지 못했습니다.');
  } finally {
    isLoadingRequests.value = false;
  }
};

const createIdempotencyKey = (prefix) => {
  const suffix = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}-${suffix}`;
};

const validateForm = () => {
  if (!selectedPeriod.value || !targetSemester.value) return '현재 접수 가능한 신청 기간이 없습니다.';
  if (isLeave.value && !form.reason.trim()) return '휴학 신청 사유를 입력해 주세요.';
  if (form.reason.trim().length > 500) return '신청 사유는 500자 이하로 입력해 주세요.';
  return attachments.value.map(validatePdf).find(Boolean) || '';
};

const submitRequest = async () => {
  if (isSubmitting.value) return;

  formError.value = validateForm();
  if (formError.value) return;

  const requestLabel = requestTypeLabels[form.requestType];
  const confirmed = await confirmDialog(`${requestLabel} 신청서를 제출하시겠습니까?`);
  if (!confirmed) return;

  const request = {
    requestType: form.requestType,
    reason: form.reason.trim() || null,
    targetYear: targetSemester.value.year,
    targetSemester: targetSemester.value.semester,
    returnYear: isLeave.value ? returnSemester.value.year : null,
    returnSemester: isLeave.value ? returnSemester.value.semester : null,
  };

  const formData = new FormData();
  formData.append('request', new Blob([JSON.stringify(request)], { type: 'application/json' }));
  attachments.value.forEach((file) => formData.append('files', file));

  isSubmitting.value = true;
  try {
    await myAxios.post('/api/academic/leave-requests', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        'Idempotency-Key': createIdempotencyKey(),
      },
    });
    form.reason = '';
    resetAttachment();
    await notify(`${requestLabel} 신청이 접수되었습니다.`);
    await loadRequests(1);
  } catch (error) {
    await notify(error.response?.data?.message || '휴학·복학 신청 중 오류가 발생했습니다.');
  } finally {
    isSubmitting.value = false;
  }
};

const formatRequestType = (type) => requestTypeLabels[type] || type || '-';
const formatStatus = (status) => statusLabels[status] || status || '-';
const statusVariant = (status) => statusVariants[status] || 'processing';

watch(() => form.requestType, () => {
  formError.value = '';
});

onMounted(async () => {
  await Promise.all([loadPeriods(), loadRequests()]);
});
</script>

<template>
  <MyPageContainer title="일반휴학/복학 신청">
    <div class="leave-return-page">
      <section class="request-section">
        
        <form
          class="request-form"
          @submit.prevent="submitRequest"
        >
          <div class="form-grid">
            <label
              class="form-field"
              for="leave-request-type"
            >
              <span>신청 유형</span>
              <MySelect
                id="leave-request-type"
                v-model="form.requestType"
                class="form-select"
              >
                <option :value="GENERAL_LEAVE">휴학</option>
                <option :value="GENERAL_RETURN">복학</option>
              </MySelect>
            </label>

            <label
              class="form-field"
              for="leave-start-period"
            >
              <span>시작 기간</span>
              <MyInput
                id="leave-start-period"
                class="period-input"
                :model-value="isLoadingPeriods ? '조회 중...' : targetSemesterLabel"
                readonly
                disabled
              />
            </label>

            <label
              v-if="isLeave"
              class="form-field"
              for="leave-return-period"
            >
              <span>복학 예정</span>
              <MyInput
                id="leave-return-period"
                class="period-input"
                :model-value="isLoadingPeriods ? '조회 중...' : returnSemesterLabel"
                readonly
                disabled
              />
            </label>
          </div>

          <div class="form-field file-field">
            <span>증빙 파일 (pdf 가능)</span>
            <div class="file-picker">
              <input
                ref="fileInput"
                class="visually-hidden"
                type="file"
                multiple
                accept=".pdf,application/pdf"
                @change="onFileChange"
              >
              <MyButton
                btn-type="button"
                class="file-select-action"
                color="white"
                size="small"
                content="파일 선택"
                @click="openFilePicker"
              />
              <span
                class="file-count"
                :class="{ 'file-count--attached': attachments.length > 0 }"
              >
                {{ attachments.length ? `${attachments.length}개 파일 첨부됨` : '선택된 파일 없음' }}
              </span>
              <div
                v-if="attachments.length"
                class="file-chips"
              >
                <span
                  v-for="(file, index) in attachments"
                  :key="`${file.name}-${file.size}-${file.lastModified}`"
                  class="file-chip"
                >
                  <span
                    class="file-icon"
                    aria-hidden="true"
                  >▣</span>
                  <span
                    class="file-name"
                    :title="file.name"
                  >{{ file.name }}</span>
                  <MyButton
                    btn-type="button"
                    :content="'×'"
                    :aria-label="`${file.name} 삭제`"
                    @click="removeAttachment(index)"
                  />
                </span>
              </div>
            </div>
          </div>

          <label
            class="form-field reason-field"
            for="leave-reason"
          >
            <span>사유</span>
            <textarea
              id="leave-reason"
              v-model="form.reason"
              rows="3"
              maxlength="500"
              placeholder="상세 사유를 입력해 주세요."
            />
          </label>

          <p
            v-if="formError"
            class="form-error"
            role="alert"
          >
            {{ formError }}
          </p>

          <div class="form-actions">
            <MyButton
              type="submit"
              color="deep-blue"
              size="big"
              :content="isSubmitting ? '제출 중...' : '신청서 제출'"
              :disabled="isSubmitting || isLoadingPeriods || !selectedPeriod"
            />
          </div>
        </form>
      </section>

      <section class="history-section">
        <h3 class="section-title">
          나의 신청 내역
        </h3>

        <div class="table-scroll">
          <MyTable
            class="leave-return-history-table"
            :columns="columns"
            :loading="isLoadingRequests"
            :empty="!isLoadingRequests && visibleRequests.length === 0"
            empty-message="일반휴학·복학 신청 내역이 없습니다."
          >
            <tr
              v-for="request in visibleRequests"
              :key="request.id"
            >
              <td>{{ formatRequestType(request.requestType) }}</td>
              <td>{{ formatSemester(request.targetYear, request.targetSemester) }}</td>
              <td
                class="reason-cell"
                :title="request.reason || '-'"
              >
                {{ request.reason || '-' }}
              </td>
              <td>
                <MyStatusBadge
                  :class="['leave-status', { 'leave-status--rejected': request.status === 'REJECTED' }]"
                  :label="formatStatus(request.status)"
                  :variant="statusVariant(request.status)"
                />
              </td>
              <td
                class="reason-cell"
                :title="request.rejectReason || '-'"
              >
                {{ request.rejectReason || '-' }}
              </td>
              <td>{{ formatDate(request.createdAt, 'YYYY. M. D.') }}</td>
            </tr>
          </MyTable>
        </div>

        <PrevNextPagination
          v-if="requestPage.page > 1 || requestPage.hasNext"
          :page="requestPage.page"
          :has-next="requestPage.hasNext"
          @page-change="loadRequests"
        />
      </section>
    </div>
  </MyPageContainer>
</template>

<style scoped>
.leave-return-page {
  max-width: 1120px;
}

.request-section {
  margin-top: 0;
}

.section-title {
  margin: 0 0 10px 6px;
  color: var(--personal-color-primary-text-navy);
  font-size: 1rem;
  font-weight: 600;
}

.request-form {
  padding: 18px 26px 24px;
  border: 1px solid var(--personal-color-border-mist);
  border-radius: 8px;
  background: var(--personal-color-white);
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 28px;
}

.form-field {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 5px;
  color: var(--personal-color-primary-text-navy);
  font-size: 0.75rem;
  font-weight: 400;
}

.form-field > span:first-child {
  font-weight: 600;
}

.form-select,
.period-input {
  width: 100%;
  height: 38px;
  padding: 8px 12px;
  border: 1px solid var(--personal-color-border-mist);
  border-radius: 4px;
  color: var(--personal-color-primary-text-navy);
  background: var(--personal-color-white);
  font-size: 0.82rem;
}

.period-input:disabled {
  opacity: 1;
  color: var(--personal-color-primary-text-navy);
  background: var(--personal-color-bg-surface-frost);
}

.file-field {
  margin-top: 12px;
}

.reason-field {
  margin-top: 8px;
}

.file-picker {
  min-height: 38px;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 4px 8px;
  border: 1px solid var(--personal-color-border-mist);
  border-radius: 4px;
  background: var(--personal-color-white);
}

.file-select-action {
  flex: 0 0 auto;
  border: 1px solid var(--personal-color-border-mist);
  color: var(--personal-color-primary-text-navy);
  background: var(--personal-color-bg-surface-frost);
  white-space: nowrap;
}

.file-count {
  flex: 0 0 auto;
  color: var(--personal-color-text-faint-fog);
  font-size: 0.75rem;
  white-space: nowrap;
}

.file-count--attached {
  color: var(--personal-color-login-primary-navy);
  font-weight: 500;
}

.file-chips {
  min-width: 0;
  flex: 1;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  overflow-x: auto;
}

.file-chip {
  min-width: 0;
  max-width: 230px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  border: 1px solid var(--personal-color-border-mist);
  border-radius: 3px;
  color: var(--personal-color-primary-navy);
  background: var(--personal-color-bg-surface-frost);
  font-size: 0.72rem;
  font-weight: 500;
}

.file-name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.reason-field textarea {
  width: 100%;
  min-height: 54px;
  padding: 10px 12px;
  border: 1px solid var(--personal-color-border-mist);
  border-radius: 4px;
  color: var(--personal-color-primary-text-navy);
  background: var(--personal-color-white);
  resize: vertical;
}

.reason-field textarea::placeholder {
  color: var(--personal-color-text-faint-fog);
}

.form-error {
  margin: 10px 0 0;
  color: var(--personal-color-red);
  font-size: 0.8rem;
  font-weight: 500;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 28px;
}

.history-section {
  margin-top: 16px;
}

.table-scroll {
  overflow-x: auto;
}

.reason-cell {
  max-width: 280px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.leave-status.status-badge {
  padding: 0;
  border: 0;
  color: var(--personal-color-primary-text-navy);
  background: transparent;
  font-weight: 400;
}

.leave-status--rejected.status-badge {
  color: var(--personal-color-red);
}

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

@media (max-width: 860px) {
  .form-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }
}

@media (max-width: 560px) {
  .request-form {
    padding: 18px 16px;
  }

  .form-actions > * {
    width: 100%;
  }
}
</style>

<style>
.leave-return-history-table.table-container .my-table th {
  padding: 12px 16px;
  border-bottom: 1px solid var(--personal-color-border-mist);
  color: var(--personal-color-primary-text-navy);
  font-size: 0.75rem;
  font-weight: 600;
}

.leave-return-history-table.table-container .my-table td {
  padding: 12px 16px;
  color: var(--personal-color-primary-text-navy);
  font-size: 0.75rem;
  font-weight: 400;
}
</style>
