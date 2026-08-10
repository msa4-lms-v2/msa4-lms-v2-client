<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../../store/auth/useAuthStore';

const router = useRouter();
const authStore = useAuthStore();

const loginId = ref('');
const password = ref('');
const isLoading = ref(false);
const errorMessage = ref('');

const ROLE_HOME_PATH = { ADMIN: '/admin/tuition', STUDENT: '/tuition' };

const handleSubmit = async () => {
  errorMessage.value = '';
  isLoading.value = true;
  try {
    await authStore.login({ loginId: loginId.value, password: password.value });
    router.push(ROLE_HOME_PATH[authStore.role] ?? '/');
  } catch (error) {
    errorMessage.value = error.response?.data?.message ?? '로그인에 실패했습니다.';
  } finally {
    isLoading.value = false;
  }
};
</script>

<template>
  <div class="login-page">
    <form class="login-form" @submit.prevent="handleSubmit">
      <h1>로그인</h1>

      <div class="field">
        <label for="loginId">학번·교번</label>
        <input id="loginId" v-model="loginId" type="text" required autocomplete="username" />
      </div>

      <div class="field">
        <label for="password">비밀번호</label>
        <input
          id="password"
          v-model="password"
          type="password"
          required
          autocomplete="current-password"
        />
      </div>

      <p v-if="errorMessage" class="error" role="alert">{{ errorMessage }}</p>

      <button type="submit" :disabled="isLoading">
        {{ isLoading ? '로그인 중...' : '로그인' }}
      </button>
    </form>
  </div>
</template>

<style scoped>
.login-page {
  min-height: 100svh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--personal-color-bg-surface);
}

.login-form {
  width: 320px;
  padding: 32px;
  background: var(--personal-color-white);
  border-radius: var(--personal-radius-card);
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

input {
  padding: 8px 12px;
  border-radius: var(--personal-radius);
  border: 1px solid #cbd5e1;
}

.error {
  color: #dc2626;
  font-size: 0.85rem;
  margin: 0;
}

button {
  padding: 10px;
  border: none;
  border-radius: var(--personal-radius);
  background: var(--personal-color-admin-secondary);
  color: var(--personal-color-white);
  cursor: pointer;
}

button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
