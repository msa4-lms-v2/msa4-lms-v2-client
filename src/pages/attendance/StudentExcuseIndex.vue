<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue';
import {
  createExcuseRequest,
  downloadExcuseAttachment,
  searchAttendanceRecords,
  searchExcuseRequests,
  uploadExcuseAttachment,
} from '../../api/attendanceApi';
import MyButton from '../../components/button/MyButton.vue';
import MyInput from '../../components/input/MyInput.vue';
import MyPageContainer from '../../components/layout/MyPageContainer.vue';
import MySelect from '../../components/input/MySelect.vue';
import MyTable from '../../components/table/MyTable.vue';
import PrevNextPagination from '../../components/pagination/PrevNextPagination.vue';
import { notify } from '../../composables/useDialog';
import { formatDate } from '../../util/format';

defineOptions({ name: 'StudentExcuseIndex' });

const PDF_MAX_SIZE = 10 * 1024 * 1024;
const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

const columns = [
  { key: 'course', label: '과목' },
  { key: 'lectureDate', label: '날짜' },
  { key: 'status', label: '상태' },
  { key: 'reason', label: '사유' },
  { key: 'attachment', label: '첨부파일' },
];

const statusLabels = { PENDING: '대기', APPROVED: '승인', REJECTED: '반려' };
const statusVariants = { PENDING: 'processing', APPROVED: 'success', REJECTED: 'fail' };

const form = reactive({
  courseKey: '',
  lectureDate: '',
  reason: '',
  attachmentFile: null,
});

const attendanceRecords = ref([]);
const requests = ref([]);
const page = ref({ page: 1, size: 20, totalCount: 0, hasNext: false });
const isLoadingCourses = ref(false);
const isLoadingRequests = ref(false);
const isSubmitting = ref(false);
const uploadingRequestId = ref(null);
const downloadingRequestId = ref(null);
const attachmentInput = ref(null);
const fileInputRefs = ref({});
const formError = ref('');

const toLocalDateString = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const today = new Date();
const earliestExcuseDate = new Date(today);
earliestExcuseDate.setDate(earliestExcuseDate.getDate() - 7);
const minLectureDate = toLocalDateString(earliestExcuseDate);
const maxLectureDate = toLocalDateString(today);

const selectedDateLabel = computed(() => {
  if (!form.lectureDate) return '날짜 선택';
  const date = new Date(`${form.lectureDate}T00:00:00`);
  return `${form.lectureDate.replaceAll('-', '.')} ${DAY_LABELS[date.getDay()]}`;
});

const existingRequestKeys = computed(() => new Set(requests.value.map(
  (request) => `${request.lectureDate}:${request.enrollmentId}:${request.period}`,
)));

const courseOptions = computed(() => {
  const options = new Map();

  attendanceRecords.value.forEach((record) => {
    const key = `${record.enrollmentId}:${record.period}`;
    const requestKey = `${form.lectureDate}:${key}`;
    if (existingRequestKeys.value.has(requestKey) || options.has(key)) return;
    options.set(key, {
      key,
      enrollmentId: record.enrollmentId,
      period: Number(record.period),
      courseName: record.courseName,
      courseCode: record.courseCode,
      sectionNo: record.sectionNo,
    });
  });

  return [...options.values()].sort((left, right) => (
    left.courseName.localeCompare(right.courseName, 'ko')
    || left.period - right.period
  ));
});

const selectedCourse = computed(() => courseOptions.value.find((option) => option.key === form.courseKey));

const loadRequests = async (pageNumber = 1) => {
  isLoadingRequests.value = true;
  try {
    const response = await searchExcuseRequests({ page: pageNumber, size: 20 });
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
    await notify(error.response?.data?.message || '공결 신청 내역을 불러오지 못했습니다.');
  } finally {
    isLoadingRequests.value = false;
  }
};

const loadCourseOptions = async () => {
  attendanceRecords.value = [];
  if (!form.lectureDate) return;

  isLoadingCourses.value = true;
  try {
    const response = await searchAttendanceRecords({
      fromDate: form.lectureDate,
      toDate: form.lectureDate,
      page: 1,
      size: 100,
    });
    attendanceRecords.value = response.data.data?.items || [];
  } catch (error) {
    await notify(error.response?.data?.message || '선택한 날짜의 수업을 불러오지 못했습니다.');
  } finally {
    isLoadingCourses.value = false;
  }
};

const resetForm = () => {
  form.courseKey = '';
  form.lectureDate = '';
  form.reason = '';
  form.attachmentFile = null;
  formError.value = '';
  if (attachmentInput.value) attachmentInput.value.value = '';
};

const selectAttachment = async (event) => {
  const file = event.target.files?.[0];
  if (!file) {
    form.attachmentFile = null;
    return;
  }
  if (file.type !== 'application/pdf' || !file.name.toLowerCase().endsWith('.pdf')) {
    event.target.value = '';
    form.attachmentFile = null;
    await notify('증빙 파일은 PDF 형식만 첨부할 수 있습니다.');
    return;
  }
  if (file.size > PDF_MAX_SIZE) {
    event.target.value = '';
    form.attachmentFile = null;
    await notify('증빙 파일은 10MB 이하만 첨부할 수 있습니다.');
    return;
  }
  form.attachmentFile = file;
};

const submitRequest = async () => {
  if (isSubmitting.value) return;
  if (!form.lectureDate) {
    formError.value = '결석 수업일을 선택해 주세요.';
    return;
  }
  if (form.lectureDate < minLectureDate || form.lectureDate > maxLectureDate) {
    formError.value = '공결은 오늘을 포함해 최근 7일 이내 수업만 신청할 수 있습니다.';
    return;
  }
  if (!selectedCourse.value) {
    formError.value = '공결을 신청할 과목을 선택해 주세요.';
    return;
  }
  if (!form.reason.trim()) {
    formError.value = '공결 신청 사유를 입력해 주세요.';
    return;
  }
  if (form.reason.trim().length > 500) {
    formError.value = '공결 신청 사유는 500자 이하로 입력해 주세요.';
    return;
  }
  formError.value = '';

  isSubmitting.value = true;
  let attachmentError = null;
  try {
    const response = await createExcuseRequest({
      enrollmentId: Number(selectedCourse.value.enrollmentId),
      lectureDate: form.lectureDate,
      period: selectedCourse.value.period,
      reason: form.reason.trim(),
    });
    const requestId = response.data.data?.id;

    if (form.attachmentFile && requestId) {
      try {
        await uploadExcuseAttachment(requestId, form.attachmentFile);
      } catch (error) {
        attachmentError = error;
      }
    }

    resetForm();
    await loadRequests(1);
    if (attachmentError) {
      await notify(attachmentError.response?.data?.message || '공결 신청은 접수됐지만 증빙 파일은 등록하지 못했습니다. 신청 내역에서 다시 첨부해 주세요.');
    } else {
      await notify('공결 신청이 완료되었습니다.');
    }
  } catch (error) {
    await notify(error.response?.data?.message || '공결 신청 중 오류가 발생했습니다.');
  } finally {
    isSubmitting.value = false;
  }
};

const setFileInputRef = (requestId) => (element) => {
  fileInputRefs.value[requestId] = element;
};

const openAttachmentPicker = (requestId) => {
  fileInputRefs.value[requestId]?.click();
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

const onAttachmentChange = async (requestId, event) => {
  const file = event.target.files?.[0];
  event.target.value = '';
  if (!file) return;
  if (file.type !== 'application/pdf' || !file.name.toLowerCase().endsWith('.pdf')) {
    await notify('증빙 파일은 PDF 형식만 첨부할 수 있습니다.');
    return;
  }
  if (file.size > PDF_MAX_SIZE) {
    await notify('증빙 파일은 10MB 이하만 첨부할 수 있습니다.');
    return;
  }

  uploadingRequestId.value = requestId;
  try {
    await uploadExcuseAttachment(requestId, file);
    await notify('증빙 파일이 등록되었습니다.');
    await loadRequests(page.value.page);
  } catch (error) {
    await notify(error.response?.data?.message || '증빙 파일 등록에 실패했습니다.');
  } finally {
    uploadingRequestId.value = null;
  }
};

watch(
  () => form.lectureDate,
  async () => {
    form.courseKey = '';
    formError.value = '';
    await loadCourseOptions();
  },
);

onMounted(() => loadRequests());
</script>

<template>
  <MyPageContainer title="공결 신청">
    <section class="form-panel">
      <form class="request-form" @submit.prevent="submitRequest">
        <div class="form-field date-field">
          <label for="excuse-date">날짜</label>
          <div class="date-chip-wrap">
            <span>{{ selectedDateLabel }}</span>
            <MyInput
              id="excuse-date"
              v-model="form.lectureDate"
              type="date"
              :min="minLectureDate"
              :max="maxLectureDate"
              aria-label="날짜 선택"
            />
          </div>
        </div>

        <div class="form-field subject-field">
          <label for="excuse-course">과목</label>
          <MySelect
            id="excuse-course"
            v-model="form.courseKey"
            :disabled="!form.lectureDate || isLoadingCourses"
          >
            <option value="">
              {{
                !form.lectureDate
                  ? '날짜를 먼저 선택'
                  : isLoadingCourses
                    ? '수업 조회 중'
                    : courseOptions.length === 0
                      ? '신청 가능한 수업이 없습니다'
                      : '선택'
              }}
            </option>
            <option v-for="course in courseOptions" :key="course.key" :value="course.key">
              {{ course.courseName }} ({{ course.sectionNo }}분반 · {{ course.period }}교시)
            </option>
          </MySelect>
        </div>

        <div class="form-field reason-field">
          <label for="excuse-reason">사유</label>
          <MyInput
            id="excuse-reason"
            v-model="form.reason"
            maxlength="500"
            placeholder="사유 입력"
          />
        </div>

        <div class="form-field attachment-field">
          <label for="excuse-attachment">첨부파일</label>
          <input
            id="excuse-attachment"
            ref="attachmentInput"
            type="file"
            accept=".pdf,application/pdf"
            @change="selectAttachment"
          >
        </div>

        <div class="button-field">
          <span aria-hidden="true">&nbsp;</span>
          <MyButton
            type="submit"
            color="deep-blue"
            size="small"
            :content="isSubmitting ? '신청 중' : '신청'"
            :disabled="isSubmitting"
          />
        </div>

        <p v-if="formError" class="form-error" role="alert">{{ formError }}</p>
      </form>
    </section>

    <section class="history-section">
      <div class="section-title-row">
        <h3>공결 신청 내역</h3>
      </div>
      <MyTable
        :columns="columns"
        :loading="isLoadingRequests"
        :empty="!isLoadingRequests && requests.length === 0"
        empty-message="공결 신청 내역이 없습니다."
      >
        <tr v-for="item in requests" :key="item.id">
          <td>
            {{ item.courseName }}
          </td>
          <td>{{ formatDate(item.lectureDate) }}</td>
          <td>
            <span :class="`status-text--${statusVariants[item.status] || 'processing'}`">
              {{ statusLabels[item.status] || item.status }}
            </span>
          </td>
          <td class="reason-cell">
            <span>{{ item.reason }}</span>
            <span v-if="item.status === 'REJECTED' && item.rejectReason" class="reject-reason">
              반려 사유: {{ item.rejectReason }}
            </span>
          </td>
          <td>
            <div v-if="item.attachmentOriginalName || item.status === 'PENDING'" class="attachment-actions">
              <button
                v-if="item.attachmentOriginalName"
                type="button"
                class="attachment-button"
                :disabled="downloadingRequestId === item.id"
                @click="downloadAttachment(item)"
              >
                {{ downloadingRequestId === item.id ? '받는 중...' : item.attachmentOriginalName }}
              </button>
              <input
                v-if="item.status === 'PENDING'"
                :ref="setFileInputRef(item.id)"
                class="visually-hidden"
                type="file"
                accept=".pdf,application/pdf"
                @change="onAttachmentChange(item.id, $event)"
              >
              <MyButton
                v-if="item.status === 'PENDING'"
                btn-type="button"
                color="white"
                size="small"
                :content="uploadingRequestId === item.id ? '업로드 중' : (item.attachmentOriginalName ? '교체' : '첨부')"
                :disabled="uploadingRequestId === item.id"
                @click="openAttachmentPicker(item.id)"
              />
            </div>
            <span v-else>-</span>
          </td>
        </tr>
      </MyTable>

      <PrevNextPagination
        v-if="page.page > 1 || page.hasNext"
        :page="page.page"
        :has-next="page.hasNext"
        @page-change="loadRequests"
      />
    </section>
  </MyPageContainer>
</template>

<style scoped>
.form-panel {
  margin-bottom: 24px;
  overflow: hidden;
  border: 1px solid var(--personal-color-border-mist);
  border-radius: 8px;
  background: var(--personal-color-white);
}

:deep(.page-container) {
  max-width: 1100px;
  padding: 18px 18px 40px;
}

:deep(.page-heading h2) {
  margin: 0 0 18px;
  font-size: 1.35rem;
}

:deep(.my-table th) {
  padding: 11px 10px;
  font-size: 0.76rem;
}

:deep(.my-table td) {
  padding: 12px 10px;
  font-size: 0.78rem;
}

.request-form {
  display: grid;
  grid-template-columns: 170px minmax(180px, 1fr) minmax(200px, 1.25fr) minmax(190px, 1fr) 57px;
  align-items: end;
  gap: 12px;
  padding: 15px;
}

.form-field,
.button-field {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 6px;
}

.form-field label,
.button-field > span {
  color: var(--personal-color-text-secondary-steel);
  font-size: 0.82rem;
  font-weight: 600;
}

.form-field :deep(input),
.form-field :deep(select),
.attachment-field > input {
  box-sizing: border-box;
  width: 100%;
  height: 38px;
  color: var(--personal-color-primary-text-navy);
  font-size: 0.9rem;
  font-weight: 400;
}

.reason-field :deep(input::placeholder) {
  color: var(--personal-color-text-faint-fog);
  font-size: 0.9rem;
  font-weight: 400;
  opacity: 1;
}

.attachment-field > input {
  padding: 3px 8px;
  border: 1px solid var(--personal-color-border-mist);
  border-radius: 4px;
  background: var(--personal-color-white);
}

.attachment-field > input::file-selector-button {
  height: 29px;
  margin-right: 10px;
  padding: 0 10px;
  border: 1px solid var(--personal-color-border-mist);
  border-radius: 4px;
  color: var(--personal-color-text-secondary-steel);
  background: var(--personal-color-table-header-smoke);
  font: inherit;
  font-size: 0.8rem;
  cursor: pointer;
}

.date-chip-wrap {
  display: grid;
  grid-template-columns: 1fr 44px;
  align-items: center;
  height: 38px;
  overflow: hidden;
  border: 1px solid var(--personal-color-border-mist);
  border-radius: 4px;
  background: var(--personal-color-white);
}

.date-chip-wrap > span {
  padding: 0 8px;
  color: var(--personal-color-primary-text-navy);
  font-size: 0.9rem;
  white-space: nowrap;
}

.date-chip-wrap :deep(input[type='date']) {
  justify-self: center;
  width: 24px;
  height: 36px;
  padding: 0;
  border: 0;
  color: transparent;
  background: transparent;
  cursor: pointer;
}

.date-chip-wrap :deep(input[type='date']::-webkit-datetime-edit) {
  color: transparent;
}

.date-chip-wrap :deep(input[type='date']::-webkit-calendar-picker-indicator) {
  width: 22px;
  height: 22px;
  margin: 0;
  padding: 0;
  cursor: pointer;
}

.form-error {
  grid-column: 1 / -1;
  margin: 0;
  color: var(--personal-color-red);
  font-size: 0.82rem;
}

.history-section {
  margin-top: 8px;
}

.section-title-row {
  margin-bottom: 12px;
}

.section-title-row h3 {
  margin: 0;
  color: var(--personal-color-primary-text-navy);
  font-size: 1rem;
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
  min-width: 180px;
  max-width: 320px;
  overflow-wrap: anywhere;
  white-space: normal;
}

.reason-cell > span {
  display: block;
}

.reject-reason {
  margin-top: 4px;
  color: var(--personal-color-status-fail-text-maroon);
  font-size: 0.76rem;
}

.status-text--success {
  color: var(--personal-color-status-success-text-forest);
}

.status-text--processing {
  color: var(--personal-color-status-processing-text-navy);
}

.status-text--fail {
  color: var(--personal-color-status-fail-text-maroon);
}

.attachment-actions {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.attachment-button {
  max-width: 180px;
  padding: 0;
  overflow: hidden;
  border: 0;
  color: var(--personal-color-link-blue);
  background: transparent;
  cursor: pointer;
  font: inherit;
  text-decoration: underline;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.attachment-button:disabled {
  color: var(--personal-color-text-faint-fog);
  cursor: wait;
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

@media (max-width: 1150px) {
  .request-form {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .button-field {
    align-items: flex-end;
  }
}

@media (max-width: 760px) {
  .request-form {
    grid-template-columns: 1fr;
  }

  .button-field {
    align-items: stretch;
  }
}
</style>
