<script setup>
import { computed, onMounted, ref } from 'vue';
import DashboardCalendar from '../../components/dashboard/DashboardCalendar.vue';
import ScheduleList from '../../components/dashboard/ScheduleList.vue';
import NoticeList from '../../components/dashboard/NoticeList.vue';
import { useDashboardStore } from '../../store/dashboard/useDashboardStore.js';

const dashboardStore = useDashboardStore();
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
    <div class="dashboard">
        <div class="left">
            <div v-if="dashboardStore.isSchedulesLoading" class="status-msg">일정을 불러오는 중입니다...</div>
            <div v-else-if="dashboardStore.isSchedulesError" class="status-msg error">
                일정을 불러오지 못했습니다. <button type="button" @click="dashboardStore.loadSchedules()">재시도</button>
            </div>
            <template v-else>
                <DashboardCalendar :schedules="dashboardStore.schedules" @update:visible-range="updateVisibleRange" />
                <ScheduleList :schedules="visibleMonthSchedules" />
                <div v-if="dashboardStore.schedules.length === 0" class="empty-msg">일정이 없습니다.</div>
            </template>
        </div>

        <div class="right">
            <div v-if="dashboardStore.isNoticesLoading" class="status-msg">공지사항을 불러오는 중입니다...</div>
            <div v-else-if="dashboardStore.isNoticesError" class="status-msg error">
                공지사항을 불러오지 못했습니다. <button type="button" @click="dashboardStore.loadNotices()">재시도</button>
            </div>
            <template v-else>
                <NoticeList :notices="dashboardStore.notices" />
                <div v-if="dashboardStore.notices.length === 0" class="empty-msg">공지사항이 없습니다.</div>
            </template>
        </div>
    </div>
</template>

<style scoped>
.dashboard {
    display: grid;
    grid-template-columns: minmax(0, 1.8fr) minmax(280px, 1fr);
    align-items: stretch;
    gap: 20px;
    background: #f5f7fb;
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

.status-msg, .empty-msg {
    padding: 20px;
    background: #fff;
    border-radius: 8px;
    text-align: center;
    color: #64748b;
    box-shadow: 0 4px 14px rgba(0, 0, 0, 0.06);
}

.status-msg.error {
    color: #ef4444;
}
.status-msg.error button {
    margin-left: 10px;
    padding: 4px 8px;
    border: 1px solid #ef4444;
    background: #fff;
    color: #ef4444;
    border-radius: 4px;
    cursor: pointer;
}
</style>
