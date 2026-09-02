<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { useTuitionStore } from '../../store/payment/useTuitionStore';
import { useSemesterStore } from '../../store/semester/useSemesterStore';
import MyPageContainer from '../../components/layout/MyPageContainer.vue';
import MySearchFilter from '../../components/search/MySearchFilter.vue';
import MyTable from '../../components/table/MyTable.vue';
import MyButton from '../../components/button/MyButton.vue';
import MyStatusBadge from '../../components/common/MyStatusBadge.vue';
import { formatCurrency, formatDate } from '../../util/format';
import { PAYMENT_STATUS_LABEL, PAYMENT_STATUS_VARIANT, PAYMENT_TYPE_LABEL } from '../../util/payment/enumLabels';

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

const filteredHistory = computed(() => tuitionStore.paymentHistory.filter((row) => {
  if (!semesterMatches(row.semesterId)) return false;
  if (appliedFilters.value.paymentType && row.paymentType !== appliedFilters.value.paymentType) return false;
  if (appliedFilters.value.status && row.status !== appliedFilters.value.status) return false;
  return true;
}));

onMounted(() => {
  tuitionStore.fetchPaymentHistory();
  semesterStore.fetchSemesters();
});
</script>

<template>
  <MyPageContainer title="등록금 납부 내역">
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
          <MyStatusBadge
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
  </MyPageContainer>
</template>
