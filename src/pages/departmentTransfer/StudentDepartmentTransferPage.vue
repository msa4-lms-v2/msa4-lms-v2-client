<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import myAxios from '../../api/myAxios';
import MyButton from '../../components/button/MyButton.vue';
import MyModal from '../../components/common/MyModal.vue';
import MyStatusBadge from '../../components/common/MyStatusBadge.vue';
import MyInput from '../../components/input/MyInput.vue';
import MyPageContainer from '../../components/layout/MyPageContainer.vue';
import PrevNextPagination from '../../components/pagination/PrevNextPagination.vue';
import MyTable from '../../components/table/MyTable.vue';
import { confirmDialog, notify } from '../../composables/useDialog';
import { useProfileStore } from '../../store/profile/useProfileStore';
import { formatDate } from '../../util/format';

defineOptions({ name: 'StudentDepartmentTransferPage' });

const PDF_MAX_SIZE = 10 * 1024 * 1024;
const ATTACHMENTS_MAX_COUNT = 5;

const columns = [
  { key: 'semester', label: '신청 학기' },
  { key: 'sourceDepartment', label: '현재 학과' },
  { key: 'targetDepartment', label: '희망 학과' },
  { key: 'status', label: '진행 상태' },
  { key: 'createdAt', label: '신청일' },
  { key: 'management', label: '관리' },
];

const statusLabels = {
  PENDING: '심사중',
  APPROVED: '승인',
  REJECTED: '반려',
  CANCELLED: '취소',
};

const profileStore = useProfileStore();
const fileInput = ref(null);
const attachments = ref([]);
const departments = ref([]);
const periods = ref([]);
const requests = ref([]);
const selectedCollegeId = ref('');
const selectedDepartmentId = ref('');
const selectedSemesterId = ref('');
const selfIntroduction = ref(null);
const studyPlan = ref(null);
const hasReadGuidelines = ref(false);
const formError = ref('');
const isLoadingForm = ref(false);
const isLoadingRequests = ref(false);
const isSubmitting = ref(false);
const isCancelling = ref(false);
const cancelTarget = ref(null);
const cancelReason = ref('');
const cancelError = ref('');
const requestPage = ref({ page: 1, size: 20, totalCount: 0, hasNext: false });

const profile = computed(() => profileStore.profile || {});
const currentCollegeName = computed(() => profile.value.collegeName || '-');
const currentDepartmentName = computed(() => profile.value.departmentName || '-');

const targetDepartments = computed(() => departments.value.filter(
  (department) => (
    String(department.id) !== String(profile.value.departmentId || '')
    && department.name !== currentDepartmentName.value
  ),
));

const colleges = computed(() => {
  const collegeMap = new Map();
  targetDepartments.value.forEach((department) => {
    if (department.college?.id && !collegeMap.has(department.college.id)) {
      collegeMap.set(department.college.id, department.college);
    }
  });
  return [...collegeMap.values()].sort((left, right) => left.name.localeCompare(right.name, 'ko'));
});

const filteredDepartments = computed(() => targetDepartments.value
  .filter((department) => String(department.college?.id || '') === String(selectedCollegeId.value))
  .sort((left, right) => left.name.localeCompare(right.name, 'ko')));

const openPeriods = computed(() => periods.value
  .filter((period) => period.active && period.open)
  .sort((left, right) => {
    if (left.academicYear !== right.academicYear) return left.academicYear - right.academicYear;
    return left.term === 'FIRST' ? -1 : 1;
  }));

const selectedFiles = computed(() => [selfIntroduction.value, studyPlan.value].filter(Boolean));

watch(selectedCollegeId, () => {
  if (!filteredDepartments.value.some(
    (department) => String(department.id) === String(selectedDepartmentId.value),
  )) {
    selectedDepartmentId.value = filteredDepartments.value[0]?.id || '';
  }
});

const formatSemester = (year, term) => {
  if (!year || !term) return '-';
  return `${year}학년도 ${term === 'FIRST' ? 1 : 2}학기`;
};

const formatStatus = (status) => statusLabels[status] || status || '-';

const validatePdf = (file, documentName) => {
  if (!file) return `${documentName} PDF를 첨부해 주세요.`;
  if (file.type !== 'application/pdf' || !file.name.toLowerCase().endsWith('.pdf')) {
    return `${documentName}는 PDF 형식만 선택할 수 있습니다.`;
  }
  if (file.size > PDF_MAX_SIZE) return `${documentName}는 10MB 이하만 선택할 수 있습니다.`;
  return '';
};

const validateForm = () => {
  if (!selectedPeriod.value || !targetSemester.value) return '현재 접수 가능한 신청 기간이 없습니다.';
  if (isLeave.value && !form.reason.trim()) return '휴학 신청 사유를 입력해 주세요.';
  if (form.reason.trim().length > 500) return '신청 사유는 500자 이하로 입력해 주세요.';
  return attachments.value.map(validatePdf).find(Boolean) || '';
};

const resetAttachment = () => {
  attachments.value = [];
  if (fileInput.value) fileInput.value.value = '';
};

const openFilePicker = () => fileInput.value?.click();

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

const loadFormData = async () => {
  isLoadingForm.value = true;
  try {
    const [departmentResponse, periodResponse] = await Promise.all([
      myAxios.get('/api/academic/catalog/departments', {
        params: { page: 1, size: 100, active: true },
      }),
      myAxios.get('/api/academic/catalog/department-transfer-periods', {
        params: { page: 1, size: 100, active: true },
      }),
    ]);

    departments.value = departmentResponse.data.data.items || [];
    periods.value = periodResponse.data.data.items || [];
    selectedCollegeId.value = colleges.value[0]?.id || '';
    selectedDepartmentId.value = filteredDepartments.value[0]?.id || '';
    selectedSemesterId.value = openPeriods.value[0]?.semesterId || '';
  } catch (error) {
    departments.value = [];
    periods.value = [];
    await notify(error.response?.data?.message || '전과 신청 정보를 불러오지 못했습니다.');
  } finally {
    isLoadingForm.value = false;
  }
};

const loadRequests = async (page = 1) => {
  isLoadingRequests.value = true;
  try {
    const response = await myAxios.get('/api/academic/department-transfer-requests', {
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
    await notify(error.response?.data?.message || '전과 신청 내역을 불러오지 못했습니다.');
  } finally {
    isLoadingRequests.value = false;
  }
};

const showGuidelines = async () => {
  const periodMessage = openPeriods.value.length
    ? openPeriods.value.map((period) => (
      `${formatSemester(period.academicYear, period.term)}: ${formatDate(period.startAt, 'YYYY-MM-DD HH:mm')} ~ ${formatDate(period.endAt, 'YYYY-MM-DD HH:mm')}`
    )).join('\n')
    : '현재 접수 가능한 전과 모집 기간이 없습니다.';
  await notify(`${periodMessage}\n필수 서류: 자기소개서, 학업계획서 PDF 각 1부`);
  hasReadGuidelines.value = true;
};

const createIdempotencyKey = (prefix) => {
  const suffix = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}-${suffix}`;
};

const submitRequest = async () => {
  if (isSubmitting.value) return;

  if (!hasReadGuidelines.value) {
    formError.value = '모집 요강을 먼저 확인해 주세요.';
    return;
  }
  if (!selectedDepartmentId.value) {
    formError.value = '희망 학과를 선택해 주세요.';
    return;
  }
  if (!selectedSemesterId.value) {
    formError.value = '현재 접수 가능한 전과 신청 학기가 없습니다.';
    return;
  }

  formError.value = validatePdf(selfIntroduction.value, '자기소개서')
    || validatePdf(studyPlan.value, '학업계획서');
  if (formError.value) return;

  const confirmed = await confirmDialog('전과 신청서를 제출하시겠습니까?');
  if (!confirmed) return;

  const formData = new FormData();
  formData.append('request', new Blob([JSON.stringify(request)], { type: 'application/json' }));
  attachments.value.forEach((file) => formData.append('files', file));

  isSubmitting.value = true;
  try {
    await myAxios.post('/api/academic/department-transfer-requests', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        'Idempotency-Key': createIdempotencyKey('department-transfer'),
      },
    });
    resetAttachment();
    formError.value = '';
    await notify('전과 신청이 접수되었습니다.');
    await loadRequests(1);
  } catch (error) {
    await notify(error.response?.data?.message || '전과 신청 중 오류가 발생했습니다.');
  } finally {
    isSubmitting.value = false;
  }
};

const openCancelModal = (request) => {
  cancelTarget.value = request;
  cancelReason.value = '';
  cancelError.value = '';
};

const closeCancelModal = () => {
  if (isCancelling.value) return;
  cancelTarget.value = null;
  cancelReason.value = '';
  cancelError.value = '';
};

const cancelRequest = async () => {
  const reason = cancelReason.value.trim();
  if (!reason) {
    cancelError.value = '취소 사유를 입력해 주세요.';
    return;
  }
  if (reason.length > 500) {
    cancelError.value = '취소 사유는 500자 이하로 입력해 주세요.';
    return;
  }

  isCancelling.value = true;
  try {
    await myAxios.patch(
      `/api/academic/department-transfer-requests/${cancelTarget.value.id}/cancellation`,
      { reason },
      { headers: { 'Idempotency-Key': createIdempotencyKey('department-transfer-cancel') } },
    );
    isCancelling.value = false;
    closeCancelModal();
    await notify('전과 신청이 취소되었습니다.');
    await loadRequests(requestPage.value.page);
  } catch (error) {
    await notify(error.response?.data?.message || '전과 신청 취소 중 오류가 발생했습니다.');
  } finally {
    isCancelling.value = false;
  }
};

onMounted(async () => {
  await profileStore.fetchStudentProfile();
  await Promise.all([loadFormData(), loadRequests()]);
});
</script>

<template>
  <MyPageContainer title="전과 신청">
    <div class="department-transfer-page">
      <MyButton
        btn-type="button"
        color="deep-blue"
        size="middle"
        content="모집 요강"
        @click="showGuidelines"
      />

      <section class="application-section">
        <form
          class="request-card"
          @submit.prevent="submitRequest"
        >
          <div class="form-grid form-grid--departments">
            <label
              class="form-field"
              for="current-college"
            >
              <span>현재 단과대학</span>
              <MyInput
                id="current-college"
                class="readonly-input"
                :model-value="currentCollegeName"
                readonly
                disabled
              />
            </label>

            <label
              class="form-field"
              for="current-department"
            >
              <span>현재 학과</span>
              <MyInput
                id="current-department"
                class="readonly-input"
                :model-value="currentDepartmentName"
                readonly
                disabled
              />
            </label>

            <label
              class="form-field"
              for="target-college"
            >
              <span>희망 단과대학</span>
              <select
                id="target-college"
                v-model="selectedCollegeId"
                class="form-select"
                :disabled="isLoadingForm"
              >
                <option
                  v-for="college in colleges"
                  :key="college.id"
                  :value="college.id"
                >
                  {{ college.name }}
                </option>
              </select>
            </label>

            <label
              class="form-field"
              for="target-department"
            >
              <span>희망 학과</span>
              <select
                id="target-department"
                v-model="selectedDepartmentId"
                class="form-select"
                :disabled="isLoadingForm || !selectedCollegeId"
              >
                <option
                  v-for="department in filteredDepartments"
                  :key="department.id"
                  :value="department.id"
                >
                  {{ department.name }}
                </option>
              </select>
            </label>
          </div>

          <div class="form-grid form-grid--application">
            <label
              class="form-field"
              for="target-semester"
            >
              <span>적용 희망 학기</span>
              <select
                id="target-semester"
                v-model="selectedSemesterId"
                class="form-select"
                :disabled="isLoadingForm || !openPeriods.length"
              >
                <option
                  v-for="period in openPeriods"
                  :key="period.id"
                  :value="period.semesterId"
                >
                  {{ formatSemester(period.academicYear, period.term) }}
                </option>
              </select>
            </label>

            <div class="form-field file-field">
              <div class="file-label-row">
                <span>증빙파일 (pdf 만 가능)</span>
              </div>
              <div class="file-picker">
                <input
                  ref="fileInput"
                  class="visually-hidden"
                  type="file"
                  accept=".pdf,application/pdf"
                  multiple
                  @change="onFileChange"
                >
                <MyButton
                  btn-type="button"
                  class="file-select-action"
                  color="white"
                  size="middle"
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
                    v-for="file in attachments"
                    :key="`${file.name}-${file.size}`"
                    class="file-chip"
                  >
                    <span
                      class="file-icon"
                      aria-hidden="true"
                    >▣</span>
                    <span
                      class="file-chip-name"
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
              <span class="required-guide">*필수 제출 서류 : 자기소개서 / 학업계획서</span>
            </div>
          </div>

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
              size="small"
              :content="isSubmitting ? '신청 중' : '전과 신청'"
              :disabled="isSubmitting || isLoadingForm || !openPeriods.length || !hasReadGuidelines"
            />
          </div>
        </form>
      </section>

      <section class="history-section">
        <h3 class="section-title">
          전과 신청 내역
        </h3>

        <div class="table-scroll">
          <MyTable
            class="department-transfer-history-table"
            :columns="columns"
            :loading="isLoadingRequests"
            :empty="!isLoadingRequests && requests.length === 0"
            empty-message="신청 내역이 없습니다."
          >
            <tr
              v-for="request in requests"
              :key="request.id"
            >
              <td>{{ formatSemester(request.targetAcademicYear, request.targetTerm) }}</td>
              <td>{{ request.sourceDepartmentName || '-' }}</td>
              <td>{{ request.targetDepartmentName || '-' }}</td>
              <td>
                <MyStatusBadge
                  class="department-transfer-status"
                  :label="formatStatus(request.status)"
                  variant="processing"
                />
              </td>
              <td>{{ formatDate(request.createdAt) }}</td>
              <td>
                <MyButton
                  v-if="request.status === 'PENDING'"
                  btn-type="button"
                  class="cancel-action"
                  color="white"
                  size="small"
                  content="취소"
                  @click="openCancelModal(request)"
                />
                <span v-else>-</span>
              </td>
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

    <MyModal
      :is-open="Boolean(cancelTarget)"
      title="전과 신청 취소"
      @close="closeCancelModal"
    >
      <label
        class="cancel-field"
        for="cancel-reason"
      >
        <span>취소 사유</span>
        <MyInput
          id="cancel-reason"
          v-model="cancelReason"
          placeholder="취소 사유를 입력해 주세요."
          maxlength="500"
          @keyup-enter="cancelRequest"
        />
      </label>
      <p
        v-if="cancelError"
        class="form-error"
        role="alert"
      >
        {{ cancelError }}
      </p>

      <template #footer>
        <MyButton
          btn-type="button"
          class="modal-cancel-action"
          color="white"
          size="middle"
          content="취소"
          :disabled="isCancelling"
          @click="closeCancelModal"
        />
        <MyButton
          btn-type="button"
          color="deep-blue"
          size="middle"
          :content="isCancelling ? '처리 중' : '확인'"
          :disabled="isCancelling"
          @click="cancelRequest"
        />
      </template>
    </MyModal>
  </MyPageContainer>
</template>

<style scoped>
.department-transfer-page {
  max-width: 1120px;
}

.application-section {
  margin-top: 18px;
}

.request-card {
  min-height: 224px;
  padding: 26px 20px 20px;
  border: 1px solid var(--personal-color-border-mist);
  border-radius: 8px;
  background: var(--personal-color-white);
}

.form-grid {
  display: grid;
  gap: 16px;
}

.form-grid--departments {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.form-grid--application {
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.04fr);
  margin-top: 12px;
}

.form-field,
.cancel-field {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
  color: var(--personal-color-primary-text-navy);
  font-size: 0.75rem;
}

.form-field > span:first-child,
.file-label-row > span:first-child,
.cancel-field > span:first-child {
  font-weight: 600;
}

.readonly-input,
.form-select {
  width: 100%;
  height: 38px;
  box-sizing: border-box;
}

.readonly-input:disabled {
  color: var(--personal-color-primary-text-navy);
  background: var(--personal-color-bg-surface-frost);
}

.form-select {
  padding: 8px 12px;
  border: 1px solid var(--personal-color-border-mist);
  border-radius: 4px;
  color: var(--personal-color-primary-text-navy);
  background: var(--personal-color-white);
  font-size: 0.82rem;
}

.form-select:disabled {
  color: var(--personal-color-text-tertiary-slate);
  background: var(--personal-color-bg-surface-frost);
}

.file-label-row {
  display: flex;
  align-items: center;
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

.file-select-action,
.modal-cancel-action {
  flex: 0 0 auto;
  border: 1px solid var(--personal-color-border-mist);
  background: var(--personal-color-bg-surface-frost);
}

.file-count {
  flex: 0 0 auto;
  color: var(--personal-color-text-faint-fog);
  font-size: 0.75rem;
}

.file-count--attached {
  color: var(--personal-color-login-primary-navy);
  font-weight: 500;
}

.file-chips {
  min-width: 0;
  flex: 1;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  margin-left: auto;
}

.file-chip {
  min-width: 0;
  height: 24px;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 4px 0 8px;
  border: 1px solid var(--personal-color-border-mist);
  border-radius: 4px;
  color: var(--personal-color-login-primary-navy);
  background: var(--personal-color-bg-surface-frost);
  font-size: 0.72rem;
}

.file-chip-name {
  min-width: 0;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-remove-mark {
  color: var(--personal-color-text-tertiary-slate);
  font-size: 0.95rem;
}

.required-guide,
.form-error {
  color: var(--personal-color-danger-coral);
}

.required-guide {
  font-size: 0.7rem;
}

.form-error {
  margin: 8px 0 0;
  font-size: 0.75rem;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 12px;
}

.history-section {
  margin-top: 30px;
}

.section-title {
  margin: 0 0 12px;
  color: var(--personal-color-primary-text-navy);
  font-size: 1rem;
  font-weight: 700;
}

.table-scroll {
  overflow-x: auto;
}

.department-transfer-status.status-badge {
  padding: 0;
  border: 0;
  border-radius: 0;
  color: var(--personal-color-primary-text-navy);
  background: transparent;
  font-size: inherit;
  font-weight: 600;
}

.cancel-action {
  display: inline-flex;
  color: var(--personal-color-danger-coral);
  background: transparent;
}

.cancel-field {
  font-size: 0.9rem;
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

@media (max-width: 900px) {
  .form-grid--departments {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .form-grid--application {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .form-grid--departments,
  .file-chips {
    grid-template-columns: 1fr;
  }

  .file-picker {
    align-items: flex-start;
    flex-direction: column;
  }

  .file-chips {
    width: 100%;
    margin-left: 0;
  }
}
</style>
