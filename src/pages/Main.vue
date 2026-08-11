<script setup>
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../store/auth/useAuthStore';

const router = useRouter();
const authStore = useAuthStore();

const allMenuItems = [
    {
        title: '강의 조회',
        description: '개설된 강의를 조회하고 상세 정보를 확인합니다.',
        icon: 'CL',
        path: '/lectures',
        color: '#e8f0fe',
        roles: ['STUDENT', 'PROFESSOR', 'ADMIN'],
    },
    {
        title: '수강 내역',
        description: '이번 학기 수강 과목과 총 학점을 확인합니다.',
        icon: 'EN',
        path: '/enrollments',
        color: '#fff9db',
        roles: ['STUDENT'],
    },
    {
        title: '수강 신청',
        description: '희망 강의를 신청하고 수강 목록을 관리합니다.',
        icon: 'AP',
        path: '/registration',
        color: '#e6fffa',
        roles: ['STUDENT'],
    },
    {
        title: '성적 조회',
        description: '학기별 성적, GPA, 출석률 기준 F 처리 여부를 확인합니다.',
        icon: 'GR',
        path: '/grade',
        color: '#fff5f5',
        roles: ['STUDENT'],
    },
    {
        title: '출결 현황',
        description: '출결 내역, 출석률, 공결 신청과 승인 결과를 확인합니다.',
        icon: 'AT',
        path: '/attendance',
        color: '#eef2ff',
        roles: ['STUDENT'],
    },
    {
        title: '강의 관리',
        description: '담당 강의 목록을 관리하고 성적을 입력합니다.',
        icon: 'MG',
        path: '/lectures/manage',
        color: '#e8f0fe',
        roles: ['PROFESSOR'],
    },
    {
        title: '출결 관리',
        description: '학생 공결 신청을 확인하고 승인 또는 반려합니다.',
        icon: 'CK',
        path: '/professor/attendance/approvals',
        color: '#eef2ff',
        roles: ['PROFESSOR'],
    },
    {
        title: '학생 관리',
        description: '학생 목록을 확인하고 관리합니다.',
        icon: 'ST',
        path: '/students',
        color: '#fff9db',
        roles: ['PROFESSOR', 'ADMIN'],
    },
    {
        title: '내 정보',
        description: '개인 정보와 비밀번호를 관리합니다.',
        icon: 'ME',
        path: '/profile',
        color: '#f3f0ff',
        roles: ['STUDENT', 'PROFESSOR', 'ADMIN'],
    },
];

const menuItems = computed(() => {
    const userRole = authStore.userInfo?.role || 'STUDENT';
    return allMenuItems.filter((item) => item.roles.includes(userRole));
});

const navigateTo = (path) => {
    router.push(path);
};
</script>

<template>
    <div class="main-view">
        <div class="welcome-section">
            <h1>학사관리 시스템</h1>
            <p>필요한 메뉴를 선택해 업무를 진행하세요.</p>
        </div>

        <div class="card-grid">
            <button
                v-for="item in menuItems"
                :key="item.title"
                class="menu-card"
                type="button"
                @click="navigateTo(item.path)"
            >
                <span class="card-icon" :style="{ backgroundColor: item.color }">
                    {{ item.icon }}
                </span>
                <span class="card-content">
                    <strong>{{ item.title }}</strong>
                    <span>{{ item.description }}</span>
                </span>
            </button>
        </div>
    </div>
</template>

<style scoped>
.main-view {
    max-width: 1200px;
    margin: 0 auto;
}

.welcome-section {
    margin-bottom: 40px;
}

.welcome-section h1 {
    font-size: 1.8rem;
    color: #1a1f36;
    margin-bottom: 8px;
}

.welcome-section p {
    color: #697386;
}

.card-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 24px;
}

.menu-card {
    background: white;
    border: 1px solid #edf2f7;
    border-radius: 8px;
    padding: 24px;
    display: flex;
    flex-direction: column;
    gap: 16px;
    text-align: left;
    cursor: pointer;
    transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s;
}

.menu-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
    border-color: #1a73e8;
}

.card-icon {
    width: 48px;
    height: 48px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.9rem;
    font-weight: 800;
    color: #1a1f36;
}

.card-content {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.card-content strong {
    font-size: 1.2rem;
    color: #1a1f36;
}

.card-content span {
    font-size: 0.95rem;
    color: #4f566b;
    line-height: 1.5;
}
</style>
