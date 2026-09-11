<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { useTuitionStore } from '../../store/payment/useTuitionStore';
import { useSemesterStore } from '../../store/semester/useSemesterStore';
import { useDocumentStore } from '../../store/payment/useDocumentStore';
import MyPageContainer from '../../components/layout/MyPageContainer.vue';
import MySearchFilter from '../../components/search/MySearchFilter.vue';
import MyTable from '../../components/table/MyTable.vue';
import MyButton from '../../components/button/MyButton.vue';
import MySelect from '../../components/input/MySelect.vue';
import MyStatusBadge from '../../components/common/MyStatusBadge.vue';
import { notify } from '../../composables/useDialog';
import { formatCurrency, formatDate } from '../../util/format';
import { PAYMENT_STATUS_LABEL, PAYMENT_STATUS_VARIANT, PAYMENT_TYPE_LABEL } from '../../util/payment/enumLabels';

const tuitionStore = useTuitionStore();
const semesterStore = useSemesterStore();
const documentStore = useDocumentStore();

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

// 필터에 지정된 연도·학기의 고지 건을 찾아 그 고지에 대해 인쇄/발급한다. 필터가 비어 있으면 가장 최근 고지를 쓴다.
const resolveTargetBill = () => {
  const matches = tuitionStore.myBills.filter((bill) => semesterMatches(bill.semesterId));
  return matches[0] || null;
};

const handlePrintNotice = async () => {
  const bill = resolveTargetBill();
  if (!bill) {
    await notify('출력할 등록금 고지를 찾을 수 없습니다. 연도·학기를 확인해 주세요.');
    return;
  }
  window.print();
};

const handleIssueReceipt = async () => {
  const bill = resolveTargetBill();
  if (!bill) {
    await notify('납부확인서를 발급할 등록금 고지를 찾을 수 없습니다. 연도·학기를 확인해 주세요.');
    return;
  }
  try {
    await documentStore.issuePaymentReceipt(bill.id);
    await notify('납부확인서가 발급되었습니다.');
  } catch (error) {
    await notify(error.response?.data?.message || '납부확인서를 발급하지 못했습니다.');
  }
};

onMounted(() => {
  tuitionStore.fetchPaymentHistory();
  tuitionStore.fetchMyBills();
  semesterStore.fetchSemesters();
});
</script>

<template>
  <MyPageContainer title="등록금 납부 내역">
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
      <div class="search-group">
        <label for="filter-type">신청 구분</label>
        <MySelect id="filter-type" v-model="filters.paymentType">
          <option value="">전체</option>
          <option value="LUMP_SUM">일괄납부</option>
          <option value="INSTALLMENT">분할납부</option>
        </MySelect>
      </div>
      <div class="search-group">
        <label for="filter-status">처리 상태</label>
        <MySelect id="filter-status" v-model="filters.status">
          <option value="">전체</option>
          <option v-for="(label, value) in PAYMENT_STATUS_LABEL" :key="value" :value="value">
            {{ label }}
          </option>
        </MySelect>
      </div>
    </MySearchFilter>

    <div class="list-heading">
      <h3>나의 납부 내역</h3>
      <div class="document-actions">
        <MyButton btn-type="button" color="white" size="middle" content="고지서 출력" @click="handlePrintNotice" />
        <MyButton btn-type="button" color="white" size="middle" content="납부확인서" :disabled="documentStore.isIssuing" @click="handleIssueReceipt" />
      </div>
    </div>
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
      </tr>
    </MyTable>
  </MyPageContainer>
</template>

<style scoped>
.list-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.list-heading h3 {
  margin: 0;
}

.document-actions {
  display: flex;
  gap: 8px;
}
</style>
