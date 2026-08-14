<script setup>
import { useRoute, useRouter } from 'vue-router';
import MyButton from '../../components/button/MyButton.vue';

const route = useRoute();
const router = useRouter();

const tuitionBillId = Number(route.query.tuitionBillId);
</script>

<template>
  <div class="page">
    <div class="card">
      <h1>결제가 취소됐습니다</h1>
      <p v-if="route.query.message" class="notice notice--error">
        {{ route.query.message }}
      </p>
      <MyButton
        color="deep-blue"
        size="big"
        @click="router.push(`/tuition/${tuitionBillId}`)"
      >
        등록금 고지 화면으로 이동
      </MyButton>
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
  color: #991b1b;
}
</style>
