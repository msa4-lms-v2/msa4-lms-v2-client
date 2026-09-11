<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { getCreditRequirementDiagnoses, getGraduationCreditRecords } from '../../api/gradeApi';
import MyPageContainer from '../../components/layout/MyPageContainer.vue';
import MyButton from '../../components/button/MyButton.vue';
import MyInput from '../../components/input/MyInput.vue';
import MySelect from '../../components/input/MySelect.vue';
import MyTable from '../../components/table/MyTable.vue';
import { notify } from '../../composables/useDialog';
import { useProfileStore } from '../../store/profile/useProfileStore';

defineOptions({ name: 'StudentGraduationDiagnosis' });

const profileStore = useProfileStore();
const diagnosis = ref(null);
const creditRecords = ref([]);
const isLoading = ref(false);
const isLoadingRecords = ref(false);
const filters = reactive({ academicYear: '', term: '', completionType: '', courseName: '' });

const requirementColumns = [
  { key: 'category', label: '구분' },
  { key: 'required', label: '기준' },
  { key: 'earned', label: '취득' },
  { key: 'shortage', label: '부족' },
  { key: 'status', label: '판정' },
];

const recordColumns = [
  { key: 'semester', label: '연도/학기' },
  { key: 'courseCode', label: '과목코드' },
  { key: 'courseName', label: '과목명' },
  { key: 'completionType', label: '이수구분' },
  { key: 'credits', label: '학점' },
  { key: 'grade', label: '성적' },
];

const completionTypeLabels = {
  MAJOR_REQUIRED: '전공필수',
  MAJOR_ELECTIVE: '전공선택',
  GENERAL_REQUIRED: '교양필수',
  GENERAL_ELECTIVE: '교양선택',
};

const termLabels = { FIRST: '1학기', SECOND: '2학기' };

const requirementRows = computed(() => {
  const item = diagnosis.value;
  if (!item) return [];
  return [
    { label: '전공 학점', required: item.requiredMajorCredits, earned: item.earnedMajorCredits, shortage: item.shortageMajorCredits },
    { label: '교양 학점', required: item.requiredGeneralCredits, earned: item.earnedGeneralCredits, shortage: item.shortageGeneralCredits },
    { label: '총 학점', required: item.requiredTotalCredits, earned: item.earnedTotalCredits, shortage: item.shortageTotalCredits },
  ].map((row) => ({
    ...row,
    satisfied: row.shortage !== null && Number(row.shortage) === 0,
  }));
});

const filteredRecords = computed(() => {
  const keyword = filters.courseName.trim().toLowerCase();
  if (!keyword) return creditRecords.value;
  return creditRecords.value.filter((record) => (
    record.courseName?.toLowerCase().includes(keyword)
    || record.courseCode?.toLowerCase().includes(keyword)
  ));
});

const earnedPercent = computed(() => {
  const required = Number(diagnosis.value?.requiredTotalCredits || 0);
  const earned = Number(diagnosis.value?.earnedTotalCredits || 0);
  return required ? Math.min(100, Math.round((earned / required) * 100)) : 0;
});

const graduationYear = computed(() => {
  const admissionYear = Number(diagnosis.value?.admissionYear || profileStore.profile?.admissionYear);
  return admissionYear ? admissionYear + 4 : null;
});

const completedSemesters = computed(() => {
  const gradeLevel = Number(profileStore.profile?.gradeLevel || 0);
  return gradeLevel ? gradeLevel * 2 : null;
});

const diagnosisStatusLabel = computed(() => {
  if (diagnosis.value?.diagnosisStatus === 'SATISFIED') return '충족';
  if (diagnosis.value?.diagnosisStatus === 'REQUIREMENT_NOT_CONFIGURED') return '요건 미설정';
  return '미충족';
});

const creditText = (value) => (value === null || value === undefined ? '-' : `${value}`);
const completionTypeLabel = (value) => completionTypeLabels[value] || value || '-';
const semesterLabel = (record) => `${record.academicYear}-${record.term === 'FIRST' ? 1 : 2}`;

const loadCreditRecords = async () => {
  if (!diagnosis.value?.studentId) {
    creditRecords.value = [];
    return;
  }
  isLoadingRecords.value = true;
  try {
    const response = await getGraduationCreditRecords(diagnosis.value.studentId, {
      page: 1,
      size: 100,
      academicYear: filters.academicYear || undefined,
      term: filters.term || undefined,
      completionType: filters.completionType || undefined,
      sortDirection: 'desc',
    });
    creditRecords.value = response.data.data.items || [];
  } catch (error) {
    creditRecords.value = [];
    await notify(error.response?.data?.message || '전체 이수과목을 불러오지 못했습니다.');
  } finally {
    isLoadingRecords.value = false;
  }
};

const loadDiagnosis = async () => {
  isLoading.value = true;
  try {
    const [diagnosisResponse] = await Promise.all([
      getCreditRequirementDiagnoses({ page: 1, size: 1 }, { pageLoad: true }),
      profileStore.fetchStudentProfile(),
    ]);
    diagnosis.value = diagnosisResponse.data.data.items?.[0] || null;
    await loadCreditRecords();
  } catch (error) {
    diagnosis.value = null;
    creditRecords.value = [];
    if (!error.config?.pageLoad) await notify(error.response?.data?.message || '졸업요건 진단을 불러오지 못했습니다.');
  } finally {
    isLoading.value = false;
  }
};

onMounted(loadDiagnosis);
</script>

<template>
  <MyPageContainer title="졸업요건 진단">
    <section v-if="isLoading" class="state-card">졸업요건 진단을 불러오는 중입니다...</section>

    <template v-else-if="diagnosis">
      <section class="diagnosis-overview">
        <div class="overview-item overview-standard">
          <span>현재 진단 기준</span>
          <strong>{{ diagnosis.admissionYear }}학년도 · {{ diagnosis.departmentName }}</strong>
        </div>
        <div class="overview-item">
          <span>졸업 예상 학기</span>
          <strong>{{ graduationYear ? `${graduationYear}년 2학기` : '-' }}</strong>
        </div>
        <div class="overview-item">
          <span>이수 학기</span>
          <strong>{{ completedSemesters === null ? '-' : completedSemesters }} <small>학기</small></strong>
        </div>
      </section>

      <section class="diagnosis-grid">
        <article class="credit-card">
          <h3>총 이수학점</h3>
          <div class="credit-summary">
            <div
              class="credit-ring"
              :style="{ '--earned-percent': `${earnedPercent * 3.6}deg` }"
              :aria-label="`총 이수학점 ${diagnosis.earnedTotalCredits}/${diagnosis.requiredTotalCredits}`"
            >
              <div>
                <strong>{{ diagnosis.earnedTotalCredits }}</strong>
                <span>/ {{ creditText(diagnosis.requiredTotalCredits) }}</span>
              </div>
            </div>
            <dl class="credit-breakdown">
              <div>
                <dt>전공 학점</dt>
                <dd>{{ diagnosis.earnedMajorCredits }} / {{ creditText(diagnosis.requiredMajorCredits) }}</dd>
              </div>
              <div>
                <dt>교양 학점</dt>
                <dd>{{ diagnosis.earnedGeneralCredits }} / {{ creditText(diagnosis.requiredGeneralCredits) }}</dd>
              </div>
              <div>
                <dt>필수 학점</dt>
                <dd>{{ diagnosis.earnedRequiredCredits }} / -</dd>
              </div>
            </dl>
          </div>
        </article>

        <article class="requirement-card">
          <div class="card-heading">
            <h3>졸업 요건</h3>
            <span :class="['overall-status', { satisfied: diagnosis.diagnosisStatus === 'SATISFIED' }]">
              {{ diagnosisStatusLabel }}
            </span>
          </div>
          <MyTable :columns="requirementColumns">
            <tr v-for="row in requirementRows" :key="row.label">
              <td class="requirement-label">{{ row.label }}</td>
              <td>{{ creditText(row.required) }}</td>
              <td>{{ creditText(row.earned) }}</td>
              <td>{{ creditText(row.shortage) }}</td>
              <td :class="row.satisfied ? 'result-pass' : 'result-fail'">
                {{ row.satisfied ? '충족' : '미충족' }}
              </td>
            </tr>
          </MyTable>
        </article>
      </section>

      <section class="completed-course-section">
        <h3>전체 이수과목</h3>
        <form class="course-filters" @submit.prevent="loadCreditRecords">
          <div class="filter-group">
            <label for="graduation-year">연도</label>
            <MySelect id="graduation-year" v-model="filters.academicYear">
              <option value="">전체</option>
              <option v-for="year in [...new Set(creditRecords.map((item) => item.academicYear))]" :key="year" :value="year">
                {{ year }}년
              </option>
            </MySelect>
          </div>
          <div class="filter-group">
            <label for="graduation-term">학기</label>
            <MySelect id="graduation-term" v-model="filters.term">
              <option value="">전체</option>
              <option v-for="(label, value) in termLabels" :key="value" :value="value">{{ label }}</option>
            </MySelect>
          </div>
          <div class="filter-group">
            <label for="graduation-completion-type">이수구분</label>
            <MySelect id="graduation-completion-type" v-model="filters.completionType">
              <option value="">전체</option>
              <option v-for="(label, value) in completionTypeLabels" :key="value" :value="value">{{ label }}</option>
            </MySelect>
          </div>
          <div class="filter-group course-name-filter">
            <label for="graduation-course-name">과목명</label>
            <MyInput id="graduation-course-name" v-model="filters.courseName" placeholder="과목명 입력" />
          </div>
          <MyButton btn-type="submit" color="deep-blue" size="middle" content="조회" />
        </form>

        <MyTable
          :columns="recordColumns"
          :loading="isLoadingRecords"
          :empty="!isLoadingRecords && filteredRecords.length === 0"
          empty-message="조회된 이수과목이 없습니다."
        >
          <tr v-for="record in filteredRecords" :key="record.enrollmentId">
            <td>{{ semesterLabel(record) }}</td>
            <td>{{ record.courseCode }}</td>
            <td>{{ record.courseName }}</td>
            <td>{{ completionTypeLabel(record.completionType) }}</td>
            <td>{{ record.credits }}</td>
            <td :class="{ 'excluded-grade': record.result === 'EXCLUDED' }">{{ record.letterGrade || '-' }}</td>
          </tr>
        </MyTable>
      </section>
    </template>

    <section v-else class="state-card">조회된 졸업요건 진단 결과가 없습니다.</section>
  </MyPageContainer>
</template>

<style scoped>
.state-card,
.diagnosis-overview,
.credit-card,
.requirement-card,
.course-filters {
  border: 1px solid var(--personal-color-border-mist);
  border-radius: 8px;
  background: var(--personal-color-white);
}

.state-card {
  padding: 32px;
  color: var(--personal-color-text-muted-slate);
  text-align: center;
}

.diagnosis-overview {
  display: grid;
  grid-template-columns: 1.35fr 0.75fr 0.45fr;
  gap: 24px;
  min-height: 116px;
  padding: 24px 36px;
}

.overview-item {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 12px;
}

.overview-item span {
  color: var(--personal-color-text-muted-slate);
  font-size: 0.78rem;
}

.overview-item strong {
  color: var(--personal-color-login-primary-navy);
  font-size: 1.42rem;
  font-weight: 800;
}

.overview-item small {
  margin-left: 5px;
  font-size: 0.68rem;
  font-weight: 500;
}

.diagnosis-grid {
  display: grid;
  grid-template-columns: minmax(330px, 0.8fr) minmax(600px, 1.7fr);
  gap: 30px;
  margin-top: 20px;
}

.credit-card,
.requirement-card {
  min-height: 250px;
  padding: 22px;
}

.credit-card h3,
.card-heading h3,
.completed-course-section > h3 {
  margin: 0;
  color: var(--personal-color-primary-text-navy);
  font-size: 1rem;
  font-weight: 800;
}

.credit-summary {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 42px;
  min-height: 175px;
}

.credit-ring {
  position: relative;
  display: grid;
  place-items: center;
  width: 142px;
  height: 142px;
  flex: 0 0 auto;
  border-radius: 50%;
  background: conic-gradient(
    var(--personal-color-primary-navy) 0 var(--earned-percent),
    var(--personal-color-border-mist) var(--earned-percent) 360deg
  );
}

.credit-ring::before {
  position: absolute;
  width: 104px;
  height: 104px;
  border-radius: 50%;
  background: var(--personal-color-white);
  content: '';
}

.credit-ring > div {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  color: var(--personal-color-login-primary-navy);
}

.credit-ring strong {
  font-size: 1.85rem;
  line-height: 1;
}

.credit-ring span {
  margin-top: 4px;
  font-size: 0.92rem;
  font-weight: 800;
}

.credit-breakdown {
  display: flex;
  flex-direction: column;
  gap: 13px;
  margin: 0;
}

.credit-breakdown div {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 22px;
}

.credit-breakdown dt {
  color: var(--personal-color-text-muted-slate);
  font-size: 0.78rem;
}

.credit-breakdown dd {
  margin: 0;
  color: var(--personal-color-login-primary-navy);
  font-size: 0.86rem;
  font-weight: 800;
  white-space: nowrap;
}

.card-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.overall-status {
  color: var(--personal-color-danger-coral);
  font-size: 0.74rem;
  font-weight: 800;
}

.overall-status.satisfied,
.result-pass {
  color: var(--personal-color-primary-navy);
}

.requirement-card :deep(.table-container) {
  border-radius: 0;
}

.requirement-card :deep(th),
.requirement-card :deep(td) {
  padding: 14px 12px;
  font-size: 0.75rem;
}

.requirement-label {
  background: var(--personal-color-table-header-smoke);
  font-weight: 800;
}

.result-fail,
.excluded-grade {
  color: var(--personal-color-danger-coral);
  font-weight: 800;
}

.completed-course-section {
  margin-top: 30px;
}

.completed-course-section > h3 {
  margin-bottom: 16px;
  font-size: 1.12rem;
}

.course-filters {
  display: grid;
  grid-template-columns: 150px 150px 150px minmax(220px, 1fr) 77px;
  align-items: end;
  gap: 18px;
  padding: 18px 22px;
  border-bottom-right-radius: 0;
  border-bottom-left-radius: 0;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.filter-group label {
  color: var(--personal-color-text-secondary-steel);
  font-size: 0.72rem;
  font-weight: 700;
}

.completed-course-section :deep(.table-container) {
  border-top: 0;
  border-top-left-radius: 0;
  border-top-right-radius: 0;
}

.completed-course-section :deep(th),
.completed-course-section :deep(td) {
  padding: 14px 16px;
  font-size: 0.76rem;
}

@media (max-width: 1100px) {
  .diagnosis-grid {
    grid-template-columns: 1fr;
  }

  .course-filters {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 700px) {
  .diagnosis-overview,
  .course-filters {
    grid-template-columns: 1fr;
  }

  .credit-summary {
    align-items: flex-start;
    flex-direction: column;
    gap: 24px;
  }

  .course-filters :deep(button) {
    width: 100%;
  }
}
</style>
