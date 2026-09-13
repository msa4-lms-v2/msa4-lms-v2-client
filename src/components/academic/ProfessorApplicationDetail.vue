<script setup>
import MyButton from '../button/MyButton.vue';

defineProps({
  studentFields: { type: Array, default: () => [] },
  applicationFields: { type: Array, default: () => [] },
  reason: { type: String, default: '' },
  reviewReason: { type: String, default: '' },
  reviewable: Boolean,
  busy: Boolean,
  error: { type: String, default: '' },
});
defineEmits(['update:reviewReason', 'approve', 'reject', 'back']);
</script>

<template>
  <div class="application-detail">
    <section v-for="group in [{ title: '학생 정보', fields: studentFields }, { title: '신청 정보', fields: applicationFields }]" :key="group.title">
      <h3>{{ group.title }}</h3>
      <dl class="field-grid">
        <div v-for="field in group.fields" :key="field.label">
          <dt>{{ field.label }}</dt>
          <dd>{{ field.value ?? '-' }}</dd>
        </div>
      </dl>
    </section>
    <section>
      <h3>신청 사유</h3>
      <p class="content-box preserve-line">{{ reason || '-' }}</p>
    </section>
    <section>
      <h3>증빙 서류</h3>
      <div class="content-box"><slot name="files">첨부된 증빙 서류가 없습니다.</slot></div>
    </section>
    <slot name="history" />
    <section v-if="reviewable">
      <h3><label for="professor-review-reason">검토 의견</label></h3>
      <textarea id="professor-review-reason" :value="reviewReason" :disabled="busy" maxlength="500" rows="2" placeholder="검토 의견을 입력해 주세요. 반려 시 사유를 입력합니다." @input="$emit('update:reviewReason', $event.target.value)" />
      <p v-if="error" class="error" role="alert">{{ error }}</p>
    </section>
    <div class="actions">
      <MyButton color="white" size="middle" content="목록" :disabled="busy" @click="$emit('back')" />
      <template v-if="reviewable">
        <MyButton color="red" size="middle" content="반려" :disabled="busy" @click="$emit('reject')" />
        <MyButton color="deep-blue" size="middle" content="승인" :disabled="busy" @click="$emit('approve')" />
      </template>
    </div>
  </div>
</template>

<style scoped>
.application-detail { display: grid; gap: 24px; }
h3 { margin: 0 0 10px; font-size: 16px; font-weight: 700; }
.field-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 22px 30px; margin: 0; padding: 14px 18px; background: var(--personal-color-white); }
dt { margin-bottom: 8px; font-size: 12px; color: var(--personal-color-text-muted-slate); }
dd { margin: 0; font-size: 14px; overflow-wrap: anywhere; }
.content-box { margin: 0; min-height: 60px; padding: 18px; background: var(--personal-color-white); font-size: 14px; }
.preserve-line { white-space: pre-wrap; overflow-wrap: anywhere; }
textarea { display: block; box-sizing: border-box; width: 100%; min-height: 60px; padding: 18px; border: 1px solid transparent; border-radius: 0; background: var(--personal-color-white); font: inherit; font-size: 14px; resize: vertical; }
textarea:focus { outline: 2px solid var(--personal-color-primary-navy); }
textarea::placeholder { color: var(--personal-color-text-muted-slate); }
.actions { display: flex; justify-content: flex-end; gap: 12px; }
.error { color: var(--personal-color-danger-coral); font-size: 13px; }
@media (max-width: 760px) { .field-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 480px) { .field-grid { grid-template-columns: 1fr; } }
</style>
