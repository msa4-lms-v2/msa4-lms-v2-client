<script setup>
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../../store/auth/useAuthStore';
import MyButton from '../button/MyButton.vue';

const router = useRouter();
const authStore = useAuthStore();

const roleClass = computed(() => `role-${(authStore.userInfo?.role || 'student').toLowerCase()}`);

const goHome = () => {
  if (authStore.isLoggedIn) {
    router.push('/main');
  } else {
    router.push('/');
  }
};

const logout = async () => {
  await authStore.logout();
  router.push('/');
};
</script>

<template>
  <header class="header" :class="roleClass">
    <div class="header-left" @click="goHome">
      <img :src="'/로고-흰.png'" alt="로고" class="logo" />
      <img :src="'/이름-흰.png'" alt="대학이름" class="logo-name" />
    </div>

    <div class="header-right">
      <template v-if="authStore.isLoggedIn">
        <div class="user-info">
          <span class="user-name"
            ><strong>{{ authStore.userInfo?.name }}</strong
            >님 환영합니다</span
          >
          <span class="user-role">[{{ authStore.userInfo?.role }}]</span>
        </div>
        <MyButton
          btnType="button"
          color="white"
          size="small"
          content="로그아웃"
          @click="logout"
        />
      </template>
    </div>
  </header>
</template>

<style scoped>
.header {
  height: 64px;
  background-color: var(--personal-color-student-primary);
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 24px;
  position: sticky;
  top: 0;
  z-index: 100;
  transition: background-color 0.2s ease;
}

.header.role-student {
  background-color: var(--personal-color-student-primary);
}

.header.role-professor {
  background-color: var(--personal-color-professor-primary);
}

.header.role-admin {
  background-color: var(--personal-color-admin-primary);
}

.header-left {
  display: flex;
  align-items: center;
  cursor: pointer;
}

.logo {
  height: 40px;
  margin-right: 12px;
}

.logo-name {
  height: 32px;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 20px;
}

.user-info {
  font-size: 0.9rem;
  color: #fff;
  display: flex;
  gap: 8px;
  align-items: center;
}

.user-role {
  color: #ffffffcc;
  font-size: 0.8rem;
  font-weight: bold;
}
</style>
