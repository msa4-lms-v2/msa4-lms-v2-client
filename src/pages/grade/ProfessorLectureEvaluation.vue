<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { getProfessorLectureEvaluations } from '../../api/gradeApi';
import { getMyLectures } from '../../api/lectureApi';
import MyPageContainer from '../../components/layout/MyPageContainer.vue';
import MySearchFilter from '../../components/search/MySearchFilter.vue';
import MySelect from '../../components/input/MySelect.vue';
import MyTable from '../../components/table/MyTable.vue';
import MyButton from '../../components/button/MyButton.vue';
import MyModal from '../../components/common/MyModal.vue';
import PrevNextPagination from '../../components/pagination/PrevNextPagination.vue';
import { notify } from '../../composables/useDialog';

defineOptions({ name: 'ProfessorLectureEvaluation' });

const route = useRoute();
const router = useRouter();
const termLabels = { FIRST: '1학기', SECOND: '2학기' };
const questions = [
  { key: 'CONTENT_QUALITY', label: '강의 목표와 내용이 명확하게 안내되었다.' },
  { key: 'DELIVERY_CLARITY', label: '교수자는 강의 내용을 이해하기 쉽게 설명하였다.' },
  { key: 'FAIR_GRADING', label: '과제와 평가는 강의 내용과 적절하게 연계되었다.' },
  { key: 'LEARNING_SUPPORT', label: '강의 자료와 학습 환경이 수업에 도움이 되었다.' },
  { key: 'OVERALL_SATISFACTION', label: '전반적으로 이 강의를 추천하고 싶다.' },
];

const columns = [
  { key: 'courseCode', label: '과목코드' },
  { key: 'department', label: '학과' },
  { key: 'courseName', label: '강의명' },
  { key: 'credits', label: '학점' },
  { key: 'targetGrade', label: '대상학년' },
  { key: 'responses', label: '평가참여' },
  { key: 'responseRate', label: '참여율' },
  { key: 'average', label: '평균 평점' },
  { key: 'capacity', label: '정원' },
  { key: 'detail', label: '상세' },
];

const lectures = ref([]);
const selectedSemesterKey = ref('');
const evaluations = ref([]);
const selectedEvaluation = ref(null);
const page = ref({ page: 1, size: 20, totalCount: 0, hasNext: false });
const isLoading = ref(false);
const isLoadingLectures = ref(false);
const commentsOpen = ref(false);

const isDetail = computed(() => Boolean(route.query.lectureId));
const semesterKey = (lecture) => `${lecture.academicYear}-${lecture.term}`;
const semesterLabel = (item) => `${item.academicYear}학년도 ${termLabels[item.term] || item.term}`;

const semesterOptions = computed(() => {
  const seen = new Set();
  return lectures.value.reduce((options, lecture) => {
    const value = semesterKey(lecture);
    if (!seen.has(value)) {
      seen.add(value);
      options.push({ value, label: semesterLabel(lecture) });
    }
    return options;
  }, []);
});

const lectureById = computed(() => Object.fromEntries(
  lectures.value.map((lecture) => [String(lecture.classId), lecture]),
));

const rows = computed(() => evaluations.value.map((evaluation) => ({
  ...lectureById.value[String(evaluation.lectureId)],
  ...evaluation,
})));

const detail = computed(() => {
  if (!selectedEvaluation.value) return null;
  return {
    ...lectureById.value[String(selectedEvaluation.value.lectureId)],
    ...selectedEvaluation.value,
  };
});

const parseSelectedSemester = () => {
  const [academicYear, term] = selectedSemesterKey.value.split('-');
  return academicYear && term ? { academicYear: Number(academicYear), term } : {};
};

const formatAverage = (value) => (value === null || value === undefined ? '-' : Number(value).toFixed(1));
const overallAverageLabel = (value) => (value === null || value === undefined ? '-' : `${formatAverage(value)}/5.0`);
const targetGradeLabel = (value) => (value ? `${value}학년` : '전체');
const questionScore = (key) => Number(detail.value?.questionAverages?.[key] || 0);
const questionWidth = (key) => `${Math.min(100, Math.max(0, questionScore(key) * 20))}%`;

const loadLectures = async () => {
  isLoadingLectures.value = true;
  try {
    const response = await getMyLectures({ page: 1, size: 100 });
    lectures.value = response.data.data.items || [];
    selectedSemesterKey.value = semesterOptions.value[0]?.value || '';
  } catch (error) {
    lectures.value = [];
    await notify(error.response?.data?.message || '담당 강의 정보를 불러오지 못했습니다.');
  } finally {
    isLoadingLectures.value = false;
  }
};

const load = async (pageNumber = 1) => {
  isLoading.value = true;
  try {
    const params = isDetail.value
      ? { page: 1, size: 1, lectureId: Number(route.query.lectureId) }
      : { page: pageNumber, size: 20, ...parseSelectedSemester() };
    const response = await getProfessorLectureEvaluations(params);
    const data = response.data.data;
    if (isDetail.value) {
      selectedEvaluation.value = data.items?.[0] || null;
    } else {
      evaluations.value = data.items || [];
      selectedEvaluation.value = null;
      page.value = {
        page: data.page,
        size: data.size,
        totalCount: data.totalCount,
        hasNext: data.hasNext,
      };
    }
  } catch (error) {
    if (isDetail.value) selectedEvaluation.value = null;
    else evaluations.value = [];
    await notify(error.response?.data?.message || '강의평가 결과를 불러오지 못했습니다.');
  } finally {
    isLoading.value = false;
  }
};

const openDetail = (lectureId) => router.push({ path: route.path, query: { lectureId } });
const closeDetail = () => router.push({ path: route.path });

const csvValue = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;

const downloadResults = () => {
  if (!detail.value) return;
  const lines = [
    ['학기', semesterLabel(detail.value)],
    ['강의명', detail.value.courseName],
    ['담당 교수', detail.value.professorName || '-'],
    ['평가 참여', `${detail.value.responseCount}/${detail.value.activeEnrollmentCount}`],
    ['평균 평점', formatAverage(detail.value.overallAverage)],
    [],
    ['문항', '평균 점수'],
    ...questions.map((question) => [question.label, formatAverage(detail.value.questionAverages?.[question.key])]),
    [],
    ['서술형 의견'],
    ...(detail.value.comments || []).map((comment) => [comment]),
  ];
  const csv = `\ufeff${lines.map((line) => line.map(csvValue).join(',')).join('\r\n')}`;
  const blobUrl = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = `${detail.value.courseCode}_${detail.value.courseName}_강의평가.csv`;
  link.click();
  URL.revokeObjectURL(blobUrl);
};

watch(
  () => route.query.lectureId,
  () => load(1),
);

onMounted(async () => {
  await loadLectures();
  await load(1);
});
</script>

<template>
  <MyPageContainer :title="isDetail ? '강의평가 결과(상세)' : '강의평가 결과'">
    <template v-if="!isDetail">
      <MySearchFilter submit-text="조회" @search="load(1)">
        <div class="search-group semester-filter">
          <label for="evaluation-semester">학기 선택</label>
          <MySelect id="evaluation-semester" v-model="selectedSemesterKey" :disabled="isLoadingLectures">
            <option value="">전체 학기</option>
            <option v-for="semester in semesterOptions" :key="semester.value" :value="semester.value">{{ semester.label }}</option>
          </MySelect>
        </div>
      </MySearchFilter>

      <MyTable :columns="columns" :loading="isLoading" :empty="!isLoading && rows.length === 0" empty-message="조회된 강의평가 결과가 없습니다.">
        <tr v-for="item in rows" :key="item.lectureId">
          <td>{{ item.courseCode }}</td>
          <td>{{ item.departmentName || '-' }}</td>
          <td>{{ item.courseName }}</td>
          <td>{{ item.credits ?? '-' }}</td>
          <td>{{ targetGradeLabel(item.targetGrade) }}</td>
          <td>{{ item.responseCount }}명</td>
          <td>{{ formatAverage(item.responseRate) }}%</td>
          <td>{{ overallAverageLabel(item.overallAverage) }}</td>
          <td>{{ item.capacity ?? item.activeEnrollmentCount }}명</td>
          <td><MyButton class="detail-button" color="deep-blue" size="small" content="상세보기" @click="openDetail(item.lectureId)" /></td>
        </tr>
      </MyTable>

      <PrevNextPagination v-if="page.page > 1 || page.hasNext" :page="page.page" :has-next="page.hasNext" @page-change="load" />
    </template>

    <template v-else>
      <div class="detail-top-actions">
        <MyButton class="list-button" color="gray" size="middle" content="목록" @click="closeDetail" />
      </div>

      <section v-if="detail" class="lecture-info-card">
        <h3>강의 정보</h3>
        <div class="lecture-info-grid">
          <div><span>학기</span><strong>{{ semesterLabel(detail) }}</strong></div>
          <div><span>강의명</span><strong>{{ detail.courseName }}</strong></div>
          <div><span>담당 교수</span><strong>{{ detail.professorName || '-' }}</strong></div>
        </div>
      </section>

      <section v-if="detail" class="evaluation-result-card">
        <h3>문항별 평가 결과</h3>
        <div class="question-results">
          <div v-for="(question, index) in questions" :key="question.key" class="question-result">
            <p><span>{{ index + 1 }}.</span> {{ question.label }}</p>
            <div class="score-row">
              <div class="score-track"><span :style="{ width: questionWidth(question.key) }"></span></div>
              <strong>{{ formatAverage(detail.questionAverages?.[question.key]) }}</strong>
            </div>
          </div>
        </div>
      </section>

      <div v-if="detail" class="detail-actions">
        <MyButton class="wide-button" color="deep-blue" size="middle" content="결과 다운로드" @click="downloadResults" />
        <MyButton class="wide-button" color="deep-blue" size="middle" content="서술형 의견보기" @click="commentsOpen = true" />
      </div>

      <div v-if="!isLoading && !detail" class="empty-detail">해당 강의평가 결과를 찾을 수 없습니다.</div>
    </template>

    <MyModal :is-open="commentsOpen" title="서술형 의견" max-width="680px" @close="commentsOpen = false">
      <ul v-if="detail?.comments?.length" class="comment-list">
        <li v-for="(comment, index) in detail.comments" :key="index"><span>{{ index + 1 }}</span><p>{{ comment }}</p></li>
      </ul>
      <p v-else class="empty-comments">등록된 서술형 의견이 없습니다.</p>
      <template #footer>
        <MyButton color="gray" size="middle" content="닫기" @click="commentsOpen = false" />
      </template>
    </MyModal>
  </MyPageContainer>
</template>

<style scoped>
.semester-filter :deep(select) { min-width: 360px; }
.detail-button { width: auto; min-width: 64px; padding: 0 10px; }
.detail-top-actions { display: flex; justify-content: flex-end; margin: -46px 0 18px; }
.list-button { width: 64px; }
.lecture-info-card,
.evaluation-result-card { padding: 22px 24px; border: 1px solid var(--personal-color-border-mist); border-radius: 8px; background: var(--personal-color-white); }
.lecture-info-card h3,
.evaluation-result-card h3 { margin: 0 0 20px; font-size: 1rem; }
.lecture-info-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; }
.lecture-info-grid div { display: flex; flex-direction: column; gap: 8px; }
.lecture-info-grid span { color: var(--personal-color-text-secondary-steel); font-size: 0.82rem; font-weight: 600; }
.lecture-info-grid strong { min-height: 38px; padding: 10px 12px; border: 1px solid var(--personal-color-border-mist); border-radius: 4px; box-sizing: border-box; font-size: 0.9rem; font-weight: 500; }
.evaluation-result-card { margin-top: 20px; }
.question-results { display: flex; flex-direction: column; gap: 22px; }
.question-result p { margin: 0 0 10px; color: var(--personal-color-primary-text-navy); font-size: 0.9rem; }
.question-result p span { margin-right: 4px; font-weight: 700; }
.score-row { display: flex; align-items: center; gap: 14px; }
.score-track { flex: 1; height: 14px; overflow: hidden; border-radius: 999px; background: var(--personal-color-table-header-smoke); }
.score-track span { display: block; height: 100%; border-radius: inherit; background: var(--personal-color-primary-navy); }
.score-row strong { width: 28px; color: var(--personal-color-primary-navy); font-size: 0.92rem; }
.detail-actions { display: flex; justify-content: center; gap: 12px; margin-top: 20px; }
.wide-button { width: auto; min-width: 118px; padding: 0 14px; }
.empty-detail { padding: 60px 20px; border: 1px solid var(--personal-color-border-mist); border-radius: 8px; background: white; color: var(--personal-color-text-muted-slate); text-align: center; }
.comment-list { max-height: 440px; margin: 0; padding: 0; overflow-y: auto; list-style: none; }
.comment-list li { display: flex; gap: 12px; padding: 14px 0; border-bottom: 1px solid var(--personal-color-border-mist); }
.comment-list li > span { display: grid; flex: 0 0 26px; height: 26px; place-items: center; border-radius: 50%; background: var(--personal-color-table-header-smoke); color: var(--personal-color-primary-navy); font-size: 0.78rem; font-weight: 700; }
.comment-list p { margin: 3px 0 0; white-space: pre-wrap; line-height: 1.55; }
.empty-comments { margin: 20px 0; color: var(--personal-color-text-muted-slate); text-align: center; }
@media (max-width: 800px) {
  .semester-filter :deep(select) { min-width: 220px; }
  .lecture-info-grid { grid-template-columns: 1fr; }
  .detail-top-actions { margin-top: 0; }
}
</style>
