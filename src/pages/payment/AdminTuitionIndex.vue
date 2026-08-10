<script setup>
import { ref, onMounted } from 'vue';
import { useTuitionStore } from '../../store/payment/useTuitionStore';
import StatusBadge from '../../components/common/StatusBadge.vue';
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
  <div class="page">
    <h1>관리자 등록금 목록</h1>

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

    <div class="pagination">
      <button
        :disabled="tuitionStore.adminBillsPage.page <= 1"
        @click="load(tuitionStore.adminBillsPage.page - 1)"
      >
        이전
      </button>
      <span>{{ tuitionStore.adminBillsPage.page }} 페이지</span>
      <button
        :disabled="!tuitionStore.adminBillsPage.hasNext"
        @click="load(tuitionStore.adminBillsPage.page + 1)"
      >
        다음
      </button>
    </div>
  </div>
</template>

<style scoped>
.page {
  max-width: 960px;
  margin: 0 auto;
  padding: 32px;
}

.filter {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
}

select {
  padding: 6px 10px;
  border-radius: var(--personal-radius);
  border: 1px solid #cbd5e1;
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
  border-bottom: 1px solid #e2e8f0;
}

th {
  background: var(--personal-color-admin-primary);
  color: var(--personal-color-white);
}

.pagination {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 16px;
}

button {
  padding: 6px 12px;
  border-radius: var(--personal-radius);
  border: 1px solid #cbd5e1;
  background: var(--personal-color-white);
  cursor: pointer;
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.error {
  color: #dc2626;
}
</style>
