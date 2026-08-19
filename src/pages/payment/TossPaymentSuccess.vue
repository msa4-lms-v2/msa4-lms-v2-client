<script setup>
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useTuitionStore } from '../../store/payment/useTuitionStore';
import MyButton from '../../components/button/MyButton.vue';

const route = useRoute();
const router = useRouter();
const tuitionStore = useTuitionStore();

const isConfirming = ref(true);
const errorMessage = ref('');

const tuitionBillId = Number(route.query.tuitionBillId);

onMounted(async () => {
  try {
    await tuitionStore.confirmTossPayment({
      tuitionBillId,
      orderId: route.query.orderId,
      paymentKey: route.query.paymentKey,
      amount: Number(route.query.amount),
    });
  } catch {
    errorMessage.value = '결제 승인 확정에 실패했습니다. 등록금 고지 화면에서 상태를 다시 확인해 주세요.';
  } finally {
    isConfirming.value = false;
  }
});
</script>

<template>
  <div class="page">
    <div class="card">
      <p v-if="isConfirming">
        결제 승인을 확정하는 중입니다...
      </p>
      <template v-else>
        <h1 v-if="!errorMessage">
          결제가 완료됐습니다
        </h1>
        <h1 v-else>
          결제 확인이 필요합니다
        </h1>
        <p v-if="errorMessage" class="notice notice--error">
          {{ errorMessage }}
        </p>
        <MyButton
          color="deep-blue"
          size="big"
          @click="router.push(`/tuition/${tuitionBillId}`)"
        >
          등록금 고지 화면으로 이동
        </MyButton>
      </template>
    </div>
  </div>
</template>

<style scoped>
.page {
  max-width: 640px;
  margin: 0 auto;
  padding: 32px;
}

.card {
  display: flex;
  flex-direction: column;
  gap: 16px;
  align-items: center;
  padding: 32px;
  background: var(--personal-color-white);
  border-radius: var(--personal-radius-card);
  text-align: center;
}

.notice--error {
  padding: 12px 16px;
  border-radius: var(--personal-radius);
  background: var(--personal-color-status-fail-bg);
  color: var(--personal-color-status-fail-text);
}
</style>
