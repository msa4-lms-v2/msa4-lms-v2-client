<script setup>
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../../store/auth/useAuthStore';

const router = useRouter();
const authStore = useAuthStore();

const roleLabel = computed(
    () =>
        ({
            STUDENT: '학생',
            PROFESSOR: '교수',
            ADMIN: '관리자',
        }[authStore.userInfo?.role] || '사용자')
);

const roleClass = computed(() => `role-${(authStore.userInfo?.role || 'STUDENT').toLowerCase()}`);

const logout = async () => {
    await authStore.logout();
    await router.replace('/login');
};
</script>

<template>
    <header class="header" :class="roleClass">
        <button class="brand" type="button" @click="router.push('/main')">
            <img src="/로고-흰.png" alt="미래대학교 로고" class="logo" />
            <img src="/이름-흰.png" alt="미래대학교" class="logo-name" />
        </button>

        <div class="header-right">
            <div class="user-info">
                <strong>{{ authStore.userInfo?.name || authStore.userInfo?.loginId }}</strong>
                <span>{{ roleLabel }}</span>
            </div>
            <button class="logout-button" type="button" @click="logout">로그아웃</button>
        </div>
    </header>
</template>

<style scoped>
.header {
    height: 64px;
    flex: none;
    padding: 0 24px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 1px solid #ffffff24;
    background: var(--personal-color-student-primary);
    position: sticky;
    top: 0;
    z-index: 100;
    transition: background-color 0.2s ease;
}

.header.role-student {
    background: var(--personal-color-student-primary);
}
.header.role-professor {
    background: var(--personal-color-professor-primary);
}
.header.role-admin {
    background: var(--personal-color-admin-primary);
}

.brand {
    padding: 0;
    display: flex;
    align-items: center;
    gap: 12px;
    border: 0;
    background: transparent;
    cursor: pointer;
}

.logo,
.logo-name {
    filter: brightness(0) invert(1);
}
.logo {
    width: 42px;
    height: 42px;
    object-fit: contain;
}
.logo-name {
    width: auto;
    height: 29px;
    object-fit: contain;
}
.header-right,
.user-info {
    display: flex;
    align-items: center;
}
.header-right {
    gap: 18px;
}
.user-info {
    gap: 8px;
    color: #fff;
    font-size: 14px;
}
.user-info span {
    color: #ffffffcc;
    font-size: 12px;
    font-weight: 700;
}
.logout-button {
    padding: 8px 13px;
    border: 1px solid #ffffff70;
    border-radius: 8px;
    color: #fff;
    background: #ffffff12;
    cursor: pointer;
}
.logout-button:hover {
    border-color: #fff;
    color: #fff;
    background: #ffffff24;
}

@media (max-width: 640px) {
    .header {
        padding: 0 14px;
    }
    .logo-name {
        display: none;
    }
    .user-info strong {
        display: none;
    }
}
</style>
