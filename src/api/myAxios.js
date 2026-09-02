import axios from 'axios';
import { useAuthStore } from '../store/auth/useAuthStore';
import { useErrorStore } from '../store/error/useErrorStore';
import { isJwtExpiringSoon } from '../util/jwt';

const AUTH_EXEMPT_PATHS = [
  '/api/auth/student/login',
  '/api/auth/professor/login',
  '/api/auth/admin/login',
  '/api/auth/reissue-token',
  '/api/auth/initial-password',
];

const myAxios = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '',
  withCredentials: true,
});

let reissuePromise = null;

const reissueTokenOnce = () => {
  if (!reissuePromise) {
    const authStore = useAuthStore();
    reissuePromise = authStore.reissue().finally(() => {
      reissuePromise = null;
    });
  }
  return reissuePromise;
};

myAxios.interceptors.request.use(async (config) => {
  if (AUTH_EXEMPT_PATHS.some((path) => config.url?.startsWith(path))) {
    return config;
  }

  const authStore = useAuthStore();
  if (authStore.accessToken && isJwtExpiringSoon(authStore.accessToken)) {
    await reissueTokenOnce();
  }
  if (authStore.accessToken) {
    config.headers.Authorization = `Bearer ${authStore.accessToken}`;
  }
  return config;
});

myAxios.interceptors.response.use(
  (res) => res,
  async (error) => {
    const { config, response } = error;
    const isExempt = AUTH_EXEMPT_PATHS.some((path) => config?.url?.startsWith(path));

    if (response?.status === 401 && !isExempt && !config?.skipAuthRefresh && !config._retried) {
      config._retried = true;
      const newToken = await reissueTokenOnce();
      config.headers.Authorization = `Bearer ${newToken}`;
      return myAxios(config);
    }

    useErrorStore().setError(error);

    return Promise.reject(error);
  },
);

export default myAxios;
