<script setup>
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import Header from './components/layout/Header.vue';
import SideBar from './components/layout/SideBar.vue';
import TabBar from './components/layout/TabBar.vue';
import AppDialog from './components/common/AppDialog.vue';
import { useTabStore } from './store/tab/useTabStore';

const route = useRoute();
const tabStore = useTabStore();
const usesAppLayout = computed(() => !['/login', '/initial-password', '/attendance/check-in'].includes(route.path));
</script>

<template>
  <router-view v-if="!usesAppLayout" />

  <div v-else class="app-shell">
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

@media (max-width: 900px) {
  .app-body {
    display: block;
  }

  .page-content {
    padding: 12px;
  }
}
</style>
