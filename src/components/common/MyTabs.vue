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
  background: #fff;
  color: #697386;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 600;
  transition: all 0.2s ease-in-out;
}

.tab-button:hover {
  background: #f8f9fa;
}

.tab-button.active {
  border-color: var(--primary-color);
  background: var(--primary-color);
  color: #fff;
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
