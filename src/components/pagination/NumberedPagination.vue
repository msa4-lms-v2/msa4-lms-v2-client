<script setup>
import { computed } from 'vue';

const props = defineProps({
  page: { type: Number, required: true },
  totalCount: { type: Number, required: true },
  size: { type: Number, default: 20 },
});

const emit = defineEmits(['page-change']);

const WINDOW_SIZE = 5;

const totalPages = computed(() => Math.max(1, Math.ceil(props.totalCount / props.size)));

const pages = computed(() => {
  const total = totalPages.value;
  let start = Math.max(1, props.page - Math.floor(WINDOW_SIZE / 2));
  let end = start + WINDOW_SIZE - 1;
  if (end > total) {
    end = total;
    start = Math.max(1, end - WINDOW_SIZE + 1);
  }
  const result = [];
  for (let p = start; p <= end; p += 1) result.push(p);
  return result;
});

const showFirstPage = computed(() => pages.value[0] > 1);
const showLeadingEllipsis = computed(() => pages.value[0] > 2);
const showLastPage = computed(() => pages.value[pages.value.length - 1] < totalPages.value);
const showTrailingEllipsis = computed(() => pages.value[pages.value.length - 1] < totalPages.value - 1);

const goTo = (target) => {
  const clamped = Math.min(Math.max(1, target), totalPages.value);
  if (clamped === props.page) return;
  emit('page-change', clamped);
};
</script>

<template>
  <nav class="numbered-pagination" aria-label="페이지 내비게이션">
    <button type="button" class="nav-btn" :disabled="page <= 1" aria-label="첫 페이지" @click="goTo(1)">«</button>
    <button type="button" class="nav-btn" :disabled="page <= 1" aria-label="이전 페이지" @click="goTo(page - 1)">‹</button>

    <button v-if="showFirstPage" type="button" class="page-btn" @click="goTo(1)">1</button>
    <span v-if="showLeadingEllipsis" class="ellipsis" aria-hidden="true">…</span>

    <button
      v-for="p in pages"
      :key="p"
      type="button"
      class="page-btn"
      :class="{ active: p === page }"
      :aria-current="p === page ? 'page' : null"
      @click="goTo(p)"
    >
      {{ p }}
    </button>

    <span v-if="showTrailingEllipsis" class="ellipsis" aria-hidden="true">…</span>
    <button v-if="showLastPage" type="button" class="page-btn" @click="goTo(totalPages)">{{ totalPages }}</button>

    <button type="button" class="nav-btn" :disabled="page >= totalPages" aria-label="다음 페이지" @click="goTo(page + 1)">›</button>
    <button type="button" class="nav-btn" :disabled="page >= totalPages" aria-label="마지막 페이지" @click="goTo(totalPages)">»</button>
  </nav>
</template>

<style scoped>
.numbered-pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  margin-top: 16px;
}

.nav-btn,
.page-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 28px;
  height: 28px;
  padding: 0 6px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--personal-color-text-muted-slate);
  font-size: 0.8rem;
  cursor: pointer;
}

.nav-btn:hover:not(:disabled),
.page-btn:hover:not(.active) {
  background: var(--personal-color-indigo-soft-lavender);
  color: var(--personal-color-admin-secondary-indigo);
}

.nav-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.page-btn.active {
  background: var(--personal-color-admin-secondary-indigo);
  color: var(--personal-color-white);
  font-weight: 600;
}

.ellipsis {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 28px;
  color: var(--personal-color-text-faint-fog);
}
</style>
