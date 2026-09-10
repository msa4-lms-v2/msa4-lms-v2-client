<script setup>
import MyCard from '../common/MyCard.vue';

defineProps({
  notices: {
    type: Array,
    default: () => [],
  },
});
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
        <div class="notice-title">
          {{ notice.title }}
        </div>
      </div>
    </MyCard>
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

.empty-message {
  margin: 0;
  padding: 24px 0;
  color: var(--personal-color-text-muted-slate);
  text-align: center;
}
</style>
