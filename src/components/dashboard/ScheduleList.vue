<script setup>
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
        <div class="schedule-list">
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
        </div>
    </div>
</template>

<style scoped>
.schedule-section {
    flex: 1;
    display: flex;
    flex-direction: column;
}

.schedule-list {
    background: var(--personal-color-white);
    border-radius: 8px;
    padding: 16px;
    box-shadow: 0 4px 14px var(--personal-shadow-soft);
    flex: 1;
}

.schedule-container {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 16px;
}

.schedule-item {
    background: var(--personal-color-white);
    border: 1px solid var(--personal-color-border-faint);
    border-radius: 10px;
    padding: 14px;
    transition: all 0.2s ease;
}

.schedule-title {
    font-weight: 600;
    font-size: 16px;
    margin-bottom: 8px;
}

.schedule-date {
    font-size: 14px;
    color: var(--personal-color-primary-text);
}
</style>
