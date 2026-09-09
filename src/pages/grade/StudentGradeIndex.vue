<script setup>
import { onMounted, reactive, ref } from 'vue';
import MyPageContainer from '../../components/layout/MyPageContainer.vue';
import MySearchFilter from '../../components/search/MySearchFilter.vue';
import MySelect from '../../components/input/MySelect.vue';
import MyInput from '../../components/input/MyInput.vue';
import MyTable from '../../components/table/MyTable.vue';
import SummaryStatCard from '../../components/payment/SummaryStatCard.vue';
import { useProfileStore } from '../../store/profile/useProfileStore';
import { useSemesterStore } from '../../store/semester/useSemesterStore';
import { getMyGrades } from '../../api/gradeApi';
import { notify } from '../../composables/useDialog';
import { ACADEMIC_STATUS_LABEL } from '../../util/academic/enumLabels';

defineOptions({ name: 'StudentGradeIndex' });

const columns = [
  { key: 'semester', label: '학년도·학기' },
  { key: 'course', label: '교과목' },
  { key: 'credits', label: '학점' },
  { key: 'totalScore', label: '총점' },
  { key: 'letterGrade', label: '등급' },
  { key: 'gpaReflected', label: 'GPA 반영' },
];

const termLabels = { FIRST: '1학기', SECOND: '2학기' };

const profileStore = useProfileStore();
const semesterStore = useSemesterStore();

const filters = reactive({ academicYear: '', term: '', courseName: '' });
const grades = ref([]);
const summary = ref({ totalGpa: 0, totalCredits: 0, queryGpa: 0, queryCredits: 0 });
const isLoadingProfile = ref(false);
const isLoadingGrades = ref(false);

const loadGrades = async () => {
  isLoadingGrades.value = true;
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
  } catch (error) {
    grades.value = [];
    await notify(error.response?.data?.message || '성적을 불러오지 못했습니다.');
  } finally {
    isLoadingGrades.value = false;
  }
};

const applyFilters = () => loadGrades();

onMounted(async () => {
  isLoadingProfile.value = true;
  try {
    await Promise.all([
      profileStore.fetchStudentProfile(),
      semesterStore.fetchSemesters(),
      loadGrades(),
    ]);
  } catch (error) {
    await notify(error.response?.data?.message || '학적 정보를 불러오지 못했습니다.');
  } finally {
    isLoadingProfile.value = false;
  }
});
</script>

<template>
  <MyPageContainer title="성적 조회" subtitle="확정된 취득 학점과 성적 상세를 확인합니다.">
    <section v-if="isLoadingProfile" class="state-card">
      학적 정보를 불러오는 중입니다...
    </section>

    <template v-else>
      <section class="summary-card">
        <div class="summary-item">
          <span class="summary-label">학적 상태</span>
          <strong class="summary-value">{{ ACADEMIC_STATUS_LABEL[profileStore.profile?.academicStatus] || profileStore.profile?.academicStatus || '-' }}</strong>
        </div>
        <div class="summary-item">
          <span class="summary-label">소속</span>
          <strong class="summary-value">{{ profileStore.profile?.departmentName || '-' }}</strong>
        </div>
      </section>

      <section class="summary-bar">
        <SummaryStatCard label="전체 GPA" :value="Number(summary.totalGpa).toFixed(2)" />
        <SummaryStatCard label="전체 취득 학점" :value="`${summary.totalCredits}학점`" />
        <SummaryStatCard label="조회 조건 GPA" :value="Number(summary.queryGpa).toFixed(2)" highlight />
        <SummaryStatCard label="조회 조건 학점" :value="`${summary.queryCredits}학점`" />
      </section>

      <MySearchFilter submit-text="조회" @search="applyFilters">
        <div class="search-group">
          <label for="filter-year">연도</label>
          <MySelect id="filter-year" v-model="filters.academicYear">
            <option value="">전체</option>
            <option v-for="year in semesterStore.academicYears" :key="year" :value="year">
              {{ year }}학년도
            </option>
          </MySelect>
        </div>
        <div class="search-group">
          <label for="filter-term">학기</label>
          <MySelect id="filter-term" v-model="filters.term">
            <option value="">전체</option>
            <option value="FIRST">1학기</option>
            <option value="SECOND">2학기</option>
          </MySelect>
        </div>
        <div class="search-group">
          <label for="filter-course-name">교과목명</label>
          <MyInput id="filter-course-name" v-model="filters.courseName" placeholder="교과목명 검색" />
        </div>
      </MySearchFilter>

      <MyTable
        :columns="columns"
        :loading="isLoadingGrades"
        :empty="!isLoadingGrades && grades.length === 0"
        empty-message="조회된 성적이 없습니다."
      >
        <tr v-for="grade in grades" :key="grade.enrollmentId">
          <td>{{ grade.academicYear }}학년도 {{ termLabels[grade.term] || grade.term }}</td>
          <td>
            <div class="course-name">{{ grade.courseName }}</div>
            <div class="course-code">{{ grade.courseCode }}</div>
          </td>
          <td>{{ grade.credits }}학점</td>
          <td>{{ grade.totalScore ?? '-' }}</td>
          <td>{{ grade.letterGrade || '-' }}</td>
          <td>{{ grade.reflectedInGpa ? 'O' : 'X' }}</td>
        </tr>
      </MyTable>
    </template>
  </MyPageContainer>
</template>

<style scoped>
.state-card {
  padding: 24px;
  border: 1px solid var(--personal-color-border-mist);
  border-radius: 8px;
  background: var(--personal-color-white);
  color: var(--personal-color-text-muted-slate);
}

.summary-card {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  margin-bottom: 16px;
}

.summary-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 20px;
  border: 1px solid var(--personal-color-border-mist);
  border-radius: var(--personal-radius);
  background: var(--personal-color-white);
}

.summary-label {
  color: var(--personal-color-text-muted-slate);
  font-size: 0.85rem;
}

.summary-value {
  color: var(--personal-color-primary-text-navy);
  font-size: 1.2rem;
}

.summary-bar {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 20px;
}

.course-name {
  font-weight: 600;
}

.course-code {
  margin-top: 2px;
  color: var(--personal-color-text-muted-slate);
  font-size: 0.78rem;
}

@media (max-width: 640px) {
  .summary-card,
  .summary-bar {
    grid-template-columns: 1fr;
  }
}
</style>
