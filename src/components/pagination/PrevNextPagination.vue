<script setup>
defineProps({
  page: { type: Number, required: true },
  hasNext: { type: Boolean, default: false },
});

const emit = defineEmits(['page-change']);
</script>

<template>
  <div class="pagination">
    <button type="button" :disabled="page <= 1" @click="emit('page-change', page - 1)">이전</button>
    <span>{{ page }} 페이지</span>
    <button type="button" :disabled="!hasNext" @click="emit('page-change', page + 1)">다음</button>
  </div>
</template>

<style scoped>
.pagination {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 16px;
}

.pagination button {
  padding: 6px 12px;
  border-radius: var(--personal-radius);
  border: 1px solid var(--personal-color-border-mist);
  background: var(--personal-color-white);
  cursor: pointer;
}

.pagination button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
