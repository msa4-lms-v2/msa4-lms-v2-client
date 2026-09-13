<script setup>
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { searchAttendanceRecords } from '../../api/attendanceApi';
import MyButton from '../../components/button/MyButton.vue';
import SummaryStatCard from '../../components/payment/SummaryStatCard.vue';
import MyPageContainer from '../../components/layout/MyPageContainer.vue';
import MyTable from '../../components/table/MyTable.vue';
import { notify } from '../../composables/useDialog';
import { useSemesterStore } from '../../store/semester/useSemesterStore';
import { formatDate } from '../../util/format';

defineOptions({ name: 'StudentAttendanceStatus' });

const TERM_ORDER = { FIRST: 1, SECOND: 2 };
const TERM_LABELS = { FIRST: '1학기', SECOND: '2학기' };
const ATTENDED_STATUSES = new Set(['PRESENT', 'EXCUSED']);
const STATUS_LABELS = { PRESENT: '출석', LATE: '지각', ABSENT: '결석', EXCUSED: '공결' };

const attendanceColumns = [
  { key: 'lectureDate', label: '수업일' },
  { key: 'period', label: '교시' },
  { key: 'status', label: '출결 상태' },
  { key: 'checkInTime', label: '출석 시각' },
  { key: 'remarks', label: '비고' },
];

const route = useRoute();
const router = useRouter();
const semesterStore = useSemesterStore();
const selectedSemester = ref(null);
const records = ref([]);
const isLoading = ref(false);

const enrollmentId = computed(() => Number(route.params.enrollmentId));
const course = computed(() => records.value[0] || null);
const courseTitle = computed(() => course.value?.courseName || route.query.courseName || '출결 현황');
const courseDescription = computed(() => {
  if (!course.value) {
    const courseCode = route.query.courseCode;
    const sectionNo = route.query.sectionNo;
    return courseCode && sectionNo ? `${courseCode} · ${sectionNo}분반 · ${semesterLabel.value}` : semesterLabel.value;
  }
  return `${course.value.courseCode} · ${course.value.sectionNo}분반 · ${semesterLabel.value}`;
});
const semesterLabel = computed(() => (
  selectedSemester.value
    ? `${selectedSemester.value.academicYear}학년도 ${TERM_LABELS[selectedSemester.value.term] || selectedSemester.value.term}`
    : '-'
));

const summary = computed(() => {
  const count = (status) => records.value.filter((record) => record.status === status).length;
  const totalCount = records.value.length;
  const attendedCount = records.value.filter((record) => ATTENDED_STATUSES.has(record.status)).length;

  return {
    totalCount,
    presentCount: count('PRESENT'),
    lateCount: count('LATE'),
    absentCount: count('ABSENT'),
    excusedCount: count('EXCUSED'),
    attendanceRate: totalCount === 0 ? 0 : (attendedCount / totalCount) * 100,
  };
});

const orderedRecords = computed(() => [...records.value].sort((left, right) => (
  String(right.lectureDate).localeCompare(String(left.lectureDate))
  || Number(right.period) - Number(left.period)
)));

const statusClass = (status) => `status-text--${status || 'UNKNOWN'}`;
const formatRate = (rate) => `${Number(rate || 0).toFixed(1)}%`;

const resolveSemester = () => {
  const requested = semesterStore.semesters.find((semester) => (
    String(semester.academicYear) === String(route.query.academicYear || '')
    && semester.term === route.query.term
  ));
  const current = semesterStore.semesters.find((semester) => semester.isCurrent ?? semester.current);
  const fallback = [...semesterStore.semesters].sort((left, right) => (
    right.academicYear - left.academicYear
    || TERM_ORDER[right.term] - TERM_ORDER[left.term]
  ))[0];
  return requested || current || fallback || null;
};

const load = async () => {
  if (!selectedSemester.value || !Number.isInteger(enrollmentId.value) || enrollmentId.value <= 0) {
    await notify('조회할 강의 정보를 찾을 수 없습니다.');
    router.replace({ name: 'StudentAttendanceIndex' });
    return;
  }

  isLoading.value = true;
  try {
    const items = [];
    let pageNumber = 1;
    let hasNext = false;

    do {
      const response = await searchAttendanceRecords({
        enrollmentId: enrollmentId.value,
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
      String(record.enrollmentId) === String(enrollmentId.value)
      && String(record.academicYear) === String(selectedSemester.value.academicYear)
      && record.term === selectedSemester.value.term
    ));
  } catch (error) {
    records.value = [];
    await notify(error.response?.data?.message || '출결 현황을 불러오지 못했습니다.');
  } finally {
    isLoading.value = false;
  }
};

const goBack = () => {
  router.push({
    name: 'StudentAttendanceIndex',
    query: selectedSemester.value
      ? { academicYear: selectedSemester.value.academicYear, term: selectedSemester.value.term }
      : undefined,
  });
};

onMounted(async () => {
  try {
    await semesterStore.fetchSemesters();
    selectedSemester.value = resolveSemester();
    await load();
  } catch (error) {
    await notify(error.response?.data?.message || '출결 현황 조회 정보를 불러오지 못했습니다.');
  }
});
</script>

<template>
  <MyPageContainer title="출결 현황">
    <section class="course-header" aria-labelledby="course-title">
      <div>
        <h3 id="course-title">{{ courseTitle }}</h3>
        <p>{{ courseDescription }}</p>
      </div>
      <MyButton
        btn-type="button"
        class="back-button"
        color="white"
        size="middle"
        content="목록으로"
        @click="goBack"
      />
    </section>

    <section class="summary-grid" aria-label="출결 요약">
      <SummaryStatCard label="전체 수업" :value="`${summary.totalCount}회`" />
      <SummaryStatCard label="출석" :value="`${summary.presentCount}회`" />
      <SummaryStatCard label="지각" :value="`${summary.lateCount}회`" />
      <SummaryStatCard label="결석" :value="`${summary.absentCount}회`" />
      <SummaryStatCard label="공결" :value="`${summary.excusedCount}회`" />
      <SummaryStatCard label="출석률" :value="formatRate(summary.attendanceRate)" highlight />
    </section>

    <section class="detail-section" aria-labelledby="attendance-detail-title">
      <h3 id="attendance-detail-title">회차별 출결 내역</h3>
      <MyTable
        :columns="attendanceColumns"
        :loading="isLoading"
        :empty="!isLoading && orderedRecords.length === 0"
        empty-message="등록된 출결 기록이 없습니다."
      >
        <tr v-for="record in orderedRecords" :key="record.id">
          <td>{{ formatDate(record.lectureDate) }}</td>
          <td>{{ record.period }}교시</td>
          <td>
            <span :class="statusClass(record.status)">
              {{ STATUS_LABELS[record.status] || record.status }}
            </span>
          </td>
          <td>{{ record.checkInTime ? formatDate(record.checkInTime, 'YYYY-MM-DD HH:mm') : '-' }}</td>
          <td>{{ record.remarks || '-' }}</td>
        </tr>
      </MyTable>
    </section>
  </MyPageContainer>
</template>

<style scoped>
.course-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 18px 20px;
  border: 1px solid var(--personal-color-border-mist);
  border-radius: 8px;
  background: var(--personal-color-white);
}

.course-header h3 {
  margin: 0;
  color: var(--personal-color-primary-text-navy);
  font-size: 1.05rem;
}

.course-header p {
  margin: 7px 0 0;
  color: var(--personal-color-text-muted-slate);
  font-size: 0.8rem;
}

.back-button {
  flex: 0 0 auto;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 12px;
  margin-top: 20px;
}

.summary-grid :deep(.stat-card) {
  min-width: 0;
  padding: 14px 16px;
}

.summary-grid :deep(.stat-label) {
  font-size: 0.75rem;
}

.summary-grid :deep(.stat-value) {
  font-size: 1rem;
}

.detail-section {
  margin-top: 26px;
}

.detail-section h3 {
  margin: 0 0 14px;
  color: var(--personal-color-primary-text-navy);
  font-size: 1rem;
}

.detail-section :deep(th),
.detail-section :deep(td) {
  padding: 14px 16px;
  font-size: 0.78rem;
}

.status-text--PRESENT {
  color: var(--personal-color-status-success-text-forest);
}

.status-text--LATE {
  color: var(--personal-color-status-warning-text-amber);
}

.status-text--ABSENT {
  color: var(--personal-color-status-fail-text-maroon);
}

.status-text--EXCUSED {
  color: var(--personal-color-status-processing-text-navy);
}

@media (max-width: 1080px) {
  .summary-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 680px) {
  .course-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .summary-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
