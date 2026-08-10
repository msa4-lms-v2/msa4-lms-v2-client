<script setup>
import { onMounted } from 'vue';
import { usePaymentHealthStore } from '../../store/payment/usePaymentHealthStore';
import StatusBadge from '../../components/common/StatusBadge.vue';
import { formatDate } from '../../util/format';
import { HEALTH_STATUS_VARIANT } from '../../util/payment/enumLabels';

const paymentHealthStore = usePaymentHealthStore();

onMounted(() => paymentHealthStore.fetchHealth());
</script>

<template>
  <div class="page">
    <h1>외부 연동 상태</h1>

    <p v-if="paymentHealthStore.isLoading">확인 중...</p>

    <div v-else class="health-list">
      <div v-if="paymentHealthStore.pgHealth" class="health-card">
        <span>{{ paymentHealthStore.pgHealth.feature }}</span>
        <StatusBadge
          :label="paymentHealthStore.pgHealth.status"
          :variant="HEALTH_STATUS_VARIANT[paymentHealthStore.pgHealth.status]"
        />
        <span class="message">{{ paymentHealthStore.pgHealth.message }}</span>
        <span class="checked-at">{{ formatDate(paymentHealthStore.pgHealth.checkedAt, 'YYYY-MM-DD HH:mm') }}</span>
      </div>

      <div v-if="paymentHealthStore.virtualAccountHealth" class="health-card">
        <span>{{ paymentHealthStore.virtualAccountHealth.feature }}</span>
        <StatusBadge
          :label="paymentHealthStore.virtualAccountHealth.status"
          :variant="HEALTH_STATUS_VARIANT[paymentHealthStore.virtualAccountHealth.status]"
        />
        <span class="message">{{ paymentHealthStore.virtualAccountHealth.message }}</span>
        <span class="checked-at">
          {{ formatDate(paymentHealthStore.virtualAccountHealth.checkedAt, 'YYYY-MM-DD HH:mm') }}
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page {
  max-width: 640px;
  margin: 0 auto;
  padding: 32px;
}

.health-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.health-card {
  display: flex;
  align-items: center;
  gap: 12px;
  background: var(--personal-color-white);
  border-radius: var(--personal-radius-card);
  padding: 16px 24px;
}

.message {
  color: #64748b;
}

.checked-at {
  margin-left: auto;
  font-size: 0.85rem;
  color: #94a3b8;
}
</style>
