<script setup>
import { computed, onActivated, onMounted, ref } from "vue";
import MyPageContainer from "../../components/layout/MyPageContainer.vue";
import DashboardState from "../../components/dashboard/DashboardState.vue";
import { useAdminDashboardStore } from "../../store/dashboard/useAdminDashboardStore";
import { useDashboardStore } from "../../store/dashboard/useDashboardStore";
import {
  academicTypes,
  mergePendingTasks,
  pendingTaskRoute,
  tuitionSegments,
} from "../../util/adminDashboard";

const store = useAdminDashboardStore();
const common = useDashboardStore();
const taskPage = ref(1);
const pageSize = 6;
const cards = [
  { label: "강의 개설 검토", key: "lecturePending", service: "academic" },
  {
    label: "학적 변경 신청",
    key: "academicChangePending",
    service: "academic",
  },
  { label: "등록금 분할납부", key: "installmentPending", service: "payment" },
  { label: "증명서 발급", key: "certificatePending", service: "payment" },
];
const taskLabels = {
  LECTURE: "강의 개설 검토",
  LEAVE: "휴학 신청",
  RETURN: "복학 신청",
  WITHDRAWAL: "자퇴 신청",
  DISMISSAL: "퇴학 처리",
  TRANSFER: "전과 신청",
  DOUBLE_MAJOR: "복수전공 신청",
  INSTALLMENT: "등록금 분할납부",
  CERTIFICATE: "증명서 발급",
};
const tasks = computed(() =>
  mergePendingTasks(store.academic.data?.tasks, store.payment.data?.tasks)
);
const taskPages = computed(() =>
  Math.max(1, Math.ceil(tasks.value.length / pageSize))
);
const visibleTasks = computed(() =>
  tasks.value.slice((taskPage.value - 1) * pageSize, taskPage.value * pageSize)
);
const pendingTotal = computed(() => {
  if (store.academic.status !== "ready" || store.payment.status !== "ready")
    return null;
  return cards.reduce(
    (sum, card) => sum + store[card.service].data.summary[card.key],
    0
  );
});
const tuition = computed(() => store.payment.data?.tuitionStats);
const segments = computed(() => tuitionSegments(tuition.value));
const donutStyle = computed(() => ({
  background: segments.value.total
    ? `conic-gradient(#5c46e5 0% ${segments.value.paidEnd}%, #eead52 ${segments.value.paidEnd}% ${segments.value.progressEnd}%, #e2e7f0 ${segments.value.progressEnd}% 100%)`
    : "#e2e7f0",
}));
const tuitionLegend = [
  { key: "paid", label: "납부 완료", color: "#5c46e5" },
  { key: "inProgress", label: "납부 진행", color: "#eead52" },
  { key: "unpaid", label: "미납", color: "#e2e7f0" },
];
const academicStats = computed(() =>
  academicTypes.map((item) => ({
    ...item,
    ...store.academic.data?.academicStats?.find(
      (stat) => stat.type === item.type
    ),
  }))
);
const chartMax = computed(() =>
  Math.max(
    5,
    Math.ceil(
      Math.max(
        0,
        ...academicStats.value.flatMap((item) => [
          item.completed || 0,
          item.pending || 0,
        ])
      ) / 5
    ) * 5
  )
);
const hasAcademicData = computed(() =>
  academicStats.value.some((item) => item.completed || item.pending)
);
const formatCount = (value) =>
  value == null ? "—" : value.toLocaleString("ko-KR");
const formatDate = (value) =>
  value ? String(value).slice(0, 10).replaceAll("-", ".") : "—";
const semesterLabel = (state) =>
  state.data?.currentSemester
    ? `${state.data.currentSemester.year}학년도 ${state.data.currentSemester.label} 기준`
    : "현재 학기 기준";
const notices = computed(() =>
  [...common.notices]
    .filter((item) => item.isActive !== false)
    .sort((a, b) =>
      String(b.createdAt || "").localeCompare(String(a.createdAt || ""))
    )
    .slice(0, 4)
);
const schedules = computed(() => {
  const today = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Seoul",
  }).format(new Date());
  return [...common.schedules]
    .filter(
      (item) => String(item.endDate || item.startDate).slice(0, 10) >= today
    )
    .sort((a, b) => String(a.startDate).localeCompare(String(b.startDate)))
    .slice(0, 4);
});
const commonStatus = (loading, error) =>
  loading ? "loading" : error ? "error" : "ready";
const refreshing = computed(
  () =>
    store.academic.status === "loading" ||
    store.payment.status === "loading" ||
    common.isNoticesLoading ||
    common.isSchedulesLoading
);
const loadNotices = () =>
  common.loadNotices({ active: true, page: 1, size: 4 });
const loadSchedules = () =>
  common.loadSchedules({
    active: true,
    page: 1,
    size: 4,
    from: new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul" }).format(
      new Date()
    ),
  });
let lastRefresh = 0;
function refresh() {
  lastRefresh = Date.now();
  taskPage.value = 1;
  return Promise.allSettled([store.loadAll(), loadNotices(), loadSchedules()]);
}
onMounted(refresh);
onActivated(() => {
  if (Date.now() - lastRefresh > 1000) refresh();
});
</script>

<template>
  <MyPageContainer title="관리자 메인" class="admin-dashboard">
    <div class="toolbar">
      <button
        type="button"
        class="refresh"
        :disabled="refreshing"
        @click="refresh"
      >
        {{ refreshing ? "조회 중…" : "새로고침" }}
      </button>
    </div>

    <div class="overview-grid">
      <div class="work-column">
        <div class="summary-grid">
          <section
            v-for="card in cards"
            :key="card.key"
            class="panel summary-card"
            :aria-label="`${card.label} 처리 대기`"
          >
            <h3>{{ card.label }}</h3>
            <div class="summary-value">
              <strong
                >{{ formatCount(store[card.service].data?.summary[card.key])
                }}<small v-if="store[card.service].status === 'ready'"
                  >건</small
                ></strong
              >
              <span class="pending-label">처리 대기</span>
            </div>
            <span
              v-if="
                card.key === 'certificatePending' &&
                store.payment.status === 'ready'
              "
              class="card-status"
              >현재 즉시 발급 방식</span
            >
            <span
              v-if="store[card.service].status !== 'ready'"
              class="card-status"
            >
              {{
                ["idle", "loading"].includes(store[card.service].status)
                  ? "조회 중"
                  : store[card.service].status === "unavailable"
                  ? "집계 준비 중"
                  : "조회 실패"
              }}
            </span>
          </section>
        </div>

        <section class="panel work-panel">
          <div class="section-heading">
            <h3>
              처리 대기 업무
              <span v-if="pendingTotal !== null" class="count-badge"
                >{{ formatCount(pendingTotal) }}건</span
              >
            </h3>
            <span class="muted">누적 · 접수일순</span>
          </div>
          <template v-for="service in ['academic', 'payment']" :key="service">
            <div v-if="store[service].status !== 'ready'" class="service-state">
              <span>{{
                service === "academic" ? "학사 업무" : "등록금·증명서 업무"
              }}</span>
              <DashboardState
                :status="store[service].status"
                @retry="store.load(service)"
              />
            </div>
          </template>
          <div class="table-scroll">
            <table class="tasks-table">
              <caption class="sr-only">
                누적 처리 대기 업무 목록, 오래된 접수 순
              </caption>
              <thead>
                <tr>
                  <th scope="col">업무 유형</th>
                  <th scope="col">요청자</th>
                  <th scope="col">접수일</th>
                  <th scope="col">상태</th>
                  <th scope="col">바로가기</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="task in visibleTasks"
                  :key="`${task.service}-${task.type}-${task.id}`"
                >
                  <td>{{ taskLabels[task.type] || task.type }}</td>
                  <td>{{ task.requesterName }}</td>
                  <td>{{ formatDate(task.requestedAt) }}</td>
                  <td><span class="status-pill">처리 대기</span></td>
                  <td>
                    <RouterLink
                      v-if="pendingTaskRoute(task)"
                      :to="pendingTaskRoute(task)"
                      class="primary-link"
                    >
                      바로가기 </RouterLink
                    ><span v-else class="muted">화면 준비 중</span>
                  </td>
                </tr>
                <tr
                  v-if="
                    !tasks.length &&
                    store.academic.status === 'ready' &&
                    store.payment.status === 'ready'
                  "
                >
                  <td colspan="5" class="empty">처리 대기 업무가 없습니다.</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div v-if="tasks.length" class="table-footer">
            <span class="muted"
              >대기 업무 중 오래된 {{ formatCount(tasks.length) }}건</span
            >
            <div v-if="taskPages > 1" class="pagination">
              <button
                type="button"
                :disabled="taskPage === 1"
                aria-label="이전 업무 페이지"
                @click="taskPage--"
              >
                ‹
              </button>
              <span>{{ taskPage }} / {{ taskPages }}</span>
              <button
                type="button"
                :disabled="taskPage === taskPages"
                aria-label="다음 업무 페이지"
                @click="taskPage++"
              >
                ›
              </button>
            </div>
          </div>
        </section>
      </div>

      <aside class="news-column">
        <section class="panel notices-panel">
          <div class="section-heading">
            <h3>최근 공지사항</h3>
            <RouterLink to="/admin/notices" class="more-link">
              전체 보기 ›
            </RouterLink>
          </div>
          <DashboardState
            :status="
              commonStatus(common.isNoticesLoading, common.isNoticesError)
            "
            @retry="loadNotices"
          />
          <template v-if="!common.isNoticesLoading && !common.isNoticesError">
            <ul v-if="notices.length" class="news-list">
              <li v-for="notice in notices" :key="notice.id">
                <span class="notice-marker">공지</span
                ><span class="news-title">{{ notice.title }}</span
                ><time>{{ formatDate(notice.createdAt).slice(5) }}</time>
              </li>
            </ul>
            <p v-else class="empty">등록된 공지사항이 없습니다.</p>
          </template>
        </section>
        <section class="panel schedules-panel">
          <div class="section-heading">
            <h3>학사 일정</h3>
            <RouterLink to="/admin/academic-schedules" class="more-link">
              전체 보기 ›
            </RouterLink>
          </div>
          <DashboardState
            :status="
              commonStatus(common.isSchedulesLoading, common.isSchedulesError)
            "
            @retry="loadSchedules"
          />
          <template
            v-if="!common.isSchedulesLoading && !common.isSchedulesError"
          >
            <ul v-if="schedules.length" class="schedule-list">
              <li v-for="schedule in schedules" :key="schedule.id">
                <time>{{ formatDate(schedule.startDate) }}</time
                ><span>{{ schedule.title }}</span>
              </li>
            </ul>
            <p v-else class="empty">예정된 학사 일정이 없습니다.</p>
          </template>
        </section>
      </aside>
    </div>

    <div class="charts-grid">
      <section class="panel chart-panel">
        <div class="section-heading">
          <h3>등록금 납부 현황</h3>
          <span class="muted">{{ semesterLabel(store.payment) }}</span>
        </div>
        <DashboardState
          :status="store.payment.status"
          @retry="store.load('payment')"
        />
        <template v-if="store.payment.status === 'ready'">
          <p
            v-if="!store.payment.data.currentSemester"
            class="empty chart-empty"
          >
            현재 학기가 설정되지 않았습니다.
          </p>
          <template v-else>
            <div class="tuition-chart">
              <div
                class="donut"
                :style="donutStyle"
                role="img"
                :aria-label="
                  segments.total
                    ? `납부 완료율 ${segments.rate}%`
                    : '현재 학기 등록금 고지서 없음'
                "
              >
                <div class="donut-center">
                  <strong>{{
                    segments.total ? `${segments.rate}%` : "—"
                  }}</strong
                  ><span>납부 완료율</span>
                </div>
              </div>
              <ul class="tuition-legend">
                <li v-for="item in tuitionLegend" :key="item.key">
                  <span
                    class="legend-dot"
                    :style="{ background: item.color }"
                  /><span>{{ item.label }}</span
                  ><strong>{{ formatCount(tuition[item.key]) }}건</strong>
                </li>
              </ul>
            </div>
            <p class="chart-note">
              {{
                segments.total
                  ? "고지서 기준 · 납부 진행: 일부 납부 후 잔액이 있는 상태"
                  : "현재 학기에 집계할 등록금 고지서가 없습니다."
              }}
            </p>
          </template>
        </template>
      </section>
      <section class="panel chart-panel">
        <div class="section-heading">
          <h3>학적 처리 현황</h3>
          <span class="muted">{{ semesterLabel(store.academic) }}</span>
        </div>
        <DashboardState
          :status="store.academic.status"
          @retry="store.load('academic')"
        />
        <template v-if="store.academic.status === 'ready'">
          <p
            v-if="!store.academic.data.currentSemester"
            class="empty chart-empty"
          >
            현재 학기가 설정되지 않았습니다.
          </p>
          <template v-else>
            <div class="bar-legend">
              <span><i class="legend-dot completed" />처리 완료</span
              ><span><i class="legend-dot pending" />미처리</span>
            </div>
            <svg
              class="bar-chart"
              viewBox="0 0 660 250"
              role="img"
              aria-labelledby="academic-chart-title academic-chart-desc"
            >
              <title id="academic-chart-title">현재 학기 학적 처리 현황</title>
              <desc id="academic-chart-desc">
                {{
                  academicStats
                    .map(
                      (item) =>
                        `${item.label}: 처리 완료 ${item.completed}건, 미처리 ${item.pending}건`
                    )
                    .join(". ")
                }}
              </desc>
              <g v-for="tick in [0, 1, 2, 3, 4, 5]" :key="tick">
                <line
                  x1="34"
                  x2="652"
                  :y1="210 - tick * 36"
                  :y2="210 - tick * 36"
                  stroke="#e3e8f1"
                />
                <text
                  x="25"
                  :y="214 - tick * 36"
                  text-anchor="end"
                  class="axis-text"
                >
                  {{ (chartMax / 5) * tick }}
                </text>
              </g>
              <g
                v-for="(item, index) in academicStats"
                :key="item.type"
                :transform="`translate(${52 + index * 102}, 0)`"
              >
                <rect
                  x="0"
                  :y="210 - (item.completed / chartMax) * 180"
                  width="30"
                  :height="(item.completed / chartMax) * 180"
                  rx="5"
                  fill="#5c46e5"
                />
                <rect
                  x="36"
                  :y="210 - (item.pending / chartMax) * 180"
                  width="22"
                  :height="(item.pending / chartMax) * 180"
                  rx="5"
                  fill="#dce3ef"
                />
                <text
                  x="15"
                  :y="203 - (item.completed / chartMax) * 180"
                  text-anchor="middle"
                  class="value-text"
                >
                  {{ item.completed }}
                </text>
                <text
                  x="47"
                  :y="203 - (item.pending / chartMax) * 180"
                  text-anchor="middle"
                  class="value-text"
                >
                  {{ item.pending }}
                </text>
                <text x="29" y="238" text-anchor="middle" class="axis-text">
                  {{ item.label }}
                </text>
              </g>
            </svg>
            <p class="chart-note">
              {{
                hasAcademicData
                  ? "승인·반려는 처리 완료에 포함"
                  : "현재 학기에 집계할 학적 처리 내역이 없습니다."
              }}
              <br />
              자퇴·퇴학은 효력·처리일 기준이며, 없으면 신청·등록일을 사용합니다.
            </p>
          </template>
        </template>
      </section>
    </div>
  </MyPageContainer>
</template>

<style scoped>
.admin-dashboard {
  --accent: #5c46e5;
  color: #202338;
}
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin: 0 0 24px;
}
.toolbar p {
  margin: 0;
  color: #77839b;
  font-size: 13px;
}
.refresh,
.pagination button {
  background: white;
  border: 1px solid #dce3ef;
  border-radius: 7px;
  padding: 8px 12px;
  font: inherit;
  font-size: 12px;
  color: #59647d;
  cursor: pointer;
}
button:disabled {
  opacity: 0.5;
  cursor: default;
}
a:focus-visible,
button:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 4px;
}
.overview-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.76fr) minmax(280px, 1fr);
  gap: 24px;
}
.work-column,
.news-column {
  display: flex;
  flex-direction: column;
  gap: 20px;
  min-width: 0;
}
.panel {
  background: #fff;
  border: 1px solid #dce3ef;
  border-radius: 12px;
  padding: 22px;
  min-width: 0;
}
.summary-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}
.summary-card {
  padding: 20px 16px;
  min-height: 112px;
  box-sizing: border-box;
}
h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 750;
}
.summary-card h3 {
  font-size: 12px;
  color: #74809a;
  line-height: 1.6;
}
.summary-value {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 4px;
  margin-top: 14px;
}
.summary-value strong {
  font-size: 28px;
  line-height: 1.2;
}
.summary-value small {
  font-size: 21px;
  margin-left: 2px;
}
.pending-label,
.card-status {
  font-size: 10px;
  color: #8490a5;
}
.card-status {
  display: block;
  margin-top: 6px;
}
.section-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 18px;
}
.muted,
.more-link {
  color: #78849c;
  font-size: 11px;
}
.more-link {
  text-decoration: none;
  white-space: nowrap;
}
.more-link:hover {
  color: var(--accent);
}
.count-badge {
  display: inline-block;
  margin-left: 6px;
  padding: 3px 7px;
  color: var(--accent);
  background: #f0edff;
  border-radius: 5px;
  font-size: 11px;
  vertical-align: middle;
}
.work-panel {
  flex: 1;
  min-height: 260px;
}
.service-state {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  border: 1px dashed #e1e6f0;
  border-radius: 7px;
  padding: 0 10px;
  margin-bottom: 10px;
  color: #77839b;
  font-size: 12px;
}
.service-state :deep(.dashboard-state) {
  padding: 10px 0;
  font-size: 12px;
}
.table-scroll {
  overflow-x: auto;
}
.tasks-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
  text-align: left;
  white-space: nowrap;
}
th {
  padding: 14px 10px;
  background: #f7f8fa;
  color: #74809a;
  font-size: 11px;
  font-weight: 600;
}
th:first-child {
  border-radius: 6px 0 0 6px;
}
th:last-child {
  border-radius: 0 6px 6px 0;
}
td {
  padding: 17px 10px;
  border-bottom: 1px solid #edf0f6;
}
.primary-link {
  display: inline-block;
  padding: 9px 12px;
  background: var(--accent);
  color: white;
  border-radius: 7px;
  font-size: 11px;
  font-weight: 600;
  text-decoration: none;
}
.status-pill {
  color: #71618d;
  font-size: 11px;
}
.table-footer,
.pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 12px;
  font-size: 12px;
}
.pagination {
  margin-top: 0;
}
.news-column section {
  flex: 1;
}
.news-list,
.schedule-list,
.tuition-legend {
  list-style: none;
  padding: 0;
  margin: 0;
}
.news-list li {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 14px;
  align-items: center;
  padding: 16px 0;
  font-size: 12px;
}
.notice-marker {
  color: #7c879d;
  font-size: 11px;
  font-weight: 600;
}
.news-title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
time {
  color: #7c879d;
  font-size: 11px;
}
.schedule-list li {
  display: grid;
  grid-template-columns: 82px minmax(0, 1fr);
  gap: 12px;
  padding: 7px 0;
  font-size: 12px;
}
.charts-grid {
  display: grid;
  grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr);
  gap: 24px;
  margin-top: 24px;
}
.chart-panel {
  min-height: 335px;
  display: flex;
  flex-direction: column;
}
.chart-panel > :deep(.dashboard-state) {
  flex: 1;
}
.tuition-chart {
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: space-around;
  gap: 24px;
  padding: 16px 0;
}
.donut {
  width: clamp(150px, 17vw, 220px);
  aspect-ratio: 1;
  border-radius: 50%;
  display: grid;
  place-items: center;
  flex-shrink: 0;
}
.donut-center {
  width: 64%;
  height: 64%;
  border-radius: 50%;
  background: white;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 7px;
}
.donut-center strong {
  font-size: 34px;
}
.donut-center span {
  color: #8690a3;
  font-size: 11px;
}
.tuition-legend {
  flex: 1;
  max-width: 230px;
}
.tuition-legend li {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 28px 0;
  font-size: 12px;
}
.tuition-legend strong {
  margin-left: auto;
  font-size: 14px;
}
.legend-dot {
  display: inline-block;
  width: 11px;
  height: 11px;
  border-radius: 50%;
  flex-shrink: 0;
}
.completed {
  background: #5c46e5;
}
.pending {
  background: #dce3ef;
}
.bar-legend {
  display: flex;
  gap: 22px;
  justify-content: flex-end;
  color: #78849c;
  font-size: 11px;
}
.bar-legend span {
  display: flex;
  align-items: center;
  gap: 7px;
}
.bar-chart {
  width: 100%;
  height: auto;
  margin-top: 8px;
  overflow: visible;
}
.axis-text {
  fill: #74809a;
  font-size: 11px;
}
.value-text {
  fill: #282c42;
  font-size: 11px;
  font-weight: 600;
}
.chart-note {
  color: #8590a3;
  font-size: 11px;
  margin: auto 0 0;
  padding-top: 12px;
}
.empty {
  text-align: center;
  color: #8590a3;
  font-size: 13px;
  padding: 30px 10px;
}
.chart-empty {
  margin: auto;
}
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
@media (max-width: 1250px) {
  .overview-grid {
    grid-template-columns: 1fr;
  }
  .news-column {
    display: grid;
    grid-template-columns: 1fr 1fr;
  }
  .charts-grid {
    grid-template-columns: 1fr;
  }
  .donut {
    width: 210px;
  }
}
@media (max-width: 640px) {
  .admin-dashboard {
    padding: 8px;
  }
  .summary-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .news-column {
    grid-template-columns: 1fr;
  }
  .panel {
    padding: 16px;
  }
  .toolbar {
    align-items: flex-start;
  }
  .toolbar p {
    max-width: 210px;
  }
  .tuition-chart {
    flex-direction: column;
    gap: 8px;
  }
  .tuition-legend {
    width: 100%;
    max-width: none;
  }
  .tuition-legend li {
    margin: 16px 0;
  }
  .bar-chart {
    min-width: 0;
  }
  .section-heading {
    align-items: flex-start;
  }
  .chart-panel {
    min-height: 280px;
  }
}
</style>
