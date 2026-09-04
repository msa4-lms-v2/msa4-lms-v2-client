<script setup>
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from "vue";
import QRCode from "qrcode";
import {
  closeAttendanceSession,
  getAttendanceSessions,
  getAttendanceSessionSummary,
  getCurrentAttendanceSession,
  getProfessorLectures,
  openAttendanceSession,
  renewAttendanceQr,
} from "../../api/attendanceApi";
import { confirmDialog, notify } from "../../composables/useDialog";
import MyModal from "../../components/common/MyModal.vue";
import MyTable from "../../components/table/MyTable.vue";
import MyButton from "../../components/button/MyButton.vue";
import MySelect from "../../components/input/MySelect.vue";
import MyPageContainer from "../../components/layout/MyPageContainer.vue";
import MyStatusBadge from "../../components/common/MyStatusBadge.vue";

const lectures = ref([]);
const selectedClassId = ref("");
const currentSession = ref(null);
const sessions = ref([]);
const qrCanvas = ref(null);
const expandedQrCanvas = ref(null);
const qrUrl = ref("");
const secondsLeft = ref(0);
const isLoading = ref(true);
const isOpening = ref(false);
const isClosing = ref(false);
const isQrExpanded = ref(false);
let countdownTimer;
let qrRenewTimer;
let summaryTimer;
let qrRefreshDeadline = 0;

const historyColumns = [
  { key: "lecture", label: "강의명", class: "lecture-column" },
  { key: "openedAt", label: "출석 일시", class: "date-column" },
  { key: "attendance", label: "참여 인원", class: "attendance-column" },
  { key: "status", label: "상태", class: "status-column" },
];

const selectedLecture = computed(() =>
  lectures.value.find(
    (lecture) => String(lecture.classId) === String(selectedClassId.value)
  )
);
const lectureOptions = computed(() =>
  lectures.value.map((lecture) => ({
    value: String(lecture.classId),
    label: lectureLabel(lecture),
  })),
);
const hasOpenSession = computed(() => currentSession.value?.status === "OPEN");

const lectureLabel = (lecture) =>
  `${lecture.courseName} (${lecture.sectionNo}분반)`;
const statusLabel = (status) => (status === "OPEN" ? "진행 중" : "종료");
const formatDateTime = (value) => {
  if (!value) return "-";
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
};
const errorMessage = (error, fallback) =>
  error?.response?.data?.message || fallback;

const renderQr = async () => {
  if (!qrUrl.value) return;
  const rootStyle = getComputedStyle(document.documentElement);
  const qrColors = {
    dark: rootStyle.getPropertyValue("--personal-color-black").trim(),
    light: rootStyle.getPropertyValue("--personal-color-white").trim(),
  };
  if (qrCanvas.value)
    await QRCode.toCanvas(qrCanvas.value, qrUrl.value, {
      width: 190,
      margin: 2,
      color: qrColors,
      errorCorrectionLevel: "M",
    });
  if (expandedQrCanvas.value)
    await QRCode.toCanvas(expandedQrCanvas.value, qrUrl.value, {
      width: 440,
      margin: 2,
      color: qrColors,
      errorCorrectionLevel: "M",
    });
};

const stopLiveUpdates = () => {
  clearInterval(countdownTimer);
  clearTimeout(qrRenewTimer);
  clearInterval(summaryTimer);
};

const updateCountdown = () => {
  secondsLeft.value = qrRefreshDeadline
    ? Math.max(0, Math.ceil((qrRefreshDeadline - Date.now()) / 1000))
    : 0;
};

const applyQr = async (qr) => {
  const refreshAfterSeconds = Math.max(1, Number(qr.refreshAfterSeconds) || 10);
  qrUrl.value = qr.qrUrl;
  qrRefreshDeadline = Date.now() + refreshAfterSeconds * 1000;
  updateCountdown();
  clearInterval(countdownTimer);
  countdownTimer = setInterval(updateCountdown, 250);
  await nextTick();
  await renderQr();
  clearTimeout(qrRenewTimer);
  qrRenewTimer = setTimeout(refreshQr, refreshAfterSeconds * 1000);
};

const refreshSummary = async () => {
  if (!hasOpenSession.value) return;
  try {
    const { data } = await getAttendanceSessionSummary(
      currentSession.value.sessionId
    );
    Object.assign(currentSession.value, data.data);
  } catch {
    // 일시적인 폴링 실패는 다음 주기에 다시 시도한다.
  }
};

const refreshQr = async () => {
  if (!hasOpenSession.value) return;
  try {
    const { data } = await renewAttendanceQr(currentSession.value.sessionId);
    await applyQr(data.data);
  } catch (error) {
    stopLiveUpdates();
    await notify(errorMessage(error, "QR 갱신에 실패했습니다."));
  }
};

const startLiveUpdates = () => {
  clearInterval(summaryTimer);
  summaryTimer = setInterval(refreshSummary, 3000);
};

const loadHistory = async () => {
  const { data } = await getAttendanceSessions();
  sessions.value = data.data?.items || [];
};

const restoreCurrentSession = async () => {
  stopLiveUpdates();
  currentSession.value = null;
  qrUrl.value = "";
  if (!selectedClassId.value) return;
  try {
    const { data } = await getCurrentAttendanceSession(selectedClassId.value);
    currentSession.value = data.data;
    if (currentSession.value) {
      await refreshSummary();
      await refreshQr();
      startLiveUpdates();
    }
  } catch (error) {
    await notify(errorMessage(error, "현재 출석 세션을 불러오지 못했습니다."));
  }
};

const createSession = async () => {
  if (!selectedClassId.value) {
    await notify("강의를 먼저 선택해 주세요.");
    return;
  }
  isOpening.value = true;
  try {
    const { data } = await openAttendanceSession(Number(selectedClassId.value));
    const opened = data.data;
    currentSession.value = { ...opened };
    await applyQr(opened.qr);
    startLiveUpdates();
    await loadHistory();
  } catch (error) {
    await notify(errorMessage(error, "출석 세션을 생성하지 못했습니다."));
  } finally {
    isOpening.value = false;
  }
};

const endSession = async () => {
  const confirmed = await confirmDialog("현재 QR 출석 세션을 종료할까요?", {
    title: "출석 종료",
    confirmText: "종료",
  });
  if (!confirmed) return;
  isClosing.value = true;
  try {
    await closeAttendanceSession(currentSession.value.sessionId);
    stopLiveUpdates();
    currentSession.value = null;
    qrUrl.value = "";
    isQrExpanded.value = false;
    await loadHistory();
  } catch (error) {
    await notify(errorMessage(error, "출석 세션을 종료하지 못했습니다."));
  } finally {
    isClosing.value = false;
  }
};

const toggleQr = async () => {
  isQrExpanded.value = !isQrExpanded.value;
  await nextTick();
  await renderQr();
};

watch(selectedClassId, restoreCurrentSession);
watch(isQrExpanded, async () => {
  await nextTick();
  await renderQr();
});

onMounted(async () => {
  try {
    const [lectureResponse] = await Promise.all([
      getProfessorLectures(),
      loadHistory(),
    ]);
    lectures.value = lectureResponse.data.data?.items || [];
    if (lectures.value.length)
      selectedClassId.value = String(lectures.value[0].classId);
  } catch (error) {
    await notify(errorMessage(error, "QR 출석 정보를 불러오지 못했습니다."));
  } finally {
    isLoading.value = false;
  }
});

onBeforeUnmount(stopLiveUpdates);
</script>

<template>
  <MyPageContainer
    title="QR 출석 관리"
    subtitle="담당 강의의 출석 세션을 열고 실시간 참여 현황을 확인합니다."
  >
    <section class="attendance-page" :aria-busy="isLoading">
      <div class="lecture-panel panel">
        <label for="lecture-select">강의 선택</label>
        <div class="lecture-controls">
          <MySelect
            id="lecture-select"
            v-model="selectedClassId"
            :options="lectureOptions"
            placeholder="강의를 선택해 주세요"
            :disabled="isLoading || hasOpenSession"
          />
          <MyButton
            color="deep-blue"
            size="big"
            :content="isOpening ? '생성 중...' : '세션 생성'"
            :disabled="!selectedClassId || hasOpenSession || isOpening"
            @click="createSession"
          />
        </div>
        <p v-if="!isLoading && !lectures.length" class="empty-inline">
          현재 학기에 진행 중인 담당 강의가 없습니다.
        </p>
      </div>

      <section class="current-section">
        <div class="section-title-row">
          <h2>현재 출석 세션</h2>
          <MyStatusBadge
            v-if="hasOpenSession"
            label="진행 중"
            variant="success"
          />
        </div>

        <div v-if="hasOpenSession" class="session-panel panel">
          <div class="summary-card">
            <p class="muted-label">진행 상태</p>
            <MyStatusBadge label="출석 진행 중" variant="success" />
            <p class="muted-label count-label">현재 참여</p>
            <div class="count">
              <strong>{{ currentSession.attendedCount || 0 }}</strong
              ><span
                >/
                {{
                  currentSession.totalEnrollmentCount ||
                  selectedLecture?.currentEnrollmentCount ||
                  0
                }}명</span
              >
            </div>
            <p class="session-name">
              {{ currentSession.courseName }} ·
              {{ currentSession.sectionNo }}분반
            </p>
          </div>

          <div class="qr-card">
            <button
              class="qr-preview"
              type="button"
              aria-label="QR 코드 확대"
              @click="toggleQr"
            >
              <canvas ref="qrCanvas"></canvas>
            </button>
            <div class="qr-copy">
              <strong>실시간 출석 QR</strong>
              <p>학생이 QR 코드를 스캔하면 출석됩니다.</p>
              <span>다음 갱신까지</span>
              <b>{{ secondsLeft }}초</b>
            </div>
            <MyButton
              color="deep-blue"
              size="middle"
              content="QR 확대"
              @click="toggleQr"
            />
          </div>
        </div>
        <div v-else class="empty-session panel">
          <span class="empty-icon">QR</span>
          <div>
            <strong>진행 중인 출석 세션이 없습니다.</strong>
            <p>강의를 선택한 뒤 세션을 생성해 주세요.</p>
          </div>
        </div>
        <div v-if="hasOpenSession" class="end-row">
          <MyButton
            color="red"
            size="middle"
            :content="isClosing ? '종료 중...' : '출석 종료'"
            :disabled="isClosing"
            @click="endSession"
          />
        </div>
      </section>

      <section class="history-section">
        <h2>출석 세션 내역</h2>
        <MyTable
          :columns="historyColumns"
          :loading="isLoading"
          :empty="!sessions.length"
          empty-message="출석 세션 내역이 없습니다."
        >
          <tr v-for="session in sessions" :key="session.sessionId">
            <td class="lecture-cell">
              {{ session.courseName }} ({{ session.sectionNo }}분반)
            </td>
            <td>{{ formatDateTime(session.openedAt) }}</td>
            <td>
              {{ session.attendedCount }} / {{ session.totalEnrollmentCount }}명
            </td>
            <td>{{ statusLabel(session.status) }}</td>
          </tr>
        </MyTable>
      </section>

      <MyModal :is-open="isQrExpanded" max-width="790px" @close="toggleQr">
        <div v-if="currentSession" class="expanded-qr">
          <header class="expanded-header">
            <div>
              <h2>QR 출석</h2>
              <p>
                {{ currentSession.courseName }} ({{
                  currentSession.sectionNo
                }}분반)
              </p>
            </div>
            <MyButton
              class="modal-close"
              color="white"
              size="small"
              content="×"
              aria-label="닫기"
              @click="toggleQr"
            />
          </header>
          <div class="expanded-summary">
            <MyStatusBadge label="출석 진행 중" variant="success" />
            <div>
              <span>현재 참여</span
              ><b
                >{{ currentSession.attendedCount || 0 }} /
                {{
                  currentSession.totalEnrollmentCount ||
                  selectedLecture?.currentEnrollmentCount ||
                  0
                }}명</b
              >
            </div>
          </div>
          <div class="expanded-code">
            <canvas ref="expandedQrCanvas"></canvas>
          </div>
          <div class="expanded-footer">
            <div class="refresh-clock">
              <span class="clock-icon">◷</span><span>다음 QR 갱신까지</span
              ><b>{{ secondsLeft }}초</b
              ><small>QR 코드는 자동으로 변경됩니다.</small>
            </div>
            <MyButton
              color="red"
              size="middle"
              :content="isClosing ? '종료 중...' : '출석 종료'"
              :disabled="isClosing"
              @click="endSession"
            />
          </div>
        </div>
      </MyModal>
    </section>
  </MyPageContainer>
</template>

<style scoped>
.attendance-page {
  color: var(--personal-color-primary-text-navy);
}
.panel {
  background: var(--personal-color-white);
  border: 1px solid var(--personal-color-border-mist);
  border-radius: var(--personal-radius);
  box-shadow: 0 8px 24px var(--personal-shadow-soft);
}
.lecture-panel {
  padding: 20px 24px;
}
.lecture-panel label {
  display: block;
  margin-bottom: 10px;
  font-size: 0.88rem;
  font-weight: 700;
}
.lecture-controls {
  display: flex;
  gap: 12px;
}
.lecture-controls > :first-child {
  min-width: 0;
  flex: 1;
}
.current-section,
.history-section {
  margin-top: 28px;
}
.section-title-row {
  display: flex;
  align-items: center;
  gap: 10px;
}
h2 {
  margin: 0 0 12px 8px;
  font-size: 1.18rem;
}
.section-title-row :deep(.status-badge) {
  margin-bottom: 12px;
}
.session-panel {
  display: grid;
  grid-template-columns: minmax(260px, 0.8fr) minmax(480px, 1.2fr);
  gap: 20px;
  padding: 18px;
}
.summary-card,
.qr-card {
  min-height: 230px;
  border: 1px solid var(--personal-color-border-mist);
  border-radius: var(--personal-radius);
}
.summary-card {
  padding: 28px;
}
.muted-label {
  margin: 0 0 12px;
  color: var(--personal-color-text-faint-fog);
  font-size: 0.8rem;
}
.count-label {
  margin-top: 28px;
}
.count {
  display: flex;
  align-items: baseline;
  gap: 8px;
}
.count strong {
  color: var(--personal-color-professor-primary-navy);
  font-size: 2.35rem;
  line-height: 1;
}
.count span,
.session-name {
  color: var(--personal-color-text-muted-slate);
}
.session-name {
  margin: 22px 0 0;
  font-size: 0.82rem;
}
.qr-card {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 22px;
  padding: 18px 20px;
}
.qr-preview {
  padding: 0;
  background: var(--personal-color-white);
  border: 1px solid var(--personal-color-border-mist);
  border-radius: var(--personal-radius);
  cursor: pointer;
}
.qr-preview canvas {
  display: block;
  width: 150px !important;
  height: 150px !important;
}
.qr-copy strong {
  font-size: 0.98rem;
}
.qr-copy p {
  margin: 12px 0 24px;
  color: var(--personal-color-text-faint-fog);
  font-size: 0.8rem;
  line-height: 1.5;
}
.qr-copy span {
  display: block;
  color: var(--personal-color-text-faint-fog);
  font-size: 0.75rem;
}
.qr-copy b {
  display: block;
  margin-top: 4px;
  color: var(--personal-color-professor-primary-navy);
  font-size: 1.5rem;
}
.qr-card > :last-child {
  align-self: end;
}
.end-row {
  display: flex;
  justify-content: flex-end;
  margin-top: 8px;
}
.empty-session {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 18px;
  min-height: 180px;
  color: var(--personal-color-text-muted-slate);
}
.empty-session strong {
  color: var(--personal-color-admin-primary-slate);
}
.empty-session p {
  margin: 6px 0 0;
  font-size: 0.88rem;
}
.empty-icon {
  display: grid;
  place-items: center;
  width: 54px;
  height: 54px;
  color: var(--personal-color-professor-primary-navy);
  background: var(--personal-color-indigo-soft-lavender);
  border-radius: var(--personal-radius);
  font-weight: 900;
}
.empty-inline {
  margin: 12px 0 0;
  color: var(--personal-color-text-muted-slate);
  font-size: 0.84rem;
}
.lecture-cell {
  white-space: nowrap;
}
:deep(.lecture-column) { width: 28%; }
:deep(.date-column) { width: 32%; }
:deep(.attendance-column) { width: 25%; }
:deep(.status-column) { width: 15%; }
.expanded-qr {
  padding: 0 12px 4px;
}
.expanded-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 0 0 18px;
}
.expanded-header h2 {
  margin: 0;
  font-size: 1.45rem;
}
.expanded-header p {
  margin: 6px 0 0;
  color: var(--personal-color-text-muted-slate);
  font-size: 0.82rem;
}
.modal-close {
  border: 1px solid var(--personal-color-border-mist);
  font-size: 1.25rem;
}
.expanded-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 15px 18px;
  border: 1px solid var(--personal-color-border-mist);
  border-radius: var(--personal-radius);
}
.expanded-summary > div {
  display: flex;
  align-items: baseline;
  gap: 22px;
}
.expanded-summary > div span {
  color: var(--personal-color-text-faint-fog);
  font-size: 0.78rem;
}
.expanded-summary > div b {
  color: var(--personal-color-professor-primary-navy);
  font-size: 1.1rem;
}
.expanded-code {
  display: grid;
  place-items: center;
  margin: 28px auto 18px;
}
.expanded-code canvas {
  display: block;
  width: min(48vw, 420px) !important;
  height: min(48vw, 420px) !important;
  padding: 10px;
  border: 1px solid var(--personal-color-border-mist);
  border-radius: var(--personal-radius);
}
.expanded-footer {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 54px;
}
.refresh-clock {
  display: flex;
  align-items: center;
  gap: 13px;
}
.refresh-clock .clock-icon {
  color: var(--personal-color-secondary-blue);
  font-size: 2rem;
  line-height: 1;
}
.refresh-clock > span:not(.clock-icon),
.refresh-clock small {
  color: var(--personal-color-text-faint-fog);
  font-size: 0.74rem;
}
.refresh-clock b {
  color: var(--personal-color-professor-primary-navy);
  font-size: 1.08rem;
}
.expanded-footer > :last-child {
  position: absolute;
  right: 0;
}
:deep(.modal-card) {
  max-height: calc(100vh - 36px);
  overflow-y: auto;
}
@media (max-width: 900px) {
  .session-panel {
    grid-template-columns: 1fr;
  }
  .qr-card {
    grid-template-columns: auto 1fr;
  }
  .qr-card > :last-child {
    grid-column: 1 / -1;
  }
}
@media (max-width: 620px) {
  .lecture-controls {
    flex-direction: column;
  }
  .lecture-controls > * {
    width: 100%;
  }
  .qr-card {
    grid-template-columns: 1fr;
    text-align: center;
  }
  .qr-preview {
    justify-self: center;
  }
  .expanded-summary {
    align-items: flex-start;
    gap: 14px;
  }
  .expanded-summary > div {
    flex-direction: column;
    gap: 3px;
    text-align: right;
  }
  .expanded-code canvas {
    width: min(76vw, 420px) !important;
    height: min(76vw, 420px) !important;
  }
  .expanded-footer {
    flex-direction: column;
    gap: 16px;
  }
  .refresh-clock {
    flex-wrap: wrap;
    justify-content: center;
  }
  .expanded-footer > :last-child {
    position: static;
    width: 100%;
  }
}
</style>
