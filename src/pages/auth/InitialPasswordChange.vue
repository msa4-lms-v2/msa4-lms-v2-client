<script setup>
import { computed, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../../store/auth/useAuthStore';
import passwordChangeValidator from '../../util/validator/domain/passwordChangeValidator';

const router = useRouter();
const authStore = useAuthStore();
const form = reactive({ newPassword: '', confirmPassword: '' });
const showPassword = reactive({ newPassword: false, confirmPassword: false });
const isSubmitting = ref(false);
const errorMessage = ref('');

const conditions = computed(() => ({
    length: form.newPassword.length >= 8 && form.newPassword.length <= 20,
    combination: /[A-Za-z]/.test(form.newPassword) && /\d/.test(form.newPassword) && /[!@#$%^&*()]/.test(form.newPassword),
    matches: Boolean(form.confirmPassword) && form.newPassword === form.confirmPassword,
}));

const submit = async () => {
    errorMessage.value = passwordChangeValidator.newPassword(form.newPassword)
        || passwordChangeValidator.confirmPassword(form.newPassword, form.confirmPassword);
    if (errorMessage.value) return;

    isSubmitting.value = true;
    try {
        await authStore.initialPasswordChange(form.newPassword);
        await router.replace({
            path: '/login',
            query: { passwordChanged: 'true' },
        });
    } catch (error) {
        errorMessage.value = error.response?.data?.message || error.message || '비밀번호 변경에 실패했습니다.';
    } finally {
        isSubmitting.value = false;
    }
};
</script>

<template>
    <main class="password-page">
        <section class="security-panel" aria-labelledby="security-title">
            <div class="brand-logo">
                <img src="/로고.png" alt="" />
                <img src="/이름.png" alt="미래대학교 MIRAE UNIVERSITY" />
            </div>

            <div class="security-content">
                <div class="lock-circle" aria-hidden="true">
                    <svg viewBox="0 0 48 48">
                        <path d="M15 21v-7a9 9 0 0 1 18 0v7M13 21h22a3 3 0 0 1 3 3v17H10V24a3 3 0 0 1 3-3Z" />
                        <circle cx="24" cy="30" r="3" />
                        <path d="M24 33v4" />
                    </svg>
                </div>
                <h1 id="security-title">보안을 위해<br />비밀번호를 변경해 주세요</h1>
                <p>최초 로그인입니다.<br />안전한 서비스 이용을 위해<br />비밀번호를 변경해 주세요.</p>

                <aside class="notice-box">
                    <strong><span>i</span> 안내사항</strong>
                    <ul>
                        <li>비밀번호는 8~20자 이내로 입력해 주세요.</li>
                        <li>영문, 숫자, 특수문자를 모두 포함해야 합니다.</li>
                        <li>이전 비밀번호와 동일할 수 없습니다.</li>
                    </ul>
                </aside>
            </div>
        </section>

        <section class="form-panel">
            <form class="password-card" @submit.prevent="submit">
                <header>
                    <h2>비밀번호 변경</h2>
                    <p>새로운 비밀번호를 입력해 주세요.</p>
                </header>

                <label for="new-password">새 비밀번호</label>
                <div class="input-wrap">
                    <svg class="input-icon" viewBox="0 0 24 24"><path d="M7 10V7a5 5 0 0 1 10 0v3M6 10h12a2 2 0 0 1 2 2v8H4v-8a2 2 0 0 1 2-2Z" /></svg>
                    <input id="new-password" v-model="form.newPassword" :type="showPassword.newPassword ? 'text' : 'password'" autocomplete="new-password" placeholder="새 비밀번호를 입력하세요." :disabled="isSubmitting" />
                    <button type="button" class="toggle" :aria-label="showPassword.newPassword ? '비밀번호 숨기기' : '비밀번호 보기'" @click="showPassword.newPassword = !showPassword.newPassword">
                        <svg viewBox="0 0 24 24"><path d="M3 3l18 18M10.6 10.6A2 2 0 0 0 13.4 13.4M9.9 5.2A10 10 0 0 1 12 5c6 0 9.5 7 9.5 7a16 16 0 0 1-3 3.8M6.2 6.2C3.8 8 2.5 12 2.5 12S6 19 12 19c1.2 0 2.3-.3 3.3-.7" /></svg>
                    </button>
                </div>

                <label for="confirm-password">새 비밀번호 확인</label>
                <div class="input-wrap">
                    <svg class="input-icon" viewBox="0 0 24 24"><path d="M7 10V7a5 5 0 0 1 10 0v3M6 10h12a2 2 0 0 1 2 2v8H4v-8a2 2 0 0 1 2-2Z" /></svg>
                    <input id="confirm-password" v-model="form.confirmPassword" :type="showPassword.confirmPassword ? 'text' : 'password'" autocomplete="new-password" placeholder="새 비밀번호를 다시 입력하세요." :disabled="isSubmitting" />
                    <button type="button" class="toggle" :aria-label="showPassword.confirmPassword ? '비밀번호 숨기기' : '비밀번호 보기'" @click="showPassword.confirmPassword = !showPassword.confirmPassword">
                        <svg viewBox="0 0 24 24"><path d="M3 3l18 18M10.6 10.6A2 2 0 0 0 13.4 13.4M9.9 5.2A10 10 0 0 1 12 5c6 0 9.5 7 9.5 7a16 16 0 0 1-3 3.8M6.2 6.2C3.8 8 2.5 12 2.5 12S6 19 12 19c1.2 0 2.3-.3 3.3-.7" /></svg>
                    </button>
                </div>

                <div class="requirements" aria-live="polite">
                    <strong>비밀번호 조건</strong>
                    <p :class="{ valid: conditions.length }"><span>✓</span> 8~20자 이내</p>
                    <p :class="{ valid: conditions.combination }"><span>✓</span> 영문, 숫자, 특수문자 모두 포함</p>
                    <p :class="{ valid: conditions.matches }"><span>✓</span> 비밀번호 확인 일치</p>
                </div>

                <p v-if="errorMessage" class="error-message" role="alert">{{ errorMessage }}</p>
                <button class="submit-button" type="submit" :disabled="isSubmitting">
                    {{ isSubmitting ? '변경 중...' : '비밀번호 변경' }}
                </button>
            </form>
        </section>
    </main>
</template>

<style scoped>
.password-page { min-height: 100vh; display: grid; grid-template-columns: minmax(320px, 38%) 1fr; background: white; color: #172033; }
.security-panel { position: relative; min-height: 100vh; padding: 30px clamp(32px, 6vw, 72px); background: linear-gradient(145deg, #f7f9fd, #edf3ff); }
.brand-logo { display: flex; align-items: center; gap: 10px; }
.brand-logo img:first-child { width: 43px; height: 43px; object-fit: contain; }
.brand-logo img:last-child { width: 150px; height: auto; }
.security-content { max-width: 300px; margin: 72px auto 0; }
.lock-circle { width: 92px; height: 92px; margin: 0 auto 28px; display: grid; place-items: center; border-radius: 50%; background: #dfe8ff; }
.lock-circle svg { width: 50px; fill: none; stroke: #263a96; stroke-width: 2.2; stroke-linecap: round; stroke-linejoin: round; }
.security-content h1 { margin: 0; color: #1d378d; font-size: 24px; line-height: 1.35; letter-spacing: -.04em; }
.security-content > p { margin: 18px 0; color: #70809a; font-size: 14px; line-height: 1.65; }
.notice-box { margin-top: 22px; padding: 16px 18px; border-radius: 10px; background: #e6edff; color: #52627d; font-size: 11px; }
.notice-box strong { display: flex; align-items: center; gap: 7px; color: #273f91; }
.notice-box strong span { width: 14px; height: 14px; display: grid; place-items: center; border-radius: 50%; color: white; background: #273f91; font-size: 9px; }
.notice-box ul { margin: 10px 0 0; padding-left: 17px; line-height: 1.9; }
.form-panel { min-height: 100vh; display: grid; place-items: center; padding: 45px; background: white; }
.password-card { width: min(540px, 100%); padding: 44px 48px; border-radius: 12px; background: white; box-shadow: 0 10px 30px rgba(31, 45, 78, .13); }
.password-card header { margin-bottom: 28px; }
.password-card h2 { margin: 0; font-size: 26px; letter-spacing: -.04em; }
.password-card header p { margin: 8px 0 0; color: #8994a8; font-size: 13px; }
.password-card label { display: block; margin: 18px 0 8px; font-size: 12px; font-weight: 800; }
.input-wrap { height: 48px; padding: 0 14px; display: flex; align-items: center; gap: 10px; border: 1px solid #d8dfeb; border-radius: 7px; transition: .2s; }
.input-wrap:focus-within { border-color: #2f45a4; box-shadow: 0 0 0 3px rgba(47, 69, 164, .1); }
.input-wrap input { min-width: 0; flex: 1; border: 0; outline: 0; color: #172033; background: transparent; font-size: 12px; }
.input-wrap input::placeholder { color: #a3aec0; }
.input-icon, .toggle svg { width: 17px; fill: none; stroke: #98a5b9; stroke-width: 1.7; stroke-linecap: round; stroke-linejoin: round; }
.toggle { padding: 4px; display: grid; place-items: center; border: 0; background: transparent; cursor: pointer; }
.requirements { margin-top: 90px; padding: 16px; border: 1px solid #dbe3f2; border-radius: 7px; background: #f3f6fc; font-size: 11px; }
.requirements strong { display: block; margin-bottom: 10px; color: #273f91; }
.requirements p { margin: 7px 0 0; color: #7c879b; }
.requirements p span { margin-right: 8px; color: #a7b0c0; font-weight: 800; }
.requirements p.valid, .requirements p.valid span { color: #233d96; }
.error-message { margin: 12px 0 -4px; color: #dc2626; font-size: 11px; }
.submit-button { width: 100%; height: 48px; margin-top: 20px; border: 0; border-radius: 6px; color: white; background: #292f91; font-size: 13px; font-weight: 800; cursor: pointer; }
.submit-button:hover:not(:disabled) { background: #202676; }
.submit-button:disabled { opacity: .65; cursor: wait; }
@media (max-width: 800px) { .password-page { padding: 0; display: block; } .security-panel { min-height: auto; padding: 22px; } .security-content { margin: 28px auto 0; text-align: center; } .security-content > p { margin-bottom: 0; } .notice-box { display: none; } .form-panel { min-height: auto; padding: 28px 18px 50px; } .password-card { padding: 28px 24px; } .requirements { margin-top: 35px; } }
</style>
