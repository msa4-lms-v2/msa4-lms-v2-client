<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { getMyEnrollments } from '../../api/enrollmentApi';
import { getMyGrades, submitLectureEvaluation } from '../../api/gradeApi';
import MyPageContainer from '../../components/layout/MyPageContainer.vue';
import MySelect from '../../components/input/MySelect.vue';
import MyTable from '../../components/table/MyTable.vue';
import MyButton from '../../components/button/MyButton.vue';
import { confirmDialog, notify } from '../../composables/useDialog';
import { useSemesterStore } from '../../store/semester/useSemesterStore';

defineOptions({ name: 'StudentLectureEvaluation' });

const route = useRoute();
const router = useRouter();
const semesterStore = useSemesterStore();

const questions = [
  { key: 'CONTENT_QUALITY', label: '강의 목표와 내용이 명확하게 안내되었다.' },
  { key: 'DELIVERY_CLARITY', label: '교수자는 강의 내용을 이해하기 쉽게 설명하였다.' },
  { key: 'FAIR_GRADING', label: '과제와 평가는 강의 내용과 적절하게 연계되었다.' },
  { key: 'LEARNING_SUPPORT', label: '강의 자료와 학습 환경이 수업에 도움이 되었다.' },
  { key: 'OVERALL_SATISFACTION', label: '전반적으로 이 강의를 추천하고 싶다.' },
];

const scoreOptions = [
  { value: 1, label: '매우 그렇지 않다' },
  { value: 2, label: '그렇지 않다' },
  { value: 3, label: '보통' },
  { value: 4, label: '그렇다' },
  { value: 5, label: '매우 그렇다' },
];

const completionTypeLabels = {
  MAJOR_REQUIRED: '전공필수',
  MAJOR_ELECTIVE: '전공선택',
  GENERAL_REQUIRED: '교양필수',
  GENERAL_ELECTIVE: '교양선택',
};

const columns = [
  { key: 'semester', label: '연도/학기' },
  { key: 'courseCode', label: '과목코드' },
  { key: 'courseName', label: '과목명' },
  { key: 'completionType', label: '이수구분' },
  { key: 'status', label: '현황' },
  { key: 'evaluation', label: '평가' },
];

const filters = reactive({ academicYear: '', term: '' });
const enrollments = ref([]);
const submittedEnrollmentIds = ref(new Set());
const selectedEnrollmentId = ref('');
const isLoading = ref(false);
const isSubmitting = ref(false);
const form = reactive({
  ratings: questions.reduce((ratings, question) => {
    ratings[question.key] = null;
    return ratings;
  }, {}),
  comment: '',
});

const selectedEnrollment = computed(() =>
  enrollments.value.find((item) => String(item.enrollmentId) === String(selectedEnrollmentId.value))
);

const selectedSemester = computed(() => semesterStore.semesters.find((semester) => (
  String(semester.academicYear) === String(filters.academicYear)
  && semester.term === filters.term
)));

const isFormView = computed(() => Boolean(route.query.enrollmentId && selectedEnrollment.value));

const evaluationPeriodLabel = computed(() => {
  const semester = selectedSemester.value;
  if (!semester?.evaluationStartAt || !semester?.evaluationEndAt) return '-';
  return `${formatDate(semester.evaluationStartAt)} ~ ${formatDate(semester.evaluationEndAt)}`;
});

const isEvaluationOpen = computed(() => {
  const semester = selectedSemester.value;
  if (!semester?.evaluationStartAt || !semester?.evaluationEndAt) return false;
  const now = Date.now();
  return now >= new Date(semester.evaluationStartAt).getTime()
    && now <= new Date(semester.evaluationEndAt).getTime();
});

const allQuestionsAnswered = computed(() =>
  questions.every((question) => Number(form.ratings[question.key]) >= 1)
);

function formatDate(value) {
  if (!value) return '-';
  return String(value).slice(0, 10);
}

const termLabel = (term) => (term === 'FIRST' ? '1학기' : term === 'SECOND' ? '2학기' : term || '-');
const semesterLabel = (enrollment) => `${enrollment.academicYear}년 ${termLabel(enrollment.term)}`;
const completionTypeLabel = (type) => completionTypeLabels[type] || type || '-';
const lectureStatusLabel = (enrollment) => (enrollment.status === 'CLOSED' ? '완료' : '진행 중');
const isSubmitted = (enrollmentId) => submittedEnrollmentIds.value.has(Number(enrollmentId));

const resetForm = () => {
  questions.forEach((question) => {
    form.ratings[question.key] = null;
  });
  form.comment = '';
};

const chooseInitialSemester = (allEnrollments) => {
  const queryEnrollment = allEnrollments.find((item) => (
    String(item.enrollmentId) === String(route.query.enrollmentId || '')
  ));
  const currentSemester = semesterStore.semesters.find((semester) => (
    (semester.isCurrent ?? semester.current)
    && allEnrollments.some((item) => (
      String(item.academicYear) === String(semester.academicYear)
      && item.term === semester.term
    ))
  ));
  const latestEnrollment = [...allEnrollments].sort((left, right) => (
    Number(right.academicYear) - Number(left.academicYear)
    || (right.term === 'SECOND' ? 1 : 0) - (left.term === 'SECOND' ? 1 : 0)
  ))[0];
  const target = queryEnrollment || currentSemester || latestEnrollment;

  if (target) {
    filters.academicYear = target.academicYear;
    filters.term = target.term;
    return;
  }

  const latestSemester = [...semesterStore.semesters].sort((left, right) => (
    Number(right.academicYear) - Number(left.academicYear)
    || (right.term === 'SECOND' ? 1 : 0) - (left.term === 'SECOND' ? 1 : 0)
  ))[0];
  if (latestSemester) {
    filters.academicYear = latestSemester.academicYear;
    filters.term = latestSemester.term;
  }
};

const loadEvaluationData = async () => {
  isLoading.value = true;
  try {
    const [enrollmentResponse, gradeResponse] = await Promise.all([
      getMyEnrollments({
        academicYear: filters.academicYear || undefined,
        term: filters.term || undefined,
      }),
      getMyGrades({
        academicYear: filters.academicYear || undefined,
        term: filters.term || undefined,
      }),
    ]);
    enrollments.value = enrollmentResponse.data.data || [];
    submittedEnrollmentIds.value = new Set(
      (gradeResponse.data.data?.grades || []).map((grade) => Number(grade.enrollmentId))
    );

    const queryEnrollmentId = route.query.enrollmentId;
    selectedEnrollmentId.value = queryEnrollmentId
      && enrollments.value.some((item) => String(item.enrollmentId) === String(queryEnrollmentId))
      ? String(queryEnrollmentId)
      : '';
  } catch (error) {
    enrollments.value = [];
    submittedEnrollmentIds.value = new Set();
    selectedEnrollmentId.value = '';
    await notify(error.response?.data?.message || '강의평가 목록을 불러오지 못했습니다.');
  } finally {
    isLoading.value = false;
  }
};

const openEvaluation = (enrollment) => {
  selectedEnrollmentId.value = String(enrollment.enrollmentId);
  resetForm();
  router.push({ path: '/evaluations', query: { enrollmentId: enrollment.enrollmentId } });
};

const goToList = () => {
  selectedEnrollmentId.value = '';
  resetForm();
  router.push('/evaluations');
};

const submit = async () => {
  if (!selectedEnrollment.value) {
    await notify('평가할 강의를 선택해 주세요.');
    return;
  }
  if (!isEvaluationOpen.value) {
    await notify('현재는 해당 학기의 강의평가 기간이 아닙니다.');
    return;
  }
  if (!allQuestionsAnswered.value) {
    await notify('모든 강의평가 문항에 답변해 주세요.');
    return;
  }

  const confirmed = await confirmDialog('강의평가를 제출하시겠습니까? 제출 후 수정할 수 없습니다.');
  if (!confirmed) return;

  isSubmitting.value = true;
  try {
    await submitLectureEvaluation({
      enrollmentId: Number(selectedEnrollmentId.value),
      ratings: { ...form.ratings },
      comment: form.comment.trim() || null,
    });
    submittedEnrollmentIds.value = new Set([
      ...submittedEnrollmentIds.value,
      Number(selectedEnrollmentId.value),
    ]);
    await notify('강의평가가 제출되었습니다.');
    await goToList();
  } catch (error) {
    await notify(error.response?.data?.message || '강의평가 제출에 실패했습니다.');
  } finally {
    isSubmitting.value = false;
  }
};

watch(
  () => route.query.enrollmentId,
  (enrollmentId) => {
    selectedEnrollmentId.value = enrollmentId ? String(enrollmentId) : '';
  }
);

onMounted(async () => {
  isLoading.value = true;
  try {
    await semesterStore.fetchSemesters();
    const response = await getMyEnrollments();
    chooseInitialSemester(response.data.data || []);
    await loadEvaluationData();
  } catch (error) {
    enrollments.value = [];
    await notify(error.response?.data?.message || '강의평가 목록을 불러오지 못했습니다.');
  } finally {
    isLoading.value = false;
  }
});
</script>

<template>
  <MyPageContainer v-if="!isFormView" title="강의 평가">
    <section class="evaluation-filter-card">
      <div class="filter-fields">
        <div class="filter-group semester-filter">
          <label for="evaluation-year">연도</label>
          <MySelect id="evaluation-year" v-model="filters.academicYear">
            <option v-for="year in semesterStore.academicYears" :key="year" :value="year">
              {{ year }}년
            </option>
          </MySelect>
        </div>
        <div class="filter-group semester-filter">
          <label for="evaluation-term">학기</label>
          <MySelect id="evaluation-term" v-model="filters.term">
            <option value="FIRST">1학기</option>
            <option value="SECOND">2학기</option>
          </MySelect>
        </div>
        <MyButton
          btn-type="button"
          color="deep-blue"
          size="middle"
          content="조회"
          @click="loadEvaluationData"
        />
      </div>
      <div class="evaluation-period">
        <span>평가 기간</span>
        <strong>{{ evaluationPeriodLabel }}</strong>
      </div>
    </section>

    <section class="lecture-list-section">
      <h3>수강 강의</h3>
      <MyTable
        :columns="columns"
        :loading="isLoading"
        :empty="!isLoading && enrollments.length === 0"
        empty-message="조회된 수강 강의가 없습니다."
      >
        <tr v-for="enrollment in enrollments" :key="enrollment.enrollmentId">
          <td>{{ semesterLabel(enrollment) }}</td>
          <td>{{ enrollment.courseCode }}</td>
          <td>{{ enrollment.courseName }}</td>
          <td>{{ completionTypeLabel(enrollment.completionType) }}</td>
          <td :class="{ 'status-incomplete': enrollment.status !== 'CLOSED' }">
            {{ lectureStatusLabel(enrollment) }}
          </td>
          <td>
            <MyButton
              v-if="isSubmitted(enrollment.enrollmentId)"
              btn-type="button"
              color="gray"
              size="big"
              content="평가 완료"
              disabled
            />
            <MyButton
              v-else
              btn-type="button"
              color="deep-blue"
              size="big"
              content="평가하기"
              @click="openEvaluation(enrollment)"
            />
          </td>
        </tr>
      </MyTable>
    </section>
  </MyPageContainer>

  <MyPageContainer v-else title="강의 평가 작성">
    <section class="selected-lecture-card">
      <div class="selected-lecture-main">
        <div class="selected-title-row">
          <h3>{{ selectedEnrollment.courseName }}</h3>
          <strong>{{ completionTypeLabel(selectedEnrollment.completionType) }}</strong>
        </div>
        <p>
          {{ selectedEnrollment.courseCode }} · {{ selectedEnrollment.professorName }} 교수 ·
          {{ semesterLabel(selectedEnrollment) }}
        </p>
      </div>
      <span>{{ isSubmitted(selectedEnrollment.enrollmentId) ? '완료' : '미완료' }}</span>
    </section>

    <h3 class="section-title">강의 평가 항목</h3>
    <section class="evaluation-card">
      <div
        v-for="(question, questionIndex) in questions"
        :key="question.key"
        class="question-row"
      >
        <p>{{ questionIndex + 1 }}. {{ question.label }}</p>
        <div class="score-options">
          <button
            v-for="score in scoreOptions"
            :key="score.value"
            type="button"
            class="score-option"
            :class="{ selected: form.ratings[question.key] === score.value }"
            :aria-pressed="form.ratings[question.key] === score.value"
            @click="form.ratings[question.key] = score.value"
          >
            <span>{{ score.value }}</span>
            <small>{{ score.label }}</small>
          </button>
        </div>
      </div>

      <div class="comment-field">
        <label for="evaluation-comment">하고 싶은 말</label>
        <textarea
          id="evaluation-comment"
          v-model="form.comment"
          maxlength="2000"
          rows="5"
          placeholder="좋은 점과 아쉬운 점이 있으면 적어주세요."
        ></textarea>
      </div>

      <div class="actions">
        <MyButton
          class="list-button"
          btn-type="button"
          color="white"
          size="middle"
          content="목록으로"
          @click="goToList"
        />
        <MyButton
          btn-type="button"
          color="deep-blue"
          size="middle"
          :disabled="isSubmitting || isSubmitted(selectedEnrollment.enrollmentId)"
          :content="isSubmitting ? '제출 중' : '평가 제출'"
          @click="submit"
        />
      </div>
    </section>

    <section class="anonymous-notice">
      강의평가는 익명으로 처리되며, 모든 수강 강의 평가 완료 후 성적 조회가 가능합니다.
    </section>
  </MyPageContainer>
</template>

<style scoped>
.evaluation-filter-card {
  display: flex;
  align-items: flex-end;
  gap: 24px;
  min-height: 104px;
  padding: 20px;
  border: 1px solid var(--personal-color-border-mist);
  border-radius: 8px;
  background: var(--personal-color-white);
}

.filter-fields {
  display: flex;
  align-items: flex-end;
  gap: 16px;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.filter-group label {
  color: var(--personal-color-text-secondary-steel);
  font-size: 0.78rem;
  font-weight: 700;
}

.semester-filter {
  width: 180px;
}

.evaluation-period {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 310px;
  margin-left: auto;
  padding-bottom: 2px;
}

.evaluation-period span {
  color: var(--personal-color-text-muted-slate);
  font-size: 0.78rem;
}

.evaluation-period strong {
  color: var(--personal-color-login-primary-navy);
  font-size: 0.9rem;
}

.lecture-list-section h3,
.section-title {
  margin: 20px 0 18px;
  color: var(--personal-color-primary-text-navy);
  font-size: 1.05rem;
  font-weight: 800;
}

.lecture-list-section :deep(.my-table th),
.lecture-list-section :deep(.my-table td) {
  padding-top: 12px;
  padding-bottom: 12px;
  font-size: 0.78rem;
}

.lecture-list-section :deep(.my-table th:nth-child(1)) { width: 16%; }
.lecture-list-section :deep(.my-table th:nth-child(2)) { width: 14%; }
.lecture-list-section :deep(.my-table th:nth-child(3)) { width: 22%; }
.lecture-list-section :deep(.my-table th:nth-child(4)) { width: 16%; }
.lecture-list-section :deep(.my-table th:nth-child(5)) { width: 12%; }
.lecture-list-section :deep(.my-table th:nth-child(6)) { width: 20%; }

.lecture-list-section :deep(.my-table button) {
  height: 38px;
  margin: 0 auto;
  font-size: 0.8rem;
}

.status-incomplete {
  color: var(--personal-color-danger-coral);
  font-weight: 700;
}

.selected-lecture-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 94px;
  padding: 18px 24px;
  border: 1px solid var(--personal-color-border-mist);
  border-radius: 8px;
  background: var(--personal-color-white);
}

.selected-title-row {
  display: flex;
  align-items: center;
  gap: 26px;
}

.selected-title-row h3 {
  margin: 0;
  color: var(--personal-color-primary-text-navy);
  font-size: 1.18rem;
}

.selected-title-row strong,
.selected-lecture-card > span {
  color: var(--personal-color-text-muted-slate);
  font-size: 0.72rem;
}

.selected-lecture-main p {
  margin: 8px 0 0;
  color: var(--personal-color-text-muted-slate);
  font-size: 0.78rem;
}

.evaluation-card {
  padding: 28px 24px 16px;
  border: 1px solid var(--personal-color-border-mist);
  border-radius: 8px;
  background: var(--personal-color-white);
}

.question-row {
  display: grid;
  grid-template-columns: minmax(360px, 1fr) 520px;
  align-items: center;
  min-height: 76px;
  border-bottom: 1px solid var(--personal-color-border-mist);
}

.question-row > p {
  margin: 0;
  color: var(--personal-color-primary-text-navy);
  font-size: 0.82rem;
  font-weight: 700;
}

.score-options {
  display: grid;
  grid-template-columns: repeat(5, minmax(72px, 1fr));
  gap: 8px;
}

.score-option {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--personal-color-text-muted-slate);
  cursor: pointer;
}

.score-option > span {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: 1px solid var(--personal-color-border-mist);
  border-radius: 50%;
  background: var(--personal-color-white);
  font-size: 0.68rem;
  font-weight: 700;
}

.score-option small {
  font-size: 0.52rem;
  white-space: nowrap;
}

.score-option.selected > span {
  border-color: var(--personal-color-primary-navy);
  background: var(--personal-color-primary-navy);
  color: var(--personal-color-white);
}

.score-option:focus-visible > span {
  outline: 2px solid var(--personal-color-student-accent-azure);
  outline-offset: 2px;
}

.comment-field {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 42px;
}

.comment-field label {
  color: var(--personal-color-text-secondary-steel);
  font-size: 0.78rem;
  font-weight: 700;
}

.comment-field textarea {
  width: 100%;
  min-height: 121px;
  resize: vertical;
  padding: 12px;
  border: 1px solid var(--personal-color-border-mist);
  border-radius: 4px;
  color: var(--personal-color-primary-text-navy);
  line-height: 1.5;
}

.comment-field textarea::placeholder {
  color: var(--personal-color-text-faint-fog);
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 14px;
  margin-top: 18px;
}

.list-button {
  border: 1px solid var(--personal-color-border-mist) !important;
  color: var(--personal-color-primary-navy) !important;
  font-weight: 700;
}

.anonymous-notice {
  margin-top: 32px;
  padding: 18px 20px;
  border: 1px solid var(--personal-color-border-mist);
  border-radius: 8px;
  background: var(--personal-color-white);
  color: var(--personal-color-login-primary-navy);
  font-size: 0.72rem;
}

@media (max-width: 1000px) {
  .evaluation-filter-card,
  .filter-fields {
    flex-wrap: wrap;
  }

  .evaluation-period {
    width: 100%;
    margin-left: 0;
  }

  .question-row {
    grid-template-columns: 1fr;
    gap: 16px;
    padding: 18px 0;
  }
}

@media (max-width: 640px) {
  .filter-fields {
    width: 100%;
  }

  .semester-filter {
    width: 100%;
  }

  .score-options {
    grid-template-columns: repeat(5, 1fr);
    gap: 2px;
  }

  .score-option small {
    white-space: normal;
  }
}
</style>
