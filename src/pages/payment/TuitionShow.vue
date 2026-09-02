<script setup>
import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import { useTuitionStore } from '../../store/payment/useTuitionStore';
import { useSemesterStore } from '../../store/semester/useSemesterStore';
import MyPageContainer from '../../components/layout/MyPageContainer.vue';
import MyButton from '../../components/button/MyButton.vue';
import MyTable from '../../components/table/MyTable.vue';
import MyStatusBadge from '../../components/common/MyStatusBadge.vue';
import SummaryStatCard from '../../components/payment/SummaryStatCard.vue';
import { formatCurrency, formatDate, formatDeduction } from '../../util/format';
import {
  PAYMENT_STATUS_LABEL,
  PAYMENT_STATUS_VARIANT,
  TUITION_BILL_STATUS_LABEL,
  TUITION_BILL_STATUS_VARIANT,
} from '../../util/payment/enumLabels';

const route = useRoute();
const tuitionBillId = Number(route.params.id);
const tuitionStore = useTuitionStore();
const semesterStore = useSemesterStore();
const selectedPaymentMethod = ref('CARD');
const paymentErrorMessage = ref('');
const refundErrorMessage = ref('');

const currentBill = computed(() => tuitionStore.myBills.find((bill) => bill.id === tuitionBillId));
const semesterLabel = computed(() => (
  currentBill.value ? semesterStore.getSemesterLabel(currentBill.value.semesterId) : '-'
));

const paymentMethods = [
  { value: 'CARD', label: '카드' },
  { value: 'VIRTUAL_ACCOUNT', label: '가상계좌' },
  { value: 'TRANSFER', label: '계좌이체' },
];

const displayedPaymentAmount = computed(() => {
  const amount = tuitionStore.currentAllocation?.actualPaymentAmount
    ?? tuitionStore.currentStatus?.billingAmount;
  const numericAmount = Number(amount);
  return Number.isFinite(numericAmount) ? numericAmount : 0;
});

const canPay = computed(() => (
  displayedPaymentAmount.value > 0
  && tuitionStore.currentStatus?.status !== 'PAID'
));

const formatRefundRate = (rate) => {
  const numericRate = Number(rate);
  return Number.isFinite(numericRate) ? `${numericRate * 100}%` : '-';
};

const handlePayment = async () => {
  paymentErrorMessage.value = '';

  try {
    // 성공 시 토스 결제창이 successUrl로 브라우저를 이동시키므로 여기서 더 할 일이 없다.
    await tuitionStore.initiateTossPayment({
      tuitionBillId,
      method: selectedPaymentMethod.value,
      amount: displayedPaymentAmount.value,
    });
  } catch {
    paymentErrorMessage.value = '결제를 시작하지 못했습니다. 잠시 후 다시 시도해 주세요.';
  }
};

const handleRefundEstimate = async () => {
  refundErrorMessage.value = '';
  try {
    await tuitionStore.fetchWithdrawalEstimate(tuitionBillId);
  } catch {
    refundErrorMessage.value = '환불 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.';
  }
};

onMounted(() => {
  tuitionStore.fetchMyBills();
  tuitionStore.fetchStatus(tuitionBillId);
  tuitionStore.fetchAllocation(tuitionBillId);
  semesterStore.fetchSemesters();
});
</script>

<template>
  <MyPageContainer title="등록금 고지서">
    <div class="panels">
      <section
        v-if="tuitionStore.currentAllocation"
        class="summary-bar"
      >
        <SummaryStatCard label="학기" :value="semesterLabel" />
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

      <section v-if="tuitionStore.currentStatus" class="notice-section">
        <h3>납부 고지 내역</h3>
        <MyTable
          :columns="[
            { key: 'division', label: '구분' },
            { key: 'amount', label: '금액' },
            { key: 'dueDate', label: '납부기한' },
            { key: 'status', label: '상태' },
          ]"
        >
          <tr>
            <td>{{ semesterLabel }} 등록금</td>
            <td>{{ formatCurrency(tuitionStore.currentStatus.billingAmount) }}</td>
            <td>{{ formatDate(tuitionStore.currentStatus.dueDate) }}</td>
            <td>
              <MyStatusBadge
                :label="TUITION_BILL_STATUS_LABEL[tuitionStore.currentStatus.status]"
                :variant="TUITION_BILL_STATUS_VARIANT[tuitionStore.currentStatus.status]"
              />
            </td>
          </tr>
        </MyTable>
      </section>

      <section
        class="action-panel"
        aria-labelledby="payment-title"
      >
        <h3 id="payment-title">
          등록금 결제
        </h3>
        <p class="description">
          결제할 금액 {{ formatCurrency(displayedPaymentAmount) }}을 확인하고 결제 수단을 선택해 주세요.
        </p>

        <fieldset
          class="payment-methods"
          :disabled="tuitionStore.isPaymentLoading"
        >
          <legend>결제 수단</legend>
          <label
            v-for="method in paymentMethods"
            :key="method.value"
            class="payment-method"
          >
            <input
              v-model="selectedPaymentMethod"
              type="radio"
              name="paymentMethod"
              :value="method.value"
            >
            <span>{{ method.label }}</span>
          </label>
        </fieldset>

        <p
          v-if="tuitionStore.isPaymentError && paymentErrorMessage"
          class="notice notice--error"
          role="alert"
        >
          {{ paymentErrorMessage }}
        </p>
        <div
          v-if="tuitionStore.currentPayment"
          class="result-row"
          role="status"
        >
          <span>결제 결과</span>
          <MyStatusBadge
            :label="PAYMENT_STATUS_LABEL[tuitionStore.currentPayment.status]"
            :variant="PAYMENT_STATUS_VARIANT[tuitionStore.currentPayment.status]"
          />
        </div>

        <MyButton
          color="deep-blue"
          size="big"
          :disabled="!canPay || tuitionStore.isPaymentLoading"
          @click="handlePayment"
        >
          {{ tuitionStore.isPaymentLoading ? '결제 처리 중...' : '결제하기' }}
        </MyButton>
      </section>

      <section
        class="action-panel"
        aria-labelledby="refund-title"
      >
        <h3 id="refund-title">
          자퇴 환불 상태
        </h3>
        <p class="description">
          자퇴 신청에 따른 예상 환불 금액을 확인할 수 있습니다.
        </p>

        <MyButton
          color="white"
          size="big"
          :disabled="tuitionStore.isRefundEstimateLoading"
          @click="handleRefundEstimate"
        >
          {{ tuitionStore.isRefundEstimateLoading ? '확인 중...' : '환불 정보 확인' }}
        </MyButton>

        <p
          v-if="tuitionStore.hasNoWithdrawalRequest"
          class="notice"
          role="status"
        >
          자퇴 신청 내역이 없습니다.
        </p>
        <p
          v-else-if="tuitionStore.isRefundEstimateError && refundErrorMessage"
          class="notice notice--error"
          role="alert"
        >
          {{ refundErrorMessage }}
        </p>
        <dl
          v-else-if="tuitionStore.currentRefundEstimate"
          class="refund-details"
        >
          <dt>환불 기준 금액</dt>
          <dd>{{ formatCurrency(tuitionStore.currentRefundEstimate.refundableBase) }}</dd>
          <dt>예상 환불률</dt>
          <dd>{{ formatRefundRate(tuitionStore.currentRefundEstimate.refundRate) }}</dd>
          <dt>예상 환불액</dt>
          <dd class="highlight">
            {{ formatCurrency(tuitionStore.currentRefundEstimate.estimatedRefundAmount) }}
          </dd>
        </dl>
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
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}

.notice-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.notice-section h3 {
  margin: 0;
}

@media (max-width: 640px) {
  .summary-bar {
    grid-template-columns: repeat(2, 1fr);
  }
}

.action-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 24px;
  background: var(--personal-color-white);
  border-radius: var(--personal-radius-card);
}

.action-panel h3,
.action-panel p {
  margin: 0;
}

.description {
  color: var(--personal-color-student-primary-cyan);
}

.payment-methods {
  display: grid;
  gap: 10px;
  padding: 0;
  border: 0;
}

.payment-methods legend {
  margin-bottom: 8px;
  font-weight: 700;
}

.payment-method {
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 12px;
  background: var(--personal-color-bg-surface-frost);
  border-radius: var(--personal-radius);
  cursor: pointer;
}

.payment-method input {
  accent-color: var(--personal-color-secondary-blue);
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

.result-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.refund-details {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 8px 16px;
  margin: 0;
}

.refund-details dt {
  color: var(--personal-color-student-primary-cyan);
}

.refund-details dd {
  margin: 0;
}

.highlight {
  font-weight: 700;
}
</style>
