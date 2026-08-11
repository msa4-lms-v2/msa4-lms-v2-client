<script setup>
import MyButton from '../button/MyButton.vue';

defineProps({
    currentPage: Number,
    totalPages: Number,
});

const emit = defineEmits(['page-change']);
</script>

<template>
    <div class="pagination" v-if="totalPages > 0">
        <MyButton
            v-for="page in totalPages"
            :key="page"
            :color="currentPage === page ? 'deep-blue' : 'white'"
            size="small"
            :content="String(page)"
            @click="emit('page-change', page)"
        />
    </div>
</template>

<style scoped>
.pagination {
    display: flex;
    justify-content: center;
    gap: 8px;
    margin-top: 30px;
}

.pagination :deep(button) {
    width: 38px;
    height: 38px;
    padding: 0;
    border: 1px solid #ddd;
    border-radius: 4px;
}

.pagination :deep(button.deep-blue) {
    border-color: var(--primary-color);
}

.pagination :deep(button:hover:not(.deep-blue)) {
    background-color: #f8f9fa;
}
</style>
