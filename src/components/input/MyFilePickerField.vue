<script setup>
import { ref } from 'vue';
import MyFileSelectButton from './MyFileSelectButton.vue';
import MyButton from '../button/MyButton.vue';

defineProps({
  files: { type: Array, default: () => [] },
  accept: { type: String, default: '' },
  multiple: { type: Boolean, default: false },
  compact: { type: Boolean, default: false },
  emptyText: { type: String, default: '선택된 파일 없음' },
  countSuffix: { type: String, default: '개 파일 첨부됨' },
});

const emit = defineEmits(['change', 'remove']);

const buttonRef = ref(null);

const onChange = (fileList) => emit('change', fileList);
const onRemove = (index) => emit('remove', index);
const reset = () => buttonRef.value?.reset();

defineExpose({ reset });
</script>

<template>
  <div class="file-picker" :class="{ 'file-picker--compact': compact }">
    <MyFileSelectButton
      ref="buttonRef"
      :accept="accept"
      :multiple="multiple"
      @change="onChange"
    />
    <span
      v-if="!compact || !files.length"
      class="file-count"
      :class="{ 'file-count--attached': files.length > 0 }"
    >
      {{ files.length ? `${files.length}${countSuffix}` : emptyText }}
    </span>
    <div v-if="files.length" class="file-chips">
      <span
        v-for="(file, index) in files"
        :key="`${file.name}-${file.size}-${file.lastModified}`"
        class="file-chip"
      >
        <span class="file-icon" aria-hidden="true">▣</span>
        <span class="file-name" :title="file.name">{{ file.name }}</span>
        <MyButton
          btn-type="button"
          class="file-chip-remove"
          content="×"
          :aria-label="`${file.name} 삭제`"
          @click="onRemove(index)"
        />
      </span>
    </div>
  </div>
</template>

<style scoped>
/* 학사 관리(학생) 페이지들에 흩어져 있던 .file-picker 박스를 통일한 공용 컴포넌트.
   첨부 파일 칩은 버튼/개수와 같은 줄에서, 작은 너비로 오른쪽에 정렬한다. */
.file-picker {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  min-height: 32px;
  padding: 3px 8px;
  border: 1px solid var(--personal-color-border-mist);
  border-radius: 4px;
  background: var(--personal-color-white);
}

.file-picker :deep(.file-select-action) {
  width: auto !important;
  min-width: auto !important;
  height: 28px !important;
  padding: 0 10px !important;
  font-size: 0.72rem !important;
  font-weight: 500 !important;
}

.file-count {
  flex: none;
  color: var(--personal-color-text-faint-fog);
  font-size: 0.72rem;
  font-weight: 400;
  white-space: nowrap;
}

.file-count--attached {
  color: var(--personal-color-primary-navy);
  font-weight: 500;
}

.file-chips {
  min-width: 0;
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 6px;
  margin-left: auto;
}

.file-chip {
  min-width: 0;
  max-width: 180px;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 7px;
  border: 1px solid var(--personal-color-border-mist);
  border-radius: 3px;
  background: var(--personal-color-bg-surface-frost);
  color: var(--personal-color-primary-navy);
  font-size: 0.7rem;
  font-weight: 500;
}

.file-icon {
  flex: none;
  font-size: 0.65rem;
}

.file-name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-chip :deep(.file-chip-remove) {
  flex: none;
  width: 15px;
  height: 15px;
  padding: 0;
  color: var(--personal-color-danger-strong-crimson);
  background: transparent;
  font-size: 0.78rem;
  line-height: 1;
}

@media (max-width: 640px) {
  .file-picker {
    align-items: stretch;
    flex-direction: column;
  }

  .file-chips {
    justify-content: flex-start;
    margin-left: 0;
  }

  .file-chip {
    max-width: 100%;
  }
}

.file-picker--compact {
  min-width: 0;
  height: 38px;
  box-sizing: border-box;
  flex-wrap: nowrap;
  flex-direction: row;
  align-items: center;
}

.file-picker--compact .file-count {
  min-width: 0;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
}

.file-picker--compact .file-chips {
  flex: 1;
  flex-wrap: nowrap;
}

.file-picker--compact .file-chip {
  flex: 1;
  max-width: 100%;
  box-sizing: border-box;
}
</style>
