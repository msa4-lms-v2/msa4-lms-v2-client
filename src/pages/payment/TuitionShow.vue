<script setup>
import { onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useTuitionStore } from '../../store/payment/useTuitionStore';
import MyPageContainer from '../../components/layout/MyPageContainer.vue';
import SummaryStatCard from '../../components/payment/SummaryStatCard.vue';
import TuitionPaymentPanel from '../../components/payment/TuitionPaymentPanel.vue';
import { formatCurrency, formatDeduction } from '../../util/format';

const route = useRoute();
const tuitionBillId = Number(route.params.id);
const tuitionStore = useTuitionStore();

onMounted(() => {
  tuitionStore.fetchMyBills();
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

      <TuitionPaymentPanel :tuition-bill-id="tuitionBillId" />
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
</style>
