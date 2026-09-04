<template>
  <MyPageContainer title="분할납부 신청">
    <article class="form-card">
      <div v-if="instStore.isLoadingPlan">
        <p class="notice">불러오는 중...</p>
      </div>

      <!-- 신청 폼 (계획이 없을 때) -->
      <div v-else-if="!instStore.installmentPlan">
        <p class="notice">아직 분할납부를 신청하지 않았습니다.</p>

        <div v-if="submitSuccess">
          <p class="success-notice">신청 완료, 관리자 승인을 기다려주세요.</p>
        </div>
        <div v-else class="apply-form">
          <div class="form-group">
            <label>분할 회차</label>
            <MySelect v-model="selectedRounds">
              <option :value="2">2회</option>
              <option :value="3">3회</option>
              <option :value="4">4회</option>
            </MySelect>
          </div>
          <div class="action-area">
            <MyButton
              color="deep-blue"
              content="신청하기"
              size="middle"
              @click="onSubmit"
              :disabled="instStore.isSubmittingPlan"
            />
          </div>
        </div>
      </div>

      <!-- 계획이 있을 때 -->
      <div v-else>
        <div class="status-panel">
          <MyStatusBadge
            :label="INSTALLMENT_PLAN_STATUS_LABEL[instStore.installmentPlan.status]"
            :variant="INSTALLMENT_PLAN_STATUS_VARIANT[instStore.installmentPlan.status]"
          />
        </div>

        <div v-if="instStore.installmentPlan.status === 'REQUESTED'">
          <p class="notice">승인 대기 중입니다. 관리자 승인 후 결제가 가능합니다.</p>
        </div>

        <div v-else-if="instStore.installmentPlan.status === 'REJECTED'">
          <p class="error-notice">
            반려됨: {{ instStore.installmentPlan.rejectReason || '사유 없음' }}
          </p>
        </div>

        <div v-else-if="instStore.installmentPlan.status === 'ACTIVE' || instStore.installmentPlan.status === 'COMPLETED'">
          <div v-if="instStore.installmentPlan.status === 'COMPLETED'" class="success-notice">
            모든 분할납부가 완료되었습니다.
          </div>

          <MyTable
            :columns="[
              { key: 'round', label: '회차' },
              { key: 'amount', label: '금액' },
              { key: 'dueDate', label: '납부기한' },
              { key: 'status', label: '상태' },
              { key: 'action', label: '결제' }
            ]"
          >
            <tr v-for="item in sortedItems" :key="item.id">
              <td>{{ item.roundNo }}회</td>
              <td>{{ formatCurrency(item.amount) }}</td>
              <td>{{ item.dueDate || '-' }}</td>
              <td>
                <MyStatusBadge
                  :label="INSTALLMENT_ITEM_STATUS_LABEL[item.status]"
                  :variant="INSTALLMENT_ITEM_STATUS_VARIANT[item.status]"
                />
              </td>
              <td>
                <MyButton
                  v-if="item.status === 'SCHEDULED' && instStore.installmentPlan.status === 'ACTIVE'"
                  color="deep-blue"
                  size="small"
                  content="결제하기"
                  @click="onPayment(item)"
                  :disabled="instStore.isProcessingPayment"
                />
              </td>
            </tr>
          </MyTable>
        </div>
      </div>
    </article>
  </MyPageContainer>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRoute } from 'vue-router';
import { useInstallmentStore } from '../../store/payment/useInstallmentStore';
import { 
  INSTALLMENT_PLAN_STATUS_LABEL, 
  INSTALLMENT_PLAN_STATUS_VARIANT,
  INSTALLMENT_ITEM_STATUS_LABEL,
  INSTALLMENT_ITEM_STATUS_VARIANT
} from '../../util/payment/enumLabels';
import MyPageContainer from '../../components/layout/MyPageContainer.vue';
import MyButton from '../../components/button/MyButton.vue';
import MySelect from '../../components/input/MySelect.vue';
import MyStatusBadge from '../../components/common/MyStatusBadge.vue';
import MyTable from '../../components/table/MyTable.vue';
import { formatCurrency } from '../../util/format';

const route = useRoute();
const instStore = useInstallmentStore();

const tuitionBillId = Number(route.params.tuitionBillId);
const selectedRounds = ref(2);
const submitSuccess = ref(false);

onMounted(async () => {
  await instStore.fetchInstallmentPlan(tuitionBillId);
});

const sortedItems = computed(() => {
  if (!instStore.installmentPlan || !instStore.installmentPlan.items) return [];
  return [...instStore.installmentPlan.items].sort((a, b) => a.roundNo - b.roundNo);
});

const onSubmit = async () => {
  try {
    await instStore.submitInstallmentPlan({
      tuitionBillId,
      totalRounds: selectedRounds.value
    });
    submitSuccess.value = true;
  } catch (err) {
    alert('신청 중 오류가 발생했습니다.');
  }
};

const onPayment = async (item) => {
  if (!confirm(`${item.roundNo}회차 금액 ${formatCurrency(item.amount)}을 결제하시겠습니까?`)) {
    return;
  }
  try {
    await instStore.processInstallmentPayment({
      tuitionBillId,
      installmentPlanItemId: item.id
    });
    alert('결제가 완료되었습니다.');
  } catch (err) {
    alert('결제 중 오류가 발생했습니다.');
  }
};
</script>

<style scoped>
.form-card {
  padding: 26px 30px;
  background-color: var(--personal-color-white);
  border: 1px solid var(--personal-color-border-mist);
  border-radius: 8px;
}
.form-group {
  margin-bottom: 20px;
}
label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: var(--personal-color-black);
}
select {
  padding: 10px;
  width: 250px;
  border: 1px solid var(--personal-color-gray);
  border-radius: 4px;
  font-size: 0.95rem;
}
.notice, .success-notice, .error-notice {
  padding: 20px;
  border-radius: 6px;
  margin-bottom: 20px;
  font-weight: 500;
  text-align: center;
}
.notice { background-color: var(--personal-color-bg-subtle-snow); color: var(--personal-color-text-secondary-steel); }
.success-notice { background-color: var(--personal-color-bg-success-soft-honeydew); color: var(--personal-color-success-text-forest); border: 1px solid var(--personal-color-success-text-forest); }
.error-notice { background-color: var(--personal-color-bg-danger-soft-rose); color: var(--personal-color-danger-strong-crimson); border: 1px solid var(--personal-color-danger-strong-crimson); }

.status-panel {
  margin-bottom: 20px;
  display: flex;
  justify-content: flex-end;
}
.action-area {
  display: flex;
  justify-content: flex-start;
}
</style>
