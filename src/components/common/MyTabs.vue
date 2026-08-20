<script setup>
defineProps({
  tabs: {
    type: Array,
    required: true,
    // 예: [{ value: 'PENDING', label: '승인 대기' }, { value: 'COMPLETED', label: '처리 완료' }]
  },
  modelValue: {
    type: [String, Number],
    required: true,
  },
});

const emit = defineEmits(["update:modelValue", "change"]);

const selectTab = (value) => {
  emit("update:modelValue", value);
  emit("change", value);
};
</script>

<template>
  <div class="tab-bar">
    <button
      v-for="tab in tabs"
      :key="tab.value"
      type="button"
      :class="['tab-button', { active: modelValue === tab.value }]"
      @click="selectTab(tab.value)"
    >
      {{ tab.label }}
    </button>
  </div>
</template>

<style scoped>
.tab-bar {
  display: flex;
  gap: 8px;
}

.tab-button {
  height: 36px;
  border: 1px solid #d8dde6;
  border-radius: 4px;
  padding: 0 14px;
  background: var(--personal-color-white);
  color: var(--personal-color-text-tertiary-slate);
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 600;
  transition: all 0.2s ease-in-out;
}

.tab-button:hover {
  background: var(--personal-color-bg-subtle-snow);
}

.tab-button.active {
  border-color: var(--personal-color-primary-navy);
  background: var(--personal-color-primary-navy);
  color: var(--personal-color-white);
}

@media (max-width: 760px) {
  .tab-bar {
    width: 100%;
  }

  .tab-button {
    flex: 1;
  }
}
</style>
