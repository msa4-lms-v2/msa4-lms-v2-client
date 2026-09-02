<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import myAxios from '../../api/myAxios';
import MyButton from '../../components/button/MyButton.vue';
import MyStatusBadge from '../../components/common/MyStatusBadge.vue';
import MyPageContainer from '../../components/layout/MyPageContainer.vue';
import PrevNextPagination from '../../components/pagination/PrevNextPagination.vue';
import MyTable from '../../components/table/MyTable.vue';
import { confirmDialog, notify } from '../../composables/useDialog';
import { formatDate } from '../../util/format';

defineOptions({ name: 'StudentDoubleMajorPage' });

const PDF_MAX_SIZE = 10 * 1024 * 1024;

const columns = [
  { key: 'semester', label: '신청 학기' },
  { key: 'sourceDepartment', label: '주전공' },
  { key: 'targetDepartment', label: '희망 복수전공' },
  { key: 'status', label: '진행 상태' },
  { key: 'createdAt', label: '신청일' },
];

const statusLabels = {
  PENDING: '접수 완료',
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

const fileInput = ref(null);
const departments = ref([]);
const periods = ref([]);
const requests = ref([]);
const selectedCollegeId = ref('');
const selectedDepartmentId = ref('');
const selfIntroduction = ref(null);
const studyPlan = ref(null);
const hasReadGuidelines = ref(false);
const formError = ref('');
const isLoadingForm = ref(false);
const isLoadingRequests = ref(false);
const isSubmitting = ref(false);
const requestPage = ref({ page: 1, size: 20, totalCount: 0, hasNext: false });

const colleges = computed(() => {
  const collegeMap = new Map();
  departments.value.forEach((department) => {
    if (department.college?.id && !collegeMap.has(department.college.id)) {
      collegeMap.set(department.college.id, department.college);
    }
  });
  return [...collegeMap.values()].sort((left, right) => left.name.localeCompare(right.name, 'ko'));
});

const filteredDepartments = computed(() => departments.value
  .filter((department) => String(department.college?.id || '') === String(selectedCollegeId.value))
  .sort((left, right) => left.name.localeCompare(right.name, 'ko')));

const selectedFiles = computed(() => [selfIntroduction.value, studyPlan.value].filter(Boolean));
const selectedPeriod = computed(() => periods.value.find((period) => period.open) || null);

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
const statusVariant = (status) => statusVariants[status] || 'processing';

const validatePdf = (file, documentName) => {
  if (!file) return `${documentName} PDF를 첨부해 주세요.`;
  if (file.type !== 'application/pdf' || !file.name.toLowerCase().endsWith('.pdf')) {
    return `${documentName}는 PDF 형식만 선택할 수 있습니다.`;
  }
  if (file.size > PDF_MAX_SIZE) return `${documentName}는 10MB 이하만 선택할 수 있습니다.`;
  return '';
};

const resetFiles = () => {
  selfIntroduction.value = null;
  studyPlan.value = null;
  if (fileInput.value) fileInput.value.value = '';
};

const openFilePicker = () => fileInput.value?.click();

const onFileChange = (event) => {
  const files = [...(event.target.files || [])];
  if (files.length !== 2) {
    resetFiles();
    formError.value = '자기소개서와 학업계획서 PDF를 한 번에 2개 선택해 주세요.';
    return;
  }

  const firstError = validatePdf(files[0], '자기소개서');
  const secondError = validatePdf(files[1], '학업계획서');
  if (firstError || secondError) {
    resetFiles();
    formError.value = firstError || secondError;
    return;
  }

  const selfIntroductionFile = files.find((file) => /자기|소개|self/i.test(file.name));
  const studyPlanFile = files.find((file) => /학업|계획|study/i.test(file.name));
  if (selfIntroductionFile && studyPlanFile && selfIntroductionFile !== studyPlanFile) {
    selfIntroduction.value = selfIntroductionFile;
    studyPlan.value = studyPlanFile;
  } else {
    [selfIntroduction.value, studyPlan.value] = files;
  }
  formError.value = '';
};

const loadFormData = async () => {
  isLoadingForm.value = true;
  try {
    const [departmentResponse, periodResponse] = await Promise.all([
      myAxios.get('/api/academic/catalog/departments', {
        params: { page: 1, size: 100, active: true },
      }),
      myAxios.get('/api/academic/catalog/double-major-periods', {
        params: { page: 1, size: 100, active: true },
      }),
    ]);

    departments.value = departmentResponse.data.data.items || [];
    periods.value = periodResponse.data.data.items || [];
    selectedCollegeId.value = colleges.value[0]?.id || '';
    selectedDepartmentId.value = filteredDepartments.value[0]?.id || '';
  } catch (error) {
    departments.value = [];
    periods.value = [];
    await notify(error.response?.data?.message || '복수전공 신청 정보를 불러오지 못했습니다.');
  } finally {
    isLoadingForm.value = false;
  }
};

const loadRequests = async (page = 1) => {
  isLoadingRequests.value = true;
  try {
    const response = await myAxios.get('/api/academic/double-major-requests', {
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
    await notify(error.response?.data?.message || '복수전공 신청 내역을 불러오지 못했습니다.');
  } finally {
    isLoadingRequests.value = false;
  }
};

const showGuidelines = async () => {
  const period = selectedPeriod.value;
  const periodMessage = period
    ? `${formatSemester(period.academicYear, period.term)} 모집\n접수 기간: ${formatDate(period.startAt, 'YYYY-MM-DD HH:mm')} ~ ${formatDate(period.endAt, 'YYYY-MM-DD HH:mm')}`
    : '현재 접수 가능한 복수전공 모집 기간이 없습니다.';
  await notify(`${periodMessage}\n필수 서류: 자기소개서, 학업계획서 PDF 각 1부`);
  hasReadGuidelines.value = true;
};

const createIdempotencyKey = () => {
  const suffix = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `double-major-${suffix}`;
};

const submitRequest = async () => {
  if (isSubmitting.value) return;

  if (!hasReadGuidelines.value) {
    formError.value = '모집 요강을 먼저 확인해 주세요.';
    return;
  }
  if (!selectedPeriod.value) {
    formError.value = '현재 접수 가능한 복수전공 모집 기간이 없습니다.';
    return;
  }
  if (!selectedDepartmentId.value) {
    formError.value = '희망 복수전공을 선택해 주세요.';
    return;
  }

  formError.value = validatePdf(selfIntroduction.value, '자기소개서')
    || validatePdf(studyPlan.value, '학업계획서');
  if (formError.value) return;

  const confirmed = await confirmDialog('복수전공 신청서를 제출하시겠습니까?');
  if (!confirmed) return;

  const formData = new FormData();
  formData.append('request', new Blob([JSON.stringify({
    targetDepartmentId: Number(selectedDepartmentId.value),
  })], { type: 'application/json' }));
  formData.append('selfIntroduction', selfIntroduction.value);
  formData.append('studyPlan', studyPlan.value);

  isSubmitting.value = true;
  try {
    await myAxios.post('/api/academic/double-major-requests', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        'Idempotency-Key': createIdempotencyKey(),
      },
    });
    resetFiles();
    formError.value = '';
    await notify('복수전공 신청이 접수되었습니다.');
    await loadRequests(1);
  } catch (error) {
    await notify(error.response?.data?.message || '복수전공 신청 중 오류가 발생했습니다.');
  } finally {
    isSubmitting.value = false;
  }
};

onMounted(async () => {
  await Promise.all([loadFormData(), loadRequests()]);
});
</script>

<template>
  <MyPageContainer title="복수전공 신청">
    <div class="double-major-page">
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
          <div class="form-grid">
            <label
              class="form-field"
              for="double-major-college"
            >
              <span>희망 단과대학</span>
              <select
                id="double-major-college"
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
              for="double-major-department"
            >
              <span>희망 복수전공</span>
              <select
                id="double-major-department"
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

          <div class="form-field file-field">
            <div class="file-label-row">
              <span>증빙파일 (pdf 가능)</span>
              <span class="required-guide">* 필수 제출 서류 : 자기소개서 / 학업계획서</span>
            </div>
            <div class="file-picker">
              <input
                ref="fileInput"
                class="visually-hidden"
                type="file"
                accept=".pdf,application/pdf"
                multiple
                aria-hidden="true"
                tabindex="-1"
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
              <span class="file-count">
                {{ selectedFiles.length ? `${selectedFiles.length}개 파일 첨부됨` : '선택된 파일 없음' }}
              </span>
              <div
                v-if="selectedFiles.length"
                class="file-chips"
              >
                <span
                  v-for="file in selectedFiles"
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
                  <span
                    class="file-remove-mark"
                    aria-hidden="true"
                  >×</span>
                </span>
              </div>
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
              :content="isSubmitting ? '신청 중...' : '복수전공 신청'"
              :disabled="isSubmitting || isLoadingForm || !selectedPeriod || !hasReadGuidelines"
            />
          </div>
        </form>
      </section>

      <section class="history-section">
        <h3 class="section-title">
          복수전공 신청 내역
        </h3>

        <div class="table-scroll">
          <MyTable
            class="double-major-history-table"
            :columns="columns"
            :loading="isLoadingRequests"
            :empty="!isLoadingRequests && requests.length === 0"
            empty-message="신청 내역이 없습니다."
          >
            <tr
              v-for="request in requests"
              :key="request.id"
            >
              <td>{{ formatSemester(request.recruitmentAcademicYear, request.recruitmentTerm) }}</td>
              <td>{{ request.sourceDepartmentName || '-' }}</td>
              <td>{{ request.targetDepartmentName || '-' }}</td>
              <td>
                <MyStatusBadge
                  :class="['double-major-status', { 'double-major-status--rejected': request.status === 'REJECTED' }]"
                  :label="formatStatus(request.status)"
                  :variant="statusVariant(request.status)"
                />
              </td>
              <td>{{ formatDate(request.createdAt) }}</td>
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
.double-major-page {
  max-width: 1120px;
}

.application-section {
  margin-top: 18px;
}

.section-title {
  margin: 0 0 12px;
  color: var(--personal-color-primary-text-navy);
  font-size: 1rem;
  font-weight: 700;
}

.request-card {
  min-height: 240px;
  padding: 26px 20px 20px;
  border: 1px solid var(--personal-color-border-mist);
  border-radius: 8px;
  background: var(--personal-color-white);
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px;
  max-width: 680px;
}

.form-field {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
  color: var(--personal-color-primary-text-navy);
  font-size: 0.75rem;
}

.form-field > span:first-child,
.file-label-row > span:first-child {
  font-weight: 600;
}

.form-select {
  width: 100%;
  height: 38px;
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

.file-field {
  margin-top: 12px;
}

.file-label-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.required-guide,
.form-error {
  color: var(--personal-color-danger-coral);
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
  background: var(--personal-color-bg-surface-frost);
}

.file-count {
  flex: 0 0 auto;
  color: var(--personal-color-login-primary-navy);
  font-size: 0.75rem;
}

.file-chips {
  min-width: 0;
  flex: 1;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 28px;
  margin-left: auto;
}

.file-chip {
  min-width: 0;
  height: 24px;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 8px;
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

.form-error {
  margin: 8px 0 0;
  font-size: 0.75rem;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 68px;
}

.history-section {
  margin-top: 14px;
}

.table-scroll {
  overflow-x: auto;
}

.double-major-status.status-badge {
  padding: 0;
  border: 0;
  border-radius: 0;
  color: var(--personal-color-primary-text-navy);
  background: transparent;
  font-size: inherit;
  font-weight: 400;
}

.double-major-status--rejected.status-badge {
  color: var(--personal-color-danger-coral);
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

@media (max-width: 800px) {
  .form-grid,
  .file-chips {
    grid-template-columns: 1fr;
  }

  .file-picker,
  .file-label-row {
    align-items: flex-start;
    flex-direction: column;
  }

  .file-chips {
    width: 100%;
    gap: 6px;
    margin-left: 0;
  }
}
</style>
