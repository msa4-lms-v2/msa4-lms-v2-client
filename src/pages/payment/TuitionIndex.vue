<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { useTuitionStore } from '../../store/payment/useTuitionStore';
import { useSemesterStore } from '../../store/semester/useSemesterStore';
import MyPageContainer from '../../components/layout/MyPageContainer.vue';
import MySearchFilter from '../../components/search/MySearchFilter.vue';
import MySelect from '../../components/input/MySelect.vue';
import SummaryStatCard from '../../components/payment/SummaryStatCard.vue';
import TuitionPaymentPanel from '../../components/payment/TuitionPaymentPanel.vue';
import { formatCurrency, formatDeduction } from '../../util/format';
import { TUITION_BILL_STATUS_LABEL } from '../../util/payment/enumLabels';

const tuitionStore = useTuitionStore();
const semesterStore = useSemesterStore();

const filters = reactive({
  academicYear: '',
  term: '',
});
const appliedFilters = ref({ ...filters });

const applyFilters = () => {
  appliedFilters.value = { ...filters };
};

const semesterMatches = (semesterId) => {
  const semester = semesterStore.semesters.find((item) => item.id === semesterId);
  if (!semester) return true;
  if (appliedFilters.value.academicYear && semester.academicYear !== Number(appliedFilters.value.academicYear)) {
    return false;
  }
  if (appliedFilters.value.term && semester.term !== appliedFilters.value.term) {
    return false;
  }
  return true;
};

const filteredBills = computed(() => tuitionStore.myBills.filter((bill) => semesterMatches(bill.semesterId)));

// 필터링된 고지 중 납부 기한이 가장 최근인 고지 하나를 기준으로 요약 카드와 납부 화면을 보여준다.
const latestBill = computed(() => {
  if (filteredBills.value.length === 0) return null;
  return [...filteredBills.value].sort((a, b) => new Date(b.dueDate) - new Date(a.dueDate))[0];
});

onMounted(() => {
  tuitionStore.fetchMyBills();
  semesterStore.fetchSemesters();
});
</script>

<template>
  <MyPageContainer title="등록금 납부">
    <MySearchFilter submit-text="조회" submit-at-end @search="applyFilters">
      <div class="search-group">
        <label for="filter-year">연도</label>
        <MySelect id="filter-year" v-model="filters.academicYear">
          <option value="">전체</option>
          <option v-for="year in semesterStore.academicYears" :key="year" :value="year">
            {{ year }}학년도
          </option>
        </MySelect>
      </div>
      <div class="search-group">
        <label for="filter-term">학기</label>
        <MySelect id="filter-term" v-model="filters.term">
          <option value="">전체</option>
          <option value="FIRST">1학기</option>
          <option value="SECOND">2학기</option>
        </MySelect>
      </div>
    </MySearchFilter>

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
      조회된 등록금 고지가 없습니다.
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
