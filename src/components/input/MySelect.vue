<script setup>
import { computed } from "vue";

defineOptions({
  inheritAttrs: false,
});

const props = defineProps({
  modelValue: {
    type: [String, Number, Boolean],
    default: "",
  },
  options: {
    type: Array,
    default: () => [],
  },
  placeholder: {
    type: String,
    default: "",
  },
  disabled: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(["update:modelValue", "change"]);

const model = computed({
  get: () => props.modelValue,
  set: (value) => emit("update:modelValue", value),
});

const handleChange = () => {
  emit("change", model.value);
};
</script>

<template>
  <select
    v-bind="$attrs"
    v-model="model"
    :disabled="props.disabled"
    @change="handleChange"
  >
    <option v-if="props.placeholder" value="" disabled>{{ props.placeholder }}</option>
    <slot />
    <option
      v-for="option in props.options"
      :key="option.value"
      :value="option.value"
      :disabled="option.disabled"
    >
      {{ option.label }}
    </option>
  </select>
</template>

<style scoped>
select {
  width: 100%;
  height: 38px;
  padding: 0 36px 0 12px;
  border: 1px solid var(--personal-color-border-mist);
  border-radius: 4px;
  color: var(--personal-color-primary-text-navy);
  background-color: var(--personal-color-white);
  font-size: 0.9rem;
  cursor: pointer;
}

select:focus {
  border-color: var(--personal-color-primary-navy);
  outline: none;
}

select:disabled {
  color: var(--personal-color-text-faint-fog);
  background-color: var(--personal-color-bg-subtle-snow);
  cursor: not-allowed;
}
</style>
