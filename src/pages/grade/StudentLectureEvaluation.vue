<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { useRoute } from 'vue-router';
import { getMyEnrollments } from '../../api/enrollmentApi';
import { submitLectureEvaluation } from '../../api/gradeApi';
import MyPageContainer from '../../components/layout/MyPageContainer.vue';
import MySearchFilter from '../../components/search/MySearchFilter.vue';
import MySelect from '../../components/input/MySelect.vue';
import MyTable from '../../components/table/MyTable.vue';
import MyButton from '../../components/button/MyButton.vue';
import { confirmDialog, notify } from '../../composables/useDialog';
import { useSemesterStore } from '../../store/semester/useSemesterStore';

defineOptions({ name: 'StudentLectureEvaluation' });

const route = useRoute();
const semesterStore = useSemesterStore();

const questions = [
  { key: 'CONTENT_QUALITY', label: '강의 내용은 학습 목표에 맞게 구성되었나요?' },
  { key: 'DELIVERY_CLARITY', label: '교수자의 설명은 이해하기 쉬웠나요?' },
  { key: 'FAIR_GRADING', label: '평가 기준과 성적 산정 방식은 공정했나요?' },
  { key: 'LEARNING_SUPPORT', label: '질문과 학습 지원이 충분했나요?' },
  { key: 'OVERALL_SATISFACTION', label: '강의 전반에 만족하나요?' },
];

const columns = [
  { key: 'question', label: '평가 문항' },
  { key: 'score', label: '점수' },
];

const filters = reactive({ academicYear: '', term: '' });
const enrollments = ref([]);
const selectedEnrollmentId = ref('');
const isLoading = ref(false);
const isSubmitting = ref(false);
const form = reactive({
  ratings: questions.reduce((ratings, question) => {
    ratings[question.key] = 5;
    return ratings;
  }, {}),
  comment: '',
});

const selectedEnrollment = computed(() =>
  enrollments.value.find((item) => String(item.enrollmentId) === String(selectedEnrollmentId.value))
);

const applyDefaultSemester = () => {
  if (filters.academicYear && filters.term) return;
  const current = semesterStore.semesters.find((semester) => semester.isCurrent ?? semester.current);
  const fallback = [...semesterStore.semesters].sort((left, right) => (
    right.academicYear - left.academicYear || (right.term === 'SECOND' ? 1 : 0) - (left.term === 'SECOND' ? 1 : 0)
  ))[0];
  const target = current || fallback;
  if (target) {
    filters.academicYear = target.academicYear;
    filters.term = target.term;
  }
};

const loadEnrollments = async () => {
  isLoading.value = true;
  try {
    const response = await getMyEnrollments({
      academicYear: filters.academicYear || undefined,
      term: filters.term || undefined,
    });
    enrollments.value = response.data.data || [];

    const queryEnrollmentId = route.query.enrollmentId;
    if (
      queryEnrollmentId &&
      enrollments.value.some((item) => String(item.enrollmentId) === String(queryEnrollmentId))
    ) {
      selectedEnrollmentId.value = String(queryEnrollmentId);
    } else if (!enrollments.value.some((item) => String(item.enrollmentId) === String(selectedEnrollmentId.value))) {
      selectedEnrollmentId.value = enrollments.value[0]?.enrollmentId
        ? String(enrollments.value[0].enrollmentId)
        : '';
    }
  } catch (error) {
    enrollments.value = [];
    selectedEnrollmentId.value = '';
    await notify(error.response?.data?.message || '수강 강의를 불러오지 못했습니다.');
  } finally {
    isLoading.value = false;
  }
};

const submit = async () => {
  if (!selectedEnrollment.value) {
    await notify('평가할 강의를 선택해 주세요.');
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
    await notify('강의평가가 제출되었습니다.');
  } catch (error) {
    await notify(error.response?.data?.message || '강의평가 제출에 실패했습니다.');
  } finally {
    isSubmitting.value = false;
  }
};

onMounted(async () => {
  try {
    await semesterStore.fetchSemesters();
  } catch {
    // 학기 목록 조회 실패 시에도 수강 목록 전체 조회로 진행한다.
  }
  applyDefaultSemester();
  await loadEnrollments();
});
</script>

<template>
  <MyPageContainer title="강의 평가" subtitle="성적 공개 전에 수강 강의 평가를 제출합니다.">
    <MySearchFilter submit-text="조회" @search="loadEnrollments">
      <div class="search-group">
        <label for="evaluation-year">학년도</label>
        <MySelect id="evaluation-year" v-model="filters.academicYear">
          <option value="">전체</option>
          <option v-for="year in semesterStore.academicYears" :key="year" :value="year">
            {{ year }}학년도
          </option>
        </MySelect>
      </div>
      <div class="search-group">
        <label for="evaluation-term">학기</label>
        <MySelect id="evaluation-term" v-model="filters.term">
          <option value="">전체</option>
          <option value="FIRST">1학기</option>
          <option value="SECOND">2학기</option>
        </MySelect>
      </div>
      <div class="search-group wide">
        <label for="evaluation-enrollment">강의</label>
        <MySelect id="evaluation-enrollment" v-model="selectedEnrollmentId">
          <option value="">강의를 선택하세요</option>
          <option
            v-for="enrollment in enrollments"
            :key="enrollment.enrollmentId"
            :value="String(enrollment.enrollmentId)"
          >
            {{ enrollment.courseName }} / {{ enrollment.professorName }}
          </option>
        </MySelect>
      </div>
    </MySearchFilter>

    <section v-if="selectedEnrollment" class="lecture-summary">
      <div>
        <span>과목코드</span>
        <strong>{{ selectedEnrollment.courseCode }}</strong>
      </div>
      <div>
        <span>강의명</span>
        <strong>{{ selectedEnrollment.courseName }}</strong>
      </div>
      <div>
        <span>담당교수</span>
        <strong>{{ selectedEnrollment.professorName }}</strong>
      </div>
      <div>
        <span>학점</span>
        <strong>{{ selectedEnrollment.credits }}학점</strong>
      </div>
    </section>

    <section class="evaluation-card">
      <h3>평가 문항</h3>
      <MyTable
        :columns="columns"
        :loading="isLoading"
        :empty="!isLoading && !selectedEnrollment"
        empty-message="평가할 수강 강의가 없습니다."
      >
        <tr v-for="question in questions" :key="question.key">
          <td class="question-cell">{{ question.label }}</td>
          <td>
            <MySelect v-model.number="form.ratings[question.key]" class="score-select">
              <option v-for="score in [5, 4, 3, 2, 1]" :key="score" :value="score">
                {{ score }}점
              </option>
            </MySelect>
          </td>
        </tr>
      </MyTable>

      <div class="comment-field">
        <label for="evaluation-comment">서술 의견</label>
        <textarea
          id="evaluation-comment"
          v-model="form.comment"
          maxlength="2000"
          rows="5"
          placeholder="강의에 대한 의견을 입력하세요."
        ></textarea>
      </div>

      <div class="actions">
        <MyButton
          btn-type="button"
          color="deep-blue"
          size="big"
          :disabled="isSubmitting || !selectedEnrollment"
          :content="isSubmitting ? '제출 중...' : '평가 제출'"
          @click="submit"
        />
      </div>
    </section>
  </MyPageContainer>
</template>

<style scoped>
.wide {
  min-width: 320px;
}

.lecture-summary {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
  margin-bottom: 24px;
}

.lecture-summary div,
.evaluation-card {
  border: 1px solid var(--personal-color-border-mist);
  border-radius: 8px;
  background: var(--personal-color-white);
}

.lecture-summary div {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 18px;
}

.lecture-summary span,
.comment-field label {
  color: var(--personal-color-text-muted-slate);
  font-size: 0.85rem;
  font-weight: 700;
}

.lecture-summary strong {
  color: var(--personal-color-primary-text-navy);
  font-size: 1rem;
}

.evaluation-card {
  padding: 18px;
}

.evaluation-card h3 {
  margin: 0 0 12px;
  color: var(--personal-color-primary-text-navy);
  font-size: 1rem;
}

.question-cell {
  text-align: left !important;
}

.score-select {
  width: 92px;
}

.comment-field {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 22px;
}

.comment-field textarea {
  width: 100%;
  resize: vertical;
  border: 1px solid var(--personal-color-border-mist);
  border-radius: 6px;
  padding: 12px;
  color: var(--personal-color-primary-text-navy);
  line-height: 1.5;
}

.actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 18px;
}

@media (max-width: 900px) {
  .lecture-summary {
    grid-template-columns: 1fr;
  }
}
</style>
