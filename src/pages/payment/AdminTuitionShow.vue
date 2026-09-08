<script setup>
import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import { useTuitionStore } from '../../store/payment/useTuitionStore';
import { useInstallmentStore } from '../../store/payment/useInstallmentStore';
import { useRefundStore } from '../../store/payment/useRefundStore';
import TuitionStatusPanel from '../../components/payment/TuitionStatusPanel.vue';
import ScholarshipAllocationPanel from '../../components/payment/ScholarshipAllocationPanel.vue';
import ScholarshipApplyForm from '../../components/payment/ScholarshipApplyForm.vue';
import MyPageContainer from '../../components/layout/MyPageContainer.vue';
import MyButton from '../../components/button/MyButton.vue';
import MyModal from '../../components/common/MyModal.vue';
import MyTable from '../../components/table/MyTable.vue';
import MyStatusBadge from '../../components/common/MyStatusBadge.vue';
import MySelect from '../../components/input/MySelect.vue';
import { confirmDialog, notify } from '../../composables/useDialog';
import { formatCurrency } from '../../util/format';
import {
  INSTALLMENT_PLAN_STATUS_LABEL,
  INSTALLMENT_PLAN_STATUS_VARIANT,
  INSTALLMENT_ITEM_STATUS_LABEL,
  INSTALLMENT_ITEM_STATUS_VARIANT,
  REFUND_STATUS_LABEL,
  REFUND_STATUS_VARIANT,
  REFUND_TYPE_LABEL,
  PAYMENT_ATTEMPT_STATUS_LABEL,
} from '../../util/payment/enumLabels';

const route = useRoute();
const tuitionBillId = Number(route.params.id);
const tuitionStore = useTuitionStore();
const installmentStore = useInstallmentStore();
const refundStore = useRefundStore();

const handleApplyScholarship = (payload) => {
  tuitionStore.applyScholarship({ tuitionBillId, ...payload });
};

// 분할납부 심사
const rejectReason = ref('');
const isReviewOpen = ref(false);

const openReview = () => {
  rejectReason.value = '';
  isReviewOpen.value = true;
};
const closeReview = () => {
  if (installmentStore.isReviewingPlan) return;
  isReviewOpen.value = false;
};

const reviewPlan = async (decision) => {
  if (decision === 'REJECT' && !rejectReason.value.trim()) {
    await notify('반려 사유를 입력해 주세요.');
    return;
  }
  try {
    await installmentStore.reviewInstallmentPlan({
      planId: installmentStore.installmentPlan.id,
      decision,
      rejectReason: decision === 'REJECT' ? rejectReason.value.trim() : null,
    });
    await notify(decision === 'APPROVE' ? '분할납부 신청을 승인했습니다.' : '분할납부 신청을 반려했습니다.');
    isReviewOpen.value = false;
  } catch (error) {
    await notify(error.response?.data?.message || '심사 처리 중 오류가 발생했습니다.');
  }
};

// 환불·PG취소 관리
const isPgCancelOpen = ref(false);
const pgCancelForm = ref({ paymentId: '', amount: '', reason: '' });

const openPgCancel = async () => {
  pgCancelForm.value = { paymentId: '', amount: '', reason: '' };
  isPgCancelOpen.value = true;
  try {
    await refundStore.fetchBillPayments(tuitionBillId);
  } catch {
    await notify('결제 내역을 불러오지 못했습니다.');
  }
};
const closePgCancel = () => {
  if (refundStore.isCreatingPgCancel) return;
  isPgCancelOpen.value = false;
};

const succeededPayments = computed(() => refundStore.billPayments.filter((p) => p.status === 'SUCCEEDED'));

const submitPgCancel = async () => {
  if (!pgCancelForm.value.paymentId) {
    await notify('취소할 결제를 선택해 주세요.');
    return;
  }
  if (!pgCancelForm.value.reason.trim()) {
    await notify('취소 사유를 입력해 주세요.');
    return;
  }
  try {
    await refundStore.createPgCancelRefund({
      paymentId: Number(pgCancelForm.value.paymentId),
      amount: pgCancelForm.value.amount ? Number(pgCancelForm.value.amount) : null,
      reason: pgCancelForm.value.reason.trim(),
    });
    await notify('PG 취소 요청을 등록했습니다.');
    isPgCancelOpen.value = false;
    await refundStore.fetchRefunds(tuitionBillId);
  } catch (error) {
    await notify(error.response?.data?.message || 'PG 취소 요청 중 오류가 발생했습니다.');
  }
};

const retryRefund = async () => {
  const confirmed = await confirmDialog('실패한 환불을 재시도하시겠습니까?');
  if (!confirmed) return;
  try {
    await refundStore.retryFailedRefund(tuitionBillId);
    await notify('재시도 요청을 등록했습니다.');
    await refundStore.fetchRefunds(tuitionBillId);
  } catch (error) {
    await notify(error.response?.data?.message || '재시도 중 오류가 발생했습니다.');
  }
};

// 환불 실행
const executeTarget = ref(null);
const executeForm = ref({ cancelReason: '', refundBankCode: '', refundAccountNumber: '', refundHolderName: '' });

const needsBankInfo = computed(() => executeTarget.value && executeTarget.value.refundType !== 'PG_CANCEL');

const openExecute = (refund) => {
  executeTarget.value = refund;
  executeForm.value = { cancelReason: '', refundBankCode: '', refundAccountNumber: '', refundHolderName: '' };
};
const closeExecute = () => {
  if (refundStore.isExecuting) return;
  executeTarget.value = null;
};

const submitExecute = async () => {
  if (!executeForm.value.cancelReason.trim()) {
    await notify('취소 사유를 입력해 주세요.');
    return;
  }
  if (needsBankInfo.value && (!executeForm.value.refundBankCode.trim() || !executeForm.value.refundAccountNumber.trim() || !executeForm.value.refundHolderName.trim())) {
    await notify('환불 수취 계좌 정보를 모두 입력해 주세요.');
    return;
  }
  try {
    await refundStore.executeRefund({
      refundId: executeTarget.value.id,
      cancelReason: executeForm.value.cancelReason.trim(),
      refundBankCode: needsBankInfo.value ? executeForm.value.refundBankCode.trim() : null,
      refundAccountNumber: needsBankInfo.value ? executeForm.value.refundAccountNumber.trim() : null,
      refundHolderName: needsBankInfo.value ? executeForm.value.refundHolderName.trim() : null,
    });
    await notify('환불을 실행했습니다.');
    executeTarget.value = null;
    await refundStore.fetchRefunds(tuitionBillId);
  } catch (error) {
    await notify(error.response?.data?.message || '환불 실행 중 오류가 발생했습니다.');
  }
};

const loadInstallmentPlan = async () => {
  try {
    await installmentStore.fetchInstallmentPlan(tuitionBillId);
  } catch {
    // 신청 이력이 없으면 404이며 스토어가 null로 처리한다.
  }
};

onMounted(() => {
  tuitionStore.fetchStatus(tuitionBillId);
  tuitionStore.fetchAllocation(tuitionBillId);
  loadInstallmentPlan();
  refundStore.fetchRefunds(tuitionBillId);
});
</script>

<template>
  <MyPageContainer :title="`등록금 고지 #${tuitionBillId}`">
    <div class="panels">
      <TuitionStatusPanel v-if="tuitionStore.currentStatus" :status="tuitionStore.currentStatus" />
      <p v-else-if="tuitionStore.isLoadingStatus">불러오는 중...</p>

      <ScholarshipAllocationPanel
        v-if="tuitionStore.currentAllocation"
        :allocation="tuitionStore.currentAllocation"
      />
      <p v-else-if="tuitionStore.isLoadingAllocation">불러오는 중...</p>

      <ScholarshipApplyForm
        :is-submitting="tuitionStore.isSubmittingScholarship"
        @submit="handleApplyScholarship"
      />

      <section class="admin-panel" aria-labelledby="installment-review-title">
        <div class="panel-header">
          <h3 id="installment-review-title">분할납부 심사</h3>
          <MyStatusBadge
            v-if="installmentStore.installmentPlan"
            :label="INSTALLMENT_PLAN_STATUS_LABEL[installmentStore.installmentPlan.status]"
            :variant="INSTALLMENT_PLAN_STATUS_VARIANT[installmentStore.installmentPlan.status]"
          />
        </div>

        <p v-if="installmentStore.isLoadingPlan">불러오는 중...</p>
        <p v-else-if="!installmentStore.installmentPlan" class="empty-text">분할납부 신청 이력이 없습니다.</p>
        <template v-else>
          <p class="description">
            총 {{ installmentStore.installmentPlan.totalRounds }}회차 분할납부 신청입니다.
          </p>
          <MyTable
            :columns="[
              { key: 'round', label: '회차' },
              { key: 'amount', label: '금액' },
              { key: 'status', label: '상태' },
            ]"
          >
            <tr v-for="(item, index) in installmentStore.installmentPlan.items" :key="item.id">
              <td>{{ index + 1 }}회차</td>
              <td>{{ formatCurrency(item.amount) }}</td>
              <td>
                <MyStatusBadge
                  :label="INSTALLMENT_ITEM_STATUS_LABEL[item.status] || item.status"
                  :variant="INSTALLMENT_ITEM_STATUS_VARIANT[item.status] || 'processing'"
                />
              </td>
            </tr>
          </MyTable>

          <p v-if="installmentStore.installmentPlan.rejectReason" class="notice">
            반려 사유: {{ installmentStore.installmentPlan.rejectReason }}
          </p>

          <MyButton
            v-if="installmentStore.installmentPlan.status === 'REQUESTED'"
            color="deep-blue"
            size="middle"
            content="심사하기"
            @click="openReview"
          />
        </template>
      </section>

      <section class="admin-panel" aria-labelledby="refund-management-title">
        <div class="panel-header">
          <h3 id="refund-management-title">환불·취소·재시도 관리</h3>
          <MyButton color="deep-blue" size="middle" content="PG 취소 신청" @click="openPgCancel" />
        </div>

        <MyTable
          :loading="refundStore.isLoadingRefunds"
          :empty="!refundStore.isLoadingRefunds && refundStore.refunds.length === 0"
          empty-message="환불·취소 이력이 없습니다."
          :columns="[
            { key: 'id', label: '환불번호' },
            { key: 'type', label: '유형' },
            { key: 'amount', label: '금액' },
            { key: 'rate', label: '환불률' },
            { key: 'status', label: '상태' },
            { key: 'retry', label: '재시도 횟수' },
            { key: 'action', label: '관리' },
          ]"
        >
          <tr v-for="refund in refundStore.refunds" :key="refund.id">
            <td>{{ refund.id }}</td>
            <td>{{ REFUND_TYPE_LABEL[refund.refundType] || refund.refundType }}</td>
            <td>{{ formatCurrency(refund.amount) }}</td>
            <td>{{ refund.refundRate != null ? `${(Number(refund.refundRate) * 100).toFixed(2)}%` : '-' }}</td>
            <td>
              <MyStatusBadge
                :label="REFUND_STATUS_LABEL[refund.status] || refund.status"
                :variant="REFUND_STATUS_VARIANT[refund.status] || 'processing'"
              />
            </td>
            <td>{{ refund.retryCount }}</td>
            <td class="action-cell">
              <MyButton
                v-if="refund.status === 'FAILED'"
                color="white"
                size="small"
                content="재시도"
                @click="retryRefund"
              />
              <MyButton
                v-if="['REQUESTED', 'RETRYING'].includes(refund.status)"
                color="deep-blue"
                size="small"
                content="실행"
                @click="openExecute(refund)"
              />
            </td>
          </tr>
        </MyTable>
      </section>
    </div>

    <MyModal :is-open="isReviewOpen" title="분할납부 신청 심사" max-width="480px" @close="closeReview">
      <p class="description">이 신청을 승인하면 학생이 회차 결제를 시작할 수 있습니다.</p>
      <div class="review-area">
        <textarea v-model="rejectReason" rows="2" placeholder="반려 시 사유를 입력해 주세요."></textarea>
      </div>
      <template #footer>
        <MyButton color="gray" size="small" content="닫기" :disabled="installmentStore.isReviewingPlan" @click="closeReview" />
        <MyButton color="red" size="small" content="반려" :disabled="installmentStore.isReviewingPlan" @click="reviewPlan('REJECT')" />
        <MyButton color="deep-blue" size="small" content="승인" :disabled="installmentStore.isReviewingPlan" @click="reviewPlan('APPROVE')" />
      </template>
    </MyModal>

    <MyModal :is-open="isPgCancelOpen" title="PG 취소 신청" max-width="480px" @close="closePgCancel">
      <div class="form-grid">
        <label for="pg-cancel-payment">취소할 결제</label>
        <MySelect
          id="pg-cancel-payment"
          v-model="pgCancelForm.paymentId"
          placeholder="결제를 선택하세요"
          :options="succeededPayments.map((p) => ({
            value: p.id,
            label: `#${p.id} · ${PAYMENT_ATTEMPT_STATUS_LABEL[p.status] || p.status} · ${formatCurrency(p.amount)}`,
          }))"
        />

        <label for="pg-cancel-amount">취소 금액(비우면 전액)</label>
        <input id="pg-cancel-amount" v-model="pgCancelForm.amount" type="number" min="0" />

        <label for="pg-cancel-reason">취소 사유</label>
        <textarea id="pg-cancel-reason" v-model="pgCancelForm.reason" rows="2"></textarea>
      </div>
      <template #footer>
        <MyButton color="gray" size="small" content="닫기" :disabled="refundStore.isCreatingPgCancel" @click="closePgCancel" />
        <MyButton color="deep-blue" size="small" content="신청" :disabled="refundStore.isCreatingPgCancel" @click="submitPgCancel" />
      </template>
    </MyModal>

    <MyModal :is-open="Boolean(executeTarget)" title="환불 실행" max-width="480px" @close="closeExecute">
      <template v-if="executeTarget">
        <p class="description">환불번호 #{{ executeTarget.id }} · {{ formatCurrency(executeTarget.amount) }}</p>
        <div class="form-grid">
          <label for="execute-reason">취소 사유</label>
          <textarea id="execute-reason" v-model="executeForm.cancelReason" rows="2"></textarea>

          <template v-if="needsBankInfo">
            <label for="execute-bank-code">환불 수취은행 코드</label>
            <input id="execute-bank-code" v-model="executeForm.refundBankCode" type="text" placeholder="예: 020" />

            <label for="execute-account">환불 수취계좌번호</label>
            <input id="execute-account" v-model="executeForm.refundAccountNumber" type="text" placeholder="하이픈 없이 입력" />

            <label for="execute-holder">예금주명</label>
            <input id="execute-holder" v-model="executeForm.refundHolderName" type="text" />
          </template>
        </div>
      </template>
      <template #footer>
        <MyButton color="gray" size="small" content="닫기" :disabled="refundStore.isExecuting" @click="closeExecute" />
        <MyButton color="deep-blue" size="small" content="실행" :disabled="refundStore.isExecuting" @click="submitExecute" />
      </template>
    </MyModal>
  </MyPageContainer>
</template>

<style scoped>
.panels {
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-width: 900px;
}

.admin-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 24px;
  background: var(--personal-color-white);
  border-radius: var(--personal-radius-card);
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.panel-header h3 {
  margin: 0;
}

.description {
  margin: 0;
  color: var(--personal-color-text-muted-slate);
}

.empty-text {
  margin: 0;
  color: var(--personal-color-text-tertiary-slate);
}

.notice {
  padding: 12px;
  background: var(--personal-color-status-fail-bg-blush);
  border-radius: var(--personal-radius);
  margin: 0;
}

.action-cell {
  display: flex;
  gap: 8px;
  justify-content: center;
}

.review-area textarea,
.form-grid textarea,
.form-grid input {
  width: 100%;
  box-sizing: border-box;
  padding: 8px 12px;
  border: 1px solid var(--personal-color-border-mist);
  border-radius: 4px;
  font-size: 0.9rem;
  font-family: inherit;
}

.form-grid {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-grid label {
  font-size: 0.85rem;
  color: var(--personal-color-text-muted-slate);
  margin-top: 8px;
}

.form-grid label:first-child {
  margin-top: 0;
}
</style>
