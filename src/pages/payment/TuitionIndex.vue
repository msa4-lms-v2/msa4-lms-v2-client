<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useTuitionStore } from '../../store/payment/useTuitionStore';
import { useSemesterStore } from '../../store/semester/useSemesterStore';
import MyPageContainer from '../../components/layout/MyPageContainer.vue';
import MySearchFilter from '../../components/search/MySearchFilter.vue';
import MySelect from '../../components/input/MySelect.vue';
import MyStatusBadge from '../../components/common/MyStatusBadge.vue';
import SummaryStatCard from '../../components/payment/SummaryStatCard.vue';
import { formatCurrency, formatDate, formatDeduction } from '../../util/format';
import { TUITION_BILL_STATUS_LABEL, TUITION_BILL_STATUS_VARIANT } from '../../util/payment/enumLabels';

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

// 요약 카드는 필터링된 고지 중 납부 기한이 가장 최근인 고지 하나를 기준으로 보여준다.
const latestBill = computed(() => {
  if (filteredBills.value.length === 0) return null;
  return [...filteredBills.value].sort((a, b) => new Date(b.dueDate) - new Date(a.dueDate))[0];
});

watch(latestBill, (bill) => {
  if (bill) tuitionStore.fetchAllocation(bill.id);
});

onMounted(() => {
  tuitionStore.fetchMyBills();
  semesterStore.fetchSemesters();
});
</script>

<template>
  <MyPageContainer title="등록금 납부">
    <MySearchFilter submit-text="조회" @search="applyFilters">
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
      <div class="stat-card">
        <span class="stat-label">현재 납부 상태</span>
        <MyStatusBadge
          :label="TUITION_BILL_STATUS_LABEL[latestBill.status]"
          :variant="TUITION_BILL_STATUS_VARIANT[latestBill.status]"
        />
      </div>
    </section>

    <section class="bill-list-section">
      <h3>등록금 고지 목록</h3>
      <p v-if="tuitionStore.isLoadingMyBills">
        불러오는 중...
      </p>
      <p v-else-if="filteredBills.length === 0">
        조회된 등록금 고지가 없습니다.
      </p>
      <ul v-else class="bill-list">
        <li v-for="bill in filteredBills" :key="bill.id">
          <RouterLink :to="`/tuition/${bill.id}`" class="bill-card">
            <span class="semester">{{ semesterStore.getSemesterLabel(bill.semesterId) }}</span>
            <span class="amount">{{ formatCurrency(bill.billingAmount) }}</span>
            <span class="due">{{ formatDate(bill.dueDate) }} 까지</span>
            <MyStatusBadge
              :label="TUITION_BILL_STATUS_LABEL[bill.status]"
              :variant="TUITION_BILL_STATUS_VARIANT[bill.status]"
            />
          </RouterLink>
        </li>
      </ul>
    </section>
  </MyPageContainer>
</template>

<style scoped>
.summary-bar {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 24px;
}

.stat-card {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 16px 20px;
  background: var(--personal-color-white);
  border-radius: var(--personal-radius);
  border: 1px solid var(--personal-color-border-mist);
}

.stat-label {
  font-size: 0.85rem;
  color: var(--personal-color-text-muted-slate);
}

.bill-list-section h3 {
  margin: 0 0 12px;
}

.bill-list {
  list-style: none;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.bill-card {
  display: flex;
  align-items: center;
  gap: 16px;
  background: var(--personal-color-white);
  border-radius: var(--personal-radius-card);
  padding: 20px 24px;
  text-decoration: none;
  color: inherit;
}

.semester {
  font-weight: 700;
}

.amount {
  margin-left: auto;
}

.due {
  color: var(--personal-color-text-muted-slate);
  font-size: 0.85rem;
}

@media (max-width: 640px) {
  .summary-bar {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
