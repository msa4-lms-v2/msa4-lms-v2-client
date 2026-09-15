<script setup>
import { formatCurrency, formatDate } from '../../util/format';
import { INSTALLMENT_ITEM_STATUS_LABEL } from '../../util/payment/enumLabels';

const props = defineProps({
  semesterLabel: { type: String, required: true },
  rounds: { type: Array, required: true },
});
</script>

<template>
  <section class="rounds-section">
    <h3>{{ props.semesterLabel }} · 납부 회차 안내</h3>
    <ul
      class="rounds-grid"
      aria-label="납부 회차별 금액과 기한"
    >
      <li
        v-for="item in props.rounds"
        :key="item.id"
        class="round-card"
      >
        <div class="round-header">
          <span class="round-no">{{ item.roundNo }}회차</span>
          <span
            class="round-status"
            :class="{ 'round-status--paid': item.status === 'PAID' }"
          >
            {{ item.status === 'SCHEDULED' ? '납부 예정' : item.status === 'PARTIAL' ? '부분납부' : INSTALLMENT_ITEM_STATUS_LABEL[item.status] ?? item.status }}
          </span>
        </div>
        <div class="round-info">
          <span>{{ formatCurrency(item.amount) }}</span><span aria-hidden="true">·</span>
          <time
            :datetime="item.dueDate || undefined"
            :title="item.dueDate ? `납부 기한 ${formatDate(item.dueDate)}` : '납부 기한 미정'"
          >{{ item.dueDate ? formatDate(item.dueDate, 'MM.DD') : '-' }}</time>
        </div>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.rounds-section { display: flex; flex-direction: column; gap: 1rem; }
h3 { margin: 0; font-size: 1.1rem; }
.rounds-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(0, 13rem));
  justify-content: start;
  gap: 0.875rem;
  margin: 0;
  padding: 1.75rem 2rem;
  list-style: none;
  background: var(--personal-color-white);
  border: 1px solid var(--personal-color-border-mist);
  border-radius: var(--personal-radius);
}
.round-card {
  box-sizing: border-box; width: 13rem; max-width: 100%; min-height: 4.75rem;
  display: flex; flex-direction: column; justify-content: center; gap: 0.625rem;
  padding: 0.75rem; background: var(--personal-color-bg-surface-frost);
  border: 1px solid var(--personal-color-border-mist); border-radius: var(--personal-radius);
}
.round-header { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; font-size: 0.75rem; font-weight: 700; }
.round-no, .round-status { color: var(--personal-color-primary-navy); }
.round-status--paid { color: var(--personal-color-primary-text-navy); }
.round-info { display: flex; align-items: center; gap: 0.35rem; white-space: nowrap; font-size: 0.75rem; color: var(--personal-color-primary-text-navy); }
@media (max-width: 760px) { .rounds-grid { padding: 1rem; grid-template-columns: repeat(auto-fill, minmax(0, min(13rem, 100%))); } }
</style>
