<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useTuitionStore } from '../../store/payment/useTuitionStore';
import { useSemesterStore } from '../../store/semester/useSemesterStore';
import MySearchFilter from '../../components/search/MySearchFilter.vue';
import MyTable from '../../components/table/MyTable.vue';
import MyButton from '../../components/button/MyButton.vue';
import StatusBadge from '../../components/common/StatusBadge.vue';
import SummaryStatCard from '../../components/payment/SummaryStatCard.vue';
import { formatCurrency, formatDate, formatDeduction } from '../../util/format';
import {
  TUITION_BILL_STATUS_LABEL,
  TUITION_BILL_STATUS_VARIANT,
  PAYMENT_STATUS_LABEL,
  PAYMENT_STATUS_VARIANT,
  PAYMENT_TYPE_LABEL,
} from '../../util/payment/enumLabels';

const tuitionStore = useTuitionStore();
const semesterStore = useSemesterStore();

const filters = reactive({
  academicYear: '',
  term: '',
  paymentType: '',
  status: '',
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

const filteredHistory = computed(() => tuitionStore.paymentHistory.filter((row) => {
  if (!semesterMatches(row.semesterId)) return false;
  if (appliedFilters.value.paymentType && row.paymentType !== appliedFilters.value.paymentType) return false;
  if (appliedFilters.value.status && row.status !== appliedFilters.value.status) return false;
  return true;
}));

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
  tuitionStore.fetchPaymentHistory();
  semesterStore.fetchSemesters();
});
</script>

<template>
  <div class="page">
    <h1>등록금 신청 내역</h1>

    <MySearchFilter submit-text="조회" @search="applyFilters">
      <div class="search-group">
        <label for="filter-year">연도</label>
        <select id="filter-year" v-model="filters.academicYear">
          <option value="">전체</option>
          <option v-for="year in semesterStore.academicYears" :key="year" :value="year">
            {{ year }}학년도
          </option>
        </select>
      </div>
      <div class="search-group">
        <label for="filter-term">학기</label>
        <select id="filter-term" v-model="filters.term">
          <option value="">전체</option>
          <option value="FIRST">1학기</option>
          <option value="SECOND">2학기</option>
        </select>
      </div>
      <div class="search-group">
        <label for="filter-type">신청 구분</label>
        <select id="filter-type" v-model="filters.paymentType">
          <option value="">전체</option>
          <option value="LUMP_SUM">일괄납부</option>
          <option value="INSTALLMENT">분할납부</option>
        </select>
      </div>
      <div class="search-group">
        <label for="filter-status">처리 상태</label>
        <select id="filter-status" v-model="filters.status">
          <option value="">전체</option>
          <option v-for="(label, value) in PAYMENT_STATUS_LABEL" :key="value" :value="value">
            {{ label }}
          </option>
        </select>
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
        <StatusBadge
          :label="TUITION_BILL_STATUS_LABEL[latestBill.status]"
          :variant="TUITION_BILL_STATUS_VARIANT[latestBill.status]"
        />
      </div>
    </section>

    <section class="history-section">
      <h3>나의 납부 내역</h3>
      <MyTable
        :loading="tuitionStore.isLoadingPaymentHistory"
        :empty="!tuitionStore.isLoadingPaymentHistory && filteredHistory.length === 0"
        empty-message="조회된 납부 내역이 없습니다."
        :columns="[
          { key: 'semester', label: '학기' },
          { key: 'type', label: '납부 구분' },
          { key: 'date', label: '납부일' },
          { key: 'amount', label: '납부금액' },
          { key: 'status', label: '상태' },
          { key: 'detail', label: '상세' },
        ]"
      >
        <tr v-for="row in filteredHistory" :key="`${row.tuitionBillId}-${row.paymentDate}-${row.amount}`">
          <td>{{ semesterStore.getSemesterLabel(row.semesterId) }}</td>
          <td>{{ PAYMENT_TYPE_LABEL[row.paymentType] || row.paymentType }}</td>
          <td>{{ row.paymentDate ? formatDate(row.paymentDate) : '-' }}</td>
          <td>{{ formatCurrency(row.amount) }}</td>
          <td>
            <StatusBadge
              :label="PAYMENT_STATUS_LABEL[row.status]"
              :variant="PAYMENT_STATUS_VARIANT[row.status]"
            />
          </td>
          <td>
            <RouterLink :to="`/tuition/${row.tuitionBillId}`">
              <MyButton color="white" size="small" content="상세보기" />
            </RouterLink>
          </td>
        </tr>
      </MyTable>
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
            <StatusBadge
              :label="TUITION_BILL_STATUS_LABEL[bill.status]"
              :variant="TUITION_BILL_STATUS_VARIANT[bill.status]"
            />
          </RouterLink>
        </li>
      </ul>
    </section>
  </div>
</template>

<style scoped>
.page {
  max-width: 960px;
  margin: 0 auto;
  padding: 32px;
}

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
  border: 1px solid #e2e8f0;
}

.stat-label {
  font-size: 0.85rem;
  color: #64748b;
}

.history-section,
.bill-list-section {
  margin-bottom: 24px;
}

.history-section h3,
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
  color: #64748b;
  font-size: 0.85rem;
}

@media (max-width: 640px) {
  .page {
    padding: 20px;
  }

  .summary-bar {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
