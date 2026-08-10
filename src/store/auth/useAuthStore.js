import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import myAxios from '../../api/myAxios';
import { decodeJwtPayload } from '../../util/jwt';

export const useAuthStore = defineStore('authStore', () => {
  // 1. State (ref)
  const accessToken = ref(null);

  // 2. Getters (computed)
  const isLoggedIn = computed(() => !!accessToken.value);
  const userId = computed(() =>
    accessToken.value ? Number(decodeJwtPayload(accessToken.value).sub) : null,
  );
  const role = computed(() =>
    accessToken.value ? decodeJwtPayload(accessToken.value).role : null,
  );

  // 3. Actions (function)
  const setAccessToken = (token) => {
    accessToken.value = token;
  };

  const login = async ({ loginId, password }) => {
    const res = await myAxios.post('/auth/login', { loginId, password });
    setAccessToken(res.data.data.accessToken);
  };

  const logout = async () => {
    await myAxios.post('/auth/logout');
    setAccessToken(null);
  };

  const reissueToken = async () => {
    const res = await myAxios.post('/auth/reissue-token');
    setAccessToken(res.data.data.accessToken);
    return res.data.data.accessToken;
  };

  return { accessToken, isLoggedIn, userId, role, setAccessToken, login, logout, reissueToken };
});
