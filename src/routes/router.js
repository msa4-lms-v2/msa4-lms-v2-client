import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '../store/auth/useAuthStore';
import { notify } from '../composables/useDialog';
import Dashboard from '../pages/dashboard/Dashboard.vue';
const setMeta = (isAuthenticated, isGuestOnly, roles = []) => {
    return {
        isAuthenticated, // 인증된 사용자
        isGuestOnly, // 게스트
        roles, // 접근을 허용할 권한 목록
    };
};
const routes = [
    { path: '/', redirect: '/login' },
    { path: '/login', component: () => import('../pages/auth/LoginIndex.vue') },
    {
        path: '/main',
        name: 'Dashboard',
        component: Dashboard,
        meta: { ...setMeta(true, false), requiresAuth: true },
    },
    {
        path: '/profile',
        name: 'StudentProfile',
        component: () => import('../pages/profile/StudentProfile.vue'),
        meta: { requiresAuth: true, roles: ['STUDENT'] },
    },
    {
        path: '/tuition',
        name: 'TuitionIndex',
        component: () => import('../pages/payment/TuitionIndex.vue'),
        meta: { requiresAuth: true, roles: ['STUDENT'] },
    },
    {
        path: '/tuition/history',
        name: 'TuitionHistoryIndex',
        component: () => import('../pages/payment/TuitionHistoryIndex.vue'),
        meta: { requiresAuth: true, roles: ['STUDENT'] },
    },
    {
        path: '/tuition/:id',
        name: 'TuitionShow',
        component: () => import('../pages/payment/TuitionShow.vue'),
        meta: { requiresAuth: true, roles: ['STUDENT'] },
    },
    {
        path: '/admin/tuition',
        name: 'AdminTuitionIndex',
        component: () => import('../pages/payment/AdminTuitionIndex.vue'),
        meta: { requiresAuth: true, roles: ['ADMIN'] },
    },
    {
        path: '/admin/tuition/:id',
        name: 'AdminTuitionShow',
        component: () => import('../pages/payment/AdminTuitionShow.vue'),
        meta: { requiresAuth: true, roles: ['ADMIN'] },
    },
    {
        path: '/payment/health',
        name: 'PaymentHealthIndex',
        component: () => import('../pages/payment/PaymentHealthIndex.vue'),
        meta: { requiresAuth: true, roles: ['STUDENT', 'ADMIN'] },
    },
    {
        path: '/scholarships/apply',
        name: 'ScholarshipApplicationApply',
        component: () => import('../pages/payment/ScholarshipApplicationApply.vue'),
        meta: { requiresAuth: true, roles: ['STUDENT'] },
    },
    {
        path: '/scholarships/history',
        name: 'ScholarshipHistory',
        component: () => import('../pages/payment/ScholarshipHistory.vue'),
        meta: { requiresAuth: true, roles: ['STUDENT'] },
    },
    {
        path: '/tuition/:tuitionBillId/installment',
        name: 'InstallmentApply',
        component: () => import('../pages/payment/InstallmentApply.vue'),
        meta: { requiresAuth: true, roles: ['STUDENT'] },
    },
    {
        path: '/payments/toss/success',
        name: 'TossPaymentSuccess',
        component: () => import('../pages/payment/TossPaymentSuccess.vue'),
        meta: { requiresAuth: true, roles: ['STUDENT'] },
    },
    {
        path: '/payments/toss/fail',
        name: 'TossPaymentFail',
        component: () => import('../pages/payment/TossPaymentFail.vue'),
        meta: { requiresAuth: true, roles: ['STUDENT'] },
    },
];

const router = createRouter({
    history: createWebHistory(),
    routes,
});

let isInitChecked = false;

router.beforeEach(async (to) => {
    const authStore = useAuthStore();
    
    if (!isInitChecked) {
        try {
            await authStore.reissue();
        } catch (e) {
            // 조용한 재발급 실패 무시
        }
        isInitChecked = true;
    }

    if (to.meta.requiresAuth && !authStore.isLoggedIn) {
        return '/login';
    }
    if (to.meta.roles?.length && !to.meta.roles.includes(authStore.userInfo?.role)) {
        await notify('접근 권한이 없습니다.');
        return '/main';
    }
});

router.afterEach((to) => {
    // 컴포넌트 외부에서 호출되므로 콜백 내부에서 동적으로 스토어를 임포트하여 사용
    import('../store/tab/useTabStore.js').then(({ useTabStore }) => {
        const tabStore = useTabStore();
        tabStore.addTab(to);
    });
});

router.onError((error) => {
    if (/Loading chunk/.test(error.message)) {
        window.location.reload();
    }
});

export default router;
