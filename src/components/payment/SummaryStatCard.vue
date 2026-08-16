<script setup>
defineProps({
  label: { type: String, required: true },
  value: { type: String, required: true },
  highlight: { type: Boolean, default: false },
});
</script>

<template>
  <div class="stat-card">
    <span class="stat-label">{{ label }}</span>
    <span
      class="stat-value"
      :class="{ highlight }"
    >{{ value }}</span>
  </div>
</template>

<style scoped>
.stat-card {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 16px 20px;
  background: var(--personal-color-white);
  border-radius: var(--personal-radius);
  border: 1px solid #e2e8f0;
}

.stat-label {
  font-size: 0.85rem;
  color: #64748b;
}

.stat-value {
  font-size: 1.2rem;
  font-weight: 700;
  color: var(--primary-text-color);
}

.stat-value.highlight {
  color: var(--personal-color-student-secondary);
}
</style>
