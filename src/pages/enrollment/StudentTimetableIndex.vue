<script setup>
import { computed, onMounted, ref } from 'vue';
import { getMyTimetable } from '../../api/enrollmentApi';
import MyButton from '../../components/button/MyButton.vue';
import MySelect from '../../components/input/MySelect.vue';
import MyPageContainer from '../../components/layout/MyPageContainer.vue';
import MyTable from '../../components/table/MyTable.vue';
import { notify } from '../../composables/useDialog';
import { useSemesterStore } from '../../store/semester/useSemesterStore';

defineOptions({ name: 'StudentTimetableIndex' });

const DAYS = [
  { value: 'MON', label: '월', column: 2 },
  { value: 'TUE', label: '화', column: 3 },
  { value: 'WED', label: '수', column: 4 },
  { value: 'THU', label: '목', column: 5 },
  { value: 'FRI', label: '금', column: 6 },
];
const DAY_LABELS = Object.fromEntries(DAYS.map((day) => [day.value, day.label]));
const TIMETABLE_COLORS = [
  'var(--personal-color-timetable-lilac)',
  'var(--personal-color-timetable-blush)',
  'var(--personal-color-timetable-sage)',
  'var(--personal-color-timetable-sky)',
  'var(--personal-color-timetable-sand)',
  'var(--personal-color-timetable-apricot)',
  'var(--personal-color-timetable-lime)',
  'var(--personal-color-timetable-aqua)',
  'var(--personal-color-timetable-pink)',
  'var(--personal-color-timetable-periwinkle)',
];

const columns = [
  { key: 'course', label: '교과목' },
  { key: 'schedule', label: '요일·교시' },
  { key: 'classroom', label: '강의실' },
  { key: 'professor', label: '담당교수' },
  { key: 'credits', label: '학점' },
];

const semesterStore = useSemesterStore();
const selectedAcademicYear = ref('');
const selectedTerm = ref('');
const items = ref([]);
const totalCredits = ref(0);
const isLoading = ref(false);
const loadError = ref('');

const academicYearOptions = computed(() => semesterStore.academicYears);
const maxPeriod = computed(() => Math.max(
  9,
  ...items.value.flatMap((item) => (item.schedules || []).map((schedule) => Number(schedule.endPeriod) || 0)),
));
const periods = computed(() => Array.from({ length: maxPeriod.value }, (_, index) => index + 1));
const timetableStyle = computed(() => ({ '--period-count': maxPeriod.value }));
const timetableBlocks = computed(() => items.value.flatMap((item, itemIndex) => (
  (item.schedules || []).flatMap((schedule, scheduleIndex) => {
    const day = DAYS.find((candidate) => candidate.value === schedule.dayOfWeek);
    const startPeriod = Number(schedule.startPeriod);
    const endPeriod = Number(schedule.endPeriod);
    if (!day || startPeriod < 1 || endPeriod < startPeriod) return [];
    return [{
      key: `${item.enrollmentId}-${schedule.dayOfWeek}-${startPeriod}-${scheduleIndex}`,
      item,
      style: {
        gridColumn: day.column,
        gridRow: `${startPeriod + 1} / span ${endPeriod - startPeriod + 1}`,
        backgroundColor: TIMETABLE_COLORS[itemIndex % TIMETABLE_COLORS.length],
      },
    }];
  })
)));

const formatSchedule = (schedules = []) => schedules
  .map((schedule) => `${DAY_LABELS[schedule.dayOfWeek] || schedule.dayOfWeek} ${schedule.startPeriod}~${schedule.endPeriod}교시`)
  .join(', ') || '-';

const applyDefaultSemester = () => {
  if (selectedAcademicYear.value && selectedTerm.value) return;
  const current = semesterStore.semesters.find((semester) => semester.isCurrent ?? semester.current);
  const fallback = [...semesterStore.semesters].sort((left, right) => (
    right.academicYear - left.academicYear
    || (right.term === 'SECOND' ? 1 : 0) - (left.term === 'SECOND' ? 1 : 0)
  ))[0];
  const target = current || fallback;
  if (target) {
    selectedAcademicYear.value = target.academicYear;
    selectedTerm.value = target.term;
  }
};

const loadTimetable = async () => {
  if (!selectedAcademicYear.value || !selectedTerm.value) {
    loadError.value = '조회할 학년도와 학기를 선택해 주세요.';
    return;
  }
  isLoading.value = true;
  loadError.value = '';
  try {
    const response = await getMyTimetable(Number(selectedAcademicYear.value), selectedTerm.value);
    items.value = response.data.data?.items || [];
    totalCredits.value = response.data.data?.totalCredits || 0;
  } catch (error) {
    items.value = [];
    totalCredits.value = 0;
    loadError.value = error.response?.data?.message || '시간표를 불러오지 못했습니다.';
    await notify(loadError.value);
  } finally {
    isLoading.value = false;
  }
};

onMounted(async () => {
  try {
    await semesterStore.fetchSemesters();
  } catch (error) {
    await notify(error.response?.data?.message || '학기 목록을 불러오지 못했습니다.');
  }
  applyDefaultSemester();
  await loadTimetable();
});
</script>

<template>
  <MyPageContainer
    title="시간표 조회"
    subtitle="학년도·학기별 수강 과목을 주간 시간표로 확인합니다."
  >
    <div class="filter-row">
      <div class="filter-field">
        <label for="timetable-year">학년도</label>
        <MySelect
          id="timetable-year"
          v-model="selectedAcademicYear"
        >
          <option
            v-for="year in academicYearOptions"
            :key="year"
            :value="year"
          >
            {{ year }}학년도
          </option>
        </MySelect>
      </div>
      <div class="filter-field">
        <label for="timetable-term">학기</label>
        <MySelect
          id="timetable-term"
          v-model="selectedTerm"
        >
          <option value="FIRST">
            1학기
          </option>
          <option value="SECOND">
            2학기
          </option>
        </MySelect>
      </div>
      <MyButton
        btn-type="button"
        color="deep-blue"
        size="middle"
        :content="isLoading ? '조회 중' : '조회'"
        :disabled="isLoading"
        @click="loadTimetable"
      />
    </div>

    <p
      v-if="loadError"
      class="error-text"
      role="alert"
    >
      {{ loadError }}
    </p>

    <div class="section-title-row">
      <h3>주간 시간표</h3>
      <span class="summary-text">총 신청학점 <strong>{{ totalCredits }}</strong>학점</span>
    </div>

    <section
      class="timetable-section"
      aria-label="주간 시간표"
    >
      <p
        v-if="isLoading"
        class="timetable-message"
      >
        시간표를 불러오는 중입니다...
      </p>
      <p
        v-else-if="items.length === 0"
        class="timetable-message"
      >
        선택한 학기의 시간표가 없습니다.
      </p>
      <p
        v-else-if="timetableBlocks.length === 0"
        class="timetable-message"
      >
        수강 과목의 강의 시간이 등록되지 않아 주간 시간표에 표시할 수 없습니다.
      </p>
      <div
        v-else
        class="timetable-scroll"
      >
        <div
          class="timetable-grid"
          :style="timetableStyle"
        >
          <div class="grid-cell grid-header time-header">
            교시
          </div>
          <div
            v-for="day in DAYS"
            :key="day.value"
            class="grid-cell grid-header"
            :style="{ gridColumn: day.column, gridRow: 1 }"
          >
            {{ day.label }}요일
          </div>

          <template
            v-for="period in periods"
            :key="period"
          >
            <div
              class="grid-cell period-label"
              :style="{ gridColumn: 1, gridRow: period + 1 }"
            >
              {{ period }}교시
            </div>
            <div
              v-for="day in DAYS"
              :key="`${day.value}-${period}`"
              class="grid-cell empty-cell"
              :style="{ gridColumn: day.column, gridRow: period + 1 }"
            />
          </template>

          <div
            v-for="block in timetableBlocks"
            :key="block.key"
            class="schedule-block"
            :style="block.style"
            :title="`${block.item.courseName} / ${block.item.classroom || '강의실 미정'}`"
          >
            <strong>{{ block.item.courseName }}</strong>
            <span>{{ block.item.courseCode }} · {{ block.item.sectionNo }}분반</span>
            <span>{{ block.item.classroom || '강의실 미정' }}</span>
          </div>
        </div>
      </div>
    </section>

    <section class="list-section">
      <h3>수강 과목 목록</h3>
      <MyTable
        :columns="columns"
        :loading="isLoading"
        :empty="!isLoading && items.length === 0"
        empty-message="선택한 학기의 수강 과목이 없습니다."
      >
        <tr
          v-for="item in items"
          :key="item.enrollmentId"
        >
          <td>
            <div class="course-name">
              {{ item.courseName }}
            </div>
            <div class="course-code">
              {{ item.courseCode }} · {{ item.sectionNo }}분반
            </div>
          </td>
          <td>{{ formatSchedule(item.schedules) }}</td>
          <td>{{ item.classroom || '-' }}</td>
          <td>{{ item.professorName || '-' }}</td>
          <td>{{ item.credits }}</td>
        </tr>
      </MyTable>
    </section>
  </MyPageContainer>
</template>

<style scoped>
.filter-row {
  display: flex;
  align-items: flex-end;
  gap: 16px;
  padding: 18px 20px;
  margin-bottom: 24px;
  border: 1px solid var(--personal-color-border-mist);
  border-radius: 8px;
  background: var(--personal-color-white);
}

.filter-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 160px;
}

.filter-field label {
  color: var(--personal-color-text-secondary-steel);
  font-size: 0.85rem;
  font-weight: 600;
}

.error-text {
  margin: 0 0 12px;
  color: var(--personal-color-red);
  font-size: 0.85rem;
}

.section-title-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 10px;
}

h3 {
  margin: 0 0 10px;
  color: var(--personal-color-primary-text-navy);
  font-size: 1rem;
  font-weight: 700;
}

.summary-text {
  color: var(--personal-color-text-muted-slate);
  font-size: 0.85rem;
}

.summary-text strong {
  color: var(--personal-color-student-primary-cyan);
  font-size: 1rem;
}

.timetable-section {
  min-height: 220px;
  margin-bottom: 32px;
  border: 1px solid var(--personal-color-border-mist);
  border-radius: 8px;
  overflow: hidden;
  background: var(--personal-color-white);
}

.timetable-message {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 220px;
  margin: 0;
  color: var(--personal-color-text-tertiary-slate);
}

.timetable-scroll {
  overflow-x: auto;
}

.timetable-grid {
  display: grid;
  grid-template-columns: 82px repeat(5, minmax(128px, 1fr));
  grid-template-rows: 44px repeat(var(--period-count), 58px);
  min-width: 760px;
}

.grid-cell {
  display: flex;
  align-items: center;
  justify-content: center;
  border-right: 1px solid var(--personal-color-table-border-frost);
  border-bottom: 1px solid var(--personal-color-table-border-frost);
}

.grid-header {
  color: var(--personal-color-white);
  background: var(--personal-color-student-primary-cyan);
  font-size: 0.85rem;
  font-weight: 700;
}

.time-header {
  grid-column: 1;
  grid-row: 1;
}

.period-label {
  color: var(--personal-color-text-secondary-steel);
  background: var(--personal-color-bg-subtle-snow);
  font-size: 0.78rem;
  font-weight: 600;
}

.empty-cell {
  background: var(--personal-color-white);
}

.schedule-block {
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  padding: 6px;
  margin: 2px;
  border: 1px solid rgb(15 23 42 / 10%);
  border-radius: 5px;
  color: var(--personal-color-primary-text-navy);
  text-align: center;
  overflow: hidden;
}

.schedule-block strong {
  max-width: 100%;
  font-size: 0.82rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.schedule-block span {
  max-width: 100%;
  color: var(--personal-color-text-secondary-steel);
  font-size: 0.7rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.list-section {
  margin-bottom: 28px;
}

.course-name {
  font-weight: 600;
}

.course-code {
  margin-top: 2px;
  color: var(--personal-color-text-muted-slate);
  font-size: 0.78rem;
}

@media (max-width: 640px) {
  .filter-row {
    align-items: stretch;
    flex-direction: column;
  }

  .filter-field {
    width: 100%;
  }
}
</style>
