<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useTuitionStore } from '../../store/payment/useTuitionStore';
import { useInstallmentStore } from '../../store/payment/useInstallmentStore';
import { useSemesterStore } from '../../store/semester/useSemesterStore';
import MyPageContainer from '../../components/layout/MyPageContainer.vue';
import MyButton from '../../components/button/MyButton.vue';
import MyTable from '../../components/table/MyTable.vue';
import MySelect from '../../components/input/MySelect.vue';
import MyStatusBadge from '../../components/common/MyStatusBadge.vue';
import SummaryStatCard from '../../components/payment/SummaryStatCard.vue';
import { notify } from '../../composables/useDialog';
import { formatCurrency, formatDate, formatDeduction } from '../../util/format';
import { INSTALLMENT_ITEM_STATUS_LABEL, INSTALLMENT_ITEM_STATUS_VARIANT } from '../../util/payment/enumLabels';

const route = useRoute();
const tuitionBillId = Number(route.params.id);
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

const currentBill = computed(() => tuitionStore.myBills.find((bill) => bill.id === tuitionBillId));
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
      tuitionBillId,
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

onMounted(async () => {
  tuitionStore.fetchMyBills();
  tuitionStore.fetchStatus(tuitionBillId);
  tuitionStore.fetchAllocation(tuitionBillId);
  tuitionStore.fetchBillItems(tuitionBillId);
  semesterStore.fetchSemesters();

  try {
    await installmentStore.fetchInstallmentPlan(tuitionBillId);
    if (hasActivePlan.value) {
      paymentType.value = 'INSTALLMENT';
    }
  } catch {
    // 분할납부 계획이 없거나 조회에 실패해도 일시납 결제는 그대로 가능해야 하므로 무시한다.
  }
});
</script>

<template>
  <MyPageContainer title="등록금 납부">
    <div class="panels">
      <section
        v-if="tuitionStore.currentAllocation"
        class="summary-bar"
      >
        <SummaryStatCard label="총 등록금" :value="formatCurrency(tuitionStore.currentAllocation.billingAmount)" />
        <SummaryStatCard
          label="장학금"
          :value="formatDeduction(tuitionStore.currentAllocation.totalScholarshipAmount)"
        />
        <SummaryStatCard
          label="납부 예정액"
          :value="formatCurrency(tuitionStore.currentAllocation.actualPaymentAmount)"
          highlight
        />
      </section>
      <p v-else-if="tuitionStore.isLoadingAllocation || tuitionStore.isLoadingStatus">
        불러오는 중...
      </p>

      <section class="bill-section">
        <h3>등록금 고지 목록</h3>
        <div class="bill-grid">
          <div class="bill-detail">
            <h4>등록금 상세 내역</h4>
            <MyTable
              :loading="tuitionStore.isLoadingBillItems"
              :empty="!tuitionStore.isLoadingBillItems && tuitionStore.billItems.length === 0"
              empty-message="등록된 항목이 없습니다."
              :columns="[
                { key: 'itemName', label: '수급자금명' },
                { key: 'amount', label: '수납금액' },
                { key: 'paid', label: '납입여부' },
              ]"
            >
              <tr v-for="item in tuitionStore.billItems" :key="item.id">
                <td>{{ item.itemName }}</td>
                <td>{{ formatCurrency(item.amount) }}</td>
                <td>
                  <input type="checkbox" :checked="item.paid" disabled>
                </td>
              </tr>
            </MyTable>
          </div>

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
        </div>
      </section>

      <section v-if="sortedPlanItems.length > 0" class="rounds-section">
        <h3>{{ semesterLabel }} · 납부 회차 안내</h3>
        <div class="rounds-grid">
          <div v-for="item in sortedPlanItems" :key="item.id" class="round-card">
            <div class="round-header">
              <span class="round-no">{{ item.roundNo }}회</span>
              <MyStatusBadge
                :label="INSTALLMENT_ITEM_STATUS_LABEL[item.status]"
                :variant="INSTALLMENT_ITEM_STATUS_VARIANT[item.status]"
              />
            </div>
            <span class="round-amount">{{ formatCurrency(item.amount) }}</span>
            <span class="round-due">{{ formatDate(item.dueDate, 'MM.DD') }}</span>
          </div>
        </div>
      </section>
    </div>
  </MyPageContainer>
</template>

<style scoped>
.panels {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.summary-bar {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

@media (max-width: 640px) {
  .summary-bar {
    grid-template-columns: 1fr;
  }
}

.bill-section,
.rounds-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.bill-section h3,
.rounds-section h3 {
  margin: 0;
}

.bill-grid {
  display: grid;
  grid-template-columns: 1.2fr 1fr;
  gap: 16px;
  align-items: start;
}

@media (max-width: 900px) {
  .bill-grid {
    grid-template-columns: 1fr;
  }
}

.bill-detail {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.bill-detail h4 {
  margin: 0;
  font-size: 0.95rem;
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
