<script setup>
import { computed, onMounted, ref } from 'vue';
import { getMyTimetable } from '../../api/enrollmentApi';
import MySelect from '../../components/input/MySelect.vue';
import MyPageContainer from '../../components/layout/MyPageContainer.vue';
import MySearchFilter from '../../components/search/MySearchFilter.vue';
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
const TIME_SLOTS = {
  1: '09:00~09:50',
  2: '10:00~10:50',
  3: '11:00~11:50',
  4: '12:00~12:50',
  5: '13:00~13:50',
  6: '14:00~14:50',
  7: '15:00~15:50',
  8: '16:00~16:50',
  9: '17:00~17:50',
};

const columns = [
  { key: 'courseCode', label: '과목코드' },
  { key: 'courseName', label: '과목명' },
  { key: 'professor', label: '교수명' },
  { key: 'classroom', label: '강의실' },
  { key: 'schedule', label: '수강시간' },
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
  <MyPageContainer title="내 수강 내역 및 시간표">
    <MySearchFilter submit-text="조회" @search="loadTimetable">
      <div class="search-group compact">
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
      <div class="search-group compact">
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
    </MySearchFilter>

    <p
      v-if="loadError"
      class="error-text"
      role="alert"
    >
      {{ loadError }}
    </p>

    <div class="summary-card">
      <p>신청 과목 합계 학점: <strong>{{ totalCredits }}</strong> 학점</p>
    </div>

    <section
      class="timetable-section"
      aria-label="주간 시간표"
    >
      <div class="common-section-header">
        <h3>주간 시간표</h3>
      </div>
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
            시간
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
              <strong>{{ period }}교시</strong>
              <span>{{ TIME_SLOTS[period] || '' }}</span>
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
      <div class="common-section-header">
        <h3>수강 신청 목록</h3>
      </div>
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
          <td>{{ item.courseCode }}</td>
          <td class="course-name">{{ item.courseName }}</td>
          <td>{{ item.professorName || '-' }}</td>
          <td>{{ item.classroom || '-' }}</td>
          <td>{{ formatSchedule(item.schedules) }}</td>
          <td>{{ item.credits }}학점</td>
        </tr>
      </MyTable>
    </section>
  </MyPageContainer>
</template>

<style scoped>
.compact {
  flex: 0 0 160px;
}

.error-text {
  margin: 0 0 12px;
  color: var(--personal-color-red);
  font-size: 0.85rem;
}

h3 {
  margin: 0 0 10px;
  color: var(--personal-color-primary-text-navy);
  font-size: 1rem;
  font-weight: 700;
}

.summary-card {
  padding: 14px 18px;
  margin-bottom: 20px;
  border: 1px solid var(--personal-color-border-mist);
  background: var(--personal-color-white);
}

.summary-card p {
  margin: 0;
}

.summary-card strong {
  color: var(--personal-color-student-primary-cyan);
  font-size: 1rem;
}

.timetable-section {
  min-height: 220px;
  margin-bottom: 40px;
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
  grid-template-columns: 100px repeat(5, minmax(128px, 1fr));
  grid-template-rows: 45px repeat(var(--period-count), 70px);
  min-width: 760px;
  border-top: 1px solid var(--personal-color-table-border-frost);
  border-left: 1px solid var(--personal-color-table-border-frost);
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
  background: var(--personal-color-text-muted-slate);
  font-size: 0.85rem;
  font-weight: 700;
}

.time-header {
  grid-column: 1;
  grid-row: 1;
}

.period-label {
  flex-direction: column;
  color: var(--personal-color-text-secondary-steel);
  background: var(--personal-color-bg-subtle-snow);
  font-size: 0.75rem;
}

.period-label strong {
  color: var(--personal-color-primary-text-navy);
  font-size: 0.85rem;
}

.period-label span {
  margin-top: 2px;
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

@media (max-width: 640px) {
  .compact {
    width: 100%;
    flex-basis: auto;
  }
}
</style>
