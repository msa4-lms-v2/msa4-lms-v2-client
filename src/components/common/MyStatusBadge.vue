<script setup>
const props = defineProps({
  label: { type: String, required: true },
  variant: {
    type: String,
    required: true,
    validator: (value) => ['success', 'processing', 'warning', 'fail'].includes(value),
  },
});
</script>

<template>
  <span class="status-badge" :class="`status-badge--${props.variant}`">{{ props.label }}</span>
</template>

<style scoped>
.status-badge {
  display: inline-block;
  padding: var(--personal-badge-padding);
  border-radius: var(--personal-radius-badge);
  font-size: var(--personal-badge-font-size);
  font-weight: 500;
}

.status-badge--success {
  background: var(--personal-color-status-success-bg-mint);
  color: var(--personal-color-status-success-text-forest);
}

.status-badge--processing {
  background: var(--personal-color-status-processing-bg-sky);
  color: var(--personal-color-status-processing-text-navy);
}

.status-badge--warning {
  background: var(--personal-color-status-warning-bg-butter);
  color: var(--personal-color-status-warning-text-amber);
}

.status-badge--fail {
  background: var(--personal-color-status-fail-bg-blush);
  color: var(--personal-color-status-fail-text-maroon);
}
</style>
