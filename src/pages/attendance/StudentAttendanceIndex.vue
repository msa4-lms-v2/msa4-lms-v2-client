<script setup>
import { computed, onMounted, ref } from 'vue';
import { searchAttendanceRecords } from '../../api/attendanceApi';
import MyButton from '../../components/button/MyButton.vue';
import MyPageContainer from '../../components/layout/MyPageContainer.vue';
import MySearchFilter from '../../components/search/MySearchFilter.vue';
import MySelect from '../../components/input/MySelect.vue';
import MyTable from '../../components/table/MyTable.vue';
import { notify } from '../../composables/useDialog';
import { useSemesterStore } from '../../store/semester/useSemesterStore';
import { formatDate } from '../../util/format';

defineOptions({ name: 'StudentAttendanceIndex' });

const TERM_ORDER = { FIRST: 1, SECOND: 2 };
const TERM_LABELS = { FIRST: '1학기', SECOND: '2학기' };
const ATTENDED_STATUSES = new Set(['PRESENT', 'EXCUSED']);

const rateColumns = [
  { key: 'course', label: '과목' },
  { key: 'accepted', label: '인정 출석' },
  { key: 'total', label: '전체 수업' },
  { key: 'rate', label: '출석률' },
];

const attendanceColumns = [
  { key: 'course', label: '과목' },
  { key: 'lectureDate', label: '날짜' },
  { key: 'period', label: '교시' },
  { key: 'status', label: '상태' },
];

const statusLabels = { PRESENT: '출석', LATE: '지각', ABSENT: '결석', EXCUSED: '공결' };
const statusVariants = { PRESENT: 'success', LATE: 'warning', ABSENT: 'fail', EXCUSED: 'processing' };

const semesterStore = useSemesterStore();
const selectedAcademicYear = ref('');
const selectedTerm = ref('');
const selectedEnrollmentId = ref('');
const records = ref([]);
const isLoading = ref(false);

const academicYearOptions = computed(() => semesterStore.academicYears);
const availableTerms = computed(() => semesterStore.semesters
  .filter((semester) => String(semester.academicYear) === String(selectedAcademicYear.value))
  .sort((left, right) => TERM_ORDER[left.term] - TERM_ORDER[right.term]));
const selectedSemester = computed(() => semesterStore.semesters.find((semester) => (
  String(semester.academicYear) === String(selectedAcademicYear.value)
  && semester.term === selectedTerm.value
)));
const targetTermText = computed(() => (
  selectedAcademicYear.value && selectedTerm.value
    ? `${selectedAcademicYear.value}학년도 ${TERM_LABELS[selectedTerm.value] || selectedTerm.value}`
    : '-'
));

const attendanceRates = computed(() => {
  const summaryMap = new Map();

  records.value.forEach((record) => {
    const key = String(record.enrollmentId);
    if (!summaryMap.has(key)) {
      summaryMap.set(key, {
        enrollmentId: record.enrollmentId,
        courseName: record.courseName,
        courseCode: record.courseCode,
        sectionNo: record.sectionNo,
        attendedCount: 0,
        totalCount: 0,
      });
    }

    const summary = summaryMap.get(key);
    summary.totalCount += 1;
    if (ATTENDED_STATUSES.has(record.status)) summary.attendedCount += 1;
  });

  return [...summaryMap.values()]
    .map((summary) => ({
      ...summary,
      attendanceRate: summary.totalCount === 0
        ? 0
        : (summary.attendedCount / summary.totalCount) * 100,
    }))
    .sort((left, right) => (
      left.courseName.localeCompare(right.courseName, 'ko')
      || String(left.sectionNo).localeCompare(String(right.sectionNo), 'ko')
    ));
});

const selectedCourse = computed(() => attendanceRates.value.find(
  (summary) => String(summary.enrollmentId) === selectedEnrollmentId.value,
));
const selectedCourseRecords = computed(() => records.value
  .filter((record) => String(record.enrollmentId) === selectedEnrollmentId.value)
  .sort((left, right) => (
    String(right.lectureDate).localeCompare(String(left.lectureDate))
    || Number(right.period) - Number(left.period)
  )));

const formatRate = (rate) => `${Number(rate || 0).toFixed(1)}%`;

const selectCourse = (enrollmentId) => {
  selectedEnrollmentId.value = String(enrollmentId);
};

const clearSelectedCourse = () => {
  selectedEnrollmentId.value = '';
};

const changeAcademicYear = () => {
  if (!availableTerms.value.some((semester) => semester.term === selectedTerm.value)) {
    selectedTerm.value = availableTerms.value.at(-1)?.term || '';
  }
  clearSelectedCourse();
};

const applyDefaultSemester = () => {
  const current = semesterStore.semesters.find((semester) => semester.isCurrent ?? semester.current);
  const fallback = [...semesterStore.semesters].sort((left, right) => (
    right.academicYear - left.academicYear
    || TERM_ORDER[right.term] - TERM_ORDER[left.term]
  ))[0];
  const target = current || fallback;
  if (!target) return;

  selectedAcademicYear.value = target.academicYear;
  selectedTerm.value = target.term;
};

const load = async () => {
  if (!selectedSemester.value) {
    await notify('조회할 학년도와 학기를 선택해 주세요.');
    return;
  }

  isLoading.value = true;
  clearSelectedCourse();
  try {
    const items = [];
    let pageNumber = 1;
    let hasNext = false;

    do {
      const response = await searchAttendanceRecords({
        fromDate: selectedSemester.value.startDate,
        toDate: selectedSemester.value.endDate,
        page: pageNumber,
        size: 100,
      });
      const data = response.data.data;
      items.push(...(data.items || []));
      hasNext = Boolean(data.hasNext);
      pageNumber += 1;
    } while (hasNext);

    records.value = items.filter((record) => (
      String(record.academicYear) === String(selectedAcademicYear.value)
      && record.term === selectedTerm.value
    ));
  } catch (error) {
    records.value = [];
    await notify(error.response?.data?.message || '출결 기록을 불러오지 못했습니다.');
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
  if (selectedSemester.value) await load();
});
</script>

<template>
  <MyPageContainer title="출결 현황">
    <MySearchFilter submit-text="조회" submit-at-end @search="load">
      <div class="search-group compact">
        <label for="attendance-year">연도</label>
        <MySelect id="attendance-year" v-model="selectedAcademicYear" @change="changeAcademicYear">
          <option v-for="year in academicYearOptions" :key="year" :value="year">
            {{ year }}년
          </option>
        </MySelect>
      </div>
      <div class="search-group compact">
        <label for="attendance-term">학기</label>
        <MySelect id="attendance-term" v-model="selectedTerm" @change="clearSelectedCourse">
          <option v-for="semester in availableTerms" :key="semester.id" :value="semester.term">
            {{ TERM_LABELS[semester.term] || semester.term }}
          </option>
        </MySelect>
      </div>
      <div class="term-info">
        <span>대상 학기</span>
        <strong>{{ targetTermText }}</strong>
      </div>
    </MySearchFilter>

    <section v-if="!selectedEnrollmentId" class="panel">
      <div class="section-title-row">
        <h3>과목별 출석률</h3>
        <span>과목을 선택하면 상세 출결을 확인할 수 있습니다.</span>
      </div>
      <MyTable
        :columns="rateColumns"
        :loading="isLoading"
        :empty="!isLoading && attendanceRates.length === 0"
        empty-message="출석률 데이터가 없습니다."
      >
        <tr
          v-for="rate in attendanceRates"
          :key="rate.enrollmentId"
          class="clickable-row"
          tabindex="0"
          @click="selectCourse(rate.enrollmentId)"
          @keyup.enter="selectCourse(rate.enrollmentId)"
        >
          <td>
            <div class="course-name">{{ rate.courseName }}</div>
            <div class="course-code">{{ rate.courseCode }} · {{ rate.sectionNo }}분반</div>
          </td>
          <td>{{ rate.attendedCount }}</td>
          <td>{{ rate.totalCount }}</td>
          <td><span class="rate-text">{{ formatRate(rate.attendanceRate) }}</span></td>
        </tr>
      </MyTable>
    </section>

    <section v-else class="panel">
      <div class="section-title-row">
        <div>
          <h3>{{ selectedCourse?.courseName || '상세 출결' }}</h3>
          <span v-if="selectedCourse">
            {{ selectedCourse.courseCode }} · {{ selectedCourse.sectionNo }}분반
          </span>
        </div>
        <MyButton
          btn-type="button"
          color="deep-blue"
          size="small"
          content="뒤로가기"
          @click="clearSelectedCourse"
        />
      </div>
      <MyTable
        :columns="attendanceColumns"
        :loading="isLoading"
        :empty="!isLoading && selectedCourseRecords.length === 0"
        empty-message="등록된 출결 기록이 없습니다."
      >
        <tr v-for="record in selectedCourseRecords" :key="record.id">
          <td class="course-name">{{ record.courseName }}</td>
          <td>{{ formatDate(record.lectureDate) }}</td>
          <td>{{ record.period }}교시</td>
          <td>
            <span :class="`status-text--${statusVariants[record.status] || 'processing'}`">
              {{ statusLabels[record.status] || record.status }}
            </span>
          </td>
        </tr>
      </MyTable>
    </section>
  </MyPageContainer>
</template>

<style scoped>
.compact {
  flex: 0 0 120px;
}

.term-info {
  display: flex;
  min-width: 180px;
  flex-direction: column;
  gap: 6px;
}

.term-info span {
  color: var(--personal-color-text-secondary-steel);
  font-size: 0.85rem;
  font-weight: 600;
}

.term-info strong {
  color: var(--personal-color-primary-navy);
  font-size: 1rem;
  line-height: 38px;
  white-space: nowrap;
}

.panel {
  margin-bottom: 24px;
  overflow: hidden;
}

.section-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 12px;
}

.section-title-row h3 {
  margin: 0;
  color: var(--personal-color-primary-text-navy);
  font-size: 1rem;
}

.section-title-row span {
  color: var(--personal-color-text-muted-slate);
  font-size: 0.82rem;
}

.clickable-row {
  cursor: pointer;
}

.clickable-row:hover,
.clickable-row:focus-visible {
  background: var(--personal-color-bg-hover-frost);
  outline: none;
}

.course-name {
  font-weight: 600;
}

.course-code {
  margin-top: 2px;
  color: var(--personal-color-text-muted-slate);
  font-size: 0.78rem;
}

.rate-text {
  color: var(--personal-color-primary-navy);
}

.status-text--success {
  color: var(--personal-color-status-success-text-forest);
}

.status-text--processing {
  color: var(--personal-color-status-processing-text-navy);
}

.status-text--warning {
  color: var(--personal-color-status-warning-text-amber);
}

.status-text--fail {
  color: var(--personal-color-status-fail-text-maroon);
}

@media (max-width: 760px) {
  .compact,
  .term-info {
    width: 100%;
    flex-basis: auto;
  }

  .section-title-row {
    align-items: flex-start;
  }
}
</style>
