<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import myAxios from '../../api/myAxios';
import { getCreditRequirementDiagnoses, getGraduationCreditRecords } from '../../api/gradeApi';
import MyButton from '../../components/button/MyButton.vue';
import MyInput from '../../components/input/MyInput.vue';
import MySelect from '../../components/input/MySelect.vue';
import MyPageContainer from '../../components/layout/MyPageContainer.vue';
import PrevNextPagination from '../../components/pagination/PrevNextPagination.vue';
import MySearchFilter from '../../components/search/MySearchFilter.vue';
import MyTable from '../../components/table/MyTable.vue';
import { notify } from '../../composables/useDialog';
import { useAuthStore } from '../../store/auth/useAuthStore';
import { ACADEMIC_STATUS_LABEL, ACADEMIC_STATUS_VARIANT } from '../../util/academic/enumLabels';

defineOptions({ name: 'GraduationDiagnosisManagement' });

const authStore = useAuthStore();
const isAdmin = computed(() => authStore.userInfo?.role === 'ADMIN');
const departments = ref([]);
const diagnoses = ref([]);
const selectedDiagnosis = ref(null);
const creditRecords = ref([]);
const isLoading = ref(false);
const isLoadingRecords = ref(false);
const page = ref({ page: 1, size: 20, totalCount: 0, hasNext: false });
const recordPage = ref({ page: 1, size: 10, totalCount: 0, hasNext: false });

const filters = reactive({
  keyword: '',
  departmentId: '',
  admissionYear: '',
  academicStatus: '',
  diagnosisStatus: '',
  sortBy: 'studentName',
  sortDirection: 'asc',
});

const recordFilters = reactive({
  academicYear: '',
  term: '',
  completionType: '',
  result: '',
});

const diagnosisColumns = [
  { key: 'student', label: '학생' },
  { key: 'department', label: '학과 / 입학년도' },
  { key: 'academicStatus', label: '학적 상태' },
  { key: 'majorCredits', label: '전공 학점' },
  { key: 'generalCredits', label: '교양 학점' },
  { key: 'totalCredits', label: '총 학점' },
  { key: 'diagnosis', label: '진단 결과' },
  { key: 'detail', label: '상세' },
];

const recordColumns = [
  { key: 'semester', label: '연도 / 학기' },
  { key: 'course', label: '교과목' },
  { key: 'completionType', label: '이수구분' },
  { key: 'credits', label: '신청 학점' },
  { key: 'grade', label: '성적' },
  { key: 'appliedCredits', label: '인정 학점' },
  { key: 'result', label: '반영 결과' },
];

const diagnosisStatus = {
  SATISFIED: { label: '충족', variant: 'success' },
  NOT_SATISFIED: { label: '미충족', variant: 'fail' },
  REQUIREMENT_NOT_CONFIGURED: { label: '요건 미설정', variant: 'warning' },
};

const completionTypeLabels = {
  MAJOR_REQUIRED: '전공필수',
  MAJOR_ELECTIVE: '전공선택',
  GENERAL_REQUIRED: '교양필수',
  GENERAL_ELECTIVE: '교양선택',
};

const resultLabels = { APPLIED: '반영', EXCLUDED: '제외' };
const termLabels = { FIRST: '1학기', SECOND: '2학기' };

const subtitle = computed(() => (
  authStore.userInfo?.role === 'ADMIN'
    ? '전체 학생의 졸업요건 충족 여부와 학점 반영 근거를 확인합니다.'
    : '담당 강의·지도 학생·소속 학과 범위의 졸업요건 충족 여부를 확인합니다.'
));

const requirementRows = computed(() => {
  const item = selectedDiagnosis.value;
  if (!item) return [];
  return [
    { label: '전공 학점', earned: item.earnedMajorCredits, required: item.requiredMajorCredits, shortage: item.shortageMajorCredits },
    { label: '교양 학점', earned: item.earnedGeneralCredits, required: item.requiredGeneralCredits, shortage: item.shortageGeneralCredits },
    { label: '총 학점', earned: item.earnedTotalCredits, required: item.requiredTotalCredits, shortage: item.shortageTotalCredits },
  ];
});

const badge = (status) => diagnosisStatus[status] || { label: status || '-', variant: 'processing' };
const creditText = (value) => (value === null || value === undefined ? '-' : value);
const creditRatio = (earned, required) => `${creditText(earned)} / ${creditText(required)}`;
const semesterLabel = (record) => `${record.academicYear}년 ${termLabels[record.term] || record.term || '-'}`;

const loadDepartments = async () => {
  try {
    const response = await myAxios.get('/api/academic/catalog/departments', {
      params: { page: 1, size: 100, active: true },
    });
    departments.value = response.data.data.items || [];
  } catch {
    departments.value = [];
  }
};

const loadDiagnoses = async (pageNumber = 1) => {
  isLoading.value = true;
  selectedDiagnosis.value = null;
  creditRecords.value = [];
  try {
    const response = await getCreditRequirementDiagnoses({
      page: pageNumber,
      size: 20,
      keyword: filters.keyword.trim() || undefined,
      departmentId: filters.departmentId || undefined,
      admissionYear: filters.admissionYear || undefined,
      academicStatus: filters.academicStatus || undefined,
      diagnosisStatus: filters.diagnosisStatus || undefined,
      sortBy: filters.sortBy,
      sortDirection: filters.sortDirection,
    });
    const data = response.data.data;
    diagnoses.value = data.items || [];
    page.value = {
      page: data.page,
      size: data.size,
      totalCount: data.totalCount,
      hasNext: data.hasNext,
    };
  } catch (error) {
    diagnoses.value = [];
    await notify(error.response?.data?.message || '졸업요건 진단 현황을 불러오지 못했습니다.');
  } finally {
    isLoading.value = false;
  }
};

const loadCreditRecords = async (pageNumber = 1) => {
  if (!selectedDiagnosis.value?.studentId) return;
  isLoadingRecords.value = true;
  try {
    const response = await getGraduationCreditRecords(selectedDiagnosis.value.studentId, {
      page: pageNumber,
      size: 10,
      academicYear: recordFilters.academicYear || undefined,
      term: recordFilters.term || undefined,
      completionType: recordFilters.completionType || undefined,
      result: recordFilters.result || undefined,
      sortDirection: 'desc',
    });
    const data = response.data.data;
    creditRecords.value = data.items || [];
    recordPage.value = {
      page: data.page,
      size: data.size,
      totalCount: data.totalCount,
      hasNext: data.hasNext,
    };
  } catch (error) {
    creditRecords.value = [];
    await notify(error.response?.data?.message || '학생의 학점 반영 내역을 불러오지 못했습니다.');
  } finally {
    isLoadingRecords.value = false;
  }
};

const selectDiagnosis = async (item) => {
  selectedDiagnosis.value = item;
  Object.assign(recordFilters, { academicYear: '', term: '', completionType: '', result: '' });
  creditRecords.value = [];
  await loadCreditRecords(1);
};

onMounted(async () => {
  await Promise.all([loadDepartments(), loadDiagnoses()]);
});
</script>

<template>
  <MyPageContainer :class="isAdmin ? 'admin-role' : 'professor-role'" title="졸업요건 진단 현황" :subtitle="subtitle">
    <MySearchFilter :class="isAdmin ? 'admin-search' : 'professor-search'" submit-text="조회" @search="loadDiagnoses(1)">
      <div class="search-group">
        <label for="diagnosis-keyword">학생 이름</label>
        <MyInput id="diagnosis-keyword" v-model="filters.keyword" placeholder="학생 이름" @keyup-enter="loadDiagnoses(1)" />
      </div>
      <div class="search-group">
        <label for="diagnosis-department">학과</label>
        <MySelect id="diagnosis-department" v-model="filters.departmentId">
          <option value="">전체</option>
          <option v-for="department in departments" :key="department.id" :value="department.id">
            {{ department.name }}
          </option>
        </MySelect>
      </div>
      <div class="search-group compact-filter">
        <label for="diagnosis-year">입학년도</label>
        <MyInput id="diagnosis-year" v-model="filters.admissionYear" numeric-only placeholder="예: 2024" @keyup-enter="loadDiagnoses(1)" />
      </div>
      <div class="search-group">
        <label for="diagnosis-academic-status">학적 상태</label>
        <MySelect id="diagnosis-academic-status" v-model="filters.academicStatus">
          <option value="">전체</option>
          <option v-for="(label, value) in ACADEMIC_STATUS_LABEL" :key="value" :value="value">{{ label }}</option>
        </MySelect>
      </div>
      <div class="search-group">
        <label for="diagnosis-status">진단 결과</label>
        <MySelect id="diagnosis-status" v-model="filters.diagnosisStatus">
          <option value="">전체</option>
          <option v-for="(item, value) in diagnosisStatus" :key="value" :value="value">{{ item.label }}</option>
        </MySelect>
      </div>
      <div class="search-group">
        <label for="diagnosis-sort">정렬</label>
        <MySelect id="diagnosis-sort" v-model="filters.sortBy">
          <option value="studentName">학생 이름</option>
          <option value="departmentName">학과</option>
          <option value="admissionYear">입학년도</option>
        </MySelect>
      </div>
      <div class="search-group compact-filter">
        <label for="diagnosis-direction">순서</label>
        <MySelect id="diagnosis-direction" v-model="filters.sortDirection">
          <option value="asc">오름차순</option>
          <option value="desc">내림차순</option>
        </MySelect>
      </div>
    </MySearchFilter>

    <div class="result-summary">
      <span>조회 결과</span>
      <strong>{{ page.totalCount.toLocaleString() }}명</strong>
    </div>

    <MyTable
      :columns="diagnosisColumns"
      :loading="isLoading"
      :empty="!isLoading && diagnoses.length === 0"
      empty-message="조회된 졸업요건 진단 결과가 없습니다."
    >
      <tr v-for="item in diagnoses" :key="item.studentId" :class="{ 'selected-row': selectedDiagnosis?.studentId === item.studentId }">
        <td class="student-cell">
          <strong>{{ item.studentName }}</strong>
          <span>학생 ID {{ item.studentId }}</span>
        </td>
        <td>
          <strong>{{ item.departmentName }}</strong>
          <span class="sub-text">{{ item.admissionYear }}학번</span>
        </td>
        <td>
          <span :class="['status-badge', `status-badge--${ACADEMIC_STATUS_VARIANT[item.academicStatus] || 'processing'}`]">
            {{ ACADEMIC_STATUS_LABEL[item.academicStatus] || item.academicStatus }}
          </span>
        </td>
        <td>{{ creditRatio(item.earnedMajorCredits, item.requiredMajorCredits) }}</td>
        <td>{{ creditRatio(item.earnedGeneralCredits, item.requiredGeneralCredits) }}</td>
        <td class="total-credit">{{ creditRatio(item.earnedTotalCredits, item.requiredTotalCredits) }}</td>
        <td class="diagnosis-cell">
          <span :class="['status-badge', `status-badge--${badge(item.diagnosisStatus).variant}`]">
            {{ badge(item.diagnosisStatus).label }}
          </span>
          <span class="reason-text">{{ item.reason || '-' }}</span>
        </td>
        <td>
          <MyButton
            :class="selectedDiagnosis?.studentId === item.studentId ? '' : (isAdmin ? 'admin-secondary' : 'professor-secondary')"
            size="middle"
            :color="selectedDiagnosis?.studentId === item.studentId ? 'gray' : 'white'"
            :content="selectedDiagnosis?.studentId === item.studentId ? '선택됨' : '상세'"
            :disabled="selectedDiagnosis?.studentId === item.studentId"
            @click="selectDiagnosis(item)"
          />
        </td>
      </tr>
    </MyTable>

    <PrevNextPagination
      v-if="page.page > 1 || page.hasNext"
      :page="page.page"
      :has-next="page.hasNext"
      @page-change="loadDiagnoses"
    />

    <section v-if="selectedDiagnosis" class="detail-section">
      <div class="detail-heading">
        <div>
          <span class="section-eyebrow">학생별 상세</span>
          <h2>{{ selectedDiagnosis.studentName }} 졸업요건 진단</h2>
          <p>{{ selectedDiagnosis.departmentName }} · {{ selectedDiagnosis.admissionYear }}학번</p>
        </div>
        <span :class="['status-badge detail-status', `status-badge--${badge(selectedDiagnosis.diagnosisStatus).variant}`]">
          {{ badge(selectedDiagnosis.diagnosisStatus).label }}
        </span>
      </div>

      <div class="credit-overview">
        <article v-for="row in requirementRows" :key="row.label" class="credit-card">
          <span>{{ row.label }}</span>
          <strong>{{ creditRatio(row.earned, row.required) }}</strong>
          <small>취득 / 기준</small>
          <p v-if="row.shortage !== null">부족 {{ row.shortage }}학점</p>
          <p v-else>졸업요건 기준 미설정</p>
        </article>
        <article class="credit-card required-card">
          <span>필수 / 선택 취득</span>
          <strong>{{ selectedDiagnosis.earnedRequiredCredits }} / {{ selectedDiagnosis.earnedElectiveCredits }}</strong>
          <small>필수 / 선택</small>
          <p>{{ selectedDiagnosis.reason || '진단 사유가 없습니다.' }}</p>
        </article>
      </div>

      <div class="record-heading">
        <div>
          <h3>학점 반영 내역</h3>
          <p>확정된 성적 가운데 졸업학점에 반영되거나 제외된 근거입니다.</p>
        </div>
        <strong>{{ recordPage.totalCount.toLocaleString() }}건</strong>
      </div>

      <MySearchFilter :class="isAdmin ? 'admin-search' : 'professor-search'" submit-text="조회" submit-at-end @search="loadCreditRecords(1)">
        <div class="search-group compact-filter">
          <label for="record-year">수강 연도</label>
          <MyInput id="record-year" v-model="recordFilters.academicYear" numeric-only placeholder="예: 2025" @keyup-enter="loadCreditRecords(1)" />
        </div>
        <div class="search-group">
          <label for="record-term">학기</label>
          <MySelect id="record-term" v-model="recordFilters.term">
            <option value="">전체</option>
            <option v-for="(label, value) in termLabels" :key="value" :value="value">{{ label }}</option>
          </MySelect>
        </div>
        <div class="search-group">
          <label for="record-completion">이수구분</label>
          <MySelect id="record-completion" v-model="recordFilters.completionType">
            <option value="">전체</option>
            <option v-for="(label, value) in completionTypeLabels" :key="value" :value="value">{{ label }}</option>
          </MySelect>
        </div>
        <div class="search-group">
          <label for="record-result">반영 결과</label>
          <MySelect id="record-result" v-model="recordFilters.result">
            <option value="">전체</option>
            <option v-for="(label, value) in resultLabels" :key="value" :value="value">{{ label }}</option>
          </MySelect>
        </div>
      </MySearchFilter>

      <MyTable
        :columns="recordColumns"
        :loading="isLoadingRecords"
        :empty="!isLoadingRecords && creditRecords.length === 0"
        empty-message="조회된 학점 반영 내역이 없습니다."
      >
        <tr v-for="record in creditRecords" :key="record.enrollmentId">
          <td>{{ semesterLabel(record) }}</td>
          <td class="course-cell">
            <strong>{{ record.courseName }}</strong>
            <span>{{ record.courseCode }}</span>
          </td>
          <td>{{ completionTypeLabels[record.completionType] || record.completionType || '-' }}</td>
          <td>{{ record.credits }}</td>
          <td>{{ record.letterGrade || '-' }}</td>
          <td class="total-credit">{{ record.appliedCredits }}</td>
          <td class="diagnosis-cell">
            <span :class="['status-badge', record.result === 'APPLIED' ? 'status-badge--success' : 'status-badge--warning']">
              {{ resultLabels[record.result] || record.result || '-' }}
            </span>
            <span v-if="record.result === 'EXCLUDED'" class="reason-text">
              {{ record.exclusionMessage || record.exclusionReason || '-' }}
            </span>
          </td>
        </tr>
      </MyTable>

      <PrevNextPagination
        v-if="recordPage.page > 1 || recordPage.hasNext"
        :page="recordPage.page"
        :has-next="recordPage.hasNext"
        @page-change="loadCreditRecords"
      />
    </section>
  </MyPageContainer>
</template>

<style scoped>
.admin-role {
  --role-accent: var(--personal-color-admin-secondary-indigo);
  --role-selection: var(--personal-color-indigo-soft-lavender);
}

.professor-role {
  --role-accent: var(--personal-color-professor-primary-navy);
  --role-selection: var(--personal-color-info-soft-ice);
}

.result-summary {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin: 0 0 12px;
  color: var(--personal-color-text-secondary-steel);
  font-size: 0.86rem;
}

.result-summary strong {
  color: var(--role-accent);
  font-size: 1rem;
}

:deep(.compact-filter input),
:deep(.compact-filter select) {
  min-width: 125px;
  width: 125px;
}

:deep(.my-table) {
  min-width: 1060px;
}

:deep(.table-container) {
  overflow-x: auto;
}

:deep(.my-table td) {
  padding: 15px 12px;
  font-size: 0.82rem;
}

.student-cell,
.course-cell,
.diagnosis-cell {
  text-align: left;
}

.student-cell strong,
.course-cell strong,
.diagnosis-cell .status-badge {
  display: block;
  margin-bottom: 5px;
}

.student-cell span,
.course-cell span,
.sub-text,
.reason-text {
  display: block;
  color: var(--personal-color-text-muted-slate);
  font-size: 0.72rem;
}

.total-credit {
  color: var(--role-accent);
  font-weight: 800;
}

.status-badge {
  white-space: nowrap;
}

.status-badge--success {
  color: var(--personal-color-status-success-text-forest);
}

.status-badge--processing {
  color: var(--personal-color-status-processing-text-navy);
}

.status-badge--warning {
  color: var(--personal-color-status-warning-text-amber);
}

.status-badge--fail {
  color: var(--personal-color-status-fail-text-maroon);
}

.selected-row {
  background: var(--role-selection);
}

.detail-section {
  margin-top: 36px;
  padding-top: 30px;
  border-top: 2px solid var(--personal-color-border-mist);
}

.detail-heading,
.record-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
}

.section-eyebrow {
  color: var(--role-accent);
  font-size: 0.74rem;
  font-weight: 800;
}

.detail-heading h2,
.record-heading h3 {
  margin: 6px 0;
  color: var(--personal-color-primary-text-navy);
}

.detail-heading h2 {
  font-size: 1.28rem;
}

.detail-heading p,
.record-heading p {
  margin: 0;
  color: var(--personal-color-text-muted-slate);
  font-size: 0.8rem;
}

.detail-status {
  margin-top: 8px;
}

.credit-overview {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
  margin: 22px 0 32px;
}

.credit-card {
  display: flex;
  flex-direction: column;
  min-height: 138px;
  padding: 20px;
  border: 1px solid var(--personal-color-border-mist);
  border-radius: 8px;
  background: var(--personal-color-white);
}

.credit-card > span,
.credit-card small {
  color: var(--personal-color-text-muted-slate);
  font-size: 0.74rem;
}

.credit-card strong {
  margin-top: 14px;
  color: var(--role-accent);
  font-size: 1.32rem;
}

.credit-card p {
  margin: auto 0 0;
  color: var(--personal-color-danger-coral);
  font-size: 0.74rem;
  font-weight: 700;
}

.required-card p {
  color: var(--personal-color-text-secondary-steel);
  font-weight: 500;
}

.record-heading {
  align-items: flex-end;
  margin-bottom: 16px;
}

.record-heading h3 {
  font-size: 1.08rem;
}

.record-heading > strong {
  color: var(--role-accent);
  font-size: 0.9rem;
}

.admin-search :deep(button.deep-blue) {
  background: var(--personal-color-admin-secondary-indigo);
}

.professor-search :deep(button.deep-blue) {
  background: var(--personal-color-professor-primary-navy);
}

.admin-secondary,
.professor-secondary {
  border: 1px solid var(--personal-color-border-mist);
  background: var(--personal-color-white);
}

.admin-secondary {
  color: var(--personal-color-admin-secondary-indigo);
}

.professor-secondary {
  color: var(--personal-color-professor-primary-navy);
}

@media (max-width: 1100px) {
  .credit-overview {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 700px) {
  .credit-overview {
    grid-template-columns: 1fr;
  }

  .detail-heading,
  .record-heading {
    flex-direction: column;
  }
}
</style>
