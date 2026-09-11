<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import myAxios from '../../api/myAxios';
import {
  cancelWithdrawal,
  downloadWithdrawalAttachment,
  getWithdrawal,
  searchWithdrawals,
} from '../../api/withdrawalApi';
import MyButton from '../../components/button/MyButton.vue';
import MyModal from '../../components/common/MyModal.vue';
import MyInput from '../../components/input/MyInput.vue';
import MyPageContainer from '../../components/layout/MyPageContainer.vue';
import PrevNextPagination from '../../components/pagination/PrevNextPagination.vue';
import MyTable from '../../components/table/MyTable.vue';
import { confirmDialog, notify } from '../../composables/useDialog';
import { useAuthStore } from '../../store/auth/useAuthStore';
import { useProfileStore } from '../../store/profile/useProfileStore';
import { useSemesterStore } from '../../store/semester/useSemesterStore';
import { ACADEMIC_STATUS_LABEL } from '../../util/academic/enumLabels';
import {
  WITHDRAWAL_ATTACHMENT_ACCEPT,
  validateWithdrawalAttachment,
} from '../../util/academic/withdrawalAttachmentPolicy';
import { formatDate } from '../../util/format';

defineOptions({ name: 'StudentWithdrawalPage' });

const authStore = useAuthStore();
const profileStore = useProfileStore();
const semesterStore = useSemesterStore();

const form = reactive({ reason: '' });
const columns = [
  { key: 'createdAt', label: '신청일' },
  { key: 'reason', label: '신청 사유' },
  { key: 'requestedEffectiveDate', label: '희망일' },
  { key: 'status', label: '처리 상태' },
  { key: 'result', label: '처리 결과' },
  { key: 'management', label: '관리' },
];
const statusLabels = {
  PENDING: '교수 검토 대기',
  ADVISOR_APPROVED: '관리자 승인 대기',
  ADVISOR_REJECTED: '교수 반려',
  APPROVED: '자퇴 승인',
  REJECTED: '관리자 반려',
  CANCELLED: '신청 취소',
};
const fileInput = ref(null);
const attachment = ref(null);
const pendingUpload = ref(null);
const requests = ref([]);
const requestPage = ref({ page: 1, size: 20, totalCount: 0, hasNext: false });
const selectedRequest = ref(null);
const detailOpen = ref(false);
const cancelReason = ref('');
const cancelError = ref('');
const isLoadingPage = ref(false);
const isLoadingRequests = ref(false);
const isLoadingDetail = ref(false);
const isSubmitting = ref(false);
const isCancelling = ref(false);
const formError = ref('');

const currentSemester = computed(() => semesterStore.semesters.find(
  (semester) => semester.isCurrent ?? semester.current,
) || null);

const currentSemesterLabel = computed(() => {
  const semester = currentSemester.value;
  if (!semester) return '현재 학기 정보 없음';
  return `${semester.academicYear}학년도 ${semester.term === 'FIRST' ? 1 : 2}학기`;
});

const student = computed(() => {
  const profile = profileStore.profile || {};
  return {
    studentNumber: authStore.userInfo?.loginId || '-',
    collegeName: profile.collegeName || '-',
    email: profile.email || '-',
    name: profile.name || '-',
    departmentName: profile.departmentName || '-',
    gradeLevel: profile.gradeLevel ? `${profile.gradeLevel}학년` : '-',
    academicStatus: ACADEMIC_STATUS_LABEL[profile.academicStatus] || profile.academicStatus || '-',
  };
});

const activeRequest = computed(() => requests.value.find(
  (request) => ['PENDING', 'ADVISOR_APPROVED'].includes(request.status),
) || null);

const canCancelSelected = computed(() => (
  selectedRequest.value && ['PENDING', 'ADVISOR_APPROVED'].includes(selectedRequest.value.status)
));

const submitButtonLabel = computed(() => {
  if (isSubmitting.value) return pendingUpload.value ? '증빙 업로드 중...' : '제출 중...';
  return pendingUpload.value ? '증빙 다시 업로드' : '신청서 제출';
});

const createIdempotencyKey = (prefix) => {
  const suffix = globalThis.crypto?.randomUUID?.()
    || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}-${suffix}`;
};

const statusLabel = (status) => statusLabels[status] || status || '-';

const resultText = (request) => {
  if (request.cancelReason) return request.cancelReason;
  if (request.advisorRejectReason) return request.advisorRejectReason;
  if (request.rejectReason) return request.rejectReason;
  if (request.status === 'APPROVED' && request.effectiveDate) {
    return `${formatDate(request.effectiveDate, 'YYYY. M. D.')} 적용`;
  }
  return '-';
};

const loadRequests = async (page = 1) => {
  isLoadingRequests.value = true;
  try {
    const response = await searchWithdrawals({ page, size: 20 });
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
    await notify(error.response?.data?.message || '자퇴 신청 내역을 불러오지 못했습니다.');
  } finally {
    isLoadingRequests.value = false;
  }
};

const showDetail = async (withdrawalId) => {
  detailOpen.value = true;
  selectedRequest.value = null;
  cancelReason.value = '';
  cancelError.value = '';
  isLoadingDetail.value = true;
  try {
    const response = await getWithdrawal(withdrawalId);
    selectedRequest.value = response.data.data;
  } catch (error) {
    detailOpen.value = false;
    await notify(error.response?.data?.message || '자퇴 신청 상세를 불러오지 못했습니다.');
  } finally {
    isLoadingDetail.value = false;
  }
};

const closeDetail = () => {
  if (isCancelling.value) return;
  detailOpen.value = false;
  selectedRequest.value = null;
  cancelReason.value = '';
  cancelError.value = '';
};

const downloadAttachment = async () => {
  if (!selectedRequest.value?.attachmentOriginalName) return;
  try {
    const response = await downloadWithdrawalAttachment(selectedRequest.value.id);
    const url = URL.createObjectURL(response.data);
    const link = document.createElement('a');
    link.href = url;
    link.download = selectedRequest.value.attachmentOriginalName;
    link.click();
    URL.revokeObjectURL(url);
  } catch (error) {
    await notify(error.response?.data?.message || '증빙 파일을 다운로드하지 못했습니다.');
  }
};

const cancelSelectedRequest = async () => {
  if (!canCancelSelected.value || isCancelling.value) return;
  const reason = cancelReason.value.trim();
  if (!reason) {
    cancelError.value = '취소 사유를 입력해 주세요.';
    return;
  }
  if (reason.length > 255) {
    cancelError.value = '취소 사유는 255자 이하로 입력해 주세요.';
    return;
  }
  if (!await confirmDialog('이 자퇴 신청을 취소하시겠습니까?')) return;

  isCancelling.value = true;
  try {
    const response = await cancelWithdrawal(
      selectedRequest.value.id,
      reason,
      createIdempotencyKey('withdrawal-cancel'),
    );
    selectedRequest.value = response.data.data;
    if (pendingUpload.value?.withdrawalId === selectedRequest.value.id) resetAttachment();
    cancelReason.value = '';
    cancelError.value = '';
    await loadRequests(requestPage.value.page);
    await notify('자퇴 신청을 취소했습니다.');
  } catch (error) {
    await notify(error.response?.data?.message || '자퇴 신청 취소 중 오류가 발생했습니다.');
  } finally {
    isCancelling.value = false;
  }
};

const openFilePicker = () => fileInput.value?.click();

const resetAttachment = () => {
  attachment.value = null;
  pendingUpload.value = null;
  if (fileInput.value) fileInput.value.value = '';
};

const onFileChange = (event) => {
  const selected = event.target.files?.[0] || null;
  const validationMessage = validateWithdrawalAttachment(selected);
  if (validationMessage) {
    formError.value = validationMessage;
    event.target.value = '';
    return;
  }

  attachment.value = selected;
  if (pendingUpload.value && selected) {
    pendingUpload.value = {
      ...pendingUpload.value,
      file: selected,
      key: createIdempotencyKey('withdrawal-attachment'),
    };
  }
  formError.value = '';
  event.target.value = '';
};

const removeAttachment = () => {
  attachment.value = null;
  if (fileInput.value) fileInput.value.value = '';
  if (pendingUpload.value) {
    formError.value = '이미 접수된 신청의 증빙을 다시 선택해 주세요.';
  }
};

const validateForm = () => {
  if (pendingUpload.value && !attachment.value) return '다시 업로드할 증빙 파일을 선택해 주세요.';
  if (!pendingUpload.value && activeRequest.value) return '진행 중인 자퇴 신청을 먼저 확인해 주세요.';
  if (!pendingUpload.value && !form.reason.trim()) return '자퇴 신청 사유를 입력해 주세요.';
  if (form.reason.trim().length > 500) return '자퇴 신청 사유는 500자 이하로 입력해 주세요.';
  return validateWithdrawalAttachment(attachment.value);
};

const uploadAttachment = async ({ withdrawalId, file, key }) => {
  const formData = new FormData();
  formData.append('file', file);
  await myAxios.put(`/api/academic/withdrawals/${withdrawalId}/attachment`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
      'Idempotency-Key': key,
    },
  });
};

const retryAttachment = async () => {
  const retry = { ...pendingUpload.value, file: attachment.value };
  try {
    await uploadAttachment(retry);
    resetAttachment();
    await loadRequests(1);
    await notify('자퇴 신청에 증빙 파일이 등록되었습니다.');
  } catch (error) {
    await notify(error.response?.data?.message || '증빙 파일을 업로드하지 못했습니다. 다시 시도해 주세요.');
  }
};

const submitRequest = async () => {
  if (isSubmitting.value) return;

  formError.value = validateForm();
  if (formError.value) return;

  const confirmation = pendingUpload.value
    ? '접수된 자퇴 신청에 증빙 파일을 다시 업로드하시겠습니까?'
    : '자퇴 신청서를 제출하시겠습니까?';
  if (!await confirmDialog(confirmation)) return;

  isSubmitting.value = true;
  try {
    if (pendingUpload.value) {
      await retryAttachment();
      return;
    }

    const response = await myAxios.post(
      '/api/academic/withdrawals',
      { reason: form.reason.trim() },
      { headers: { 'Idempotency-Key': createIdempotencyKey('withdrawal-create') } },
    );
    const withdrawalId = response.data.data.id;
    form.reason = '';

    if (!attachment.value) {
      await loadRequests(1);
      await notify('자퇴 신청이 접수되었습니다.');
      return;
    }

    const upload = {
      withdrawalId,
      file: attachment.value,
      key: createIdempotencyKey('withdrawal-attachment'),
    };
    pendingUpload.value = upload;
    try {
      await uploadAttachment(upload);
      resetAttachment();
      await loadRequests(1);
      await notify('자퇴 신청과 증빙 파일이 접수되었습니다.');
    } catch (error) {
      await loadRequests(1);
      await notify(
        `자퇴 신청은 접수되었지만 증빙 파일을 업로드하지 못했습니다. ${error.response?.data?.message || '파일을 확인한 뒤 다시 시도해 주세요.'}`,
      );
    }
  } catch (error) {
    await notify(error.response?.data?.message || '자퇴 신청 중 오류가 발생했습니다.');
  } finally {
    isSubmitting.value = false;
  }
};

onMounted(async () => {
  isLoadingPage.value = true;
  try {
    await Promise.all([
      profileStore.fetchStudentProfile(),
      semesterStore.fetchSemesters(),
      loadRequests(),
    ]);
  } catch (error) {
    await notify(error.response?.data?.message || '자퇴 신청에 필요한 정보를 불러오지 못했습니다.');
  } finally {
    isLoadingPage.value = false;
  }
});
</script>

<template>
  <MyPageContainer title="자퇴 신청">
    <div class="withdrawal-page">
      <div class="student-info-scroll">
        <table
          class="student-info-table"
          aria-label="신청 학생 정보"
        >
          <tbody>
            <tr>
              <th scope="row">
                학번
              </th>
              <td>{{ student.studentNumber }}</td>
              <th scope="row">
                단과대학
              </th>
              <td>{{ student.collegeName }}</td>
              <th scope="row">
                이메일
              </th>
              <td>{{ student.email }}</td>
            </tr>
            <tr>
              <th scope="row">
                성명
              </th>
              <td>{{ student.name }}</td>
              <th scope="row">
                학과
              </th>
              <td>{{ student.departmentName }}</td>
              <th aria-hidden="true" />
              <td aria-hidden="true" />
            </tr>
            <tr>
              <th scope="row">
                학년
              </th>
              <td>{{ student.gradeLevel }}</td>
              <th scope="row">
                학적
              </th>
              <td>{{ student.academicStatus }}</td>
              <th aria-hidden="true" />
              <td aria-hidden="true" />
            </tr>
          </tbody>
        </table>
      </div>

      <section class="application-card">
        <form @submit.prevent="submitRequest">
          <label
            class="form-field semester-field"
            for="withdrawal-semester"
          >
            <span>신청 학기</span>
            <MyInput
              id="withdrawal-semester"
              :model-value="isLoadingPage ? '조회 중...' : currentSemesterLabel"
              readonly
              disabled
            />
          </label>

          <div class="form-field file-field">
            <span>증빙 파일 (PDF, HWP/HWPX, 이미지 가능)</span>
            <div class="file-picker">
              <input
                ref="fileInput"
                class="visually-hidden"
                type="file"
                :accept="WITHDRAWAL_ATTACHMENT_ACCEPT"
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
                v-if="!attachment"
                class="file-placeholder"
              >선택된 파일 없음</span>
              <span
                v-else
                class="file-chip"
              >
                <span
                  class="file-name"
                  :title="attachment.name"
                >{{ attachment.name }}</span>
                <MyButton
                  btn-type="button"
                  content="×"
                  :aria-label="`${attachment.name} 삭제`"
                  @click="removeAttachment"
                />
              </span>
            </div>
          </div>

          <label
            class="form-field reason-field"
            for="withdrawal-reason"
          >
            <span>사유</span>
            <textarea
              id="withdrawal-reason"
              v-model="form.reason"
              rows="3"
              maxlength="500"
              :disabled="Boolean(pendingUpload)"
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
          <p
            v-if="pendingUpload"
            class="upload-notice"
            role="status"
          >
            자퇴 신청은 이미 접수되었습니다. 선택한 증빙 파일만 다시 업로드합니다.
          </p>
          <p
            v-else-if="activeRequest"
            class="active-request-notice"
            role="status"
          >
            진행 중인 자퇴 신청이 있습니다. 아래 신청 내역에서 처리 상태를 확인하거나 신청을 취소해 주세요.
          </p>

          <div class="form-actions">
            <MyButton
              type="submit"
              color="deep-blue"
              size="big"
              :content="submitButtonLabel"
              :disabled="isSubmitting || isLoadingPage || Boolean(activeRequest && !pendingUpload)"
            />
          </div>
        </form>
      </section>

      <section class="history-section">
        <div class="history-heading">
          <h3>나의 자퇴 신청 내역</h3>
          <span>총 {{ requestPage.totalCount }}건</span>
        </div>

        <div class="table-scroll">
          <MyTable
            class="withdrawal-history-table"
            :columns="columns"
            :loading="isLoadingRequests"
            :empty="!isLoadingRequests && requests.length === 0"
            empty-message="자퇴 신청 내역이 없습니다."
          >
            <tr
              v-for="request in requests"
              :key="request.id"
            >
              <td>{{ formatDate(request.createdAt, 'YYYY. M. D.') }}</td>
              <td
                class="ellipsis-cell"
                :title="request.reason"
              >
                {{ request.reason }}
              </td>
              <td>{{ formatDate(request.requestedEffectiveDate, 'YYYY. M. D.') }}</td>
              <td>
                <span :class="['status-text', `status-text--${request.status}`]">
                  {{ statusLabel(request.status) }}
                </span>
              </td>
              <td
                class="ellipsis-cell"
                :title="resultText(request)"
              >
                {{ resultText(request) }}
              </td>
              <td>
                <MyButton
                  btn-type="button"
                  class="student-secondary"
                  color="white"
                  size="middle"
                  content="상세보기"
                  @click="showDetail(request.id)"
                />
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
      :is-open="detailOpen"
      title="자퇴 신청 상세"
      max-width="760px"
      @close="closeDetail"
    >
      <p
        v-if="isLoadingDetail"
        class="detail-loading"
      >
        자퇴 신청을 불러오는 중입니다...
      </p>
      <div
        v-else-if="selectedRequest"
        class="detail-content"
      >
        <dl class="detail-grid">
          <div><dt>신청일</dt><dd>{{ formatDate(selectedRequest.createdAt, 'YYYY. M. D. HH:mm') }}</dd></div>
          <div><dt>처리 상태</dt><dd><span :class="['status-text', `status-text--${selectedRequest.status}`]">{{ statusLabel(selectedRequest.status) }}</span></dd></div>
          <div><dt>희망일</dt><dd>{{ formatDate(selectedRequest.requestedEffectiveDate, 'YYYY. M. D.') }}</dd></div>
          <div><dt>자퇴 적용일</dt><dd>{{ formatDate(selectedRequest.effectiveDate, 'YYYY. M. D.') }}</dd></div>
          <div class="detail-wide"><dt>신청 사유</dt><dd>{{ selectedRequest.reason }}</dd></div>
          <div v-if="selectedRequest.advisorRejectReason" class="detail-wide"><dt>교수 반려 사유</dt><dd>{{ selectedRequest.advisorRejectReason }}</dd></div>
          <div v-if="selectedRequest.rejectReason" class="detail-wide"><dt>관리자 반려 사유</dt><dd>{{ selectedRequest.rejectReason }}</dd></div>
          <div v-if="selectedRequest.cancelReason" class="detail-wide"><dt>취소 사유</dt><dd>{{ selectedRequest.cancelReason }}</dd></div>
          <div v-if="selectedRequest.cancelledAt"><dt>취소일</dt><dd>{{ formatDate(selectedRequest.cancelledAt, 'YYYY. M. D. HH:mm') }}</dd></div>
          <div v-if="selectedRequest.attachmentOriginalName" class="detail-wide attachment-row">
            <dt>증빙 파일</dt>
            <dd>
              <span>{{ selectedRequest.attachmentOriginalName }}</span>
              <MyButton btn-type="button" class="student-secondary" color="white" size="small" content="받기" @click="downloadAttachment" />
            </dd>
          </div>
        </dl>

        <div
          v-if="canCancelSelected"
          class="cancel-area"
        >
          <label for="withdrawal-cancel-reason">취소 사유</label>
          <textarea
            id="withdrawal-cancel-reason"
            v-model="cancelReason"
            rows="3"
            maxlength="255"
            placeholder="취소 사유를 입력해 주세요."
            :disabled="isCancelling"
          />
          <p v-if="cancelError" class="form-error" role="alert">{{ cancelError }}</p>
        </div>
      </div>

      <template #footer>
        <MyButton
          v-if="canCancelSelected"
          btn-type="button"
          color="red"
          size="middle"
          :content="isCancelling ? '처리 중' : '신청 취소'"
          :disabled="isCancelling"
          @click="cancelSelectedRequest"
        />
        <MyButton btn-type="button" class="student-secondary" color="white" size="middle" content="닫기" :disabled="isCancelling" @click="closeDetail" />
      </template>
    </MyModal>
  </MyPageContainer>
</template>

<style scoped>
.withdrawal-page { width: 100%; }
.student-info-scroll { overflow-x: auto; }
.student-info-table {
  width: 100%;
  min-width: 760px;
  border-collapse: separate;
  border-spacing: 0;
  overflow: hidden;
  border: 1px solid var(--personal-color-border-mist);
  border-radius: 8px;
  background: var(--personal-color-white);
  color: var(--personal-color-primary-text-navy);
  font-size: 0.78rem;
}
.student-info-table th,
.student-info-table td {
  height: 52px;
  padding: 12px 18px;
  border-right: 1px solid var(--personal-color-border-mist);
  border-bottom: 1px solid var(--personal-color-border-mist);
  text-align: center;
}
.student-info-table th {
  width: 14%;
  background: var(--personal-color-table-header-smoke);
  font-weight: 600;
}
.student-info-table td { width: 19.33%; }
.student-info-table tr:last-child > * { border-bottom: 0; }
.student-info-table tr > *:last-child { border-right: 0; }
.application-card {
  margin-top: 34px;
  padding: 26px 32px 28px;
  border: 1px solid var(--personal-color-border-mist);
  border-radius: 8px;
  background: var(--personal-color-white);
}
.form-field {
  display: flex;
  flex-direction: column;
  gap: 7px;
  color: var(--personal-color-primary-text-navy);
  font-size: 0.78rem;
}
.form-field > span:first-child { font-weight: 600; }
.semester-field { width: min(300px, 100%); }
.semester-field :deep(input:disabled) {
  opacity: 1;
  color: var(--personal-color-primary-text-navy);
  background: var(--personal-color-bg-surface-frost);
}
.file-field,
.reason-field { margin-top: 16px; }
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
.file-select-action {
  flex: 0 0 auto;
  border: 1px solid var(--personal-color-border-mist);
  color: var(--personal-color-primary-navy);
  background: var(--personal-color-bg-surface-frost);
}
.file-placeholder {
  color: var(--personal-color-text-faint-fog);
  font-weight: 400 !important;
}
.file-chip {
  min-width: 0;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 4px 8px;
  border: 1px solid var(--personal-color-border-mist);
  border-radius: 3px;
  color: var(--personal-color-primary-navy);
  background: var(--personal-color-bg-surface-frost);
  font-weight: 500 !important;
}
.file-name {
  min-width: 0;
  max-width: 620px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.reason-field textarea {
  width: 100%;
  min-height: 72px;
  padding: 12px;
  border: 1px solid var(--personal-color-border-mist);
  border-radius: 4px;
  color: var(--personal-color-primary-text-navy);
  background: var(--personal-color-white);
  resize: vertical;
}
.reason-field textarea::placeholder { color: var(--personal-color-text-faint-fog); }
.reason-field textarea:disabled { background: var(--personal-color-bg-surface-frost); }
.form-error,
.upload-notice,
.active-request-notice {
  margin: 10px 0 0;
  font-size: 0.8rem;
  font-weight: 500;
}
.form-error { color: var(--personal-color-red); }
.upload-notice { color: var(--personal-color-login-primary-navy); }
.active-request-notice { color: var(--personal-color-text-tertiary-slate); }
.form-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 28px;
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
.history-section { margin-top: 34px; }
.history-heading {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  margin: 0 6px 10px;
}
.history-heading h3 {
  margin: 0;
  color: var(--personal-color-primary-text-navy);
  font-size: 1rem;
  font-weight: 600;
}
.history-heading span {
  color: var(--personal-color-text-tertiary-slate);
  font-size: 0.75rem;
}
.table-scroll { overflow-x: auto; }
.ellipsis-cell {
  max-width: 220px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.status-text { font-weight: 500; }
.status-text--PENDING,
.status-text--ADVISOR_APPROVED { color: var(--personal-color-status-processing-text-navy); }
.status-text--APPROVED { color: var(--personal-color-status-success-text-forest); }
.status-text--ADVISOR_REJECTED,
.status-text--REJECTED { color: var(--personal-color-status-fail-text-maroon); }
.status-text--CANCELLED { color: var(--personal-color-text-tertiary-slate); }
.student-secondary {
  border: 1px solid var(--personal-color-border-mist);
  color: var(--personal-color-primary-navy);
}
.detail-loading { padding: 36px 0; text-align: center; }
.detail-content { color: var(--personal-color-primary-text-navy); }
.detail-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1px;
  margin: 0;
  border: 1px solid var(--personal-color-border-mist);
  background: var(--personal-color-border-mist);
}
.detail-grid > div {
  min-width: 0;
  display: grid;
  grid-template-columns: 110px 1fr;
  background: var(--personal-color-white);
}
.detail-grid dt,
.detail-grid dd {
  min-width: 0;
  margin: 0;
  padding: 12px 14px;
  overflow-wrap: anywhere;
}
.detail-grid dt {
  background: var(--personal-color-table-header-smoke);
  font-size: 0.78rem;
  font-weight: 600;
}
.detail-grid dd { font-size: 0.8rem; }
.detail-wide { grid-column: 1 / -1; }
.attachment-row dd {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.cancel-area {
  display: flex;
  flex-direction: column;
  gap: 7px;
  margin-top: 18px;
}
.cancel-area label { font-size: 0.8rem; font-weight: 600; }
.cancel-area textarea {
  width: 100%;
  min-height: 72px;
  padding: 12px;
  border: 1px solid var(--personal-color-border-mist);
  border-radius: 4px;
  color: var(--personal-color-primary-text-navy);
  background: var(--personal-color-white);
  resize: vertical;
}
@media (max-width: 640px) {
  .application-card { padding: 22px 18px; }
  .form-actions > * { width: 100%; }
  .detail-grid { grid-template-columns: 1fr; }
  .detail-wide { grid-column: auto; }
}
</style>

<style>
.withdrawal-history-table.table-container .my-table { min-width: 920px; }
.withdrawal-history-table.table-container .my-table th,
.withdrawal-history-table.table-container .my-table td {
  padding: 12px 16px;
  color: var(--personal-color-primary-text-navy);
  font-size: 0.75rem;
}
.withdrawal-history-table.table-container .my-table td .status-text--PENDING,
.withdrawal-history-table.table-container .my-table td .status-text--ADVISOR_APPROVED {
  color: var(--personal-color-status-processing-text-navy);
}
.withdrawal-history-table.table-container .my-table td .status-text--APPROVED {
  color: var(--personal-color-status-success-text-forest);
}
.withdrawal-history-table.table-container .my-table td .status-text--ADVISOR_REJECTED,
.withdrawal-history-table.table-container .my-table td .status-text--REJECTED {
  color: var(--personal-color-status-fail-text-maroon);
}
.withdrawal-history-table.table-container .my-table td .status-text--CANCELLED {
  color: var(--personal-color-text-tertiary-slate);
}
.withdrawal-history-table.table-container .my-table td:last-child button {
  border: 1px solid var(--personal-color-border-mist);
}
</style>
