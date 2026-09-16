<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import myAxios from '../../api/myAxios';
import { useTuitionStore } from '../../store/payment/useTuitionStore';
import { useSemesterStore } from '../../store/semester/useSemesterStore';
import MyButton from '../button/MyButton.vue';
import MySelect from '../input/MySelect.vue';
import TuitionRoundCards from './TuitionRoundCards.vue';
import InstallmentApplication from './InstallmentApplication.vue';
import { formatCurrency } from '../../util/format';

const props = defineProps({ tuitionBillId: { type: Number, required: true } });
const emit = defineEmits(['details-change']);
const tuitionStore = useTuitionStore();
const semesterStore = useSemesterStore();
const paymentType = ref('LUMP_SUM');
const selectedInstallmentItemId = ref('');
const selectedMethod = ref('CARD');
const paymentErrorMessage = ref('');
const loadErrorMessage = ref('');
const isLoading = ref(false);
const status = ref(null);
const allocation = ref(null);
const plan = ref(null);
const virtualAccount = ref(null);
const billItems = ref([]);
const showApplication = ref(false);
const isApplying = ref(false);
let loadVersion = 0;

const methodOptions = [
  { value: 'CARD', label: '카드' },
  { value: 'VIRTUAL_ACCOUNT', label: '가상계좌' },
  { value: 'TRANSFER', label: '계좌이체' },
];
const bankNames = { '04': '국민은행', '88': '신한은행', '20': '우리은행', '11': '농협은행', '81': '하나은행' };
const currentBill = computed(() => tuitionStore.myBills.find((bill) => bill.id === props.tuitionBillId));
const semesterLabel = computed(() => currentBill.value?.semesterId
  ? semesterStore.getSemesterLabel(currentBill.value.semesterId) : '등록금');
const hasActivePlan = computed(() => ['ACTIVE', 'COMPLETED'].includes(plan.value?.status));
const sortedPlanItems = computed(() => [...(plan.value?.items ?? [])].sort((a, b) => a.roundNo - b.roundNo));
const scheduledPlanItems = computed(() => sortedPlanItems.value.filter((item) => ['SCHEDULED', 'OVERDUE'].includes(item.status)));
const selectedInstallmentItem = computed(() => scheduledPlanItems.value.find((item) => item.id === selectedInstallmentItemId.value));
const billStatus = computed(() => status.value?.status ?? currentBill.value?.status);
const isPaid = computed(() => billStatus.value === 'PAID');
const isAwaitingDeposit = computed(() => ['ISSUED', 'PARTIALLY_DEPOSITED'].includes(virtualAccount.value?.status));
const isBusy = computed(() => isLoading.value || tuitionStore.isPaymentLoading || isApplying.value);
const canApply = computed(() => !isAwaitingDeposit.value && !plan.value && billStatus.value === 'UNPAID' && Number(allocation.value?.actualPaymentAmount) > 0 && !loadErrorMessage.value);
const planMessage = computed(() => {
  if (plan.value?.status === 'REQUESTED') return '분할납부 신청이 접수되어 관리자 심사 중입니다. 승인 후 회차별 납부가 가능합니다.';
  if (plan.value?.status === 'REJECTED') return `분할납부 신청이 반려되었습니다. 사유: ${plan.value.rejectReason || '관리자에게 문의해 주세요.'}`;
  if (plan.value?.status === 'ACTIVE') return plan.value.reviewedBy == null
    ? '분할납부가 자동 승인되었습니다. 아래 일정에 따라 회차별로 납부해 주세요.'
    : '분할납부가 승인되었습니다. 아래 일정에 따라 회차별로 납부해 주세요.';
  return '';
});
const displayedPaymentAmount = computed(() => {
  const amount = paymentType.value === 'INSTALLMENT'
    ? selectedInstallmentItem.value?.amount : allocation.value?.actualPaymentAmount;
  return Number.isFinite(Number(amount)) ? Number(amount) : 0;
});
const canPay = computed(() => {
  if (isAwaitingDeposit.value) return false;
  if (isBusy.value || showApplication.value || plan.value?.status === 'REQUESTED' || loadErrorMessage.value || isPaid.value || displayedPaymentAmount.value <= 0) return false;
  if (paymentType.value === 'INSTALLMENT') return hasActivePlan.value && !!selectedInstallmentItem.value;
  // 일시납 금액은 잔액이 아닌 전체 실납부액이므로 부분납부 상태의 재결제를 막는다.
  return billStatus.value !== 'PARTIAL';
});
const displayedRounds = computed(() => {
  if (isLoading.value || loadErrorMessage.value || !status.value || !allocation.value) return [];
  if (paymentType.value === 'INSTALLMENT') return sortedPlanItems.value;
  return [{
    id: 'lump-sum', roundNo: 1, amount: allocation.value.actualPaymentAmount,
    dueDate: status.value.dueDate ?? currentBill.value?.dueDate,
    status: isPaid.value ? 'PAID' : billStatus.value === 'PARTIAL' ? 'PARTIAL' : 'SCHEDULED',
  }];
});

const handlePayment = async () => {
  if (!canPay.value) return;
  paymentErrorMessage.value = '';
  try {
    await tuitionStore.initiateTossPayment({
      tuitionBillId: props.tuitionBillId, method: selectedMethod.value,
      amount: displayedPaymentAmount.value,
      installmentPlanItemId: paymentType.value === 'INSTALLMENT' ? selectedInstallmentItem.value?.id : undefined,
    });
  } catch {
    paymentErrorMessage.value = '결제를 시작하지 못했습니다. 잠시 후 다시 시도해 주세요.';
  }
};
const handleCancel = () => {
  paymentType.value = hasActivePlan.value ? 'INSTALLMENT' : 'LUMP_SUM';
  selectedInstallmentItemId.value = scheduledPlanItems.value[0]?.id ?? '';
  selectedMethod.value = 'CARD';
  paymentErrorMessage.value = '';
};
const handleApplied = (result) => {
  plan.value = result;
  showApplication.value = false;
  isApplying.value = false;
  paymentType.value = hasActivePlan.value ? 'INSTALLMENT' : 'LUMP_SUM';
  selectedInstallmentItemId.value = scheduledPlanItems.value[0]?.id ?? '';
};
const load = async () => {
  const version = ++loadVersion;
  const billId = props.tuitionBillId;
  isLoading.value = true;
  loadErrorMessage.value = '';
  paymentErrorMessage.value = '';
  status.value = null;
  allocation.value = null;
  plan.value = null;
  virtualAccount.value = null;
  billItems.value = [];
  showApplication.value = false;
  isApplying.value = false;
  paymentType.value = 'LUMP_SUM';
  selectedInstallmentItemId.value = '';
  emit('details-change', null);
  try {
    // 고지별 응답은 화면 안에 보관하여 다른 고지나 캐시된 상세 화면과 섞이지 않게 한다.
    const responses = await Promise.all([
      myAxios.get('/api/payment/tuition-payment-status', { params: { tuitionBillId: billId } }),
      myAxios.post('/api/payment/payment-scholarship-allocation', { tuitionBillId: billId }),
      myAxios.get(`/api/payment/tuition-bills/${billId}/items`),
      myAxios.get('/api/payment/installment-plans', { params: { tuitionBillId: billId } })
        .catch((error) => {
          if (error.response?.status === 404) return { data: { data: null } };
          throw error;
        }),
      myAxios.get('/api/payment/virtual-accounts', { params: { tuitionBillId: billId } }),
    ]);
    if (version !== loadVersion) return;
    [status.value, allocation.value, billItems.value, plan.value, virtualAccount.value] = responses.map((response) => response.data.data);
    if (isAwaitingDeposit.value) selectedMethod.value = 'VIRTUAL_ACCOUNT';
    if (hasActivePlan.value) paymentType.value = 'INSTALLMENT';
    selectedInstallmentItemId.value = scheduledPlanItems.value[0]?.id ?? '';
    emit('details-change', { billId, status: status.value, allocation: allocation.value });
  } catch {
    if (version !== loadVersion) return;
    loadErrorMessage.value = '등록금 상세 내역을 불러오지 못했습니다. 다시 조회해 주세요.';
  } finally {
    if (version === loadVersion) isLoading.value = false;
  }
};

watch(() => props.tuitionBillId, load, { immediate: true });
onBeforeUnmount(() => { loadVersion += 1; });
</script>

<template>
  <div class="panel">
    <section
      class="bill-section"
      :aria-busy="isLoading"
    >
      <h3>등록금 고지 목록</h3>
      <div class="bill-card">
        <div class="bill-details">
          <h4>등록금 상세 내역</h4>
          <div class="details-scroll">
            <table class="details-table">
              <caption class="sr-only">
                등록금 항목별 금액과 납부 여부
              </caption>
              <thead>
                <tr>
                  <th scope="col">
                    수납항목
                  </th><th scope="col">
                    수납금액
                  </th><th scope="col">
                    납부여부
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="isLoading">
                  <td
                    colspan="3"
                    class="empty-cell"
                  >
                    상세 내역을 불러오는 중...
                  </td>
                </tr>
                <tr v-else-if="loadErrorMessage">
                  <td
                    colspan="3"
                    class="empty-cell"
                  >
                    상세 내역 조회 실패
                  </td>
                </tr>
                <template v-else>
                  <tr
                    v-for="item in billItems"
                    :key="item.id"
                  >
                    <th scope="row">
                      {{ item.itemName }}
                    </th>
                    <td class="amount-cell">
                      {{ formatCurrency(item.amount) }}
                    </td>
                    <td class="paid-cell">
                      <input
                        type="checkbox"
                        :checked="item.paid"
                        disabled
                        :aria-label="`${item.itemName} ${item.paid ? '납부 완료' : '미납'}`"
                      >
                    </td>
                  </tr>
                  <tr v-if="!billItems.length">
                    <td
                      colspan="3"
                      class="empty-cell"
                    >
                      등록된 상세 항목이 없습니다.
                    </td>
                  </tr>
                </template>
              </tbody>
            </table>
          </div>
        </div>
        <form
          class="payment-form"
          @submit.prevent="handlePayment"
        >
          <div class="form-row">
            <div class="form-group">
              <label :for="`payment-type-${props.tuitionBillId}`">납부방식</label>
              <MySelect
                :id="`payment-type-${props.tuitionBillId}`"
                v-model="paymentType"
                :disabled="isBusy || isPaid || isAwaitingDeposit || !!loadErrorMessage"
              >
                <option
                  value="LUMP_SUM"
                  :disabled="hasActivePlan"
                >
                  일시납
                </option>
                <option
                  value="INSTALLMENT"
                  :disabled="!hasActivePlan"
                >
                  분할납부
                </option>
              </MySelect>
            </div>
            <div class="form-group">
              <label :for="`installment-round-${props.tuitionBillId}`">회차 선택</label>
              <MySelect
                v-if="paymentType === 'INSTALLMENT'"
                :id="`installment-round-${props.tuitionBillId}`"
                v-model="selectedInstallmentItemId"
                :disabled="isBusy || isPaid || isAwaitingDeposit || !scheduledPlanItems.length"
              >
                <option
                  v-if="!scheduledPlanItems.length"
                  value=""
                >
                  {{ isPaid ? '납부 완료' : '납부할 회차 없음' }}
                </option>
                <option
                  v-for="item in scheduledPlanItems"
                  :key="item.id"
                  :value="item.id"
                >
                  {{ item.roundNo }}회차
                </option>
              </MySelect>
              <MySelect
                v-else
                :id="`installment-round-${props.tuitionBillId}`"
                :model-value="1"
                disabled
              >
                <option :value="1">
                  1회차
                </option>
              </MySelect>
            </div>
          </div>
          <div class="form-footer">
            <div class="form-group">
              <label :for="`payment-method-${props.tuitionBillId}`">수납방식</label>
              <MySelect
                :id="`payment-method-${props.tuitionBillId}`"
                v-model="selectedMethod"
                :options="methodOptions"
                :disabled="!canPay"
              />
            </div>
            <div class="form-actions">
              <MyButton
                btn-type="submit"
                color="deep-blue"
                size="middle"
                :disabled="!canPay"
              >
                {{ tuitionStore.isPaymentLoading ? '처리 중...' : '납부' }}
              </MyButton>
              <MyButton
                btn-type="button"
                color="white"
                size="middle"
                content="취소"
                :disabled="isBusy || isPaid || isAwaitingDeposit"
                @click="handleCancel"
              />
            </div>
          </div>
        </form>
        <section
          v-if="isAwaitingDeposit"
          class="virtual-account"
        >
          <h4>등록금 가상계좌</h4>
          <dl>
            <dt>은행 / 계좌번호</dt>
            <dd>{{ bankNames[virtualAccount.bankCode] || virtualAccount.bankCode }} / {{ virtualAccount.accountNumber }}</dd>
            <dt>입금 기한</dt>
            <dd>{{ virtualAccount.expiresAt?.replace('T', ' ') }}</dd>
            <dt>납부 상태</dt>
            <dd>{{ virtualAccount.status === 'PARTIALLY_DEPOSITED' ? '부분 납부' : '입금 대기' }}</dd>
          </dl>
          <MyButton
            color="white"
            size="middle"
            content="납부 정보 새로고침"
            :disabled="isBusy"
            @click="load"
          />
        </section>
        <div
          v-if="canApply && !showApplication"
          class="application-entry"
        >
          <MyButton
            color="white"
            size="middle"
            content="분할납부 신청"
            :disabled="isBusy"
            @click="showApplication = true"
          />
        </div>
        <InstallmentApplication
          v-if="showApplication && canApply"
          :key="props.tuitionBillId"
          :tuition-bill-id="props.tuitionBillId"
          @applied="handleApplied"
          @cancel="showApplication = false"
          @busy-change="isApplying = $event"
        />
        <p
          v-if="planMessage"
          class="notice"
          role="status"
        >
          {{ planMessage }}
        </p>
        <MyButton
          v-if="plan?.status === 'REQUESTED'"
          color="white"
          size="small"
          content="심사 결과 새로고침"
          :disabled="isBusy"
          @click="load"
        />
        <div
          v-if="loadErrorMessage"
          class="notice notice--error"
          role="alert"
        >
          <span>{{ loadErrorMessage }}</span>
          <MyButton
            btn-type="button"
            color="white"
            size="small"
            content="다시 조회"
            @click="load"
          />
        </div>
        <p
          v-if="billStatus === 'PARTIAL' && paymentType === 'LUMP_SUM'"
          class="notice"
          role="status"
        >
          이미 일부 금액이 납부돼 있어 전체 금액 재결제는 제한됩니다. 잔여 납부는 관리자에게 문의해 주세요.
        </p>
        <p
          v-if="paymentErrorMessage"
          class="notice notice--error"
          role="alert"
        >
          {{ paymentErrorMessage }}
        </p>
      </div>
    </section>
    <TuitionRoundCards
      v-if="displayedRounds.length"
      :semester-label="semesterLabel"
      :rounds="displayedRounds"
    />
  </div>
</template>

<style scoped>
.panel, .bill-section { display: flex; flex-direction: column; gap: 1rem; }
.panel { gap: 2rem; }
.application-entry { grid-column: 1 / -1; display: flex; align-items: center; justify-content: space-between; gap: 1rem; font-size: 0.85rem; }
h3, h4, p { margin: 0; }
h3 { font-size: 1.1rem; }
h4 { margin-bottom: 0.5rem; font-size: 0.85rem; }
.bill-card {
  display: grid;
  grid-template-columns: minmax(0, 0.85fr) minmax(0, 1.15fr);
  align-items: start;
  gap: 1.5rem 3rem;
  padding: 1.75rem 2rem;
  background: var(--personal-color-white);
  border: 1px solid var(--personal-color-border-mist);
  border-radius: var(--personal-radius);
}
.bill-details { min-width: 0; }
.virtual-account { grid-column: 1 / -1; padding-top: 1rem; border-top: 1px solid var(--personal-color-border-mist); }
.virtual-account dl { display: grid; grid-template-columns: max-content minmax(0, 1fr); gap: 0.75rem 1.5rem; margin: 1rem 0; font-size: 0.85rem; }
.virtual-account dd { margin: 0; overflow-wrap: anywhere; }
.details-scroll { max-height: 12rem; overflow: auto; }
.details-table { width: 100%; border-collapse: collapse; font-size: 0.8rem; }
.details-table th, .details-table td { border: 1px solid var(--personal-color-border-mist); padding: 0.6rem 0.65rem; }
.details-table thead th { background: var(--personal-color-bg-subtle-snow); font-weight: 500; white-space: nowrap; }
.details-table tbody th { font-weight: 400; overflow-wrap: anywhere; }
.amount-cell { text-align: right; white-space: nowrap; }
.paid-cell { text-align: center; }
.paid-cell input { width: 1rem; height: 1rem; margin: 0; vertical-align: middle; accent-color: var(--personal-color-primary-navy); }
.empty-cell { text-align: center; color: var(--personal-color-text-muted-slate); }
.payment-form { display: flex; flex-direction: column; gap: 2.5rem; padding-top: 1.25rem; min-width: 0; }
.form-row { display: grid; grid-template-columns: repeat(2, minmax(0, 11rem)); gap: 1rem; }
.form-group { display: flex; flex-direction: column; gap: 0.5rem; min-width: 0; }
.form-group label { font-size: 0.8rem; font-weight: 600; color: var(--personal-color-primary-text-navy); }
.form-footer { display: flex; align-items: flex-end; justify-content: space-between; gap: 1.5rem; }
.form-footer > .form-group { flex: 0 1 11rem; }
.form-actions { display: flex; gap: 0.75rem; }
.notice { grid-column: 1 / -1; padding: 0.75rem; border-radius: var(--personal-radius); background: var(--personal-color-bg-surface-frost); font-size: 0.85rem; }
.notice--error { display: flex; justify-content: space-between; align-items: center; gap: 1rem; color: var(--personal-color-red); background: var(--personal-color-status-fail-bg-blush); }
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
@media (max-width: 1000px) { .bill-card { gap: 1.5rem; padding: 1.5rem; } }
@media (max-width: 760px) {
  .bill-card { grid-template-columns: minmax(0, 1fr); padding: 1rem; }
  .payment-form { padding-top: 0; gap: 1.5rem; }
  .form-row { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .form-footer { flex-wrap: wrap; gap: 1rem; }
  .form-actions { margin-left: auto; }
}
</style>
