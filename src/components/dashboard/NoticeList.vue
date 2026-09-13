<script setup>
import { onUnmounted, ref } from 'vue';
import { getNotice } from '../../api/noticeApi';
import MyCard from '../common/MyCard.vue';
import MyModal from '../common/MyModal.vue';
import MyButton from '../button/MyButton.vue';

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
    <MyModal v-if="enableDetail" :is-open="Boolean(selected)" :title="detail?.title || selected?.title || '공지사항'" max-width="720px" @close="closeDetail">
      <div class="notice-detail" aria-live="polite" :aria-busy="isLoading">
        <p v-if="isLoading">공지사항을 불러오는 중입니다...</p>
        <p v-else-if="errorMessage" class="detail-error" role="alert">{{ errorMessage }}</p>
        <div v-else-if="detail" class="notice-content">{{ detail.content || '등록된 본문이 없습니다.' }}</div>
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
.notice-detail { min-height: 100px; }
.notice-content { white-space: pre-wrap; overflow-wrap: anywhere; line-height: 1.7; }
.detail-error { color: var(--personal-color-danger-coral); }

.empty-message {
  margin: 0;
  padding: 24px 0;
  color: var(--personal-color-text-muted-slate);
  text-align: center;
}
</style>
