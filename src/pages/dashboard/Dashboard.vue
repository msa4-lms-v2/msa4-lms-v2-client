<script setup>
import { defineAsyncComponent } from "vue";
import { useAuthStore } from "../../store/auth/useAuthStore";

defineOptions({ name: "Dashboard" }); // eslint-disable-line vue/multi-word-component-names

const authStore = useAuthStore();

const AdminDashboard = defineAsyncComponent(() =>
  import("./AdminDashboard.vue")
);

const AcademicDashboard = defineAsyncComponent(() =>
  import("./AcademicDashboard.vue")
);
</script>

<template>
  <AdminDashboard v-if="authStore.userInfo?.role === 'ADMIN'" />

  <AcademicDashboard
    v-else-if="['STUDENT', 'PROFESSOR'].includes(authStore.userInfo?.role)"
  />
</template>
