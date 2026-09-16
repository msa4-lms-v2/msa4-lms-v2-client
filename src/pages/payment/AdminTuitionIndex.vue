<script setup>
import { ref, onMounted } from 'vue';
import { useTuitionStore } from '../../store/payment/useTuitionStore';
import MyStatusBadge from '../../components/common/MyStatusBadge.vue';
import MyPageContainer from '../../components/layout/MyPageContainer.vue';
import MyTable from '../../components/table/MyTable.vue';
import MySelect from '../../components/input/MySelect.vue';
import MySearchFilter from '../../components/search/MySearchFilter.vue';
import MyButton from '../../components/button/MyButton.vue';
import { useSemesterStore } from '../../store/semester/useSemesterStore';
import myAxios from '../../api/myAxios';
import { getPerson } from '../../api/peopleManagementApi';
import NumberedPagination from '../../components/pagination/NumberedPagination.vue';
import { formatCurrency, formatDate } from '../../util/format';
import { TUITION_BILL_STATUS_LABEL, TUITION_BILL_STATUS_VARIANT } from '../../util/payment/enumLabels';

const tuitionStore = useTuitionStore();
const semesterStore = useSemesterStore();

const statusFilter = ref('');
const errorMessage = ref('');
const people = ref({});
const loading = ref(false);

const load = async (page = 1) => {
  if (loading.value) return;
  errorMessage.value = '';
  loading.value = true;
  people.value = {};
  try {
    await tuitionStore.fetchAdminBills({ status: statusFilter.value || null, page });
    const studentIds = [...new Set(tuitionStore.adminBills.map(bill => bill.studentId).filter(Boolean))];
    const candidateIds = [...new Set(tuitionStore.adminBills
      .filter(bill => !bill.studentId && bill.admissionCandidateId)
      .map(bill => bill.admissionCandidateId))];
    const details = {};
    const results = await Promise.allSettled([
      semesterStore.fetchSemesters(),
      ...(studentIds.length ? [myAxios.get('/api/academic/students/identities', {
        params: { studentIds: studentIds.join(',') },
      }).then(response => {
        response.data.data.forEach(student => { details[`student:${student.studentId}`] = student; });
      })] : []),
      ...candidateIds.map(id => getPerson('admission', id).then(response => {
        details[`admission:${id}`] = response.data.data;
      })),
    ]);
    people.value = details;
    if (results.some(result => result.status === 'rejected')) {
      errorMessage.value = '일부 학생·학기 정보를 불러오지 못했습니다. 다시 조회해 주세요.';
    }
  } catch {
    errorMessage.value = '등록금 목록을 불러오지 못했습니다.';
  } finally {
    loading.value = false;
  }
};

const personFor = bill => people.value[bill.studentId
  ? `student:${bill.studentId}` : `admission:${bill.admissionCandidateId}`];
const studentNumberFor = bill => personFor(bill)?.studentNumber
  || (!bill.studentId && bill.admissionCandidateId ? '발급 대기' : '확인 불가');
const detailPath = bill => !bill.studentId && bill.admissionCandidateId
  ? `/admin/admissions/${bill.admissionCandidateId}` : `/admin/tuition/${bill.id}`;

onMounted(() => load());
</script>

<template>
  <MyPageContainer title="등록금 관리" class="admin-tuition-page">
    <MySearchFilter :submit-at-end="true" @search="load()">
      <div class="search-group">
        <label for="status-filter">납부 상태</label>
        <MySelect id="status-filter" v-model="statusFilter" :disabled="loading">
          <option value="">전체</option>
          <option v-for="(label, value) in TUITION_BILL_STATUS_LABEL" :key="value" :value="value">
            {{ label }}
          </option>
        </MySelect>
      </div>
    </MySearchFilter>

    <p v-if="errorMessage" class="error" role="alert">{{ errorMessage }}</p>

    <MyTable
      :loading="loading"
      :empty="!loading && tuitionStore.adminBills.length === 0"
      empty-message="조회된 등록금 목록이 없습니다."
      :columns="[
        { key: 'studentNumber', label: '학번' },
        { key: 'name', label: '이름' },
        { key: 'department', label: '소속 학과' },
        { key: 'semester', label: '학기' },
        { key: 'billingAmount', label: '고지 금액' },
        { key: 'dueDate', label: '납부 기한' },
        { key: 'status', label: '상태' },
        { key: 'detail', label: '상세' },
      ]"
    >
      <tr v-for="bill in tuitionStore.adminBills" :key="bill.id">
        <td>{{ studentNumberFor(bill) }}</td>
        <td>{{ personFor(bill)?.name || bill.admissionCustomerName || '확인 불가' }}</td>
        <td>{{ personFor(bill)?.departmentName || '확인 불가' }}</td>
        <td>{{ semesterStore.semesterLabelMap[bill.semesterId] || '확인 불가' }}</td>
        <td>{{ formatCurrency(bill.billingAmount) }}</td>
        <td>{{ formatDate(bill.dueDate) }}</td>
        <td>
          <MyStatusBadge
            :label="TUITION_BILL_STATUS_LABEL[bill.status]"
            :variant="TUITION_BILL_STATUS_VARIANT[bill.status]"
          />
        </td>
        <td>
          <MyButton color="admin-indigo" size="small" content="상세" @click="$router.push(detailPath(bill))" />
        </td>
      </tr>
    </MyTable>

    <NumberedPagination
      :page="tuitionStore.adminBillsPage.page"
      :total-count="tuitionStore.adminBillsPage.totalCount"
      :size="tuitionStore.adminBillsPage.size"
      @page-change="load"
    />
  </MyPageContainer>
</template>

<style scoped>
.admin-tuition-page :deep(.my-table) { background: var(--personal-color-white); }
.search-group {
  width: 180px;
  max-width: 100%;
}

.admin-tuition-page :deep(td button) { margin: 0 auto; }

.error {
  color: var(--personal-color-red);
}
</style>
