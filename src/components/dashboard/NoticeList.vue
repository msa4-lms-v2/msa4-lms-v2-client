<script setup>
import { computed, onUnmounted, ref } from 'vue';
import { getNotice } from '../../api/noticeApi';
import MyAttachmentList from '../common/MyAttachmentList.vue';
import MyCard from '../common/MyCard.vue';
import MyModal from '../common/MyModal.vue';
import MyButton from '../button/MyButton.vue';
import { formatDate } from '../../util/format';

const props = defineProps({
  enableDetail: { type: Boolean, default: false },
  notices: {
    type: Array,
    default: () => [],
  },
});
const selected = ref(null);
const detail = ref(null);
const isLoading = ref(false);
const errorMessage = ref('');
let requestVersion = 0;

const loadDetail = async () => {
  if (!selected.value || !props.enableDetail) return;
  const version = ++requestVersion;
  const id = selected.value.id;
  isLoading.value = true;
  detail.value = null;
  errorMessage.value = '';
  try {
    const response = await getNotice(id);
    if (version === requestVersion) detail.value = response.data.data;
  } catch (error) {
    if (version === requestVersion) errorMessage.value = error.response?.data?.message || '공지사항을 불러오지 못했습니다.';
  } finally {
    if (version === requestVersion) isLoading.value = false;
  }
};
const openDetail = (notice) => {
  selected.value = notice;
  loadDetail();
};
const closeDetail = () => {
  requestVersion += 1;
  selected.value = null;
  detail.value = null;
  isLoading.value = false;
  errorMessage.value = '';
};

const detailAttachments = computed(() => (detail.value?.attachments || []).map((file) => ({
  key: file.id,
  name: file.fileName,
  size: file.fileSize,
  href: file.downloadUrl,
})));

onUnmounted(() => { requestVersion += 1; });
</script>

<template>
  <div class="notice-section">
    <div class="common-section-header">
      <h3>공지사항</h3>
    </div>
    <MyCard class="notice-list">
      <p v-if="notices.length === 0" class="empty-message">
        공지사항이 없습니다.
      </p>
      <div v-for="notice in notices" :key="notice.id" class="notice-item">
        <button v-if="enableDetail" type="button" class="notice-title notice-link" @click="openDetail(notice)">
          {{ notice.title }}
        </button>
        <div v-else class="notice-title">
          {{ notice.title }}
        </div>
      </div>
    </MyCard>
    <MyModal v-if="enableDetail" :is-open="Boolean(selected)" max-width="760px" @close="closeDetail">
      <div class="notice-detail" aria-live="polite" :aria-busy="isLoading">
        <p v-if="isLoading">공지사항을 불러오는 중입니다...</p>
        <p v-else-if="errorMessage" class="detail-error" role="alert">{{ errorMessage }}</p>
        <article v-else-if="detail" class="notice-article">
          <header class="notice-article-header">
            <h2>{{ detail.title }}</h2>
            <p>
              <span>{{ detail.authorName || '관리자' }}</span>
              <span class="meta-divider" aria-hidden="true">|</span>
              <time :datetime="detail.createdAt">{{ formatDate(detail.createdAt) }}</time>
            </p>
          </header>

          <div class="notice-content">{{ detail.content || '등록된 본문이 없습니다.' }}</div>

          <section v-if="detail.attachments?.length" class="notice-attachments" aria-labelledby="notice-attachment-title">
            <h3 id="notice-attachment-title">첨부파일</h3>
            <MyAttachmentList :files="detailAttachments" />
          </section>
        </article>
      </div>
      <template #footer>
        <MyButton v-if="errorMessage" color="deep-blue" size="middle" content="재시도" @click="loadDetail" />
        <MyButton color="white" size="middle" content="닫기" @click="closeDetail" />
      </template>
    </MyModal>
  </div>
</template>

<style scoped>
.notice-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.notice-list {
  padding: 16px;
  flex: 1;
  overflow-y: auto;
}

.notice-item {
  padding: 15px 0px;
  border-bottom: 1px solid var(--personal-color-border-mist);
}

.notice-item:last-child {
  border-bottom: none;
}

.notice-title {
  font-weight: 600;
}

.notice-link {
  display: block;
  width: 100%;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  font-weight: 600;
  text-align: left;
  cursor: pointer;
  overflow-wrap: anywhere;
}
.notice-link:hover { text-decoration: underline; }
.notice-link:focus-visible { outline: 2px solid var(--personal-color-primary-navy); outline-offset: 4px; }

.notice-detail {
  min-height: 100px;
}

.notice-article-header {
  padding: 8px 0 20px;
  border-bottom: 1px solid var(--personal-color-border-mist);
}

.notice-article-header h2 {
  margin: 0;
  color: var(--personal-color-primary-text-navy);
  font-size: 1.45rem;
  font-weight: 800;
  line-height: 1.4;
  overflow-wrap: anywhere;
}

.notice-article-header p {
  display: flex;
  gap: 8px;
  margin: 14px 0 0;
  color: var(--personal-color-text-muted-slate);
  font-size: 0.8rem;
}

.meta-divider {
  color: var(--personal-color-border-mist);
}

.notice-content {
  min-height: 210px;
  padding: 28px 0;
  color: var(--personal-color-primary-text-navy);
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  line-height: 1.8;
}

.notice-attachments {
  border-top: 1px solid var(--personal-color-border-mist);
  padding-top: 18px;
}

.notice-attachments h3 {
  margin: 0 0 12px;
  color: var(--personal-color-primary-text-navy);
  font-size: 0.85rem;
}

.detail-error { color: var(--personal-color-danger-coral); }

.empty-message {
  margin: 0;
  padding: 24px 0;
  color: var(--personal-color-text-muted-slate);
  text-align: center;
}
</style>
