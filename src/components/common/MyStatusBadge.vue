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
.status-badge--success {
  color: var(--personal-color-status-success-text-forest);
}

.status-badge--processing {
  color: var(--personal-color-status-processing-text-navy);
}

.status-badge--warning {
  color: var(--personal-color-status-warning-text-amber);
}

.status-badge--fail {
  color: var(--personal-color-status-fail-text-maroon);
}
</style>
