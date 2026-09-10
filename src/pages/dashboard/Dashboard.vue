<script setup>
import { computed, onMounted, ref } from 'vue';
import DashboardCalendar from '../../components/dashboard/DashboardCalendar.vue';
import ScheduleList from '../../components/dashboard/ScheduleList.vue';
import NoticeList from '../../components/dashboard/NoticeList.vue';
import MyCard from '../../components/common/MyCard.vue';
import MyPageContainer from '../../components/layout/MyPageContainer.vue';
import { useDashboardStore } from '../../store/dashboard/useDashboardStore.js';
import { useAuthStore } from '../../store/auth/useAuthStore.js';

const dashboardStore = useDashboardStore();
const authStore = useAuthStore();
const dashboardTitle = computed(() => ({
  STUDENT: '학생 대시보드',
  PROFESSOR: '교수 대시보드',
  ADMIN: '관리자 대시보드',
}[authStore.userInfo?.role] || '대시보드'));
const visibleRange = ref({
  start: null,
  end: null,
});

const toDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const isScheduleInVisibleMonth = (schedule) => {
  if (!visibleRange.value.start || !visibleRange.value.end) return true;

  const startDate = toDate(schedule.startDate);
  const endDate = toDate(schedule.endDate) || startDate;

  if (!startDate) return false;

  return startDate < visibleRange.value.end && endDate >= visibleRange.value.start;
};

const visibleMonthSchedules = computed(() => dashboardStore.schedules.filter(isScheduleInVisibleMonth));

const updateVisibleRange = (range) => {
  visibleRange.value = range;
};

onMounted(async () => {
  await Promise.all([dashboardStore.loadSchedules(), dashboardStore.loadNotices()]);
});
</script>

<template>
  <MyPageContainer :title="dashboardTitle">
    <div class="dashboard">
    <div class="left">
      <MyCard v-if="dashboardStore.isSchedulesLoading" class="status-msg">일정을 불러오는 중입니다...</MyCard>
      <MyCard v-else-if="dashboardStore.isSchedulesError" class="status-msg error">
        일정을 불러오지 못했습니다. <button type="button" @click="dashboardStore.loadSchedules()">재시도</button>
      </MyCard>
      <template v-else>
        <DashboardCalendar :schedules="dashboardStore.schedules" @update:visible-range="updateVisibleRange" />
        <ScheduleList :schedules="visibleMonthSchedules" />
      </template>
    </div>

    <div class="right">
      <MyCard v-if="dashboardStore.isNoticesLoading" class="status-msg">공지사항을 불러오는 중입니다...</MyCard>
      <MyCard v-else-if="dashboardStore.isNoticesError" class="status-msg error">
        공지사항을 불러오지 못했습니다. <button type="button" @click="dashboardStore.loadNotices()">재시도</button>
      </MyCard>
      <template v-else>
        <NoticeList :notices="dashboardStore.notices" />
      </template>
    </div>
    </div>
  </MyPageContainer>
</template>

<style scoped>
.dashboard {
  display: grid;
  grid-template-columns: minmax(0, 1.8fr) minmax(280px, 1fr);
  align-items: stretch;
  gap: 20px;
  min-height: calc(100vh - 104px);
  overflow: hidden;
}

@media (max-width: 760px) {
  .dashboard {
    grid-template-columns: 1fr;
    min-height: auto;
    overflow: visible;
  }

  .left {
    grid-template-rows: minmax(520px, auto) auto;
  }
}

.left,
.right {
  min-height: 0;
}

.left {
  display: grid;
  grid-template-rows: minmax(560px, 3fr) minmax(180px, 1fr);
  gap: 16px;
}

.right {
  display: flex;
  flex-direction: column;
}

.status-msg {
  padding: 20px;
  text-align: center;
  color: var(--personal-color-text-muted-slate);
}

.status-msg.error {
  color: var(--personal-color-danger-coral);
}
.status-msg.error button {
  margin-left: 10px;
  padding: 4px 8px;
  border: 1px solid var(--personal-color-danger-coral);
  background: var(--personal-color-white);
  color: var(--personal-color-danger-coral);
  border-radius: 4px;
  cursor: pointer;
}
</style>
