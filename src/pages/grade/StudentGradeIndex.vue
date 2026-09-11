<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { getMyEnrollments } from '../../api/enrollmentApi';
import { getMyGrades } from '../../api/gradeApi';
import MyPageContainer from '../../components/layout/MyPageContainer.vue';
import MyButton from '../../components/button/MyButton.vue';
import MySelect from '../../components/input/MySelect.vue';
import MyTable from '../../components/table/MyTable.vue';
import SummaryStatCard from '../../components/payment/SummaryStatCard.vue';
import { notify } from '../../composables/useDialog';
import { useSemesterStore } from '../../store/semester/useSemesterStore';

defineOptions({ name: 'StudentGradeIndex' });

const semesterStore = useSemesterStore();
const filters = reactive({ academicYear: '', term: '', courseName: '' });
const grades = ref([]);
const enrollments = ref([]);
const courseOptions = ref([]);
const summary = ref({ totalGpa: 0, totalCredits: 0, queryGpa: 0, queryCredits: 0 });
const isLoading = ref(false);

const columns = [
  { key: 'semester', label: '연도/학기' },
  { key: 'courseCode', label: '과목코드' },
  { key: 'courseName', label: '과목명' },
  { key: 'completionType', label: '이수구분' },
  { key: 'credits', label: '학점' },
  { key: 'letterGrade', label: '등급' },
];

const completionTypeLabels = {
  MAJOR_REQUIRED: '전공필수',
  MAJOR_ELECTIVE: '전공선택',
  GENERAL_REQUIRED: '교양필수',
  GENERAL_ELECTIVE: '교양선택',
};

const termLabels = { FIRST: '1학기', SECOND: '2학기' };

const enrollmentById = computed(() => new Map(
  enrollments.value.map((enrollment) => [Number(enrollment.enrollmentId), enrollment])
));

const targetSemesterLabel = computed(() => {
  if (!filters.academicYear && !filters.term) return '전체';
  const year = filters.academicYear ? `${filters.academicYear}년` : '전체 연도';
  const term = filters.term ? termLabels[filters.term] : '전체 학기';
  return `${year} ${term}`;
});

const completionTypeLabel = (grade) => {
  const type = enrollmentById.value.get(Number(grade.enrollmentId))?.completionType;
  return completionTypeLabels[type] || type || '-';
};

const loadGrades = async () => {
  isLoading.value = true;
  try {
    const response = await getMyGrades({
      academicYear: filters.academicYear || undefined,
      term: filters.term || undefined,
      courseName: filters.courseName || undefined,
    });
    const data = response.data.data;
    grades.value = data.grades || [];
    summary.value = {
      totalGpa: data.totalGpa ?? 0,
      totalCredits: data.totalCredits ?? 0,
      queryGpa: data.queryGpa ?? 0,
      queryCredits: data.queryCredits ?? 0,
    };

    if (courseOptions.value.length === 0) {
      courseOptions.value = [...new Set(grades.value.map((grade) => grade.courseName))]
        .filter(Boolean)
        .sort((left, right) => left.localeCompare(right, 'ko'));
    }
  } catch (error) {
    grades.value = [];
    await notify(error.response?.data?.message || '성적을 불러오지 못했습니다.');
  } finally {
    isLoading.value = false;
  }
};

onMounted(async () => {
  isLoading.value = true;
  try {
    const [, enrollmentResponse] = await Promise.all([
      semesterStore.fetchSemesters(),
      getMyEnrollments(),
    ]);
    enrollments.value = enrollmentResponse.data.data || [];
    await loadGrades();
  } catch (error) {
    grades.value = [];
    enrollments.value = [];
    await notify(error.response?.data?.message || '성적 조회 정보를 불러오지 못했습니다.');
  } finally {
    isLoading.value = false;
  }
});
</script>

<template>
  <MyPageContainer title="성적 조회">
    <form class="grade-filters" @submit.prevent="loadGrades">
      <div class="filter-group">
        <label for="grade-year">연도</label>
        <MySelect id="grade-year" v-model="filters.academicYear">
          <option value="">전체</option>
          <option v-for="year in semesterStore.academicYears" :key="year" :value="year">{{ year }}년</option>
        </MySelect>
      </div>
      <div class="filter-group">
        <label for="grade-term">학기</label>
        <MySelect id="grade-term" v-model="filters.term">
          <option value="">전체</option>
          <option v-for="(label, value) in termLabels" :key="value" :value="value">{{ label }}</option>
        </MySelect>
      </div>
      <div class="filter-group course-filter">
        <label for="grade-course">과목명</label>
        <MySelect id="grade-course" v-model="filters.courseName">
          <option value="">전체</option>
          <option v-for="courseName in courseOptions" :key="courseName" :value="courseName">{{ courseName }}</option>
        </MySelect>
      </div>
      <div class="target-semester">
        <span>대상 학기</span>
        <strong>{{ targetSemesterLabel }}</strong>
      </div>
      <MyButton btn-type="submit" color="deep-blue" size="middle" content="조회" />
    </form>

    <section class="summary-bar">
      <SummaryStatCard label="조회 평균 평점" :value="`${Number(summary.queryGpa).toFixed(2)} / 4.5`" />
      <SummaryStatCard label="조회 이수 학점" :value="`${summary.queryCredits} 학점`" />
      <SummaryStatCard label="전체 평균 평점" :value="`${Number(summary.totalGpa).toFixed(2)} / 4.5`" />
      <SummaryStatCard label="총 전체 이수 학점" :value="`${summary.totalCredits} 학점`" />
    </section>

    <section class="grade-detail-section">
      <h3>학기별 상세 성적</h3>
      <MyTable
        :columns="columns"
        :loading="isLoading"
        :empty="!isLoading && grades.length === 0"
        empty-message="조회된 성적이 없습니다."
      >
        <tr v-for="grade in grades" :key="grade.enrollmentId">
          <td>{{ grade.academicYear }}년 {{ termLabels[grade.term] || grade.term }}</td>
          <td>{{ grade.courseCode }}</td>
          <td>{{ grade.courseName }}</td>
          <td>{{ completionTypeLabel(grade) }}</td>
          <td>{{ grade.credits }}</td>
          <td>{{ grade.letterGrade || '-' }}</td>
        </tr>
      </MyTable>
    </section>
  </MyPageContainer>
</template>

<style scoped>
.grade-filters {
  display: grid;
  grid-template-columns: 180px 180px minmax(240px, 1fr) 150px 92px;
  align-items: end;
  gap: 18px;
  min-height: 104px;
  padding: 20px;
  border: 1px solid var(--personal-color-border-mist);
  border-radius: 8px;
  background: var(--personal-color-white);
}

.filter-group,
.target-semester {
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.filter-group label,
.target-semester span {
  color: var(--personal-color-text-secondary-steel);
  font-size: 0.75rem;
  font-weight: 700;
}

.target-semester {
  justify-content: flex-end;
  height: 60px;
}

.target-semester strong {
  height: 38px;
  color: var(--personal-color-login-primary-navy);
  font-size: 0.86rem;
  line-height: 38px;
}

.grade-filters :deep(button) {
  width: 92px;
  height: 38px;
}

.summary-bar {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
  margin-top: 20px;
}

.summary-bar :deep(.summary-card) {
  min-height: 94px;
}

.grade-detail-section {
  margin-top: 26px;
}

.grade-detail-section h3 {
  margin: 0 0 16px;
  color: var(--personal-color-primary-text-navy);
  font-size: 1.08rem;
  font-weight: 800;
}

.grade-detail-section :deep(th),
.grade-detail-section :deep(td) {
  padding: 15px 16px;
  font-size: 0.78rem;
}

@media (max-width: 1050px) {
  .grade-filters {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .summary-bar {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .grade-filters,
  .summary-bar {
    grid-template-columns: 1fr;
  }

  .grade-filters :deep(button) {
    width: 100%;
  }
}
</style>
