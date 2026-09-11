<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import myAxios from '../../api/myAxios';
import MyButton from '../../components/button/MyButton.vue';
import MyInput from '../../components/input/MyInput.vue';
import MyPageContainer from '../../components/layout/MyPageContainer.vue';
import { confirmDialog, notify } from '../../composables/useDialog';
import { useAuthStore } from '../../store/auth/useAuthStore';
import { useProfileStore } from '../../store/profile/useProfileStore';
import { useSemesterStore } from '../../store/semester/useSemesterStore';
import { ACADEMIC_STATUS_LABEL } from '../../util/academic/enumLabels';
import {
  WITHDRAWAL_ATTACHMENT_ACCEPT,
  validateWithdrawalAttachment,
} from '../../util/academic/withdrawalAttachmentPolicy';

defineOptions({ name: 'StudentWithdrawalPage' });

const authStore = useAuthStore();
const profileStore = useProfileStore();
const semesterStore = useSemesterStore();

const form = reactive({ reason: '' });
const fileInput = ref(null);
const attachment = ref(null);
const pendingUpload = ref(null);
const isLoadingPage = ref(false);
const isSubmitting = ref(false);
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

const submitButtonLabel = computed(() => {
  if (isSubmitting.value) return pendingUpload.value ? '증빙 업로드 중...' : '제출 중...';
  return pendingUpload.value ? '증빙 다시 업로드' : '신청서 제출';
});

const createIdempotencyKey = (prefix) => {
  const suffix = globalThis.crypto?.randomUUID?.()
    || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}-${suffix}`;
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
  if (!currentSemester.value) return '현재 학기 정보를 확인할 수 없습니다.';
  if (pendingUpload.value && !attachment.value) return '다시 업로드할 증빙 파일을 선택해 주세요.';
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
      await notify('자퇴 신청과 증빙 파일이 접수되었습니다.');
    } catch (error) {
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

          <div class="form-actions">
            <MyButton
              type="submit"
              color="deep-blue"
              size="big"
              :content="submitButtonLabel"
              :disabled="isSubmitting || isLoadingPage || !currentSemester"
            />
          </div>
        </form>
      </section>
    </div>
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
  color: var(--personal-color-primary-text-navy);
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
.upload-notice {
  margin: 10px 0 0;
  font-size: 0.8rem;
  font-weight: 500;
}
.form-error { color: var(--personal-color-red); }
.upload-notice { color: var(--personal-color-login-primary-navy); }
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
@media (max-width: 640px) {
  .application-card { padding: 22px 18px; }
  .form-actions > * { width: 100%; }
}
</style>
