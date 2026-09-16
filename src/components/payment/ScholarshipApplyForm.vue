<script setup>
import { ref } from 'vue';
import { SCHOLARSHIP_TYPE_LABEL } from '../../util/payment/enumLabels';
import MySelect from '../input/MySelect.vue';
import MyInput from '../input/MyInput.vue';
import MyButton from '../button/MyButton.vue';

const props = defineProps({
  isSubmitting: { type: Boolean, default: false },
});
const emit = defineEmits(['submit']);

const type = ref('MERIT');
const amount = ref('');
const reason = ref('');

const handleSubmit = () => {
  emit('submit', { type: type.value, amount: Number(amount.value), reason: reason.value });
  amount.value = '';
  reason.value = '';
};
</script>

<template>
  <form class="scholarship-form" @submit.prevent="handleSubmit">
    <h3>장학금 감면·면제 적용</h3>

    <div class="field">
      <label for="scholarship-type">장학금 유형</label>
      <MySelect id="scholarship-type" v-model="type">
        <option v-for="(label, value) in SCHOLARSHIP_TYPE_LABEL" :key="value" :value="value">
          {{ label }}
        </option>
      </MySelect>
    </div>

    <div class="field">
      <label for="scholarship-amount">감면 금액</label>
      <MyInput id="scholarship-amount" v-model="amount" numeric-only required placeholder="원 단위 정수로 입력하세요" />
    </div>

    <div class="field">
      <label for="scholarship-reason">사유</label>
      <MyInput id="scholarship-reason" v-model="reason" required />
    </div>

    <MyButton
      class="submit-button"
      btn-type="submit"
      size="middle"
      color="admin-indigo"
      :disabled="props.isSubmitting"
    >
      {{ props.isSubmitting ? '적용 중...' : '적용' }}
    </MyButton>
  </form>
</template>

<style scoped>
.scholarship-form {
  background: var(--personal-color-white);
  border: 1px solid var(--personal-color-border-mist);
  border-radius: 8px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.submit-button {
  align-self: flex-start;
}

.submit-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
