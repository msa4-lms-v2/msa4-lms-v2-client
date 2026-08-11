<script setup>
import { computed } from 'vue';
import { useAuthStore } from '../../store/auth/useAuthStore';

const authStore = useAuthStore();

const commonMenu = [{ label: '메인', path: '/main' }];
const menusByRole = {
    STUDENT: [
        { label: '등록금', path: '/tuition' },
        { label: '결제 상태', path: '/payment/health' },
    ],
    PROFESSOR: [],
    ADMIN: [
        { label: '등록금 관리', path: '/admin/tuition' },
        { label: '결제 상태', path: '/payment/health' },
    ],
};

const menus = computed(() => [
    ...commonMenu,
    ...(menusByRole[authStore.userInfo?.role] || []),
]);
</script>

<template>
    <aside class="sidebar">
        <nav aria-label="주 메뉴">
            <router-link v-for="menu in menus" :key="menu.path" :to="menu.path" class="nav-item">
                {{ menu.label }}
            </router-link>
        </nav>
    </aside>
</template>

<style scoped>
.sidebar {
    width: 240px;
    flex: none;
    padding: 24px 12px;
    border-right: 1px solid #e5e7eb;
    background: #fff;
    position: sticky;
    top: 64px;
    align-self: flex-start;
    min-height: calc(100vh - 64px);
}

nav { display: flex; flex-direction: column; gap: 5px; }
.nav-item {
    padding: 12px 16px;
    border-radius: 9px;
    color: #475569;
    font-size: 14px;
    font-weight: 650;
    text-decoration: none;
}
.nav-item:hover { color: var(--secondary-blue); background: #f1f5f9; }
.nav-item.router-link-active { color: #fff; background: var(--primary-color); }

@media (max-width: 900px) {
    .sidebar {
        width: 100%;
        padding: 8px 12px;
        overflow-x: auto;
        border-right: 0;
        border-bottom: 1px solid #e5e7eb;
        position: static;
        min-height: auto;
    }
    nav { flex-direction: row; }
    .nav-item { white-space: nowrap; }
}
</style>
