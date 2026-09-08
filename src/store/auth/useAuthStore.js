import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import myAxios from '../../api/myAxios';
import { useTabStore } from '../tab/useTabStore';

export const useAuthStore = defineStore('authStore', () => {
    // 1. State
    const isLoggedIn = ref(false);
    const accessToken = ref('');
    const passwordChangeToken = ref('');
    const userInfo = ref(null);
    const pendingLoginId = ref('');
    const pendingLoginType = ref('student');
    const requiresInitialPasswordChange = computed(() => Boolean(passwordChangeToken.value));

    const mergeAccountInfo = (data, previous = null) => {
        const account = data.account || {};
        const returnedUser = data.user || {};
        return {
            ...previous,
            ...returnedUser,
            userId: returnedUser.userId ?? returnedUser.id ?? account.id ?? data.userId,
            loginId: returnedUser.loginId ?? account.loginId ?? data.loginId,
            name: returnedUser.name ?? data.name ?? previous?.name,
            role: returnedUser.role ?? account.role ?? data.role,
            requiresPasswordChange: returnedUser.requiresPasswordChange ?? account.requiresPasswordChange,
        };
    };

    const fetchDisplayName = async () => {
        const profileUrls = {
            STUDENT: '/api/academic/students/me',
            PROFESSOR: '/api/academic/professors/me',
        };
        const url = profileUrls[userInfo.value?.role];
        if (!url) return;

        try {
            const response = await myAxios.get(url);
            const profile = response.data.data;
            if (profile?.name) userInfo.value = { ...userInfo.value, name: profile.name };
        } catch {
            // 프로필 조회 실패가 로그인 자체를 막지는 않도록 계정 정보는 유지한다.
        }
    };

    // 3. Actions
    const clearAuthStore = () => {
        isLoggedIn.value = false;
        accessToken.value = '';
        passwordChangeToken.value = '';
        userInfo.value = null;
        pendingLoginId.value = '';
        pendingLoginType.value = 'student';

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
                accessToken.value = data.accessToken || '';
                passwordChangeToken.value = data.passwordChangeToken || '';
                userInfo.value = mergeAccountInfo(data);
                isLoggedIn.value = Boolean(accessToken.value);
                if (isLoggedIn.value) await fetchDisplayName();
                pendingLoginId.value = passwordChangeToken.value ? loginForm.loginId : '';
                pendingLoginType.value = passwordChangeToken.value ? loginType : 'student';
                return {
                    requiresPasswordChange: requiresInitialPasswordChange.value,
                };
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
            console.error('서버 로그아웃 요청 실패', error);
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
            accessToken.value = data.accessToken;
            passwordChangeToken.value = '';
            userInfo.value = mergeAccountInfo(data, userInfo.value);
            isLoggedIn.value = true;
            await fetchDisplayName();
            return accessToken.value;
        } catch (error) {
            clearAuthStore();
            throw error;
        }
    };

    // 최초 로그인 전용 토큰으로 비밀번호를 바꾼 뒤 모든 인증 상태를 종료한다.
    const initialPasswordChange = async (newPassword) => {
        const token = passwordChangeToken.value;

        if (!token) {
            throw new Error('비밀번호 변경 인증 정보가 없습니다. 다시 로그인해 주세요.');
        }

        await myAxios.patch(
            '/api/auth/initial-password',
            { newPassword },
            {
                headers: { Authorization: `Bearer ${token}` },
                skipAuthRefresh: true,
            }
        );

        clearAuthStore();
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
        passwordChangeToken,
        userInfo,
        requiresInitialPasswordChange,
        clearAuthStore,
        login,
        logout,
        reissue,
        passwordChange,
        initialPasswordChange,
    };
});
