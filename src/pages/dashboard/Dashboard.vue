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
            <DashboardCalendar :schedules="dashboardStore.schedules" @update:visible-range="updateVisibleRange" />

            <ScheduleList :schedules="visibleMonthSchedules" />
        </div>

        <div class="right">
            <NoticeList :notices="dashboardStore.notices" />
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
}
</style>
