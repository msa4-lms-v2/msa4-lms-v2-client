<script setup>
import FullCalendar from '@fullcalendar/vue3';
import dayGridPlugin from '@fullcalendar/daygrid';
import dayjs from 'dayjs';
import { computed, ref } from 'vue';

const props = defineProps({
    schedules: {
        type: Array,
        default: () => [],
    },
});

const emit = defineEmits(['update:visibleRange']);
const calendarRef = ref(null);
const calendarTitle = ref('');

const addOneDay = (date) => {
    const parsed = dayjs(date);
    return parsed.isValid() ? parsed.add(1, 'day').format('YYYY-MM-DD') : null;
};

const events = computed(() =>
    props.schedules.map((schedule) => ({
        title: schedule.title,
        start: schedule.startDate,
        end: addOneDay(schedule.endDate || schedule.startDate),
        backgroundColor:
            schedule.targetRole === 'STUDENT'
                ? 'var(--personal-color-green)'
                : schedule.targetRole === 'PROFESSOR'
                ? 'var(--personal-color-secondary-blue)'
                : 'var(--personal-color-red)',
        borderColor: 'transparent',
    }))
);

const moveCalendar = (action) => {
    const calendarApi = calendarRef.value?.getApi();
    if (!calendarApi) return;

    calendarApi[action]();
};

const calendarOptions = {
    plugins: [dayGridPlugin],
    initialView: 'dayGridMonth',
    height: '100%',
    expandRows: true,
    dayMaxEventRows: 2,
    headerToolbar: false,
    datesSet: ({ view }) => {
        calendarTitle.value = view.title;

        emit('update:visibleRange', {
            start: view.currentStart,
            end: view.currentEnd,
        });
    },
};
</script>

<template>
    <div class="calendar-card">
        <div class="calendar-header">
            <button class="calendar-nav-button" type="button" @click="moveCalendar('prev')">‹</button>

            <h3 class="calendar-title">{{ calendarTitle }}</h3>

            <button class="calendar-nav-button" type="button" @click="moveCalendar('next')">›</button>
        </div>

        <div class="calendar-body">
            <FullCalendar
                ref="calendarRef"
                :options="{
                    ...calendarOptions,
                    events,
                }"
            />
        </div>
    </div>
</template>

<style scoped>
.calendar-card {
    display: flex;
    flex-direction: column;
    background: var(--personal-color-white);
    border-radius: 8px;
    padding: 18px;
    box-shadow: 0 4px 14px var(--personal-shadow-soft);
    height: 100%;
    min-height: 0;
    overflow: hidden;
}

@media (min-width: 761px) {
    .calendar-card {
        min-height: 560px;
    }
}

.calendar-header {
    display: grid;
    grid-template-columns: 28px 260px 28px;
    align-items: center;
    justify-content: center;
    gap: 10px;
    margin-bottom: 8px;
    flex: 0 0 auto;
}

.calendar-title {
    width: 260px;
    color: var(--personal-color-primary-text);
    font-size: 25px;
    font-weight: 700;
    line-height: 1;
    text-align: center;
    white-space: nowrap;
}

.calendar-nav-button {
    width: 28px;
    height: 28px;
    border: none;
    background: transparent;
    color: var(--personal-color-primary-text);
    cursor: pointer;
    font-size: 30px;
    line-height: 1;
}

.calendar-nav-button:hover {
    color: var(--personal-color-secondary-blue);
}

.calendar-body {
    flex: 1;
    min-height: 0;
    overflow: hidden;
}

.calendar-body :deep(.fc) {
    height: 100%;
    font-size: 15px;
}

.calendar-body :deep(.fc-view-harness),
.calendar-body :deep(.fc-view),
.calendar-body :deep(.fc-scrollgrid) {
    min-height: 0;
}

.calendar-body :deep(.fc-daygrid-body),
.calendar-body :deep(.fc-daygrid-body table) {
    width: 100% !important;
}

.calendar-body :deep(.fc-daygrid-day-frame) {
    min-height: 0;
}

.calendar-body :deep(.fc-daygrid-event) {
    padding: 2px 6px !important;
    border-radius: 6px !important;
    margin-top: 2px;
    border: none !important;
}

.calendar-body :deep(.fc-event-title) {
    font-size: 11px;
    font-weight: 600;
}

.calendar-body :deep(.fc-day-today) {
    background-color: #e8f0ff !important;
}
</style>
