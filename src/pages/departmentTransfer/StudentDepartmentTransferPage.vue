<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import myAxios from '../../api/myAxios';
import MyButton from '../../components/button/MyButton.vue';
import AcademicChangeGuidelineModal from '../../components/common/AcademicChangeGuidelineModal.vue';
import MyModal from '../../components/common/MyModal.vue';
import MyStatusBadge from '../../components/common/MyStatusBadge.vue';
import MyInput from '../../components/input/MyInput.vue';
import MySelect from '../../components/input/MySelect.vue';
import MyPageContainer from '../../components/layout/MyPageContainer.vue';
import PrevNextPagination from '../../components/pagination/PrevNextPagination.vue';
import MyTable from '../../components/table/MyTable.vue';
import { confirmDialog, notify } from '../../composables/useDialog';
import { useProfileStore } from '../../store/profile/useProfileStore';
import {
  hasViewedAcademicChangeGuideline,
  markAcademicChangeGuidelineViewed,
} from '../../util/academic/academicChangeGuidelineView';
import { formatDate } from '../../util/format';

defineOptions({ name: 'StudentDepartmentTransferPage' });

const FILE_MAX_SIZE = 10 * 1024 * 1024;
const ATTACHMENTS_REQUIRED_COUNT = 2;
const GUIDELINE_SECTIONS = [
  {
    heading: '전과(부)',
    paragraphs: ['전과(부)(이하 전과라 한다)란 학사과정 학생이 소속 학과(부)를 변경하여 다른 학과에 소속하는 것을 말합니다.'],
  },
  {
    heading: '허용범위',
    paragraphs: [
      '전과(부)를 허용하는 범위는 다음과 같습니다.\n- 사범대학의 학과\n- 사범대학 이외의 학과는 사범대학 이외의 각 학과\n단, 의과대학, 수의과대학 및 간호대학으로의 전입은 불가합니다.',
      '- 전통 및 현대 문화 관련 학과로의 전입은 학과장의 승인을 받아 대학장이 따로 정할 수 있습니다.\n- 의학대학 전입 인원은 편입학 인원을 포함하여 해당대학 입학정원을 초과할 수 없습니다.',
      '- 전과를 허가하고 입학한 학생, 편입학한 학생 및 치의학대학 학사전문석사통합과정 학생은 전과를 할 수 없습니다.',
    ],
  },
  {
    heading: '지원시기 및 지원자격',
    paragraphs: [
      '시기\n- 전과의 지원 시기는 매 학년도 말로 합니다.',
      '자격\n- 전과 지원자는 2개 정규학기 이상 이수하고 33학점 이상을 취득하고, 4개 정규학기 이상 이수한 학생으로 합니다. 다만, 미취득으로 인한 소속 재학생의 전과는 지원자격을 갖추어야 합니다.\n- 의과대학 및 수의과대학 전입은 예과과정 등록학기 및 이수학점을 충족한 경우에 한합니다.',
    ],
  },
  {
    heading: '인원산정',
    paragraphs: ['전과 및 전입 인원은 각각 모집단위별 입학정원의 100분의 20 이내에서 총장의 승인을 받아 대학장이 따로 정하며, 구체적인 계획과 기준은 매 학년도 말 이전에 공지합니다.'],
  },
  {
    heading: '절차',
    paragraphs: [
      '- 온라인 전과 신청 → 소속학과 및 단과대학 승인 → 지원서와 제출서류 확인 → 전출 승인 후 전입 학과 선발 → 전과\n- 희망하는 소속 학과(부)장의 승인을 받아 지원서에 성적증명서 등 관계 서류를 첨부하여 소속 대학장에게 제출하여야 합니다.\n- 전과 지원 기간 내에 온라인 전과 신청을 완료하여야 하며, 전출 승인을 확정한 학생에 한해서 전입 선발이 가능합니다.',
    ],
  },
];

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
  ADVISOR_APPROVED: '지도교수 승인',
  ADVISOR_REJECTED: '지도교수 반려',
  APPROVED: '승인(기존)',
  APPLIED: '학적 반영 완료',
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
const hasReadGuidelines = ref(false);
const isGuidelineModalOpen = ref(false);
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

const requestPayload = computed(() => ({
  targetDepartmentId: Number(selectedDepartmentId.value),
  targetSemesterId: Number(selectedSemesterId.value),
}));

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

const validateHwp = (file) => {
  if (!file) return '첨부파일을 선택해 주세요.';
  if (!/\.(hwp|hwpx)$/i.test(file.name)) return 'HWP 또는 HWPX 파일만 선택할 수 있습니다.';
  if (file.size > FILE_MAX_SIZE) return '첨부파일은 파일당 10MB 이하만 선택할 수 있습니다.';
  return '';
};

const resetAttachment = () => {
  attachments.value = [];
  if (fileInput.value) fileInput.value.value = '';
};

const openFilePicker = () => fileInput.value?.click();

const onFileChange = (event) => {
  const selected = Array.from(event.target.files || []);
  const validationMessage = selected.map(validateHwp).find(Boolean) || '';
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
  if (combined.length > ATTACHMENTS_REQUIRED_COUNT) {
    formError.value = '전과 첨부파일은 정확히 2개만 선택할 수 있습니다.';
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

const showGuidelines = () => {
  hasReadGuidelines.value = true;
  isGuidelineModalOpen.value = true;
};

const closeGuidelines = () => { isGuidelineModalOpen.value = false; };

const openInitialGuidelines = () => {
  if (hasViewedAcademicChangeGuideline('department-transfer')) {
    hasReadGuidelines.value = true;
    return;
  }

  showGuidelines();
  markAcademicChangeGuidelineViewed('department-transfer');
};

const createIdempotencyKey = (prefix) => {
  const suffix = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}-${suffix}`;
};

const downloadTemplate = async (template, filename) => {
  try {
    const response = await myAxios.get(
      `/api/academic/department-transfer-requests/templates/${template}`,
      { responseType: 'blob' },
    );
    const url = URL.createObjectURL(response.data);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  } catch (error) {
    await notify(error.response?.data?.message || '양식을 다운로드하지 못했습니다.');
  }
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

  if (attachments.value.length !== ATTACHMENTS_REQUIRED_COUNT) {
    formError.value = '작성한 HWP 또는 HWPX 파일을 정확히 2개 첨부해 주세요.';
    return;
  }
  formError.value = attachments.value.map(validateHwp).find(Boolean) || '';
  if (formError.value) return;

  const confirmed = await confirmDialog('전과 신청서를 제출하시겠습니까?');
  if (!confirmed) return;

  const formData = new FormData();
  formData.append('request', new Blob([JSON.stringify(requestPayload.value)], { type: 'application/json' }));
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
  openInitialGuidelines();
  await profileStore.fetchStudentProfile();
  await Promise.all([loadFormData(), loadRequests()]);
});
</script>

<template>
  <MyPageContainer title="전과 신청">
    <div class="department-transfer-page">
      <div class="page-actions">
        <MyButton
          btn-type="button"
          color="deep-blue"
          size="middle"
          content="모집 요강"
          @click="showGuidelines"
        />
        <div class="template-actions">
          <MyButton
            btn-type="button"
            class="template-download-action"
            color="deep-blue"
            size="middle"
            content="학업계획서 다운로드"
            @click="downloadTemplate('study-plan', '학업계획서 양식.hwp')"
          />
          <MyButton
            btn-type="button"
            class="template-download-action"
            color="deep-blue"
            size="middle"
            content="자기소개서 다운로드"
            @click="downloadTemplate('self-introduction', '자기소개서 양식.hwp')"
          />
        </div>
      </div>

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
              <MySelect
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
              </MySelect>
            </label>

            <label
              class="form-field"
              for="target-department"
            >
              <span>희망 학과</span>
              <MySelect
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
              </MySelect>
            </label>
          </div>

          <div class="form-grid form-grid--application">
            <label
              class="form-field"
              for="target-semester"
            >
              <span>적용 희망 학기</span>
              <MySelect
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
              </MySelect>
            </label>

            <div class="form-field file-field">
              <div class="file-label-row">
                <span>증빙파일 (hwp, hwpx만 가능 / 정확히 2개)</span>
              </div>
              <div class="file-picker">
                <input
                  ref="fileInput"
                  class="visually-hidden"
                  type="file"
                  accept=".hwp,.hwpx,application/x-hwp,application/vnd.hancom.hwpx"
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
                    v-for="(file, index) in attachments"
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
              size="big"
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
                  v-if="request.status === 'PENDING' || request.status === 'ADVISOR_APPROVED'"
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

    <AcademicChangeGuidelineModal
      :is-open="isGuidelineModalOpen"
      title="전과 모집 요강"
      :sections="GUIDELINE_SECTIONS"
      @close="closeGuidelines"
    />
  </MyPageContainer>
</template>

<style scoped>
.department-transfer-page {
  width: 100%;
}

.page-actions,
.template-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.page-actions {
  justify-content: space-between;
}

.template-download-action {
  width: auto;
  min-width: 132px;
  padding: 0 14px;
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
  min-height: 44px;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 6px 10px;
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
