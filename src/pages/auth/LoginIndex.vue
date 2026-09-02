<script setup>
import { computed, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import MyInput from '../../components/input/MyInput.vue';
import loginValidator from '../../util/validator/domain/loginValidator';
import { useAuthStore } from '../../store/auth/useAuthStore';

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();
const loginType = ref('student');
const rememberId = ref(false);
const showPassword = ref(false);
const isLoading = ref(false);
const errorMessage = ref('');

const loginForm = reactive({
  loginId: '',
  password: '',
});

const changeLoginType = (type) => {
  loginType.value = type;
  loginForm.loginId = '';
  loginForm.password = '';
  errorMessage.value = '';
};

const loginContent = computed(() =>
  loginType.value === 'student'
    ? {
       title: '학생 로그인',
       description: '학번과 비밀번호를 입력해 주세요.',
       idLabel: '학번',
       idPlaceholder: '학번을 입력해 주세요',
       supportTeam: '학사지원팀',
     }
    : loginType.value === 'professor'
    ? {
       title: '교수 로그인',
       description: '교번과 비밀번호를 입력해 주세요.',
       idLabel: '교번',
       idPlaceholder: '교번을 입력해 주세요',
       supportTeam: '교수지원팀',
     }
    : {
       title: '관리자 로그인',
       description: '관리자 계정으로 로그인해 주세요.',
       idLabel: '관리자 아이디',
       idPlaceholder: '관리자 아이디를 입력해 주세요',
       supportTeam: '시스템관리팀',
     }
);

const handleLogin = async () => {
  errorMessage.value = '';

  const loginIdMessage = loginValidator.loginId(loginForm.loginId);
  if (loginIdMessage) {
    errorMessage.value = loginIdMessage;
    return;
  }

  const passwordMessage = loginValidator.password(loginForm.password);
  if (passwordMessage) {
    errorMessage.value = passwordMessage;
    return;
  }

  isLoading.value = true;

  try {
    await authStore.login(
      {
        loginId: loginForm.loginId,
        password: loginForm.password,
      },
      loginType.value
    );

    const redirect = typeof route.query.redirect === 'string'
      && route.query.redirect.startsWith('/')
      && !route.query.redirect.startsWith('//')
      ? route.query.redirect
      : '/main';

    router.replace(redirect);
  } catch (error) {
    errorMessage.value = error.response?.data?.message || error.message || '로그인에 실패했습니다.';
  } finally {
    isLoading.value = false;
  }
};
</script>

<template>
  <main class="login-page">
    <section class="brand-panel">
      <div class="brand-decoration decoration-one"></div>
      <div class="brand-decoration decoration-two"></div>

      <div class="brand-content">
        <div class="logo-frame">
          <img src="/로고2.png" alt="미래대학교 로고" />
        </div>

        <div class="brand-text">
          <p>MIRAE UNIVERSITY</p>
          <h1>미래대학교</h1>
          <div class="brand-line"></div>
          <h2>학사정보시스템</h2>
          <span>미래를 여는 배움, 함께 만드는 내일</span>
        </div>
      </div>

      <footer>
        <span>© 2000 Mirae University</span>
        <span>학사정보시스템 문의 02-1234-5678</span>
      </footer>
    </section>

    <section class="login-panel">
      <div class="login-container">
        <header class="login-header">
          <span class="welcome">WELCOME TO MIRAE</span>
          <h2>{{ loginContent.title }}</h2>
          <p>{{ loginContent.description }}</p>
        </header>

        <div class="login-tabs" role="tablist" aria-label="로그인 유형">
          <button
            type="button"
            role="tab"
            :aria-selected="loginType === 'student'"
            :class="{ active: loginType === 'student' }"
            @click="changeLoginType('student')"
          >
            <span class="tab-icon">
              <svg viewBox="0 0 24 24">
                <path d="m3 9 9-5 9 5-9 5-9-5Zm3 3v5c3 2 9 2 12 0v-5M21 9v6" />
              </svg>
            </span>
            <span><strong>학생</strong><small>Student</small></span>
          </button>
          <button
            type="button"
            role="tab"
            :aria-selected="loginType === 'professor'"
            :class="{ active: loginType === 'professor' }"
            @click="changeLoginType('professor')"
          >
            <span class="tab-icon">
              <svg viewBox="0 0 24 24">
                <path d="M4 4h12a3 3 0 0 1 3 3v13H7a3 3 0 0 1-3-3V4Zm3 16a3 3 0 0 1 0-6h12M8 8h7" />
              </svg>
            </span>
            <span><strong>교수</strong><small>Professor</small></span>
          </button>
          <button
            type="button"
            role="tab"
            :aria-selected="loginType === 'admin'"
            :class="{ active: loginType === 'admin' }"
            @click="changeLoginType('admin')"
          >
            <span class="tab-icon">
              <svg viewBox="0 0 24 24">
                <path d="M12 15a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm-8 6a8 8 0 0 1 16 0M18 3v4M16 5h4" />
              </svg>
            </span>
            <span><strong>관리자</strong><small>Administrator</small></span>
          </button>
        </div>

        <form @submit.prevent="handleLogin">
          <label class="login-title" for="loginId">{{ loginContent.idLabel }}</label>
          <div class="input-box">
            <svg viewBox="0 0 24 24">
              <path d="M20 21a8 8 0 0 0-16 0M12 13a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z" />
            </svg>
            <MyInput
              id="loginId"
              v-model.trim="loginForm.loginId"
              type="text"
              autocomplete="username"
              :placeholder="loginContent.idPlaceholder"
              :disabled="isLoading"
            />
          </div>

          <label class="login-title" for="password">비밀번호</label>
          <div class="input-box">
            <svg viewBox="0 0 24 24">
              <path d="M7 10V7a5 5 0 0 1 10 0v3M6 10h12a2 2 0 0 1 2 2v8H4v-8a2 2 0 0 1 2-2Z" />
            </svg>
            <MyInput
              id="password"
              v-model="loginForm.password"
              :type="showPassword ? 'text' : 'password'"
              autocomplete="current-password"
              placeholder="비밀번호를 입력해 주세요"
              :disabled="isLoading"
            />
            <button
              type="button"
              class="password-toggle"
              :aria-label="showPassword ? '비밀번호 숨기기' : '비밀번호 보기'"
              @click="showPassword = !showPassword"
            >
              <svg viewBox="0 0 24 24">
                <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
                <circle cx="12" cy="12" r="2.5" />
              </svg>
            </button>
          </div>

          <p v-if="errorMessage" class="error-message" role="alert">
            {{ errorMessage }}
          </p>

          <div class="form-options">
            <label class="remember">
              <input v-model="rememberId" type="checkbox" />
              <span></span>
              아이디 저장
            </label>
            <a href="#">비밀번호 찾기</a>
          </div>

          <button class="login-button" type="submit" :disabled="isLoading">
            {{ isLoading ? '로그인 중...' : `${loginContent.title} 하기` }}
            <svg viewBox="0 0 24 24"><path d="m9 18 6-6-6-6" /></svg>
          </button>
        </form>

        <div class="support-box">
          <span>?</span>
          <p>
            <strong>로그인에 문제가 있으신가요?</strong>
            <small>{{ loginContent.supportTeam }}으로 문의해 주세요.</small>
          </p>
          <a href="tel:02-1234-5678">02-1234-5678</a>
        </div>

        <nav class="policy-links">
          <a href="#">개인정보처리방침</a>
          <i></i>
          <a href="#">이용약관</a>
        </nav>
      </div>
    </section>
  </main>
</template>

<style scoped>
.login-page {
  min-height: 100vh;
  display: grid;
  grid-template-columns: minmax(430px, 0.95fr) minmax(580px, 1.05fr);
  color: var(--personal-color-primary-text-navy);
  background: var(--personal-color-bg-surface-frost);
}
.brand-panel {
  position: relative;
  overflow: hidden;
  min-height: 100vh;
  padding: 55px 65px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  color: var(--personal-color-white);
  background: linear-gradient(145deg, var(--personal-color-login-primary-navy), #061f4d);
}
.brand-panel:before {
  content: '';
  position: absolute;
  inset: 0;
  opacity: 0.11;
  background-image: linear-gradient(var(--personal-color-white) 1px, transparent 1px), linear-gradient(90deg, var(--personal-color-white) 1px, transparent 1px);
  background-size: 55px 55px;
  mask-image: linear-gradient(to bottom, var(--personal-color-black), transparent 88%);
}
.brand-decoration {
  position: absolute;
  border-radius: 50%;
  border: 1px solid #ffffff15;
}
.decoration-one {
  width: 520px;
  height: 520px;
  right: -270px;
  top: -250px;
  box-shadow: 0 0 0 70px var(--personal-color-login-glow-azure), 0 0 0 140px var(--personal-color-login-glow-azure-outer);
}
.decoration-two {
  width: 330px;
  height: 330px;
  left: -210px;
  bottom: -170px;
  box-shadow: 0 0 0 55px var(--personal-color-login-glow-azure);
}
.brand-content {
  position: relative;
  z-index: 1;
  width: min(470px, 100%);
  margin: auto;
}
.logo-frame {
  width: 210px;
  height: 210px;
  overflow: hidden;
  display: grid;
  place-items: center;
  border: 1px solid #ffffff50;
  border-radius: 36px;
  background: var(--personal-color-white);
  box-shadow: 0 25px 60px #00133370;
}
.logo-frame img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transform: scale(1.25);
}
.brand-text {
  margin-top: 42px;
}
.brand-text p {
  color: var(--personal-color-login-text-sky);
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 0.28em;
}
.brand-text h1 {
  margin-top: 12px;
  font-size: 48px;
  letter-spacing: -0.06em;
}
.brand-line {
  width: 42px;
  height: 3px;
  margin: 24px 0;
  background: var(--personal-color-student-accent-azure);
}
.brand-text h2 {
  font-size: 22px;
  font-weight: 500;
  letter-spacing: -0.04em;
}
.brand-text span {
  display: block;
  margin-top: 12px;
  color: #bfdbfe;
  font-size: 13px;
}
.brand-panel footer {
  position: relative;
  z-index: 1;
  display: flex;
  justify-content: space-between;
  color: var(--personal-color-login-text-sky-soft);
  font-size: 9px;
}
.login-panel {
  min-height: 100vh;
  padding: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: radial-gradient(circle at 90% 0, var(--personal-color-status-processing-bg-sky) 0, transparent 32%), var(--personal-color-bg-surface-frost);
}
.login-container {
  width: min(500px, 100%);
}
.welcome {
  color: var(--personal-color-secondary-blue);
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 0.2em;
}
.login-header h2 {
  margin-top: 10px;
  color: #0f2f68;
  font-size: 42px;
  letter-spacing: -0.05em;
}
.login-header p {
  margin-top: 8px;
  color: var(--personal-color-text-muted-slate);
  font-size: 15px;
}

.login-title {
  font-size: 15px;
}
.login-tabs {
  margin: 30px 0 27px;
  padding: 5px;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 5px;
  border-radius: 15px;
  background: #e8eef7;
}
.login-tabs button {
  height: 64px;
  padding: 0 11px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 0;
  border-radius: 11px;
  color: var(--personal-color-text-muted-slate);
  background: transparent;
  text-align: left;
  cursor: pointer;
  transition: 0.2s;
}
.login-tabs button.active {
  color: var(--personal-color-login-primary-navy);
  background: var(--personal-color-white);
  box-shadow: 0 5px 15px var(--personal-color-login-shadow-navy);
}
.tab-icon {
  width: 32px;
  height: 32px;
  display: grid;
  place-items: center;
  flex: none;
  border-radius: 9px;
  background: #ffffff88;
}
.active .tab-icon {
  color: var(--personal-color-white);
  background: linear-gradient(135deg, var(--personal-color-login-primary-navy), var(--personal-color-secondary-blue));
}
.tab-icon svg {
  width: 16px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.7;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.login-tabs strong,
.login-tabs small {
  display: block;
}
.login-tabs strong {
  font-size: 14px;
}
.login-tabs small {
  margin-top: 2px;
  font-size: 10px;
  letter-spacing: 0.03em;
  opacity: 0.7;
}
form > label {
  display: block;
  margin: 0 0 8px;
  color: var(--personal-color-admin-primary-slate);
  font-size: 11px;
  font-weight: 800;
}
.input-box {
  height: 58px;
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 18px;
  padding: 0 15px;
  border: 1px solid #dbe3ee;
  border-radius: 11px;
  background: var(--personal-color-white);
  transition: 0.2s;
}
.input-box:focus-within {
  border-color: var(--personal-color-secondary-blue);
  box-shadow: 0 0 0 4px var(--personal-color-login-shadow-blue-soft);
}
.input-box > svg {
  width: 18px;
  flex: none;
  fill: none;
  stroke: var(--personal-color-text-faint-fog);
  stroke-width: 1.7;
  stroke-linecap: round;
}
.input-box :deep(input) {
  min-width: 0;
  flex: 1;
  border: 0;
  outline: 0;
  color: var(--personal-color-primary-text-navy);
  background: transparent;
  font-size: 15px;
}
.input-box :deep(input)::placeholder {
  color: #b4bfcd;
}
.password-toggle {
  display: grid;
  place-items: center;
  border: 0;
  background: none;
  cursor: pointer;
}
.password-toggle svg {
  width: 17px;
  fill: none;
  stroke: var(--personal-color-text-faint-fog);
  stroke-width: 1.7;
}
.error-message {
  margin: -6px 0 14px;
  color: var(--personal-color-danger-coral);
  font-size: 10px;
}
.form-options {
  margin: 1px 0 22px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: var(--personal-color-text-muted-slate);
  font-size: 12px;
}
.remember {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
}
.remember input {
  position: absolute;
  opacity: 0;
}
.remember span {
  width: 14px;
  height: 14px;
  border: 1px solid var(--personal-color-border-mist);
  border-radius: 4px;
  background: var(--personal-color-white);
}
.remember input:checked + span {
  border-color: var(--personal-color-secondary-blue);
  background: var(--personal-color-secondary-blue);
  box-shadow: inset 0 0 0 3px var(--personal-color-white);
}
.form-options a,
.policy-links a {
  color: var(--personal-color-text-muted-slate);
  text-decoration: none;
}
.login-button {
  width: 100%;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  border: 0;
  border-radius: 11px;
  color: var(--personal-color-white);
  background: linear-gradient(135deg, var(--personal-color-login-primary-navy), var(--personal-color-secondary-blue));
  box-shadow: 0 14px 26px var(--personal-color-login-shadow-blue-medium);
  font-size: 15px;
  font-weight: 800;
  cursor: pointer;
  transition: 0.2s;
}
.login-button:hover {
  transform: translateY(-1px);
  box-shadow: 0 18px 30px var(--personal-color-login-shadow-blue-strong);
}
.login-button:disabled {
  opacity: 0.65;
}
.login-button svg {
  width: 16px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
}
.support-box {
  margin-top: 25px;
  padding: 15px;
  display: flex;
  align-items: center;
  gap: 10px;
  border: 1px solid var(--personal-color-border-mist);
  border-radius: 11px;
  background: var(--personal-color-white);
}
.support-box > span {
  width: 30px;
  height: 30px;
  display: grid;
  place-items: center;
  flex: none;
  border-radius: 50%;
  color: var(--personal-color-secondary-blue);
  background: #eff6ff;
  font-size: 14px;
  font-weight: 800;
}
.support-box p {
  flex: 1;
}
.support-box strong,
.support-box small {
  display: block;
}
.support-box strong {
  color: var(--personal-color-admin-primary-slate);
  font-size: 13px;
}
.support-box small {
  margin-top: 3px;
  color: var(--personal-color-text-faint-fog);
  font-size: 11px;
}
.support-box a {
  color: var(--personal-color-secondary-blue);
  text-decoration: none;
  font-size: 10px;
  font-weight: 800;
}
.policy-links {
  margin-top: 25px;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 10px;
  font-size: 11px;
}
.policy-links i {
  width: 1px;
  height: 8px;
  background: var(--personal-color-border-mist);
}
@media (max-width: 850px) {
  .login-page {
    display: block;
  }
  .brand-panel {
    min-height: auto;
    padding: 25px 22px;
  }
  .brand-content {
    margin: 0;
    display: flex;
    align-items: center;
    gap: 14px;
  }
  .logo-frame {
    width: 65px;
    height: 65px;
    border-radius: 15px;
  }
  .brand-text {
    margin: 0;
  }
  .brand-text p,
  .brand-line,
  .brand-text h2,
  .brand-text span,
  .brand-panel footer {
    display: none;
  }
  .brand-text h1 {
    margin: 0;
    font-size: 21px;
  }
  .login-panel {
    min-height: calc(100vh - 115px);
    padding: 35px 22px;
  }
}
@media (max-width: 450px) {
  .login-panel {
    align-items: flex-start;
  }
  .login-tabs button {
    padding: 0 10px;
  }
  .tab-icon {
    display: none;
  }
  .support-box a {
    display: none;
  }
}
.temp-logo {
  font-size: 48px;
  font-weight: 900;
  color: var(--personal-color-login-primary-navy);
  letter-spacing: -2px;
}
</style>
