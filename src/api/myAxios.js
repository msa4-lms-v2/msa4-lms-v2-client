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

// 다른 서비스(academic/payment 등) 응답이 일시적으로 늦거나 게이트웨이가 502/503/504를
// 반환하는 경우, 화면마다 바로 "불러오지 못했습니다" 모달을 띄우는 대신 짧게 재시도한다.
// 네트워크 자체가 끊긴 경우(응답 없음)와 502/503/504만 재시도 대상으로 하고,
// 400/401/403/404 등 실제 업무 오류는 재시도 없이 바로 실패 처리한다.
const RETRIABLE_STATUS = new Set([502, 503, 504]);
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 600;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const isRetriable = (error) => {
  if (error.config?.skipRetry) return false;
  if (!error.response) return true; // 타임아웃, 연결 끊김 등 응답 자체가 없는 경우
  return RETRIABLE_STATUS.has(error.response.status);
};

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

    if (config && isRetriable(error)) {
      config._retryCount = (config._retryCount || 0) + 1;
      if (config._retryCount <= MAX_RETRIES) {
        await wait(RETRY_DELAY_MS * config._retryCount);
        return myAxios(config);
      }
    }

    // 화면의 "1차 데이터 로드"로 표시된 요청(pageLoad: true)은 재시도까지 실패하면
    // 모달 없이 메인 화면으로 돌려보낸다. 버튼 클릭으로 발생하는 조회·액션 요청은
    // 이 플래그를 붙이지 않으므로 기존처럼 각 화면의 catch에서 모달로 안내한다.
    if (config?.pageLoad) {
      const { default: router } = await import('../routes/router');
      if (router.currentRoute.value.path !== '/main') {
        router.push('/main').catch(() => {});
      }
      return new Promise(() => {}); // 호출부의 await가 이어지지 않도록 의도적으로 미해결 상태로 둔다.
    }

    useErrorStore().setError(error);

    return Promise.reject(error);
  },
);

export default myAxios;
