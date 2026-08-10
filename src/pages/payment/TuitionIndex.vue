<script setup>
import { onMounted } from 'vue';
import { useTuitionStore } from '../../store/payment/useTuitionStore';
import StatusBadge from '../../components/common/StatusBadge.vue';
import { formatCurrency, formatDate } from '../../util/format';
import { TUITION_BILL_STATUS_LABEL, TUITION_BILL_STATUS_VARIANT } from '../../util/payment/enumLabels';

const tuitionStore = useTuitionStore();

onMounted(() => tuitionStore.fetchMyBills());
</script>

<template>
  <div class="page">
    <h1>내 등록금</h1>

    <p v-if="tuitionStore.isLoadingMyBills">불러오는 중...</p>
    <p v-else-if="tuitionStore.myBills.length === 0">조회된 등록금 고지가 없습니다.</p>

    <ul v-else class="bill-list">
      <li v-for="bill in tuitionStore.myBills" :key="bill.id">
        <RouterLink :to="`/tuition/${bill.id}`" class="bill-card">
          <span class="semester">{{ bill.semesterId }}학기</span>
          <span class="amount">{{ formatCurrency(bill.billingAmount) }}</span>
          <span class="due">{{ formatDate(bill.dueDate) }} 까지</span>
          <StatusBadge
            :label="TUITION_BILL_STATUS_LABEL[bill.status]"
            :variant="TUITION_BILL_STATUS_VARIANT[bill.status]"
          />
        </RouterLink>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.page {
  max-width: 640px;
  margin: 0 auto;
  padding: 32px;
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
</style>
