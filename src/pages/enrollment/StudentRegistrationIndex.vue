<script setup>
import dayjs from 'dayjs';
import { computed, onMounted, ref } from 'vue';
import {
  cancelEnrollment,
  createEnrollment,
  getMyEnrollments,
} from '../../api/enrollmentApi';
import MyButton from '../../components/button/MyButton.vue';
import MyInput from '../../components/input/MyInput.vue';
import MySelect from '../../components/input/MySelect.vue';
import MyPageContainer from '../../components/layout/MyPageContainer.vue';
import MySearchFilter from '../../components/search/MySearchFilter.vue';
import MyTable from '../../components/table/MyTable.vue';
import { confirmDialog, notify } from '../../composables/useDialog';
import { useSemesterStore } from '../../store/semester/useSemesterStore';
import { formatDate } from '../../util/format';

defineOptions({ name: 'StudentRegistrationIndex' });

const TERM_ORDER = { FIRST: 1, SECOND: 2 };

const enrollmentColumns = [
  { key: 'course', label: '교과목' },
  { key: 'professor', label: '담당교수' },
  { key: 'classroom', label: '강의실' },
  { key: 'credits', label: '학점' },
  { key: 'enrolledAt', label: '신청일' },
  { key: 'management', label: '관리' },
];

const semesterStore = useSemesterStore();
const selectedSemesterKey = ref('');
const newLectureId = ref('');
const enrollments = ref([]);
const isLoadingEnrollments = ref(false);
const enrollingLectureId = ref(null);
const cancellingEnrollmentId = ref(null);
const formError = ref('');

const semesterKey = (semester) => `${semester.academicYear}:${semester.term}`;
const semesterLabel = (semester) => (
  `${semester.academicYear}학년도 ${semester.term === 'FIRST' ? 1 : 2}학기`
);

const semesterOptions = computed(() => [...semesterStore.semesters]
  .sort((left, right) => (
    right.academicYear - left.academicYear
    || TERM_ORDER[right.term] - TERM_ORDER[left.term]
  ))
  .map((semester) => ({
    value: semesterKey(semester),
    label: `${semesterLabel(semester)}${(semester.isCurrent ?? semester.current) ? ' (현재)' : ''}`,
  })));

const selectedSemester = computed(() => semesterStore.semesters.find(
  (semester) => semesterKey(semester) === selectedSemesterKey.value,
));

const selectedParams = computed(() => {
  if (!selectedSemester.value) return null;
  return {
    academicYear: selectedSemester.value.academicYear,
    term: selectedSemester.value.term,
  };
});

const registrationPeriod = computed(() => {
  const semester = selectedSemester.value;
  if (!semester?.enrollmentStartAt || !semester?.enrollmentEndAt) {
    return {
      state: 'unavailable',
      label: '기간 정보 없음',
      description: '선택한 학기의 수강신청 기간이 등록되지 않았습니다.',
    };
  }

  const now = dayjs();
  const startsAt = dayjs(semester.enrollmentStartAt);
  const endsAt = dayjs(semester.enrollmentEndAt);
  const periodText = `${startsAt.format('YYYY.MM.DD HH:mm')} ~ ${endsAt.format('YYYY.MM.DD HH:mm')}`;

  if (now.isBefore(startsAt)) {
    return { state: 'upcoming', label: '신청 예정', description: periodText };
  }
  if (now.isAfter(endsAt)) {
    return { state: 'closed', label: '신청 마감', description: periodText };
  }
  return { state: 'open', label: '신청 가능', description: periodText };
});

const isEnrollmentOpen = computed(() => registrationPeriod.value.state === 'open');
const isMutating = computed(() => (
  enrollingLectureId.value !== null
  || cancellingEnrollmentId.value !== null
));
const activeEnrollmentCredits = computed(() => enrollments.value.reduce(
  (total, item) => total + Number(item.credits || 0),
  0,
));

const createIdempotencyKey = () => {
  const suffix = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `enrollment-create-${suffix}`;
};

const errorMessage = (error, fallback) => (
  error.response?.data?.data?.reasons?.[0]?.message
  || error.response?.data?.message
  || fallback
);

const loadEnrollments = async ({ showError = true } = {}) => {
  if (!selectedParams.value) return false;
  isLoadingEnrollments.value = true;
  try {
    const response = await getMyEnrollments(selectedParams.value);
    enrollments.value = response.data.data || [];
    return true;
  } catch (error) {
    enrollments.value = [];
    if (showError) await notify(errorMessage(error, '수강신청 내역을 불러오지 못했습니다.'));
    return false;
  } finally {
    isLoadingEnrollments.value = false;
  }
};

const loadRegistrationData = async () => {
  formError.value = '';
  if (!selectedParams.value) {
    formError.value = '조회할 학기를 선택해 주세요.';
    return;
  }
  const loaded = await loadEnrollments({ showError: false });
  if (!loaded) {
    await notify('선택한 학기의 수강 정보를 불러오지 못했습니다. 다시 조회해 주세요.');
  }
};

const enrollLecture = async () => {
  const lectureId = Number(newLectureId.value);
  if (!isEnrollmentOpen.value) {
    formError.value = '현재 선택한 학기는 수강신청 기간이 아닙니다.';
    return;
  }
  if (!Number.isInteger(lectureId) || lectureId <= 0) {
    formError.value = '개설 강의 번호를 정확히 입력해 주세요.';
    return;
  }

  formError.value = '';
  const confirmed = await confirmDialog(`개설 강의 ${lectureId}번을 수강신청하시겠습니까?`);
  if (!confirmed) return;

  enrollingLectureId.value = lectureId;
  try {
    await createEnrollment(lectureId, createIdempotencyKey());
    newLectureId.value = '';
    await loadEnrollments({ showError: false });
    await notify('수강신청이 완료되었습니다.');
  } catch (error) {
    await notify(errorMessage(error, '수강신청에 실패했습니다.'));
  } finally {
    enrollingLectureId.value = null;
  }
};

const cancelActiveEnrollment = async (enrollment) => {
  const confirmed = await confirmDialog(`${enrollment.courseName} 수강을 취소하시겠습니까?`);
  if (!confirmed) return;

  cancellingEnrollmentId.value = enrollment.enrollmentId;
  try {
    await cancelEnrollment(enrollment.enrollmentId);
    await loadEnrollments();
    await notify('수강신청이 취소되었습니다.');
  } catch (error) {
    await notify(errorMessage(error, '수강 취소에 실패했습니다.'));
  } finally {
    cancellingEnrollmentId.value = null;
  }
};

const applyDefaultSemester = () => {
  const current = semesterStore.semesters.find((semester) => semester.isCurrent ?? semester.current);
  const fallback = [...semesterStore.semesters].sort((left, right) => (
    right.academicYear - left.academicYear
    || TERM_ORDER[right.term] - TERM_ORDER[left.term]
  ))[0];
  if (current || fallback) selectedSemesterKey.value = semesterKey(current || fallback);
};

onMounted(async () => {
  try {
    await semesterStore.fetchSemesters();
    applyDefaultSemester();
    await loadRegistrationData();
  } catch (error) {
    await notify(errorMessage(error, '학기 정보를 불러오지 못했습니다.'));
  }
});
</script>

<template>
  <MyPageContainer title="수강 신청">
    <MySearchFilter submit-text="조회" @search="loadRegistrationData">
      <div class="search-group semester-filter">
        <label for="registration-semester">대상 학기</label>
        <MySelect
          id="registration-semester"
          v-model="selectedSemesterKey"
          :options="semesterOptions"
          placeholder="학기 선택"
        />
      </div>
    </MySearchFilter>

    <section class="period-card" :class="`period-${registrationPeriod.state}`">
      <div>
        <span class="period-title">수강신청 기간</span>
        <strong>{{ registrationPeriod.description }}</strong>
      </div>
      <span class="period-status">{{ registrationPeriod.label }}</span>
    </section>

    <section class="add-section">
      <h3>수강 신청</h3>
      <div class="add-row">
        <MyInput
          v-model="newLectureId"
          numeric-only
          placeholder="개설 강의 번호를 입력해 주세요."
          :disabled="!isEnrollmentOpen || isMutating"
          @keyup-enter="enrollLecture"
        />
        <MyButton
          btn-type="button"
          color="deep-blue"
          size="middle"
          :content="enrollingLectureId ? '신청 중' : '신청'"
          :disabled="!isEnrollmentOpen || isMutating"
          @click="enrollLecture"
        />
      </div>
      <p
        v-if="formError"
        class="error-text"
        role="alert"
      >
        {{ formError }}
      </p>
    </section>

    <section class="enrollment-section">
      <div class="section-title-row">
        <h3>수강신청 목록</h3>
        <span class="summary-text">총 신청학점 <strong>{{ activeEnrollmentCredits }}</strong>학점</span>
      </div>
      <MyTable
        :columns="enrollmentColumns"
        :loading="isLoadingEnrollments"
        :empty="!isLoadingEnrollments && enrollments.length === 0"
        empty-message="선택한 학기의 수강신청 내역이 없습니다."
      >
        <tr
          v-for="item in enrollments"
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
          <td>{{ item.professorName || '-' }}</td>
          <td>{{ item.classroom || '-' }}</td>
          <td>{{ item.credits }}</td>
          <td>{{ formatDate(item.enrolledAt, 'YYYY-MM-DD HH:mm') }}</td>
          <td>
            <MyButton
              btn-type="button"
              color="red"
              size="small"
              class="cancel-action"
              :content="cancellingEnrollmentId === item.enrollmentId ? '취소 중' : '취소'"
              :disabled="!isEnrollmentOpen || isMutating"
              @click="cancelActiveEnrollment(item)"
            />
          </td>
        </tr>
      </MyTable>
    </section>
  </MyPageContainer>
</template>

<style scoped>
.add-section {
  padding: 18px 20px;
  margin-bottom: 24px;
  border: 1px solid var(--personal-color-border-mist);
  border-radius: 8px;
  background: var(--personal-color-white);
}

.add-row {
  display: flex;
  align-items: flex-end;
  gap: 12px;
}

.semester-filter {
  width: 260px;
}

.period-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 18px 20px;
  margin-bottom: 24px;
  border: 1px solid var(--personal-color-border-mist);
  border-radius: 8px;
  color: var(--personal-color-primary-text-navy);
  background: var(--personal-color-white);
}

.period-card > div {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.period-title {
  color: var(--personal-color-text-muted-slate);
  font-size: 0.78rem;
}

.period-status {
  flex-shrink: 0;
  font-size: 0.78rem;
  font-weight: 700;
}

.period-open .period-status {
  color: var(--personal-color-status-success-text-forest);
}

.period-upcoming .period-status {
  color: var(--personal-color-status-processing-text-navy);
}

.period-closed .period-status,
.period-unavailable .period-status {
  color: var(--personal-color-status-warning-text-amber);
}

.add-section {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
}

.add-row :deep(input) {
  width: 220px;
}

.error-text {
  margin: 10px 0 0;
  color: var(--personal-color-red);
  font-size: 0.82rem;
}

.enrollment-section {
  margin-bottom: 28px;
}

.section-title-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 10px;
}

h3 {
  margin: 0;
  color: var(--personal-color-primary-text-navy);
  font-size: 1rem;
  font-weight: 700;
}

.summary-text {
  color: var(--personal-color-text-muted-slate);
  font-size: 0.85rem;
}

.summary-text strong {
  color: var(--personal-color-primary-navy);
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

.cancel-action {
  color: var(--personal-color-red);
}

@media (max-width: 760px) {
  .add-section,
  .add-row {
    align-items: stretch;
    flex-direction: column;
  }

  .semester-filter,
  .add-row :deep(input) {
    width: 100%;
  }

  .period-card {
    align-items: flex-start;
  }
}
</style>
