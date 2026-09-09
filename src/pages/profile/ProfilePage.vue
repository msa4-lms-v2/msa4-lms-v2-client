<script setup>
import { useAuthStore } from '../../store/auth/useAuthStore';
import StudentProfile from './StudentProfile.vue';
import ProfessorProfile from './ProfessorProfile.vue';

defineOptions({ name: 'ProfilePage' });

const authStore = useAuthStore();
</script>

<template>
  <ProfessorProfile v-if="authStore.userInfo?.role === 'PROFESSOR'" />
  <StudentProfile v-else />
</template>
