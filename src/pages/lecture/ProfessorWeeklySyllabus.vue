<script setup>
import { ref, watch } from 'vue';
import MyButton from '../../components/button/MyButton.vue';
import { parseWeeks, serializeWeeks } from '../../util/lecture/weeklySyllabus';

const props = defineProps({ modelValue: { type: String, default: '' } });
const emit = defineEmits(['update:modelValue']);
const weeks = ref(['', '', '']);
const legacy = ref(false);
let lastEmitted;
watch(() => props.modelValue, (value) => {
  if (value === lastEmitted) return;
  const parsed = parseWeeks(value);
  legacy.value = parsed === null;
  weeks.value = parsed || ['', '', ''];
}, { immediate: true });
const update = () => {
  lastEmitted = serializeWeeks(weeks.value);
  emit('update:modelValue', lastEmitted);
};
</script>

<template>
  <div class="weekly-syllabus">
    <label v-if="legacy" class="legacy-syllabus">
      <span>기존 강의계획서 내용</span>
      <textarea :value="modelValue" maxlength="65535" rows="12" @input="$emit('update:modelValue', $event.target.value)"></textarea>
    </label>
    <template v-else>
      <div v-for="(_, index) in weeks" :key="index" class="week-row">
        <label :for="`syllabus-week-${index + 1}`">{{ index + 1 }}주차</label>
        <textarea :id="`syllabus-week-${index + 1}`" v-model="weeks[index]" :placeholder="`${index + 1}주차 강의 내용을 입력하세요.`" maxlength="65535" rows="2" @input="update"></textarea>
      </div>
      <MyButton class="add-week" color="white" content="+ 주차 입력란 추가" :disabled="weeks.length >= 100" @click="weeks.push('')" />
    </template>
  </div>
</template>

<style scoped>
.weekly-syllabus { border: 1px solid var(--personal-color-border-mist); border-radius: 4px; padding: 16px; min-height: 360px; overflow-y: auto; }
.week-row { display: grid; grid-template-columns: 80px minmax(0, 1fr); gap: 12px; align-items: start; margin-bottom: 12px; }
.week-row label { padding: 10px 8px; border: 1px solid var(--personal-color-border-mist); border-radius: 4px; background: var(--personal-color-bg-surface-frost); text-align: center; font-size: 13px; }
textarea { width: 100%; box-sizing: border-box; padding: 10px 12px; border: 1px solid var(--personal-color-border-mist); border-radius: 4px; font: inherit; font-size: 13px; color: var(--personal-color-primary-text-navy); background: var(--personal-color-white); resize: vertical; }
.add-week { width: 100%; min-height: 38px; border-style: dashed; color: var(--personal-color-primary-navy); }
.legacy-syllabus { display: flex; flex-direction: column; gap: 12px; }
@media (max-width: 560px) { .week-row { grid-template-columns: 60px minmax(0, 1fr); gap: 8px; } }
</style>
