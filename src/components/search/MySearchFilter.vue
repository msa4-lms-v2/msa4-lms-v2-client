<script setup>
import MyButton from '../button/MyButton.vue';

defineProps({
    showSubmit: {
        type: Boolean,
        default: true,
    },
    submitText: {
        type: String,
        default: '조회',
    },
});

defineEmits(['search']);
</script>

<template>
    <div class="search-section">
        <div class="search-row">
            <slot></slot>
            <MyButton
                v-if="showSubmit"
                btnType="button"
                color="deep-blue"
                size="small"
                :content="submitText"
                @click="$emit('search')"
            />
        </div>
    </div>
</template>

<style scoped>
.search-section {
    background: white;
    padding: 20px;
    border-radius: 8px;
    border: 1px solid var(--personal-color-border-mist);
    margin-bottom: 24px;
}

.search-row {
    display: flex;
    gap: 16px;
    align-items: flex-end;
    flex-wrap: wrap;
}

/* Scoped 캡슐화를 유지하면서 슬롯으로 들어오는 자식 요소에 스타일을 적용하기 위해 :deep() 사용 */
:deep(.search-group) {
    display: flex;
    flex-direction: column;
    gap: 6px;
}

:deep(.search-group label) {
    color: var(--personal-color-text-secondary-steel);
    font-size: 0.85rem;
    font-weight: 600;
}

:deep(.search-group select),
:deep(.search-group input) {
    min-width: 160px;
    padding: 8px 12px;
    border: 1px solid var(--personal-color-border-mist);
    border-radius: 4px;
    background-color: white;
    box-sizing: border-box;
    font-size: 0.9rem;
}
</style>
