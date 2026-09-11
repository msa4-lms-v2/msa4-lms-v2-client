<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { getMyEnrollments } from '../../api/enrollmentApi';
import {
  createExcuseRequest,
  downloadExcuseAttachment,
  searchExcuseRequests,
  uploadExcuseAttachment,
} from '../../api/attendanceApi';
import MyPageContainer from '../../components/layout/MyPageContainer.vue';
import MyButton from '../../components/button/MyButton.vue';
import MyInput from '../../components/input/MyInput.vue';
import MySelect from '../../components/input/MySelect.vue';
import MyTable from '../../components/table/MyTable.vue';
import MyStatusBadge from '../../components/common/MyStatusBadge.vue';
import PrevNextPagination from '../../components/pagination/PrevNextPagination.vue';
import { notify } from '../../composables/useDialog';
import { formatDate } from '../../util/format';

defineOptions({ name: 'StudentExcuseIndex' });

const PDF_MAX_SIZE = 10 * 1024 * 1024;

const columns = [
  { key: 'course', label: '교과목' },
  { key: 'lectureDate', label: '결석일' },
  { key: 'reason', label: '신청 사유' },
  { key: 'status', label: '처리 상태' },
  { key: 'attachment', label: '증빙' },
  { key: 'createdAt', label: '신청일' },
];

const statusLabels = { PENDING: '대기', APPROVED: '승인', REJECTED: '반려' };
const statusVariants = { PENDING: 'processing', APPROVED: 'success', REJECTED: 'fail' };

const form = reactive({
  enrollmentId: '',
  lectureDate: '',
  period: '',
  reason: '',
});

const enrollments = ref([]);
const requests = ref([]);
const page = ref({ page: 1, size: 20, totalCount: 0, hasNext: false });
const isLoadingEnrollments = ref(false);
const isLoadingRequests = ref(false);
const isSubmitting = ref(false);
const uploadingRequestId = ref(null);
const downloadingRequestId = ref(null);
const fileInputRefs = ref({});
const formError = ref('');

const activeEnrollments = computed(() => enrollments.value.filter((item) => item.enrollmentStatus === 'ACTIVE'));
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

const loadEnrollments = async () => {
  isLoadingEnrollments.value = true;
  try {
    const response = await getMyEnrollments();
    enrollments.value = response.data.data || [];
  } catch (error) {
    enrollments.value = [];
    await notify(error.response?.data?.message || '수강 내역을 불러오지 못했습니다.');
  } finally {
    isLoadingEnrollments.value = false;
  }
};

const loadRequests = async (pageNumber = 1) => {
  isLoadingRequests.value = true;
  try {
    const response = await searchExcuseRequests({ page: pageNumber, size: 20 });
    const data = response.data.data;
    requests.value = data.items || [];
    page.value = { page: data.page, size: data.size, totalCount: data.totalCount, hasNext: data.hasNext };
  } catch (error) {
    requests.value = [];
    await notify(error.response?.data?.message || '공결 신청 내역을 불러오지 못했습니다.');
  } finally {
    isLoadingRequests.value = false;
  }
};

const resetForm = () => {
  form.enrollmentId = '';
  form.lectureDate = '';
  form.period = '';
  form.reason = '';
};

const submitRequest = async () => {
  if (isSubmitting.value) return;
  if (!form.enrollmentId) {
    formError.value = '공결을 신청할 수업을 선택해 주세요.';
    return;
  }
  if (!form.lectureDate) {
    formError.value = '결석 수업일을 선택해 주세요.';
    return;
  }
  if (form.lectureDate < minLectureDate || form.lectureDate > maxLectureDate) {
    formError.value = '공결은 오늘을 포함해 최근 7일 이내 수업만 신청할 수 있습니다.';
    return;
  }
  const period = Number(form.period);
  if (!Number.isInteger(period) || period < 1 || period > 20) {
    formError.value = '교시는 1~20 사이의 숫자로 입력해 주세요.';
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
  try {
    await createExcuseRequest({
      enrollmentId: Number(form.enrollmentId),
      lectureDate: form.lectureDate,
      period,
      reason: form.reason.trim(),
    });
    resetForm();
    await notify('공결 신청이 접수되었습니다. 필요 시 증빙 파일을 첨부해 주세요.');
    await loadRequests(1);
  } catch (error) {
    await notify(error.response?.data?.message || '공결 신청 중 오류가 발생했습니다.');
  } finally {
    isSubmitting.value = false;
  }
};

const setFileInputRef = (requestId) => (el) => {
  fileInputRefs.value[requestId] = el;
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

onMounted(async () => {
  await Promise.all([loadEnrollments(), loadRequests()]);
});
</script>

<template>
  <MyPageContainer title="공결 신청" subtitle="결석 수업일로부터 7일 이내에 공결을 신청합니다.">
    <form class="request-card" @submit.prevent="submitRequest">
      <div class="form-grid">
        <label class="form-field" for="excuse-enrollment">
          <span>대상 수업</span>
          <MySelect id="excuse-enrollment" v-model="form.enrollmentId" :disabled="isLoadingEnrollments">
            <option value="" disabled>수업을 선택해 주세요</option>
            <option v-for="item in activeEnrollments" :key="item.enrollmentId" :value="item.enrollmentId">
              {{ item.courseName }} ({{ item.sectionNo }}분반)
            </option>
          </MySelect>
        </label>

        <label class="form-field" for="excuse-date">
          <span>결석 수업일</span>
          <MyInput
            id="excuse-date"
            v-model="form.lectureDate"
            type="date"
            :min="minLectureDate"
            :max="maxLectureDate"
          />
        </label>

        <label class="form-field" for="excuse-period">
          <span>교시</span>
          <MyInput id="excuse-period" v-model="form.period" numeric-only :max-number="20" placeholder="예: 2" />
        </label>
      </div>

      <label class="form-field" for="excuse-reason">
        <span>신청 사유</span>
        <textarea id="excuse-reason" v-model="form.reason" rows="3" maxlength="500" placeholder="공결 신청 사유를 입력해 주세요."></textarea>
      </label>

      <p v-if="formError" class="form-error" role="alert">{{ formError }}</p>

      <div class="form-actions">
        <MyButton
          type="submit"
          color="deep-blue"
          size="middle"
          :content="isSubmitting ? '신청 중...' : '공결 신청'"
          :disabled="isSubmitting"
        />
      </div>
    </form>

    <section class="history-section">
      <h3 class="section-title">나의 공결 신청 내역</h3>
      <MyTable
        :columns="columns"
        :loading="isLoadingRequests"
        :empty="!isLoadingRequests && requests.length === 0"
        empty-message="공결 신청 내역이 없습니다."
      >
        <tr v-for="item in requests" :key="item.id">
          <td>
            <div class="course-name">{{ item.courseName }}</div>
            <div class="course-code">{{ item.courseCode }} · {{ item.sectionNo }}분반</div>
          </td>
          <td>{{ formatDate(item.lectureDate) }} {{ item.period }}교시</td>
          <td class="reason-cell" :title="item.reason">{{ item.reason }}</td>
          <td>
            <MyStatusBadge :label="statusLabels[item.status] || item.status" :variant="statusVariants[item.status] || 'processing'" />
            <div v-if="item.status === 'REJECTED' && item.rejectReason" class="reject-reason">{{ item.rejectReason }}</div>
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
          <td>{{ formatDate(item.createdAt, 'YYYY-MM-DD HH:mm') }}</td>
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
.request-card {
  padding: 20px;
  margin-bottom: 28px;
  border: 1px solid var(--personal-color-border-mist);
  border-radius: 8px;
  background: var(--personal-color-white);
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
  margin-bottom: 14px;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  color: var(--personal-color-primary-text-navy);
  font-size: 0.82rem;
  font-weight: 600;
}

.form-field textarea {
  width: 100%;
  box-sizing: border-box;
  padding: 10px 12px;
  border: 1px solid var(--personal-color-border-mist);
  border-radius: 4px;
  font-size: 0.88rem;
  font-family: inherit;
  font-weight: 400;
  resize: vertical;
}

.form-error {
  margin: 10px 0 0;
  color: var(--personal-color-red);
  font-size: 0.82rem;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 14px;
}

.history-section {
  margin-top: 8px;
}

.section-title {
  margin: 0 0 12px;
  color: var(--personal-color-primary-text-navy);
  font-size: 1rem;
  font-weight: 700;
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
  max-width: 240px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.reject-reason {
  margin-top: 4px;
  color: var(--personal-color-red);
  font-size: 0.74rem;
}

.attachment-actions {
  display: flex;
  align-items: center;
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

@media (max-width: 760px) {
  .form-grid {
    grid-template-columns: 1fr;
  }
}
</style>
