<script setup>
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { checkInAttendance } from '../../api/attendanceApi';

const route = useRoute();
const router = useRouter();

const state = ref('loading');
const message = ref('출석 정보를 확인하고 있습니다.');
const attendance = ref(null);

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
                    <dd>{{ attendance.status }}</dd>
                </div>
                <div>
                    <dt>처리 시각</dt>
                    <dd>{{ attendance.checkinTime }}</dd>
                </div>
            </dl>

            <button v-if="state !== 'loading'" type="button" @click="router.replace('/main')">
                메인 화면으로 이동
            </button>
        </section>
    </main>
</template>

<style scoped>
.check-in-page {
    min-height: 100vh;
    padding: 24px;
    display: grid;
    place-items: center;
    color: #172033;
    background: #f3f6fb;
}

.check-in-card {
    width: min(420px, 100%);
    padding: 38px 26px;
    border: 1px solid #dbe3f0;
    border-radius: 22px;
    background: #fff;
    box-shadow: 0 18px 50px #1d397018;
    text-align: center;
}

.status-icon {
    width: 64px;
    height: 64px;
    margin: 0 auto 20px;
    display: grid;
    place-items: center;
    border-radius: 50%;
    color: #fff;
    background: #3153a4;
    font-size: 34px;
    font-weight: 800;
}

.status-icon.success { background: #2f9e5b; }
.status-icon.error { background: #d64545; }

.spinner {
    width: 26px;
    height: 26px;
    border: 3px solid #ffffff55;
    border-top-color: #fff;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
}

.brand {
    color: #3153a4;
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0.13em;
}

h1 {
    margin: 8px 0 10px;
    font-size: 28px;
}

.message {
    color: #657188;
    line-height: 1.6;
}

.attendance-result {
    margin: 24px 0 0;
    padding: 6px 16px;
    border-radius: 14px;
    background: #f6f8fc;
    text-align: left;
}

.attendance-result div {
    padding: 11px 0;
    display: flex;
    justify-content: space-between;
    gap: 16px;
    border-bottom: 1px solid #e5eaf2;
}

.attendance-result div:last-child { border-bottom: 0; }
.attendance-result dt { color: #778197; }
.attendance-result dd { margin: 0; font-weight: 700; text-align: right; }

button {
    width: 100%;
    height: 50px;
    margin-top: 24px;
    border: 0;
    border-radius: 11px;
    color: #fff;
    background: #3153a4;
    font-weight: 700;
    cursor: pointer;
}

@keyframes spin {
    to { transform: rotate(360deg); }
}
</style>
