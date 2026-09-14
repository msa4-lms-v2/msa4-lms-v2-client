<script setup>
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { createNotice, getNotice, updateNotice } from '../../api/noticeApi';
import MyAttachmentList from '../../components/common/MyAttachmentList.vue';
import MyButton from '../../components/button/MyButton.vue';
import MyDateField from '../../components/input/MyDateField.vue';
import MyInput from '../../components/input/MyInput.vue';
import MyPageContainer from '../../components/layout/MyPageContainer.vue';
import { notify } from '../../composables/useDialog';
import { useAuthStore } from '../../store/auth/useAuthStore';
import { formatDate, formatFileSize } from '../../util/format';

defineOptions({ name: 'AdminNoticeForm' });

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const noticeId = computed(() => route.params.noticeId);
const isEdit = computed(() => Boolean(noticeId.value));
const tomorrow = ref('');
const refreshTomorrow = () => {
  const date = new Date(); date.setDate(date.getDate() + 1);
  tomorrow.value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};
refreshTomorrow();
let dateTimer;
onMounted(() => { dateTimer = setInterval(refreshTomorrow, 30000); });
onUnmounted(() => clearInterval(dateTimer));
const form = reactive({ title: '', content: '', category: 'NORMAL', normalTransitionDate: '', targetRole: 'ALL' });
const files = ref([]);
const existingFiles = ref([]);
const fileInput = ref(null);
const isLoading = ref(false);
const isSaving = ref(false);
const fileAccept = '.pdf,.jpg,.jpeg,.png,.gif,.webp,.hwp,.hwpx';
const noticeAuthorName = ref('');
const noticeCreatedAt = ref('');

const transitionDateLabel = (value) => value || '-';
const fileSize = formatFileSize;
const previewLabel = computed(() => ({ ALL: '전체', STUDENT: '학생', PROFESSOR: '교수' }[form.targetRole]));
const previewAuthorName = computed(() => (isEdit.value ? (noticeAuthorName.value || '관리자') : (authStore.userInfo?.name || '관리자')));
const previewCreatedAt = computed(() => formatDate(isEdit.value && noticeCreatedAt.value ? noticeCreatedAt.value : new Date()));
const previewFiles = computed(() => files.value.map((file) => ({
  key: `${file.name}-${file.lastModified}`,
  name: file.name,
  size: file.size,
})));
const openFilePicker = () => fileInput.value?.click();

const selectFiles = async (event) => {
  const selected = Array.from(event.target.files || []);
  const combined = [...files.value, ...selected].filter((file, index, all) => all.findIndex((item) => (
    item.name === file.name && item.size === file.size && item.lastModified === file.lastModified
  )) === index);
  if (existingFiles.value.length + combined.length > 5) {
    await notify('첨부파일은 기존 파일을 포함해 최대 5개까지 등록할 수 있습니다.');
  } else if (combined.some((file) => file.size > 10 * 1024 * 1024)) {
    await notify('첨부파일은 파일당 10MB 이하여야 합니다.');
  } else {
    files.value = combined;
  }
  event.target.value = '';
};

const removeFile = (index) => files.value.splice(index, 1);

const payload = () => ({
  title: form.title.trim(),
  content: form.content.trim() || null,
  category: form.category,
  normalTransitionDate: form.category === 'IMPORTANT' ? form.normalTransitionDate || null : null,
  targetRole: form.targetRole,
});

const formData = () => {
  const data = new FormData();
  data.append('request', new Blob([JSON.stringify(payload())], { type: 'application/json' }));
  files.value.forEach((file) => data.append('files', file));
  return data;
};

const validate = () => {
  if (!form.title.trim()) return '제목을 입력해 주세요.';
  if (form.title.trim().length > 100) return '제목은 100자 이하여야 합니다.';
  if (form.content.length > 5000) return '내용은 5,000자 이하여야 합니다.';
  if (form.category === 'IMPORTANT' && !form.normalTransitionDate) return '중요 공지의 일반 공지 전환일을 입력해 주세요.';
  if (form.category === 'IMPORTANT' && new Date(form.normalTransitionDate) <= new Date()) return '일반 공지 전환일은 오늘 이후여야 합니다.';
  return '';
};

const load = async () => {
  if (!isEdit.value) return;
  isLoading.value = true;
  try {
    const { data } = await getNotice(noticeId.value, { pageLoad: true });
    const notice = data.data;
    Object.assign(form, {
      title: notice.title,
      content: notice.content || '',
      category: notice.category,
      normalTransitionDate: notice.normalTransitionDate || '',
      targetRole: notice.targetRole,
    });
    existingFiles.value = notice.attachments || [];
    noticeAuthorName.value = notice.authorName || '';
    noticeCreatedAt.value = notice.createdAt || '';
  } finally {
    isLoading.value = false;
  }
};

const save = async () => {
  const message = validate();
  if (message) { await notify(message); return; }
  isSaving.value = true;
  try {
    const response = isEdit.value
      ? await updateNotice(noticeId.value, formData())
      : await createNotice(formData());
    await notify(isEdit.value ? '공지사항을 수정했습니다.' : '공지사항을 게시했습니다.');
    router.replace({ name: 'AdminNoticeEdit', params: { noticeId: response.data.data.id } });
  } catch (error) {
    await notify(error.response?.data?.message || '공지사항 저장에 실패했습니다.');
  } finally {
    isSaving.value = false;
  }
};

onMounted(load);
</script>

<template>
  <MyPageContainer :title="isEdit ? '공지사항 상세 · 수정' : '공지사항 작성'">
    <div v-if="isLoading" class="loading">공지사항을 불러오는 중입니다...</div>

    <form v-else class="notice-form" @submit.prevent="save">
      <section class="form-card">
        <h3>공지 정보</h3>
        <div class="field full choice-field">
          <span class="field-label">분류</span>
          <div class="inline-options">
            <label>
              <input v-model="form.category" type="radio" value="NORMAL" @change="form.normalTransitionDate = ''" />
              일반 공지
            </label>
            <label>
              <input v-model="form.category" type="radio" value="IMPORTANT" />
              중요 공지
            </label>
          </div>
        </div>

        <div class="field full title-field">
          <label for="notice-title">제목</label>
          <MyInput
            id="notice-title"
            v-model="form.title"
            class="title-input"
            maxlength="100"
            placeholder="공지 제목을 입력해 주세요"
          />
        </div>

        <div class="field full choice-field">
          <span class="field-label">게시 대상</span>
          <div class="inline-options">
            <label><input v-model="form.targetRole" type="radio" value="ALL" /> 전체</label>
            <label><input v-model="form.targetRole" type="radio" value="STUDENT" /> 학생</label>
            <label><input v-model="form.targetRole" type="radio" value="PROFESSOR" /> 교수</label>
          </div>
        </div>

        <div v-if="form.category === 'IMPORTANT'" class="field full">
          <div class="field-heading">
            <label for="notice-transition">일반 공지 전환일</label>
            <span class="transition-guide">선택한 날짜 00:00부터 서버가 중요 공지를 일반 공지로 자동 전환합니다.</span>
          </div>
          <MyDateField id="notice-transition" v-model="form.normalTransitionDate" :min="tomorrow" @focusin="refreshTomorrow" />
        </div>

        <div class="field full">
          <label for="notice-content">내용</label>
          <textarea id="notice-content" v-model="form.content" maxlength="5000" placeholder="공지 내용을 입력해 주세요." />
        </div>

        <div class="field full">
          <span class="field-label">첨부파일</span>
          <input
            ref="fileInput"
            class="file-input"
            type="file"
            :accept="fileAccept"
            multiple
            @change="selectFiles"
          />
          <div class="file-row">
            <MyButton color="white" size="middle" content="파일 추가" @click="openFilePicker" />
            <small>최대 5개, 파일당 10MB 이하</small>
          </div>

          <ul v-if="files.length" class="file-list">
            <li v-for="(file, index) in files" :key="`${file.name}-${file.lastModified}`">
              {{ file.name }} ({{ fileSize(file.size) }})
              <button type="button" aria-label="첨부파일 제거" @click="removeFile(index)">×</button>
            </li>
          </ul>

          <ul v-if="existingFiles.length" class="file-list existing">
            <li v-for="file in existingFiles" :key="file.id">
              <a :href="file.downloadUrl" target="_blank" rel="noopener">{{ file.fileName }}</a>
              ({{ fileSize(file.fileSize) }})
            </li>
          </ul>

          <div class="actions">
            <MyButton
              btn-type="button"
              color="white"
              size="big"
              content="목록"
              @click="router.push({ name: 'AdminNoticeIndex' })"
            />
            <MyButton
              type="submit"
              color="admin-indigo"
              size="big"
              :disabled="isSaving"
              :content="isSaving ? '저장 중' : isEdit ? '수정 저장' : '게시하기'"
            />
          </div>
        </div>
      </section>

      <aside class="preview-card">
        <h3>실시간 미리보기</h3>
        <span v-if="form.category === 'IMPORTANT'" class="important">중요 공지</span>
        <h2>{{ form.title || '공지 제목' }}</h2>
        <p class="meta">{{ previewAuthorName }} | {{ previewCreatedAt }}</p>
        <hr />
        <p class="preview-content">{{ form.content || '공지 내용이 여기에 표시됩니다.' }}</p>

        <hr v-if="files.length" />
        <MyAttachmentList v-if="files.length" :files="previewFiles" />

        <p v-if="form.category === 'IMPORTANT'" class="transition">
          일반 공지 전환 예정: {{ transitionDateLabel(form.normalTransitionDate) }}
        </p>
      </aside>

    </form>
  </MyPageContainer>
</template>

<style scoped>
.notice-form {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(360px, 1fr);
  gap: 18px;
}

.form-card,
.preview-card {
  padding: 22px;
  background: var(--personal-color-white);
  border: 1px solid var(--personal-color-border-mist);
  border-radius: 8px;
}

.form-card {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0 16px;
  align-content: start;
}

.form-card h3,
.preview-card h3 {
  grid-column: 1 / -1;
  margin: 0 0 20px;
  padding-bottom: 12px;
  font-size: 1rem;
  border-bottom: 1px solid var(--personal-color-border-mist);
}

.field {
  display: flex;
  flex-direction: column;
  gap: 7px;
  margin-bottom: 16px;
}

.full {
  grid-column: 1 / -1;
}

.field label,
.field-label {
  font-size: 0.86rem;
  font-weight: 700;
}

.field em {
  color: #d33;
  font-style: normal;
}

.choice-field {
  flex-direction: row;
  align-items: center;
  min-height: 38px;
}

.choice-field .field-label {
  flex: 0 0 76px;
  white-space: nowrap;
}

.title-field {
  flex-direction: row;
  align-items: center;
}

.title-field label {
  flex: 0 0 40px;
}

.title-input {
  flex: 1;
  min-width: 0;
}

.field-heading {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.transition-guide {
  color: #d33;
  font-size: 0.76rem;
}

.field small {
  color: var(--personal-color-text-secondary-steel);
  font-size: 0.76rem;
}

textarea {
  min-height: 160px;
  padding: 10px 12px;
  font: inherit;
  resize: vertical;
  border: 1px solid var(--personal-color-border-mist);
  border-radius: 4px;
}

.inline-options,
.file-row,
.file-list,
.actions {
  display: flex;
}

.inline-options {
  flex-wrap: wrap;
  gap: 28px;
}

.inline-options label {
  font-weight: 400;
}

input[type='radio'] {
  accent-color: var(--personal-color-admin-secondary-indigo);
}

.file-row {
  gap: 10px;
  align-items: center;
  min-height: 29px;
}

.file-input {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.file-list {
  flex-wrap: wrap;
  gap: 7px;
  margin: 4px 0 0;
  padding: 0;
  list-style: none;
}

.file-list li {
  padding: 5px 8px;
  font-size: 0.8rem;
  background: #f7f9fc;
  border: 1px solid var(--personal-color-border-mist);
  border-radius: 4px;
}

.file-list button {
  color: #d33;
  font-size: 1rem;
  cursor: pointer;
  background: transparent;
  border: 0;
}

.file-list a {
  color: var(--personal-color-link-blue);
}

.preview-card h2 {
  margin: 17px 0 8px;
  font-size: 1.35rem;
}

.meta {
  color: var(--personal-color-text-secondary-steel);
  font-size: 0.8rem;
}

.important {
  color: #d33;
  font-size: 0.8rem;
  font-weight: 700;
}

.preview-content {
  min-height: 160px;
  line-height: 1.65;
  white-space: pre-wrap;
}

.transition {
  margin-top: 28px;
  padding: 10px;
  color: #d33;
  font-size: 0.8rem;
  border: 1px solid #f4a6a6;
  border-radius: 5px;
}

.actions {
  grid-column: 1 / -1;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 14px;
}

.loading {
  padding: 48px;
  text-align: center;
}

@media (max-width: 850px) {
  .notice-form,
  .form-card {
    grid-template-columns: 1fr;
  }
}
</style>
