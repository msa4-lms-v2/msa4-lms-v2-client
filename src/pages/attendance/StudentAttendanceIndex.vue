<script setup>
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { searchAttendanceRecords } from '../../api/attendanceApi';
import MyButton from '../../components/button/MyButton.vue';
import NumberedPagination from '../../components/pagination/NumberedPagination.vue';
import MyPageContainer from '../../components/layout/MyPageContainer.vue';
import MySearchFilter from '../../components/search/MySearchFilter.vue';
import MySelect from '../../components/input/MySelect.vue';
import MyTable from '../../components/table/MyTable.vue';
import { notify } from '../../composables/useDialog';
import { useSemesterStore } from '../../store/semester/useSemesterStore';

defineOptions({ name: 'StudentAttendanceIndex' });

const TERM_ORDER = { FIRST: 1, SECOND: 2 };
const TERM_LABELS = { FIRST: '1학기', SECOND: '2학기' };
const ATTENDED_STATUSES = new Set(['PRESENT', 'EXCUSED']);

const rateColumns = [
  { key: 'course', label: '과목' },
  { key: 'accepted', label: '인정 출석' },
  { key: 'total', label: '전체 수업' },
  { key: 'rate', label: '출석률' },
  { key: 'action', label: '상세' },
];

const semesterStore = useSemesterStore();
const route = useRoute();
const router = useRouter();
const selectedAcademicYear = ref('');
const selectedTerm = ref('');
const records = ref([]);
const ratePage = ref(1);
const RATE_PAGE_SIZE = 10;
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

const pagedAttendanceRates = computed(() => attendanceRates.value.slice((ratePage.value - 1) * RATE_PAGE_SIZE, ratePage.value * RATE_PAGE_SIZE));

const formatRate = (rate) => `${Number(rate || 0).toFixed(1)}%`;

const openAttendanceStatus = (course) => {
  router.push({
    name: 'StudentAttendanceStatus',
    params: { enrollmentId: course.enrollmentId },
    query: {
      academicYear: selectedAcademicYear.value,
      term: selectedTerm.value,
      courseName: course.courseName,
      courseCode: course.courseCode,
      sectionNo: course.sectionNo,
    },
  });
};

const changeAcademicYear = () => {
  if (!availableTerms.value.some((semester) => semester.term === selectedTerm.value)) {
    selectedTerm.value = availableTerms.value.at(-1)?.term || '';
  }
};

const applyDefaultSemester = () => {
  const requested = semesterStore.semesters.find((semester) => (
    String(semester.academicYear) === String(route.query.academicYear || '')
    && semester.term === route.query.term
  ));
  const current = semesterStore.semesters.find((semester) => semester.isCurrent ?? semester.current);
  const fallback = [...semesterStore.semesters].sort((left, right) => (
    right.academicYear - left.academicYear
    || TERM_ORDER[right.term] - TERM_ORDER[left.term]
  ))[0];
  const target = requested || current || fallback;
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
    ratePage.value = 1;
  } catch (error) {
    records.value = [];
    await notify(error.response?.data?.message || '출결 기록을 불러오지 못했습니다.');
  } finally {
    isLoading.value = false;
  }
};

onMounted(async () => {
  await semesterStore.fetchSemesters();
  applyDefaultSemester();
  if (selectedSemester.value) await load();
});
</script>

<template>
  <MyPageContainer title="출결 조회">
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
        <MySelect id="attendance-term" v-model="selectedTerm">
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

    <section class="panel">
      <div class="section-title-row">
        <h3>과목별 출석률</h3>
      </div>
      <MyTable
        :columns="rateColumns"
        :loading="isLoading"
        :empty="!isLoading && attendanceRates.length === 0"
        empty-message="출석률 데이터가 없습니다."
      >
        <tr v-for="rate in pagedAttendanceRates" :key="rate.enrollmentId">
          <td>
            <div class="course-name">{{ rate.courseName }}</div>
            <div class="course-code">{{ rate.courseCode }} · {{ rate.sectionNo }}분반</div>
          </td>
          <td>{{ rate.attendedCount }}</td>
          <td>{{ rate.totalCount }}</td>
          <td><span class="rate-text">{{ formatRate(rate.attendanceRate) }}</span></td>
          <td>
            <MyButton
              btn-type="button"
              color="deep-blue"
              size="small"
              content="상세"
              @click="openAttendanceStatus(rate)"
            />
          </td>
        </tr>
      </MyTable>
      <NumberedPagination
        v-if="attendanceRates.length > RATE_PAGE_SIZE"
        :page="ratePage"
        :total-count="attendanceRates.length"
        :size="RATE_PAGE_SIZE"
        color="student-cyan"
        @page-change="ratePage = $event"
      />
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
  margin-bottom: 12px;
}

.section-title-row h3 {
  margin: 0;
  color: var(--personal-color-primary-text-navy);
  font-size: 1rem;
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

@media (max-width: 760px) {
  .compact,
  .term-info {
    width: 100%;
    flex-basis: auto;
  }
}
</style>
