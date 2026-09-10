<script setup>
import MyCard from '../common/MyCard.vue';

defineProps({
  schedules: {
    type: Array,
    default: () => [],
  },
});
</script>

<template>
  <div class="schedule-section">
    <div class="common-section-header">
      <h3>학사일정</h3>
    </div>
    <MyCard class="schedule-list">
      <p v-if="schedules.length === 0" class="empty-message">
        일정이 없습니다.
      </p>
      <div class="schedule-container">
        <div v-for="schedule in schedules" :key="schedule.id" class="schedule-item">
          <div class="schedule-title">
            {{ schedule.title }}
          </div>

          <div class="schedule-date">
            {{ schedule.startDate }}
            <span v-if="schedule.endDate"> ~ {{ schedule.endDate }} </span>
          </div>
        </div>
      </div>
    </MyCard>
  </div>
</template>

<style scoped>
.schedule-section {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.schedule-list {
  padding: 16px;
  flex: 1;
}

.schedule-container {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 16px;
}

.schedule-item {
  background: var(--personal-color-white);
  padding: 4px 0;
}

.schedule-title {
  font-weight: 600;
  font-size: 16px;
  margin-bottom: 8px;
}

.schedule-date {
  font-size: 14px;
  color: var(--personal-color-primary-text-navy);
}

.empty-message {
  margin: 0;
  padding: 24px 0;
  color: var(--personal-color-text-muted-slate);
  text-align: center;
}
</style>
