import { defineStore } from 'pinia';
import { ref } from 'vue';
import myAxios from '../../api/myAxios';
import { useTabStore } from '../tab/useTabStore';

export const useAuthStore = defineStore('authStore', () => {
    // 1. State
    const isLoggedIn = ref(false);
    const accessToken = ref('');
    const userInfo = ref(null);

    // 3. Actions
    const clearAuthStore = () => {
        isLoggedIn.value = false;
        accessToken.value = '';
        userInfo.value = null;

        // 로그아웃 시 남아있는 탭 비우기
        const tabStore = useTabStore();
        tabStore.clearTabs();
    };

    const login = async (loginForm, loginType = 'student') => {
        try {
            const loginUrls = {
                student: '/api/auth/student/login',
                professor: '/api/auth/professor/login',
                admin: '/api/auth/admin/login',
            };
            const url = loginUrls[loginType] || loginUrls.student;

            const res = await myAxios.post(url, loginForm);
            if (!res.data.code || res.data.code === '00') {
                const data = res.data.data;
                const account = data.account;
                accessToken.value = data.accessToken;
                userInfo.value = data.user || {
                    userId: account?.id ?? data.userId,
                    loginId: account?.login_id ?? data.loginId,
                    name: data.name,
                    role: account?.role ?? data.role,
                    requiresPasswordChange: account?.requiresPasswordChange,
                };
                isLoggedIn.value = true;
            } else {
                throw new Error(res.data.message || '로그인 실패');
            }
        } catch (error) {
            throw error;
        }
    };

    const logout = async () => {
        try {
            const url = '/api/auth/logout';
            await myAxios.post(url);
        } catch (error) {
            console.error(error);
        } finally {
            clearAuthStore();
        }
    };

    // reissue
    const reissue = async () => {
        try {
            const url = '/api/auth/reissue-token';

            const res = await myAxios.post(url);
            const data = res.data.data;
            const account = data.account;
            accessToken.value = data.accessToken;
            userInfo.value = data.user ||
                userInfo.value || {
                    userId: account?.id ?? data.userId,
                    loginId: account?.login_id ?? data.loginId,
                    name: data.name,
                    role: account?.role ?? data.role,
                    requiresPasswordChange: account?.requiresPasswordChange,
            };
            isLoggedIn.value = true;
            return accessToken.value;
        } catch (error) {
            clearAuthStore();
            throw error;
        }
    };

    // 비밀번호 변경
    const passwordChange = async (data) => {
        try {
            const url = '/api/auth/password';

            await myAxios.patch(url, data);

            return;
        } catch (error) {
            console.error(error);
            throw error;
        }
    };

    return {
        isLoggedIn,
        accessToken,
        userInfo,
        clearAuthStore,
        login,
        logout,
        reissue,
        passwordChange,
    };
});
