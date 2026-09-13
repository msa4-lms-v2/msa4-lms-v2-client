<script setup>
import { ref } from 'vue';
import MyButton from '../button/MyButton.vue';

defineProps({
  id: { type: String, default: undefined },
  accept: { type: String, default: '' },
  multiple: { type: Boolean, default: false },
  ariaLabel: { type: String, default: '파일 선택' },
});

const emit = defineEmits(['change']);

const fileInput = ref(null);

const openFilePicker = () => fileInput.value?.click();

const onChange = (event) => {
  emit('change', event.target.files);
  event.target.value = '';
};

const reset = () => {
  if (fileInput.value) fileInput.value.value = '';
};

defineExpose({ reset });
</script>

<template>
  <input
    :id="id"
    ref="fileInput"
    class="visually-hidden"
    type="file"
    :accept="accept"
    :multiple="multiple"
    :aria-label="ariaLabel"
    @change="onChange"
  >
  <MyButton
    btn-type="button"
    class="file-select-action"
    color="white"
    size="middle"
    content="파일 선택"
    @click="openFilePicker"
  />
</template>

<style scoped>
.file-select-action {
  flex: 0 0 auto;
  white-space: nowrap;
}

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
</style>
