<script setup>
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue';
import MyButton from '../../components/button/MyButton.vue';
import StatusBadge from '../../components/common/StatusBadge.vue';
import MyInput from '../../components/input/MyInput.vue';
import MyPageContainer from '../../components/layout/MyPageContainer.vue';
import PrevNextPagination from '../../components/pagination/PrevNextPagination.vue';
import MyTable from '../../components/table/MyTable.vue';
import { notify } from '../../composables/useDialog';
import { useInfoChangeStore } from '../../store/infochange/useInfoChangeStore';
import { useProfileStore } from '../../store/profile/useProfileStore';
import { formatDate } from '../../util/format';

defineOptions({ name: 'InfoChangeRequest' });

const PROFILE_IMAGE_MAX_SIZE = 5 * 1024 * 1024;
const ATTACHMENT_MAX_SIZE = 10 * 1024 * 1024;
const REQUEST_MAX_SIZE = 20 * 1024 * 1024;
const ATTACHMENT_MAX_COUNT = 5;
const PROFILE_IMAGE_TYPES = new Set(['image/jpeg', 'image/png']);
const ATTACHMENT_TYPES = new Set(['application/pdf', 'image/jpeg', 'image/png']);

const columns = [
  { key: 'createdAt', label: '신청일' },
  { key: 'changedFields', label: '변경 항목' },
  { key: 'reason', label: '신청 사유' },
  { key: 'files', label: '첨부파일' },
  { key: 'status', label: '진행 상태' },
];

const changedFieldLabels = {
  NAME: '이름',
  PHONE_NUMBER: '전화번호',
  EMAIL: '이메일',
  ADDRESS: '주소',
  PROFILE_IMAGE: '프로필 사진',
};

const statusLabels = {
  REQUESTED: '검토',
  APPROVED: '승인',
  REJECTED: '반려',
  CANCELLED: '취소',
};

const statusVariants = {
  REQUESTED: 'processing',
  APPROVED: 'success',
  REJECTED: 'fail',
  CANCELLED: 'warning',
};

const infoChangeStore = useInfoChangeStore();
const profileStore = useProfileStore();
const profileImageInput = ref(null);
const attachmentInput = ref(null);
const profileImage = ref(null);
const attachments = ref([]);
const previewUrl = ref('');
const errorMessage = ref('');
const isProfileLoading = ref(false);
const profileLoadError = ref('');

const form = reactive({
  newName: '',
  newPhoneNumber: '',
  newEmail: '',
  newAddress: '',
  reason: '',
});

const profile = computed(() => profileStore.profile || {});
const displayedProfileImage = computed(() => previewUrl.value || profile.value.profileImageUrl || '');

const normalize = (value) => value?.trim() || '';

const revokePreview = () => {
  if (!previewUrl.value) return;
  URL.revokeObjectURL(previewUrl.value);
  previewUrl.value = '';
};

const resetForm = () => {
  form.newName = profile.value.name || '';
  form.newPhoneNumber = profile.value.phoneNumber || '';
  form.newEmail = profile.value.email || '';
  form.newAddress = profile.value.address || '';
  form.reason = '';
  profileImage.value = null;
  attachments.value = [];
  errorMessage.value = '';
  revokePreview();
  if (profileImageInput.value) profileImageInput.value.value = '';
  if (attachmentInput.value) attachmentInput.value.value = '';
};

const buildPayload = () => ({
  newName: normalize(form.newName) !== normalize(profile.value.name) ? normalize(form.newName) : null,
  newPhoneNumber:
    normalize(form.newPhoneNumber) !== normalize(profile.value.phoneNumber)
      ? normalize(form.newPhoneNumber)
      : null,
  newEmail: normalize(form.newEmail) !== normalize(profile.value.email) ? normalize(form.newEmail) : null,
  newAddress: normalize(form.newAddress) !== normalize(profile.value.address) ? normalize(form.newAddress) : null,
  profileImage: profileImage.value,
  attachments: attachments.value,
  reason: normalize(form.reason),
});

const validatePayload = (payload) => {
  const changedValues = [payload.newName, payload.newPhoneNumber, payload.newEmail, payload.newAddress];
  if (!changedValues.some((value) => value !== null) && !payload.profileImage) {
    return '현재 정보와 다른 항목을 하나 이상 입력해 주세요.';
  }
  if (payload.newName === '') return '이름은 공백일 수 없습니다.';
  if (payload.newPhoneNumber === '') return '전화번호는 공백일 수 없습니다.';
  if (payload.newEmail === '') return '이메일은 공백일 수 없습니다.';
  if (payload.newAddress === '') return '주소는 공백일 수 없습니다.';
  if (!payload.reason) return '신청 사유를 입력해 주세요.';
  if (payload.newEmail && (payload.newEmail.length > 100 || !/^\S+@\S+\.\S+$/.test(payload.newEmail))) {
    return '올바른 이메일 형식을 입력해 주세요.';
  }
  if (payload.profileImage && !PROFILE_IMAGE_TYPES.has(payload.profileImage.type)) {
    return '프로필 사진은 JPEG 또는 PNG 형식만 선택할 수 있습니다.';
  }
  if (payload.profileImage?.size > PROFILE_IMAGE_MAX_SIZE) {
    return '프로필 사진은 5MB 이하만 선택할 수 있습니다.';
  }
  if (payload.attachments.length > ATTACHMENT_MAX_COUNT) {
    return '증빙파일은 최대 5개까지 선택할 수 있습니다.';
  }
  for (const file of payload.attachments) {
    if (!ATTACHMENT_TYPES.has(file.type)) {
      return '증빙파일은 PDF, JPEG 또는 PNG 형식만 선택할 수 있습니다.';
    }
    if (file.size > ATTACHMENT_MAX_SIZE) {
      return '증빙파일은 파일당 10MB 이하만 선택할 수 있습니다.';
    }
  }
  const totalSize = (payload.profileImage?.size || 0)
    + payload.attachments.reduce((sum, file) => sum + file.size, 0);
  if (totalSize > REQUEST_MAX_SIZE) return '전체 파일 크기는 20MB 이하여야 합니다.';
  return '';
};

const openProfileImagePicker = () => profileImageInput.value?.click();
const openAttachmentPicker = () => attachmentInput.value?.click();

const onProfileImageChange = (event) => {
  profileImage.value = event.target.files?.[0] || null;
  revokePreview();
  if (profileImage.value) previewUrl.value = URL.createObjectURL(profileImage.value);
};

const onAttachmentsChange = (event) => {
  const selected = Array.from(event.target.files || []);
  attachments.value = [...attachments.value, ...selected].filter(
    (file, index, files) =>
      files.findIndex((candidate) =>
        candidate.name === file.name
        && candidate.size === file.size
        && candidate.lastModified === file.lastModified
      ) === index,
  );
  event.target.value = '';
};

const removeAttachment = (index) => attachments.value.splice(index, 1);

const loadProfile = async () => {
  isProfileLoading.value = true;
  profileLoadError.value = '';
  try {
    await profileStore.fetchStudentProfile();
  } catch (error) {
    profileLoadError.value = error.response?.data?.message || '현재 학적 정보를 불러오지 못했습니다.';
  } finally {
    isProfileLoading.value = false;
  }
};

const loadRequests = async (page = 1) => {
  try {
    await infoChangeStore.fetchMyRequests(page);
  } catch (error) {
    await notify(error.response?.data?.message || '변경 신청 내역을 불러오지 못했습니다.');
  }
};

const submitRequest = async () => {
  if (infoChangeStore.isSubmitting) return;
  const payload = buildPayload();
  errorMessage.value = validatePayload(payload);
  if (errorMessage.value) return;

  try {
    await infoChangeStore.submitRequest(payload);
    resetForm();
    await notify('학적 정보 변경 신청이 접수되었습니다.');
    await loadRequests();
  } catch (error) {
    await notify(error.response?.data?.message || '신청 처리 중 오류가 발생했습니다.');
  }
};

const formatChangedFields = (fields = []) =>
  fields.map((field) => changedFieldLabels[field] || field).join(', ') || '-';

const formatFileCount = (item) => {
  const profileImageCount = item.changedFields?.includes('PROFILE_IMAGE') ? 1 : 0;
  return `${(item.attachmentCount || 0) + profileImageCount}개`;
};

watch(() => profileStore.profile, resetForm, { immediate: true });

onMounted(async () => {
  await Promise.all([loadProfile(), loadRequests()]);
});

onUnmounted(revokePreview);
</script>

<template>
  <MyPageContainer title="학적 정보 변경 신청">
    <div class="info-change-page">
      <div
        v-if="isProfileLoading"
        class="profile-state"
      >
        현재 학적 정보를 불러오는 중입니다...
      </div>
      <div
        v-else-if="profileLoadError"
        class="profile-state profile-state--error"
      >
        <span>{{ profileLoadError }}</span>
        <MyButton
          btn-type="button"
          color="white"
          size="small"
          content="다시 시도"
          @click="loadProfile"
        />
      </div>

      <article
        v-else
        class="request-card"
      >

        <form
          class="request-form"
          @submit.prevent="submitRequest"
        >
          <div class="profile-editor">
            <div class="profile-preview">
              <img
                v-if="displayedProfileImage"
                :src="displayedProfileImage"
                alt="현재 프로필 사진"
              >
              <span
                v-else
                class="avatar-placeholder"
                aria-label="등록된 프로필 사진 없음"
              >
                <i class="avatar-head" />
                <i class="avatar-body" />
              </span>
            </div>
            <input
              ref="profileImageInput"
              class="visually-hidden"
              type="file"
              accept=".jpg,.jpeg,.png,image/jpeg,image/png"
              @change="onProfileImageChange"
            >
            <MyButton
              btn-type="button"
              class="outlined-action profile-photo-action"
              color="white"
              size="middle"
              content="사진 변경"
              @click="openProfileImagePicker"
            />
          </div>

          <div class="form-fields">
            <div class="identity-grid">
              <label class="field" for="info-change-name">
                <span>이름</span>
                <MyInput
                  id="info-change-name"
                  v-model="form.newName"
                  class="form-input"
                  maxlength="50"
                />
              </label>
              <label class="field" for="info-change-phone">
                <span>전화번호</span>
                <MyInput
                  id="info-change-phone"
                  v-model="form.newPhoneNumber"
                  class="form-input"
                  maxlength="20"
                />
              </label>
              <label class="field" for="info-change-email">
                <span>이메일</span>
                <MyInput
                  id="info-change-email"
                  v-model="form.newEmail"
                  class="form-input"
                  type="email"
                  maxlength="100"
                />
              </label>
            </div>

            <label class="field" for="info-change-address">
              <span>주소</span>
              <MyInput
                id="info-change-address"
                v-model="form.newAddress"
                class="form-input"
                maxlength="255"
              />
            </label>

            <div class="field">
              <span>증빙파일 (pdf, png, jpeg 가능)</span>
              <div class="attachment-picker">
                <input
                  ref="attachmentInput"
                  class="visually-hidden"
                  type="file"
                  multiple
                  accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                  @change="onAttachmentsChange"
                >
                <MyButton
                  btn-type="button"
                  class="outlined-action file-select-action"
                  color="white"
                  size="middle"
                  content="파일 선택"
                  @click="openAttachmentPicker"
                />
                <span
                  v-if="attachments.length > 0"
                  class="file-count"
                >{{ attachments.length }}개 파일 첨부됨</span>
                <span
                  v-else
                  class="file-empty"
                >선택된 파일 없음</span>
                <div class="file-chips" aria-live="polite">
                  <span
                    v-for="(file, index) in attachments"
                    :key="`${file.name}-${file.lastModified}`"
                    class="file-chip"
                  >
                    <span class="file-icon" aria-hidden="true">▣</span>
                    <span class="file-name">{{ file.name }}</span>
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

            <label class="field" for="info-change-reason">
              <span>신청 사유</span>
              <textarea
                id="info-change-reason"
                v-model="form.reason"
                rows="4"
                maxlength="500"
                placeholder="변경을 신청하는 사유를 구체적으로 입력해 주세요."
              />
            </label>

            <p
              v-if="errorMessage"
              class="error-message"
              role="alert"
            >
              {{ errorMessage }}
            </p>

            <div class="form-actions">
              <MyButton
                btn-type="button"
                class="outlined-action cancel-action"
                color="white"
                size="middle"
                content="취소"
                @click="resetForm"
              />
              <MyButton
                type="submit"
                color="deep-blue"
                size="middle"
                :content="infoChangeStore.isSubmitting ? '신청 중...' : '변경 신청'"
                :disabled="infoChangeStore.isSubmitting"
              />
            </div>
          </div>
        </form>
      </article>

      <section class="history-section">
        <h3 class="section-title">나의 변경 신청 내역</h3>
        <div class="table-scroll">
          <MyTable
            class="info-change-history-table"
            :columns="columns"
            :loading="infoChangeStore.isLoadingMyRequests"
            :empty="!infoChangeStore.isLoadingMyRequests && infoChangeStore.myRequests.length === 0"
            empty-message="변경 신청 내역이 없습니다."
          >
            <tr
              v-for="item in infoChangeStore.myRequests"
              :key="item.id"
            >
              <td>{{ formatDate(item.createdAt) }}</td>
              <td>{{ formatChangedFields(item.changedFields) }}</td>
              <td class="reason-cell" :title="item.reason">{{ item.reason }}</td>
              <td>{{ formatFileCount(item) }}</td>
              <td>
                <StatusBadge
                  class="status-text"
                  :label="statusLabels[item.status] || item.status"
                  :variant="statusVariants[item.status] || 'processing'"
                />
              </td>
            </tr>
          </MyTable>
        </div>

        <PrevNextPagination
          v-if="infoChangeStore.myRequestsPage.page > 1 || infoChangeStore.myRequestsPage.hasNext"
          :page="infoChangeStore.myRequestsPage.page"
          :has-next="infoChangeStore.myRequestsPage.hasNext"
          @page-change="loadRequests"
        />
      </section>
    </div>
  </MyPageContainer>
</template>

<style scoped>
.profile-state {
  min-height: 220px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 34px;
  border: 1px solid var(--personal-color-border-mist);
  border-radius: 8px;
  color: var(--personal-color-text-muted-slate);
  background: var(--personal-color-white);
}

.profile-state--error {
  flex-direction: column;
  gap: 12px;
  color: var(--personal-color-red);
}

.request-card {
  margin-bottom: 34px;
}

.section-title {
  margin: 0 0 10px;
  color: var(--personal-color-primary-text-navy);
  font-size: 1rem;
  font-weight: 600;
}

.request-form {
  display: grid;
  grid-template-columns: 130px minmax(0, 1fr);
  gap: 24px;
  padding: 18px 26px 16px;
  border: 1px solid var(--personal-color-border-mist);
  border-radius: 8px;
  background: var(--personal-color-white);
}

.profile-editor {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.profile-preview {
  width: 104px;
  height: 104px;
  overflow: hidden;
  border-radius: 6px;
  background: var(--personal-color-border-mist);
}

.profile-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-placeholder {
  position: relative;
  display: block;
  width: 100%;
  height: 100%;
}

.avatar-head,
.avatar-body {
  position: absolute;
  left: 50%;
  display: block;
  transform: translateX(-50%);
  background: var(--personal-color-tab-inactive-silver);
}

.avatar-head {
  top: 15px;
  width: 44px;
  height: 44px;
  border-radius: 50%;
}

.avatar-body {
  bottom: 11px;
  width: 64px;
  height: 36px;
  border-radius: 36px 36px 24px 24px;
}

.form-fields {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.identity-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 18px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  color: var(--personal-color-primary-text-navy);
  font-size: 0.78rem;
  font-weight: 400;
}

.field > span {
  font-weight: 600;
}

.form-input {
  width: 100%;
  min-height: 34px;
  color: var(--personal-color-primary-text-navy);
  background: var(--personal-color-white);
  font-weight: 400;
}

.field textarea {
  width: 100%;
  min-height: 72px;
  padding: 10px 12px;
  border: 1px solid var(--personal-color-border-mist);
  border-radius: 4px;
  color: var(--personal-color-primary-text-navy);
  background: var(--personal-color-white);
  font-weight: 400;
  resize: vertical;
}

.field textarea::placeholder {
  color: var(--personal-color-text-faint-fog);
}

.attachment-picker {
  min-height: 38px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 4px 8px;
  border: 1px solid var(--personal-color-border-mist);
  border-radius: 4px;
  background: var(--personal-color-white);
}

.file-chips {
  min-width: 0;
  flex: 1;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  overflow-x: auto;
}

.file-count {
  flex: none;
  color: var(--personal-color-primary-navy);
  font-size: 0.75rem;
  font-weight: 500;
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
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-empty {
  color: var(--personal-color-text-faint-fog);
  font-size: 0.75rem;
  font-weight: 400;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.outlined-action {
  border: 1px solid var(--personal-color-border-mist);
}

.profile-photo-action {
  color: var(--personal-color-login-primary-navy);
}

.cancel-action {
  color: var(--personal-color-login-primary-navy);
}

.file-select-action {
  background: var(--personal-color-bg-surface-frost);
}

.error-message {
  margin: 0;
  color: var(--personal-color-red);
  font-size: 0.8rem;
  font-weight: 500;
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

.history-section {
  padding: 0;
}

.table-scroll {
  overflow-x: auto;
}

.reason-cell {
  max-width: 320px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.status-text.status-badge {
  padding: 0;
  border: 0;
  color: var(--personal-color-primary-text-navy);
  background: transparent;
  font-weight: 600;
}

@media (max-width: 860px) {
  .request-form {
    grid-template-columns: 1fr;
  }

  .profile-editor {
    flex-direction: row;
    justify-content: center;
  }

  .profile-preview {
    width: 82px;
    height: 82px;
  }

  .identity-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 760px) {
  .history-section {
    padding: 0;
  }
}

@media (max-width: 560px) {
  .request-form {
    padding: 16px;
  }

  .attachment-picker {
    align-items: stretch;
    flex-direction: column;
  }

  .file-chips {
    justify-content: flex-start;
    flex-direction: column;
  }

  .file-chip {
    max-width: 100%;
  }
}
</style>

<style>
.info-change-history-table.table-container .my-table th {
  padding: 12px 16px;
  border-bottom: 1px solid var(--personal-color-border-mist);
  color: var(--personal-color-primary-text-navy);
  font-size: 0.75rem;
  font-weight: 600;
}

.info-change-history-table.table-container .my-table td {
  padding: 12px 16px;
  color: var(--personal-color-primary-text-navy);
  font-size: 0.75rem;
  font-weight: 400;
}

.info-change-history-table.table-container .my-table td:last-child {
  font-weight: 600;
}
</style>
