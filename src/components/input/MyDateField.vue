<script setup>
import { computed } from 'vue';

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

const props = defineProps({
  modelValue: {
    type: String,
    default: '',
  },
  placeholder: {
    type: String,
    default: '날짜 선택',
  },
  id: String,
  ariaLabel: String,
  min: String,
  max: String,
  disabled: {
    type: Boolean,
    default: false,
  },
  required: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['update:modelValue', 'change']);

const displayLabel = computed(() => {
  if (!props.modelValue) return props.placeholder;
  const date = new Date(`${props.modelValue}T00:00:00`);
  return `${props.modelValue.replaceAll('-', '.')} ${DAY_LABELS[date.getDay()]}`;
});

const onInput = (event) => emit('update:modelValue', event.target.value);
</script>

<template>
  <div class="date-chip-wrap" :class="{ 'date-chip-wrap--disabled': disabled }">
    <span :class="{ 'placeholder-text': !modelValue }">{{ displayLabel }}</span>
    <input
      :id="id"
      type="date"
      :value="modelValue"
      :min="min"
      :max="max"
      :disabled="disabled"
      :required="required"
      :aria-label="ariaLabel"
      @input="onInput"
      @change="emit('change', $event)"
    >
  </div>
</template>

<style scoped>
.date-chip-wrap {
  display: grid;
  grid-template-columns: 1fr 44px;
  align-items: center;
  height: 38px;
  overflow: hidden;
  border: 1px solid var(--personal-color-border-mist);
  border-radius: 4px;
  background: var(--personal-color-white);
}

.date-chip-wrap--disabled {
  background: var(--personal-color-bg-surface-frost);
  opacity: 0.7;
}

.date-chip-wrap > span {
  padding: 0 8px;
  color: var(--personal-color-primary-text-navy);
  font-size: 0.9rem;
  font-weight: 400;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.date-chip-wrap > .placeholder-text {
  color: var(--personal-color-text-faint-fog);
}

.date-chip-wrap input[type='date'] {
  justify-self: center;
  width: 24px;
  height: 36px;
  padding: 0;
  border: 0;
  color: transparent;
  background: transparent;
  cursor: pointer;
}

.date-chip-wrap input[type='date']:disabled {
  cursor: not-allowed;
}

.date-chip-wrap input[type='date']::-webkit-datetime-edit {
  color: transparent;
}

.date-chip-wrap input[type='date']::-webkit-calendar-picker-indicator {
  width: 22px;
  height: 22px;
  margin: 0;
  padding: 0;
  cursor: pointer;
}
</style>
