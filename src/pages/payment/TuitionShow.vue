<script setup>
import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import { useTuitionStore } from '../../store/payment/useTuitionStore';
import { useSemesterStore } from '../../store/semester/useSemesterStore';
import MyPageContainer from '../../components/layout/MyPageContainer.vue';
import SummaryStatCard from '../../components/payment/SummaryStatCard.vue';
import TuitionPaymentPanel from '../../components/payment/TuitionPaymentPanel.vue';
import { formatCurrency, formatDeduction } from '../../util/format';
import { TUITION_BILL_STATUS_LABEL } from '../../util/payment/enumLabels';

const route = useRoute();
const tuitionBillId = computed(() => Number(route.params.id));
const tuitionStore = useTuitionStore();
const semesterStore = useSemesterStore();
const paymentDetails = ref(null);

onMounted(() => {
  tuitionStore.fetchMyBills();
  semesterStore.fetchSemesters();
});
</script>

<template>
  <MyPageContainer title="등록금 납부">
    <div class="panels">
      <section
        v-if="paymentDetails"
        class="summary-bar"
      >
        <SummaryStatCard
          label="총 등록금"
          :value="formatCurrency(paymentDetails.allocation.billingAmount)"
        />
        <SummaryStatCard
          label="장학금"
          :value="formatDeduction(paymentDetails.allocation.totalScholarshipAmount)"
        />
        <SummaryStatCard
          label="납부 예정액"
          :value="formatCurrency(paymentDetails.allocation.actualPaymentAmount)"
          highlight
        />
        <SummaryStatCard
          label="현재 납부 상태"
          :value="TUITION_BILL_STATUS_LABEL[paymentDetails.status.status]"
        />
      </section>

      <TuitionPaymentPanel
        :tuition-bill-id="tuitionBillId"
        @details-change="paymentDetails = $event"
      />
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
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.summary-bar :deep(.stat-card) { align-items: center; justify-content: center; min-height: 5.75rem; text-align: center; }

@media (max-width: 640px) {
  .summary-bar {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
