<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useTuitionStore } from '../../store/payment/useTuitionStore';
import { useInstallmentStore } from '../../store/payment/useInstallmentStore';
import { useSemesterStore } from '../../store/semester/useSemesterStore';
import MyButton from '../button/MyButton.vue';
import MySelect from '../input/MySelect.vue';
import { formatCurrency, formatDate } from '../../util/format';
import { INSTALLMENT_ITEM_STATUS_LABEL, INSTALLMENT_ITEM_STATUS_VARIANT } from '../../util/payment/enumLabels';

const props = defineProps({
  tuitionBillId: {
    type: Number,
    required: true,
  },
});

const tuitionStore = useTuitionStore();
const installmentStore = useInstallmentStore();
const semesterStore = useSemesterStore();

const paymentType = ref('LUMP_SUM');
const selectedInstallmentItemId = ref('');
const selectedMethod = ref('CARD');
const paymentErrorMessage = ref('');

const paymentTypeOptions = [
  { value: 'LUMP_SUM', label: '일시납' },
  { value: 'INSTALLMENT', label: '분할납부' },
];

const methodOptions = [
  { value: 'CARD', label: '카드' },
  { value: 'VIRTUAL_ACCOUNT', label: '가상계좌' },
  { value: 'TRANSFER', label: '계좌이체' },
];

const currentBill = computed(() => tuitionStore.myBills.find((bill) => bill.id === props.tuitionBillId));
const semester = computed(() => semesterStore.semesters.find((item) => item.id === currentBill.value?.semesterId));
const semesterLabel = computed(() => (
  semester.value ? `${semester.value.academicYear}년 ${semester.value.term === 'FIRST' ? '1' : '2'}학기` : '-'
));

const hasActivePlan = computed(() => (
  ['ACTIVE', 'COMPLETED'].includes(installmentStore.installmentPlan?.status)
));

const sortedPlanItems = computed(() => {
  if (!installmentStore.installmentPlan?.items) return [];
  return [...installmentStore.installmentPlan.items].sort((a, b) => a.roundNo - b.roundNo);
});

const scheduledPlanItems = computed(() => sortedPlanItems.value.filter((item) => item.status === 'SCHEDULED'));

// 일시납은 실제 분할 회차가 없으므로, 전체 금액을 1회차로 보여주는 가상 회차 하나만 구성한다.
const displayedRounds = computed(() => {
  if (paymentType.value === 'INSTALLMENT') return sortedPlanItems.value;
  if (!currentBill.value) return [];
  return [{
    id: 'lump-sum',
    roundNo: 1,
    amount: tuitionStore.currentAllocation?.actualPaymentAmount ?? currentBill.value.billingAmount,
    dueDate: currentBill.value.dueDate,
    status: tuitionStore.currentStatus?.status === 'PAID' ? 'PAID' : 'SCHEDULED',
  }];
});

const selectedInstallmentItem = computed(() => (
  scheduledPlanItems.value.find((item) => item.id === selectedInstallmentItemId.value)
));

// 자동으로 활성 분할납부 계획이 확인되면 다음 납부 회차를 미리 선택해 준다.
watch(() => scheduledPlanItems.value, (items) => {
  if (items.length > 0 && !selectedInstallmentItemId.value) {
    selectedInstallmentItemId.value = items[0].id;
  }
}, { immediate: true });

const displayedPaymentAmount = computed(() => {
  if (paymentType.value === 'INSTALLMENT') {
    return selectedInstallmentItem.value ? Number(selectedInstallmentItem.value.amount) : 0;
  }
  const amount = tuitionStore.currentAllocation?.actualPaymentAmount
    ?? tuitionStore.currentStatus?.billingAmount;
  const numericAmount = Number(amount);
  return Number.isFinite(numericAmount) ? numericAmount : 0;
});

// 이 화면의 결제 금액은 "이미 낸 금액을 뺀 잔액"이 아니라 장학금 차감 후 전체 실납부액이다.
// PARTIAL(가상계좌 부분입금 등으로 일부만 납부된 상태)에서 전체 금액을 다시 결제하면
// 서버가 초과납부로 거부하므로, 그 상태에서는 결제 버튼 자체를 막고 안내만 보여준다.
const canPay = computed(() => {
  if (paymentType.value === 'INSTALLMENT') {
    return hasActivePlan.value && !!selectedInstallmentItem.value;
  }
  return displayedPaymentAmount.value > 0 && !['PAID', 'PARTIAL'].includes(tuitionStore.currentStatus?.status);
});

const handlePayment = async () => {
  paymentErrorMessage.value = '';

  try {
    // 성공 시 토스 결제창이 successUrl로 브라우저를 이동시키므로 여기서 더 할 일이 없다.
    await tuitionStore.initiateTossPayment({
      tuitionBillId: props.tuitionBillId,
      method: selectedMethod.value,
      amount: displayedPaymentAmount.value,
      installmentPlanItemId: paymentType.value === 'INSTALLMENT' ? selectedInstallmentItem.value?.id : undefined,
    });
  } catch {
    paymentErrorMessage.value = '결제를 시작하지 못했습니다. 잠시 후 다시 시도해 주세요.';
  }
};

const handleCancel = () => {
  paymentType.value = 'LUMP_SUM';
  selectedMethod.value = 'CARD';
  paymentErrorMessage.value = '';
};

const load = async () => {
  paymentType.value = 'LUMP_SUM';
  selectedInstallmentItemId.value = '';
  paymentErrorMessage.value = '';
  tuitionStore.fetchStatus(props.tuitionBillId);
  tuitionStore.fetchAllocation(props.tuitionBillId);

  try {
    await installmentStore.fetchInstallmentPlan(props.tuitionBillId);
    if (hasActivePlan.value) {
      paymentType.value = 'INSTALLMENT';
    }
  } catch {
    // 분할납부 계획이 없거나 조회에 실패해도 일시납 결제는 그대로 가능해야 하므로 무시한다.
  }
};

onMounted(load);
watch(() => props.tuitionBillId, load);
</script>

<template>
  <div class="panel">
    <section class="bill-section">
      <form class="payment-form" @submit.prevent="handlePayment">
        <div class="form-row">
          <div class="form-group">
            <label for="payment-type">납부방식</label>
            <MySelect id="payment-type" v-model="paymentType" :disabled="tuitionStore.isPaymentLoading">
              <option
                v-for="option in paymentTypeOptions"
                :key="option.value"
                :value="option.value"
                :disabled="option.value === 'INSTALLMENT' && !hasActivePlan"
              >
                {{ option.label }}
              </option>
            </MySelect>
          </div>

          <div v-if="paymentType === 'INSTALLMENT'" class="form-group">
            <label for="installment-round">회차 선택</label>
            <MySelect id="installment-round" v-model="selectedInstallmentItemId" :disabled="tuitionStore.isPaymentLoading">
              <option v-for="item in scheduledPlanItems" :key="item.id" :value="item.id">
                {{ item.roundNo }}회차
              </option>
            </MySelect>
          </div>
        </div>

        <p
          v-if="paymentType === 'INSTALLMENT' && !hasActivePlan"
          class="notice"
          role="status"
        >
          승인된 분할납부 계획이 없습니다. 분할납부 신청 화면에서 먼저 신청해 주세요.
        </p>

        <div class="form-group">
          <label for="payment-method">수납방식</label>
          <MySelect id="payment-method" v-model="selectedMethod" :options="methodOptions" :disabled="tuitionStore.isPaymentLoading || !canPay" />
        </div>

        <p
          v-if="tuitionStore.currentStatus?.status === 'PARTIAL'"
          class="notice notice--warning"
          role="status"
        >
          이미 일부 금액이 납부돼 있어 전체 금액 재결제는 제한됩니다. 잔여 납부는 관리자에게 문의해 주세요.
        </p>
        <p
          v-if="tuitionStore.isPaymentError && paymentErrorMessage"
          class="notice notice--error"
          role="alert"
        >
          {{ paymentErrorMessage }}
        </p>

        <div class="form-actions">
          <MyButton
            btn-type="submit"
            color="deep-blue"
            size="middle"
            :disabled="!canPay || tuitionStore.isPaymentLoading"
          >
            {{ tuitionStore.isPaymentLoading ? '처리 중...' : '납부' }}
          </MyButton>
          <MyButton
            btn-type="button"
            color="white"
            size="middle"
            content="취소"
            :disabled="tuitionStore.isPaymentLoading"
            @click="handleCancel"
          />
        </div>
      </form>
    </section>

    <section v-if="displayedRounds.length > 0" class="rounds-section">
      <h3>{{ semesterLabel }} · 납부 회차 안내</h3>
      <div class="rounds-grid">
        <div v-for="item in displayedRounds" :key="item.id" class="round-card">
          <div class="round-header">
            <span class="round-no">{{ item.roundNo }}회</span>
            <span :class="['status-text', `status-text--${INSTALLMENT_ITEM_STATUS_VARIANT[item.status]}`]">{{ INSTALLMENT_ITEM_STATUS_LABEL[item.status] }}</span>
          </div>
          <span class="round-amount">{{ formatCurrency(item.amount) }}</span>
          <span class="round-due">{{ formatDate(item.dueDate, 'MM.DD') }}</span>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.status-text--success {
  color: var(--personal-color-status-success-text-forest);
}

.status-text--processing {
  color: var(--personal-color-status-processing-text-navy);
}

.status-text--warning {
  color: var(--personal-color-status-warning-text-amber);
}

.status-text--fail {
  color: var(--personal-color-status-fail-text-maroon);
}

.panel,
.bill-section,
.rounds-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.rounds-section h3 {
  margin: 0;
}

.payment-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 24px;
  background: var(--personal-color-white);
  border-radius: var(--personal-radius-card);
}

.form-row {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-group label {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--personal-color-text-secondary-steel);
}

.form-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.notice {
  padding: 12px;
  background: var(--personal-color-bg-surface-frost);
  border-radius: var(--personal-radius);
}

.notice--warning {
  background: var(--personal-color-status-warning-bg-butter);
}

.notice--error {
  color: var(--personal-color-red);
  background: var(--personal-color-status-fail-bg-blush);
}

.rounds-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 12px;
}

.round-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 16px;
  background: var(--personal-color-white);
  border: 1px solid var(--personal-color-border-mist);
  border-radius: var(--personal-radius);
}

.round-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.round-no {
  font-weight: 700;
}

.round-amount {
  font-weight: 600;
}

.round-due {
  color: var(--personal-color-text-muted-slate);
  font-size: 0.85rem;
}
</style>
