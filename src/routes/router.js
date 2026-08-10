import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '../store/auth/useAuthStore';

const routes = [
  { path: '/', redirect: '/login' },
  { path: '/login', component: () => import('../pages/auth/LoginIndex.vue') },
  {
    path: '/tuition',
    component: () => import('../pages/payment/TuitionIndex.vue'),
    meta: { requiresAuth: true, roles: ['STUDENT'] },
  },
  {
    path: '/tuition/:id',
    component: () => import('../pages/payment/TuitionShow.vue'),
    meta: { requiresAuth: true, roles: ['STUDENT'] },
  },
  {
    path: '/admin/tuition',
    component: () => import('../pages/payment/AdminTuitionIndex.vue'),
    meta: { requiresAuth: true, roles: ['ADMIN'] },
  },
  {
    path: '/admin/tuition/:id',
    component: () => import('../pages/payment/AdminTuitionShow.vue'),
    meta: { requiresAuth: true, roles: ['ADMIN'] },
  },
  {
    path: '/payment/health',
    component: () => import('../pages/payment/PaymentHealthIndex.vue'),
    meta: { requiresAuth: true, roles: ['STUDENT', 'ADMIN'] },
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach((to) => {
  const authStore = useAuthStore();
  if (to.meta.requiresAuth && !authStore.isLoggedIn) {
    return '/login';
  }
  if (to.meta.roles && !to.meta.roles.includes(authStore.role)) {
    return '/login';
  }
});

router.onError((error) => {
  if (/Loading chunk/.test(error.message)) {
    window.location.reload();
  }
});

export default router;
