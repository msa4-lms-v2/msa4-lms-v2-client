<script setup>
import { computed } from "vue";
import { useRoute } from "vue-router";
import Header from "./components/layout/Header.vue";
import SideBar from "./components/layout/SideBar.vue";
import TabBar from "./components/layout/TabBar.vue";
import AppDialog from "./components/common/AppDialog.vue";
import { useTabStore } from "./store/tab/useTabStore";
import { useNotificationSocket } from "./composables/useNotificationSocket.js";
import { useAuthStore } from "./store/auth/useAuthStore";

const route = useRoute();
const tabStore = useTabStore();
const authStore = useAuthStore();
const usesAppLayout = computed(() => !['/login', '/initial-password', '/attendance/check-in', '/certificates/verify'].includes(route.path));
  useNotificationSocket();
</script>

<template>
  <router-view v-if="!usesAppLayout" />

  <div v-else class="app-shell" :class="{ 'professor-shell': authStore.userInfo?.role === 'PROFESSOR' }">
    <Header />
    <div class="app-body">
      <SideBar />
      <main class="app-content">
        <TabBar />
        <div class="page-content">
          <router-view v-slot="{ Component, route: activeRoute }">
            <keep-alive :include="tabStore.tabs.map((t) => t.name)">
              <component :is="Component" :key="activeRoute.path" />
            </keep-alive>
          </router-view>
        </div>
      </main>
    </div>
  </div>

  <AppDialog />
</template>

<style scoped>
.app-shell {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--personal-color-bg-surface-frost);
}

.app-body {
  min-height: 0;
  flex: 1;
  display: flex;
}

.app-content {
  min-width: 0;
  min-height: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
}

.page-content {
  min-height: 0;
  flex: 1;
  padding: 20px;
}

.professor-shell .app-body { padding: 24px 4px 0 24px; }
.professor-shell .page-content { padding: 28px 24px; }
.professor-shell :deep(.page-container) { padding: 0 20px 50px; }
.professor-shell :deep(.page-heading) { padding-bottom: 0; margin-bottom: 24px; }
.professor-shell :deep(.page-heading h2) { margin: 0; font-size: 28px; line-height: 1.4; font-weight: 700; }
.professor-shell :deep(.sidebar) { width: 238px; flex-shrink: 0; height: calc(100vh - 88px); }
.professor-shell :deep(.menu-header), .professor-shell :deep(.nav-item) { font-size: 13px; padding: 20px; }
.professor-shell :deep(.submenu-item) { font-size: 13px; padding: 13px 20px 13px 34px; }
.professor-shell :deep(.submenu-list) { background: white; border: 0; }
.professor-shell :deep(.router-link-active) { color: var(--personal-color-professor-primary-navy); }
.professor-shell :deep(.pagination) { justify-content: center; }

@media (max-width: 900px) {
  .professor-shell .app-body { padding: 12px 0 0; }
  .professor-shell .page-content { padding: 16px 12px; }
  .professor-shell :deep(.page-container) { padding-left: 8px; padding-right: 8px; }
  .page-content {
    padding: 12px;
  }
}
</style>

