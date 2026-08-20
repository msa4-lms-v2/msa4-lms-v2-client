<script setup>
import { ref, onMounted } from 'vue';
import { useTuitionStore } from '../../store/payment/useTuitionStore';
import StatusBadge from '../../components/common/StatusBadge.vue';
import MyPageContainer from '../../components/layout/MyPageContainer.vue';
import PrevNextPagination from '../../components/pagination/PrevNextPagination.vue';
import { formatCurrency, formatDate } from '../../util/format';
import { TUITION_BILL_STATUS_LABEL, TUITION_BILL_STATUS_VARIANT } from '../../util/payment/enumLabels';

const tuitionStore = useTuitionStore();

const statusFilter = ref(null);
const errorMessage = ref('');

const load = async (page = 1) => {
  errorMessage.value = '';
  try {
    await tuitionStore.fetchAdminBills({ status: statusFilter.value, page });
  } catch {
    errorMessage.value = '등록금 목록을 불러오지 못했습니다.';
  }
};

onMounted(() => load());
</script>

<template>
  <MyPageContainer title="관리자 등록금 목록">
    <div class="filter">
      <label for="status-filter">상태</label>
      <select id="status-filter" v-model="statusFilter" @change="load()">
        <option :value="null">전체</option>
        <option v-for="(label, value) in TUITION_BILL_STATUS_LABEL" :key="value" :value="value">
          {{ label }}
        </option>
      </select>
    </div>

    <p v-if="errorMessage" class="error" role="alert">{{ errorMessage }}</p>
    <p v-else-if="tuitionStore.isLoadingAdminBills">불러오는 중...</p>

    <table v-else>
      <thead>
        <tr>
          <th>학생 ID</th>
          <th>학기 ID</th>
          <th>고지 금액</th>
          <th>납부 기한</th>
          <th>상태</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="bill in tuitionStore.adminBills" :key="bill.id">
          <td><RouterLink :to="`/admin/tuition/${bill.id}`">{{ bill.studentId }}</RouterLink></td>
          <td>{{ bill.semesterId }}</td>
          <td>{{ formatCurrency(bill.billingAmount) }}</td>
          <td>{{ formatDate(bill.dueDate) }}</td>
          <td>
            <StatusBadge
              :label="TUITION_BILL_STATUS_LABEL[bill.status]"
              :variant="TUITION_BILL_STATUS_VARIANT[bill.status]"
            />
          </td>
        </tr>
      </tbody>
    </table>

    <PrevNextPagination
      :page="tuitionStore.adminBillsPage.page"
      :has-next="tuitionStore.adminBillsPage.hasNext"
      @page-change="load"
    />
  </MyPageContainer>
</template>

<style scoped>
.filter {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
}

select {
  padding: 6px 10px;
  border-radius: var(--personal-radius);
  border: 1px solid var(--personal-color-border-mist);
}

table {
  width: 100%;
  border-collapse: collapse;
  background: var(--personal-color-white);
  border-radius: var(--personal-radius-card);
  overflow: hidden;
}

th,
td {
  text-align: left;
  padding: 12px 16px;
  border-bottom: 1px solid var(--personal-color-border-mist);
}

th {
  background: var(--personal-color-table-header-smoke);
  color: var(--personal-color-primary-text-navy);
}

.error {
  color: var(--personal-color-red);
}
</style>
