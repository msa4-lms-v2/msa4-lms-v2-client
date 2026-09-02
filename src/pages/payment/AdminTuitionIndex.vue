<script setup>
import { ref, onMounted } from 'vue';
import { useTuitionStore } from '../../store/payment/useTuitionStore';
import MyStatusBadge from '../../components/common/MyStatusBadge.vue';
import MyPageContainer from '../../components/layout/MyPageContainer.vue';
import MyTable from '../../components/table/MyTable.vue';
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

    <MyTable
      :loading="tuitionStore.isLoadingAdminBills"
      :empty="!tuitionStore.isLoadingAdminBills && tuitionStore.adminBills.length === 0"
      empty-message="조회된 등록금 목록이 없습니다."
      :columns="[
        { key: 'studentId', label: '학생 ID' },
        { key: 'semesterId', label: '학기 ID' },
        { key: 'billingAmount', label: '고지 금액' },
        { key: 'dueDate', label: '납부 기한' },
        { key: 'status', label: '상태' },
      ]"
    >
      <tr v-for="bill in tuitionStore.adminBills" :key="bill.id">
        <td><RouterLink :to="`/admin/tuition/${bill.id}`">{{ bill.studentId }}</RouterLink></td>
        <td>{{ bill.semesterId }}</td>
        <td>{{ formatCurrency(bill.billingAmount) }}</td>
        <td>{{ formatDate(bill.dueDate) }}</td>
        <td>
          <MyStatusBadge
            :label="TUITION_BILL_STATUS_LABEL[bill.status]"
            :variant="TUITION_BILL_STATUS_VARIANT[bill.status]"
          />
        </td>
      </tr>
    </MyTable>

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

.error {
  color: var(--personal-color-red);
}
</style>
