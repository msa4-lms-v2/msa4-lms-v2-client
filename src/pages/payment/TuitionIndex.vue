<script setup>
import { computed, onMounted, ref } from 'vue';
import { useTuitionStore } from '../../store/payment/useTuitionStore';
import { useSemesterStore } from '../../store/semester/useSemesterStore';
import MyPageContainer from '../../components/layout/MyPageContainer.vue';
import MySelect from '../../components/input/MySelect.vue';
import SummaryStatCard from '../../components/payment/SummaryStatCard.vue';
import TuitionPaymentPanel from '../../components/payment/TuitionPaymentPanel.vue';
import { formatCurrency, formatDeduction } from '../../util/format';
import { TUITION_BILL_STATUS_LABEL } from '../../util/payment/enumLabels';

const tuitionStore = useTuitionStore();
const semesterStore = useSemesterStore();

const selectedBillId = ref(null);
const unpaidBills = computed(() => tuitionStore.myBills.filter(bill => ['UNPAID', 'PARTIAL', 'OVERDUE'].includes(bill.status)));
const latestBill = computed(() => unpaidBills.value.find(bill => bill.id === selectedBillId.value) || unpaidBills.value[0] || null);

onMounted(() => {
  tuitionStore.fetchMyBills();
  semesterStore.fetchSemesters();
});
</script>

<template>
  <MyPageContainer title="등록금 납부">
    <label v-if="unpaidBills.length > 1">납부할 고지
      <MySelect v-model="selectedBillId">
        <option v-for="bill in unpaidBills" :key="bill.id" :value="bill.id">{{ semesterStore.getSemesterLabel(bill.semesterId) }} · {{ formatCurrency(bill.billingAmount) }}</option>
      </MySelect>
    </label>

    <section v-if="latestBill" class="summary-bar">
      <SummaryStatCard
        label="총 등록금"
        :value="formatCurrency(tuitionStore.currentAllocation?.billingAmount ?? latestBill.billingAmount)"
      />
      <SummaryStatCard
        label="장학금"
        :value="formatDeduction(tuitionStore.currentAllocation?.totalScholarshipAmount ?? 0)"
      />
      <SummaryStatCard
        label="납부 예정액"
        :value="formatCurrency(tuitionStore.currentAllocation?.actualPaymentAmount ?? latestBill.billingAmount)"
        highlight
      />
      <SummaryStatCard
        label="현재 납부 상태"
        :value="TUITION_BILL_STATUS_LABEL[latestBill.status]"
      />
    </section>
    <p v-else-if="tuitionStore.isLoadingMyBills">
      불러오는 중...
    </p>
    <p v-else>
      납부할 등록금 고지가 없습니다.
    </p>

    <TuitionPaymentPanel v-if="latestBill" :tuition-bill-id="latestBill.id" />
  </MyPageContainer>
</template>

<style scoped>
.summary-bar {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 24px;
}

@media (max-width: 640px) {
  .summary-bar {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
