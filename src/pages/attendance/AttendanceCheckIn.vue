<script setup>
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { checkInAttendance } from '../../api/attendanceApi';
import MyButton from '../../components/button/MyButton.vue';

const route = useRoute();
const router = useRouter();

const state = ref('loading');
const message = ref('출석 정보를 확인하고 있습니다.');
const attendance = ref(null);
const statusLabels = { PRESENT: '출석', LATE: '지각', ABSENT: '결석', EXCUSED: '공결' };

const title = computed(() => {
    if (state.value === 'success') return '출석 완료';
    if (state.value === 'error') return '출석 확인 실패';
    return 'QR 출석 확인';
});

const checkIn = async () => {
    const sessionId = Number(route.query.sessionId);
    const token = typeof route.query.token === 'string' ? route.query.token : '';

    if (!Number.isSafeInteger(sessionId) || sessionId <= 0 || !token) {
        state.value = 'error';
        message.value = 'QR 출석 정보가 올바르지 않습니다. QR 코드를 다시 스캔해 주세요.';
        return;
    }

    try {
        const response = await checkInAttendance(sessionId, token);
        attendance.value = response.data.data;
        state.value = 'success';
        message.value = '출석이 정상적으로 처리되었습니다.';
    } catch (error) {
        state.value = 'error';
        message.value = error.response?.data?.message
            || '출석 처리에 실패했습니다. QR 코드를 다시 스캔해 주세요.';
    }
};

onMounted(checkIn);
</script>

<template>
    <main class="check-in-page">
        <section class="check-in-card" role="status" aria-live="polite">
            <div class="status-icon" :class="state">
                <span v-if="state === 'loading'" class="spinner"></span>
                <span v-else-if="state === 'success'">✓</span>
                <span v-else>!</span>
            </div>

            <p class="brand">MIRAE UNIVERSITY</p>
            <h1>{{ title }}</h1>
            <p class="message">{{ message }}</p>

            <dl v-if="attendance" class="attendance-result">
                <div>
                    <dt>과목</dt>
                    <dd>{{ attendance.courseName }}</dd>
                </div>
                <div>
                    <dt>출석 상태</dt>
                    <dd>{{ statusLabels[attendance.status] || attendance.status }}</dd>
                </div>
                <div>
                    <dt>처리 시각</dt>
                    <dd>{{ attendance.checkinTime }}</dd>
                </div>
            </dl>

            <MyButton
                v-if="state !== 'loading'"
                class="home-button"
                btn-type="button"
                color="deep-blue"
                size="big"
                content="메인 화면으로 이동"
                @click="router.replace('/main')"
            />
        </section>
    </main>
</template>

<style scoped>
.check-in-page {
    box-sizing: border-box;
    min-height: 100vh;
    padding: 24px;
    display: grid;
    place-items: center;
    color: var(--personal-color-primary-text-navy);
    background: var(--personal-color-bg-surface-frost);
}

.check-in-card {
    box-sizing: border-box;
    width: min(420px, 100%);
    padding: 38px 26px;
    border: 1px solid var(--personal-color-border-mist);
    border-radius: 8px;
    background: var(--personal-color-white);
    text-align: center;
}

.status-icon {
    width: 64px;
    height: 64px;
    margin: 0 auto 20px;
    display: grid;
    place-items: center;
    border-radius: 50%;
    color: var(--personal-color-white);
    background: var(--personal-color-student-primary-cyan);
    font-size: 34px;
    font-weight: 800;
}

.status-icon.success { background: var(--personal-color-green); }
.status-icon.error { background: var(--personal-color-red); }

.spinner {
    width: 26px;
    height: 26px;
    border: 3px solid var(--personal-color-border-mist);
    border-top-color: var(--personal-color-white);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
}

.brand {
    color: var(--personal-color-student-primary-cyan);
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0.13em;
}

h1 {
    margin: 8px 0 10px;
    font-size: 28px;
}

.message {
    color: var(--personal-color-text-muted-slate);
    line-height: 1.6;
}

.attendance-result {
    margin: 24px 0 0;
    padding: 6px 16px;
    border-radius: 8px;
    background: var(--personal-color-bg-surface-frost);
    text-align: left;
}

.attendance-result div {
    padding: 11px 0;
    display: flex;
    justify-content: space-between;
    gap: 16px;
    border-bottom: 1px solid var(--personal-color-border-mist);
}

.attendance-result div:last-child { border-bottom: 0; }
.attendance-result dt { color: var(--personal-color-text-tertiary-slate); }
.attendance-result dd { margin: 0; font-weight: 700; text-align: right; }

.home-button {
    margin-top: 24px;
    margin-right: auto;
    margin-left: auto;
}

@keyframes spin {
    to { transform: rotate(360deg); }
}
</style>
