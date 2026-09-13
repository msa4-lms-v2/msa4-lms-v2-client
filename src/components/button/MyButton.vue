<script setup>
defineOptions({
  inheritAttrs: false,
});

const props = defineProps({
  btnType: {
    type: String,
    default: 'button',
  },
  type: {
    type: String,
    default: '',
  },
  size: String,
  color: String,
  content: String,
  disabled: Boolean,
});

const emit = defineEmits(['click']);

const handleClick = (event) => {
  emit('click', event);
};
</script>

<template>
  <button
    v-bind="$attrs"
    :type="props.type || props.btnType"
    :class="[props.color, props.size]"
    :disabled="props.disabled"
    @click="handleClick"
  >
    <slot>{{ props.content }}</slot>
  </button>
</template>

<style scoped>
button {
  border-radius: 4px;
  display: flex;
  justify-content: center;
  align-items: center;
  border: none;
  cursor: pointer;

  transition: all 0.2s ease;
}

button:hover {
  opacity: 0.9;
  transform: translateY(-2px);
}

.big {
  min-width: 132px;
  padding: 0 16px;
  height: 38px;
  font-size: 16px;
  font-weight: 500;
}

.middle {
  min-width: 77px;
  padding: 0 12px;
  height: 38px;
  font-size: 13px;
  font-weight: 500;
}

.small {
  min-width: 57px;
  padding: 0 10px;
  height: 29px;
  font-size: 12px;
  font-weight: 500;
}

.deep-blue {
  background-color: var(--personal-color-primary-navy);
  color: var(--personal-color-white);
}

.admin-indigo {
  background-color: var(--personal-color-admin-secondary-indigo);
  color: var(--personal-color-white);
}

.black {
  background-color: var(--personal-color-black);
  color: var(--personal-color-white);
}

.gray {
  background-color: var(--personal-color-gray);
  color: var(--personal-color-white);
}

.white {
  background-color: var(--personal-color-white);
  border: 1px solid var(--personal-color-border-mist);
  color: var(--personal-color-black);
}

.red {
  background-color: var(--personal-color-red);
  color: var(--personal-color-white);
}

.green {
  background-color: var(--personal-color-green);
  color: var(--personal-color-white);
}
</style>
