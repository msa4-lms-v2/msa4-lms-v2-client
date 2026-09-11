<script setup>
import { onMounted, ref } from 'vue';
import { searchAcademicStatusHistories } from '../../api/academicStatusHistoryApi';
import myAxios from '../../api/myAxios';
import MyButton from '../../components/button/MyButton.vue';
import MyInput from '../../components/input/MyInput.vue';
import MySelect from '../../components/input/MySelect.vue';
import MyPageContainer from '../../components/layout/MyPageContainer.vue';
import PrevNextPagination from '../../components/pagination/PrevNextPagination.vue';
import MyTable from '../../components/table/MyTable.vue';
import { notify } from '../../composables/useDialog';
import { ACADEMIC_STATUS_LABEL } from '../../util/academic/enumLabels';
import { formatDate } from '../../util/format';

defineOptions({ name: 'AdminAcademicStatusHistoryIndex' });

const SOURCE_TYPE_LABEL = {
  LEAVE_REQUEST: '휴학·복학',
  WITHDRAWAL_REQUEST: '자퇴',
  DISMISSAL: '제적',
  ADMIN_CORRECTION: '관리자 정정',
  READMISSION: '재입학',
};

const SOURCE_TYPE_OPTIONS = [
  { value: '', label: '전체' },
  ...Object.entries(SOURCE_TYPE_LABEL).map(([value, label]) => ({ value, label })),
];

const STATUS_OPTIONS = [
  { value: '', label: '전체' },
  ...Object.entries(ACADEMIC_STATUS_LABEL).map(([value, label]) => ({ value, label })),
];

const columns = [
  { key: 'studentName', label: '학생' },
  { key: 'department', label: '소속 학과' },
  { key: 'transition', label: '학적 변경' },
  { key: 'sourceType', label: '원인' },
  { key: 'reason', label: '사유' },
  { key: 'createdAt', label: '기록 시각' },
];

const departmentOptions = ref([{ value: '', label: '전체' }]);
const histories = ref([]);
const page = ref({ page: 1, size: 20, totalCount: 0, hasNext: false });
const isLoading = ref(false);
const filters = ref({ keyword: '', departmentId: '', newStatus: '', sourceType: '', fromDate: '', toDate: '' });

const loadDepartments = async () => {
  try {
    const response = await myAxios.get('/api/academic/catalog/departments', { params: { page: 1, size: 100, active: true } });
    const departments = response.data.data.items || [];
    departmentOptions.value = [{ value: '', label: '전체' }, ...departments.map((d) => ({ value: d.id, label: d.name }))];
  } catch {
    departmentOptions.value = [{ value: '', label: '전체' }];
  }
};

const load = async (pageNumber = 1) => {
  isLoading.value = true;
  try {
    const response = await searchAcademicStatusHistories({
      page: pageNumber,
      size: 20,
      keyword: filters.value.keyword.trim() || undefined,
      departmentId: filters.value.departmentId || undefined,
      newStatus: filters.value.newStatus || undefined,
      sourceType: filters.value.sourceType || undefined,
      fromDate: filters.value.fromDate || undefined,
      toDate: filters.value.toDate || undefined,
    });
    const data = response.data.data;
    histories.value = data.items || [];
    page.value = { page: data.page, size: data.size, totalCount: data.totalCount, hasNext: data.hasNext };
  } catch (error) {
    histories.value = [];
    await notify(error.response?.data?.message || '학적 변경 이력을 불러오지 못했습니다.');
  } finally {
    isLoading.value = false;
  }
};

const resetFilters = () => {
  filters.value = { keyword: '', departmentId: '', newStatus: '', sourceType: '', fromDate: '', toDate: '' };
  load(1);
};

onMounted(async () => {
  await Promise.all([loadDepartments(), load()]);
});
</script>

<template>
  <MyPageContainer title="학적 변경 이력" subtitle="확정된 학적 변경만 표시하며 신청 대기·반려 내역은 포함하지 않습니다.">
    <section class="filter-card">
      <label>학생명<MyInput v-model="filters.keyword" placeholder="이름 검색" @keyup.enter="load(1)" /></label>
      <label>소속 학과<MySelect v-model="filters.departmentId" :options="departmentOptions" /></label>
      <label>변경 후 상태<MySelect v-model="filters.newStatus" :options="STATUS_OPTIONS" /></label>
      <label>원인<MySelect v-model="filters.sourceType" :options="SOURCE_TYPE_OPTIONS" /></label>
      <label>시작일<MyInput v-model="filters.fromDate" type="date" /></label>
      <label>종료일<MyInput v-model="filters.toDate" type="date" /></label>
      <div class="filter-actions">
        <MyButton class="admin-primary" color="deep-blue" size="middle" content="조회" @click="load(1)" />
        <MyButton class="reset-action" color="white" size="middle" content="초기화" @click="resetFilters" />
      </div>
    </section>

    <section class="list-card">
      <div class="section-title">
        <h3>변경 이력</h3><span>총 {{ page.totalCount }}건</span>
      </div>
      <div class="table-scroll">
        <MyTable
          :columns="columns"
          :loading="isLoading"
          :empty="!isLoading && !histories.length"
          empty-message="조회된 학적 변경 이력이 없습니다."
        >
          <tr v-for="item in histories" :key="item.historyId">
            <td>{{ item.studentName }}</td>
            <td>{{ item.departmentName }}</td>
            <td class="transition-cell">
              {{ ACADEMIC_STATUS_LABEL[item.previousStatus] || item.previousStatus }}
              <span class="arrow">→</span>
              {{ ACADEMIC_STATUS_LABEL[item.newStatus] || item.newStatus }}
            </td>
            <td>{{ SOURCE_TYPE_LABEL[item.sourceType] || item.sourceType }}</td>
            <td>{{ item.reason || '-' }}</td>
            <td>{{ formatDate(item.createdAt, 'YYYY-MM-DD HH:mm') }}</td>
          </tr>
        </MyTable>
      </div>
      <PrevNextPagination
        v-if="page.page > 1 || page.hasNext"
        :page="page.page"
        :has-next="page.hasNext"
        @page-change="load"
      />
    </section>
  </MyPageContainer>
</template>

<style scoped>
.filter-card { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; align-items: end; padding: 20px; margin-bottom: 20px; border: 1px solid var(--personal-color-border-mist); border-radius: 10px; background: white; }
.filter-card label { display: flex; flex-direction: column; gap: 6px; font-size: .78rem; font-weight: 600; }
.filter-actions { display: flex; gap: 8px; justify-content: flex-end; grid-column: span 3; }
.reset-action { border: 1px solid var(--personal-color-black); }
.admin-primary { background: var(--personal-color-admin-secondary-indigo); }
.list-card { padding: 18px; border: 1px solid var(--personal-color-border-mist); border-radius: 10px; background: white; }
.section-title { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; }
.section-title h3 { margin: 0; font-size: 1rem; }
.section-title span { color: var(--personal-color-admin-secondary-indigo); font-size: .8rem; font-weight: 700; }
.table-scroll { overflow-x: auto; }
.transition-cell { display: flex; align-items: center; gap: 8px; white-space: nowrap; }
.transition-cell .arrow { color: var(--personal-color-text-muted-slate); }
@media (max-width: 900px) {
  .filter-card { grid-template-columns: repeat(2, 1fr); }
  .filter-actions { grid-column: span 2; }
}
@media (max-width: 560px) {
  .filter-card { grid-template-columns: 1fr; }
  .filter-actions { grid-column: span 1; justify-content: flex-end; }
}
</style>
