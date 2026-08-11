<script setup>
defineProps({
    columns: {
        type: Array,
        required: true,
    },
    loading: {
        type: Boolean,
        default: false,
    },
    empty: {
        type: Boolean,
        default: false,
    },
    emptyMessage: {
        type: String,
        default: '조회된 데이터가 없습니다.',
    },
});
</script>

<template>
    <div class="table-container">
        <table class="my-table">
            <thead>
                <tr>
                    <th v-for="column in columns" :key="column.key" :class="column.class">
                        {{ column.label }}
                    </th>
                </tr>
            </thead>

            <tbody>
                <tr v-if="loading">
                    <td :colspan="columns.length" class="loading-text">데이터를 불러오는 중입니다...</td>
                </tr>

                <tr v-else-if="empty">
                    <td :colspan="columns.length" class="empty-text">
                        {{ emptyMessage }}
                    </td>
                </tr>

                <slot v-else />
            </tbody>
        </table>
    </div>
</template>

<style scoped>
.table-container {
    background: white;
    border-radius: 8px;
    border: 1px solid #edf2f7;
    overflow: hidden;
}

.my-table {
    width: 100%;
    border-collapse: collapse;
    text-align: center;
}

.my-table :deep(td) {
    padding: 20px 16px;
    font-size: 0.9rem;
    border-bottom: 1px solid #edf2f7;
    vertical-align: middle;
}

.my-table :deep(td:last-child) {
    text-align: center;
}

.my-table :deep(td:last-child button) {
    display: inline-flex;
    align-items: center;
    justify-content: center;
}

.my-table :deep(th) {
    background-color: #f8f9fa;
    padding: 18px 16px;
    font-size: 0.85rem;
    color: #4f566b;
    border-bottom: 2px solid #edf2f7;
    white-space: nowrap;
}

.my-table :deep(td) {
    padding: 20px 16px;
    font-size: 0.9rem;
    border-bottom: 1px solid #edf2f7;
}
.loading-text,
.empty-text {
    text-align: center;
    padding: 40px !important;
    color: #697386;
}
</style>
