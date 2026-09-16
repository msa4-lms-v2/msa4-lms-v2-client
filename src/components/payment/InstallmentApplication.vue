<script setup>
import { onBeforeUnmount, ref, watch } from 'vue';
import myAxios from '../../api/myAxios';
import MyButton from '../button/MyButton.vue';
import MySelect from '../input/MySelect.vue';
import { formatCurrency, formatDate } from '../../util/format';

const props = defineProps({ tuitionBillId: { type: Number, required: true } });
const emit = defineEmits(['applied', 'cancel', 'busy-change']);
const rounds = ref(2);
const preview = ref(null);
const errorMessage = ref('');
const isLoading = ref(false);
const isSubmitting = ref(false);
let version = 0;

const loadPreview = async () => {
  const requestVersion = ++version;
  preview.value = null;
  errorMessage.value = '';
  isLoading.value = true;
  try {
    const response = await myAxios.post('/api/payment/installment-plans/preview', {
      tuitionBillId: props.tuitionBillId, totalRounds: rounds.value,
    });
    if (requestVersion === version) preview.value = response.data.data;
  } catch (error) {
    if (requestVersion === version) errorMessage.value = error.response?.data?.message || '신청 조건을 확인하지 못했습니다. 다시 시도해 주세요.';
  } finally {
    if (requestVersion === version) isLoading.value = false;
  }
};
const submit = async () => {
  if (!preview.value || isLoading.value || isSubmitting.value) return;
  const requestVersion = version;
  isSubmitting.value = true;
  emit('busy-change', true);
  errorMessage.value = '';
  try {
    const response = await myAxios.post('/api/payment/installment-plans', {
      tuitionBillId: props.tuitionBillId, totalRounds: rounds.value,
    });
    if (requestVersion === version) emit('applied', response.data.data);
  } catch (error) {
    if (requestVersion !== version) return;
    // 응답 유실이나 중복 클릭 뒤에도 이미 생성된 신청을 다시 조회해 복구한다.
    try {
      const response = await myAxios.get('/api/payment/installment-plans', { params: { tuitionBillId: props.tuitionBillId } });
      if (requestVersion === version) emit('applied', response.data.data);
    } catch {
      if (requestVersion === version) errorMessage.value = error.response?.data?.message || '신청 결과를 확인하지 못했습니다. 다시 시도하면 기존 신청 여부를 확인합니다.';
    }
  } finally {
    if (requestVersion === version) {
      isSubmitting.value = false;
      emit('busy-change', false);
    }
  }
};

watch([() => props.tuitionBillId, rounds], loadPreview, { immediate: true });
onBeforeUnmount(() => { version += 1; emit('busy-change', false); });
</script>

<template>
  <form
    class="installment-application"
    :aria-busy="isLoading || isSubmitting"
    @submit.prevent="submit"
  >
    <h4>분할납부 신청</h4>
    <div class="round-selection">
      <label :for="`apply-rounds-${props.tuitionBillId}`">분할 회차</label>
      <MySelect
        :id="`apply-rounds-${props.tuitionBillId}`"
        v-model="rounds"
        :disabled="isSubmitting"
      >
        <option
          v-for="count in [2, 3, 4]"
          :key="count"
          :value="count"
        >
          {{ count }}회
        </option>
      </MySelect>
    </div>
    <p
      v-if="isLoading"
      role="status"
    >
      신청 조건과 납부 일정을 확인하는 중...
    </p>
    <template v-else-if="preview">
      <div class="preview-scroll">
        <table>
          <caption>신청 후 납부 일정</caption>
          <thead>
            <tr>
              <th scope="col">
                회차
              </th><th scope="col">
                금액
              </th><th scope="col">
                납부기한
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="item in preview.items"
              :key="item.roundNo"
            >
              <th scope="row">
                {{ item.roundNo }}회차
              </th>
              <td>{{ formatCurrency(item.amount) }}</td><td>{{ formatDate(item.dueDate) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
    <p
      v-if="errorMessage"
      class="error"
      role="alert"
    >
      {{ errorMessage }}
    </p>
    <div class="actions">
      <MyButton
        v-if="!preview && !isLoading"
        color="white"
        size="middle"
        content="다시 확인"
        :disabled="isSubmitting"
        @click="loadPreview"
      />
      <MyButton
        btn-type="submit"
        color="deep-blue"
        size="middle"
        :disabled="!preview || isLoading || isSubmitting"
      >
        {{ isSubmitting ? '신청 중...' : '분할납부 신청' }}
      </MyButton>
      <MyButton
        color="white"
        size="middle"
        content="취소"
        :disabled="isSubmitting"
        @click="emit('cancel')"
      />
    </div>
  </form>
</template>

<style scoped>
.installment-application { grid-column: 1 / -1; display: flex; flex-direction: column; gap: 1rem; padding: 1.25rem; border: 1px solid var(--personal-color-border-mist); border-radius: var(--personal-radius); background: var(--personal-color-bg-surface-frost); }
h4, p { margin: 0; }
p, table, label { font-size: 0.85rem; }
.round-selection { display: flex; flex-direction: column; gap: 0.5rem; max-width: 11rem; }
.preview-scroll { overflow-x: auto; }
table { width: 100%; max-width: 38rem; border-collapse: collapse; background: var(--personal-color-white); }
caption { text-align: left; margin-bottom: 0.5rem; }
th, td { padding: 0.65rem; border: 1px solid var(--personal-color-border-mist); text-align: left; white-space: nowrap; }
.error { color: var(--personal-color-red); }
.actions { display: flex; justify-content: flex-end; flex-wrap: wrap; gap: 0.75rem; }
</style>
