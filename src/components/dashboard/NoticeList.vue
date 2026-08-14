<script setup>
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
        <div class="notice-list">
            <div v-for="notice in notices" :key="notice.id" class="notice-item">
                <div class="notice-title">
                    {{ notice.title }}
                </div>
            </div>
        </div>
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
    background: #ffffff;
    border-radius: 8px;
    padding: 16px;
    box-shadow: 0 4px 14px rgba(0, 0, 0, 0.06);
    flex: 1;
    overflow-y: auto;
}

.notice-item {
    padding: 15px 0px;
    border-bottom: 1px solid #eeeeee;
}

.notice-item:last-child {
    border-bottom: none;
}

.notice-title {
    font-weight: 600;
}
</style>
