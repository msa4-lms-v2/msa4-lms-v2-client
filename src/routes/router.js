import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '../store/auth/useAuthStore';

const routes = [
  { path: '/', redirect: '/login' },
  { path: '/login', component: () => import('../pages/auth/LoginIndex.vue') },
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
