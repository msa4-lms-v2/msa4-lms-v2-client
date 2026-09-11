<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { getProfessorLectureEvaluations } from '../../api/gradeApi';
import MyPageContainer from '../../components/layout/MyPageContainer.vue';
import MySearchFilter from '../../components/search/MySearchFilter.vue';
import MyInput from '../../components/input/MyInput.vue';
import MySelect from '../../components/input/MySelect.vue';
import MyTable from '../../components/table/MyTable.vue';
import PrevNextPagination from '../../components/pagination/PrevNextPagination.vue';
import SummaryStatCard from '../../components/payment/SummaryStatCard.vue';
import { notify } from '../../composables/useDialog';

defineOptions({ name: 'ProfessorLectureEvaluation' });

const termLabels = { FIRST: '1학기', SECOND: '2학기' };
const questionLabels = {
  CONTENT_QUALITY: '강의 내용',
  DELIVERY_CLARITY: '설명 명확성',
  FAIR_GRADING: '평가 공정성',
  LEARNING_SUPPORT: '학습 지원',
  OVERALL_SATISFACTION: '전반 만족도',
};

const columns = [
  { key: 'lecture', label: '강의' },
  { key: 'semester', label: '학기' },
  { key: 'response', label: '응답' },
  { key: 'average', label: '평균' },
  { key: 'questions', label: '문항별 평균' },
  { key: 'comments', label: '서술 의견' },
];

const filters = reactive({ lectureId: '', academicYear: '', term: '', current: '' });
const evaluations = ref([]);
const page = ref({ page: 1, size: 20, totalCount: 0, hasNext: false });
const isLoading = ref(false);

const totalResponses = computed(() => evaluations.value.reduce((sum, item) => sum + Number(item.responseCount || 0), 0));
const averageResponseRate = computed(() => {
  if (!evaluations.value.length) return 0;
  const total = evaluations.value.reduce((sum, item) => sum + Number(item.responseRate || 0), 0);
  return total / evaluations.value.length;
});
const lecturesWithResponses = computed(() => evaluations.value.filter((item) => item.hasResponses).length);

const formatAverage = (value) => (value === null || value === undefined ? '-' : Number(value).toFixed(2));

const questionAverageEntries = (averages = {}) => Object.entries(averages).map(([key, value]) => ({
  key,
  label: questionLabels[key] || key,
  value: formatAverage(value),
}));

const load = async (pageNumber = 1) => {
  isLoading.value = true;
  try {
    const response = await getProfessorLectureEvaluations({
      page: pageNumber,
      size: 20,
      lectureId: filters.lectureId || undefined,
      academicYear: filters.academicYear || undefined,
      term: filters.term || undefined,
      current: filters.current === '' ? undefined : filters.current === 'true',
    });
    const data = response.data.data;
    evaluations.value = data.items || [];
    page.value = {
      page: data.page,
      size: data.size,
      totalCount: data.totalCount,
      hasNext: data.hasNext,
    };
  } catch (error) {
    evaluations.value = [];
    await notify(error.response?.data?.message || '강의평가 결과를 불러오지 못했습니다.');
  } finally {
    isLoading.value = false;
  }
};

const applyFilters = () => load(1);

onMounted(() => load());
</script>

<template>
  <MyPageContainer title="강의평가 결과" subtitle="담당 강의에 제출된 익명 강의평가 통계와 서술 의견을 확인합니다.">
    <section class="summary-bar">
      <SummaryStatCard label="조회 강의 수" :value="`${evaluations.length}개`" />
      <SummaryStatCard label="응답 있는 강의" :value="`${lecturesWithResponses}개`" highlight />
      <SummaryStatCard label="총 응답 수" :value="`${totalResponses}건`" />
      <SummaryStatCard label="평균 응답률" :value="`${averageResponseRate.toFixed(2)}%`" />
    </section>

    <MySearchFilter submit-text="조회" @search="applyFilters">
      <div class="search-group">
        <label for="evaluation-lecture-id">강의 ID</label>
        <MyInput id="evaluation-lecture-id" v-model="filters.lectureId" numeric-only placeholder="예: 21" />
      </div>
      <div class="search-group">
        <label for="evaluation-year">학년도</label>
        <MyInput id="evaluation-year" v-model="filters.academicYear" numeric-only placeholder="예: 2026" />
      </div>
      <div class="search-group">
        <label for="evaluation-term">학기</label>
        <MySelect id="evaluation-term" v-model="filters.term">
          <option value="">전체</option>
          <option value="FIRST">1학기</option>
          <option value="SECOND">2학기</option>
        </MySelect>
      </div>
      <div class="search-group">
        <label for="evaluation-current">현재 학기</label>
        <MySelect id="evaluation-current" v-model="filters.current">
          <option value="">전체</option>
          <option value="true">현재 학기만</option>
          <option value="false">현재 학기 제외</option>
        </MySelect>
      </div>
    </MySearchFilter>

    <MyTable
      :columns="columns"
      :loading="isLoading"
      :empty="!isLoading && evaluations.length === 0"
      empty-message="조회된 강의평가 결과가 없습니다."
    >
      <tr v-for="item in evaluations" :key="item.lectureId">
        <td>
          <div class="course-name">{{ item.courseName }}</div>
          <div class="course-meta">{{ item.courseCode }} · {{ item.sectionNo }}분반 · ID {{ item.lectureId }}</div>
        </td>
        <td>{{ item.academicYear }}학년도 {{ termLabels[item.term] || item.term }}</td>
        <td>
          <strong>{{ item.responseCount }}</strong> / {{ item.activeEnrollmentCount }}명
          <div class="course-meta">응답률 {{ formatAverage(item.responseRate) }}%</div>
        </td>
        <td>{{ formatAverage(item.overallAverage) }}</td>
        <td>
          <ul v-if="item.hasResponses" class="question-list">
            <li v-for="average in questionAverageEntries(item.questionAverages)" :key="average.key">
              <span>{{ average.label }}</span><strong>{{ average.value }}</strong>
            </li>
          </ul>
          <span v-else>-</span>
        </td>
        <td>
          <details v-if="item.comments?.length" class="comments">
            <summary>{{ item.comments.length }}건 보기</summary>
            <ul>
              <li v-for="(comment, index) in item.comments" :key="`${item.lectureId}-${index}`">{{ comment }}</li>
            </ul>
          </details>
          <span v-else>-</span>
        </td>
      </tr>
    </MyTable>

    <PrevNextPagination
      v-if="page.page > 1 || page.hasNext"
      :page="page.page"
      :has-next="page.hasNext"
      @page-change="load"
    />
  </MyPageContainer>
</template>

<style scoped>
.summary-bar {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 20px;
}

.course-name {
  color: var(--personal-color-primary-text-navy);
  font-weight: 700;
}

.course-meta {
  margin-top: 4px;
  color: var(--personal-color-text-muted-slate);
  font-size: 0.8rem;
}

.question-list,
.comments ul {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.question-list li {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.question-list span {
  color: var(--personal-color-text-muted-slate);
}

.comments summary {
  cursor: pointer;
  color: var(--personal-color-primary-blue);
  font-weight: 700;
}

.comments ul {
  margin-top: 8px;
}

.comments li {
  max-width: 280px;
  white-space: pre-wrap;
  text-align: left;
}

@media (max-width: 900px) {
  .summary-bar {
    grid-template-columns: 1fr;
  }
}
</style>
