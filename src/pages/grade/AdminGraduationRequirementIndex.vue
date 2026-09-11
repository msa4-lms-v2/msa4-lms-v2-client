<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import myAxios from '../../api/myAxios';
import MyPageContainer from '../../components/layout/MyPageContainer.vue';
import MySearchFilter from '../../components/search/MySearchFilter.vue';
import MyInput from '../../components/input/MyInput.vue';
import MySelect from '../../components/input/MySelect.vue';
import MyButton from '../../components/button/MyButton.vue';
import MyTable from '../../components/table/MyTable.vue';
import PrevNextPagination from '../../components/pagination/PrevNextPagination.vue';
import { confirmDialog, notify } from '../../composables/useDialog';

defineOptions({ name: 'AdminGraduationRequirementIndex' });

const BASE_URL = '/api/academic/catalog/graduation-requirements';
const columns = [
  { key: 'department', label: '학과' },
  { key: 'year', label: '입학연도' },
  { key: 'major', label: '전공' },
  { key: 'general', label: '교양' },
  { key: 'total', label: '총학점' },
  { key: 'actions', label: '관리' },
];

const filters = reactive({ keyword: '', departmentId: '', admissionYear: '' });
const form = reactive({ id: null, departmentId: '', admissionYear: '', requiredMajorCredits: '', requiredGeneralCredits: '', requiredTotalCredits: '', reason: '' });
const departments = ref([]);
const requirements = ref([]);
const page = ref({ page: 1, size: 20, totalCount: 0, hasNext: false });
const isLoading = ref(false);
const isSaving = ref(false);
const isEdit = computed(() => Boolean(form.id));
const formTitle = computed(() => (isEdit.value ? '졸업요건 수정' : '졸업요건 등록'));

const resetForm = () => Object.assign(form, { id: null, departmentId: '', admissionYear: '', requiredMajorCredits: '', requiredGeneralCredits: '', requiredTotalCredits: '', reason: '' });
const createRequestId = () => globalThis.crypto?.randomUUID?.() || `graduation-requirement-${Date.now()}`;

const loadDepartments = async () => {
  try {
    const response = await myAxios.get('/api/academic/catalog/departments', { params: { page: 1, size: 100, active: true } });
    departments.value = response.data.data.items || [];
  } catch {
    departments.value = [];
  }
};

const load = async (pageNumber = 1) => {
  isLoading.value = true;
  try {
    const response = await myAxios.get(BASE_URL, {
      params: {
        page: pageNumber,
        size: 20,
        keyword: filters.keyword.trim() || undefined,
        departmentId: filters.departmentId || undefined,
        admissionYear: filters.admissionYear || undefined,
      },
    });
    const data = response.data.data;
    requirements.value = data.items || [];
    page.value = { page: data.page, size: data.size, totalCount: data.totalCount, hasNext: data.hasNext };
  } catch (error) {
    requirements.value = [];
    await notify(error.response?.data?.message || '졸업요건 목록을 불러오지 못했습니다.');
  } finally {
    isLoading.value = false;
  }
};

const applyFilters = () => load(1);

const edit = (item) => Object.assign(form, {
  id: item.id,
  departmentId: item.departmentId,
  admissionYear: item.admissionYear,
  requiredMajorCredits: item.requiredMajorCredits,
  requiredGeneralCredits: item.requiredGeneralCredits,
  requiredTotalCredits: item.requiredTotalCredits,
  reason: '',
});

const validate = () => {
  if (!form.departmentId) return '학과를 선택해 주세요.';
  if (!form.admissionYear) return '입학연도를 입력해 주세요.';
  if (form.requiredMajorCredits === '' || form.requiredGeneralCredits === '' || form.requiredTotalCredits === '') return '전공·교양·총학점을 모두 입력해 주세요.';
  if (Number(form.requiredMajorCredits) + Number(form.requiredGeneralCredits) > Number(form.requiredTotalCredits)) return '전공과 교양 기준의 합은 총학점을 초과할 수 없습니다.';
  if (isEdit.value && !form.reason.trim()) return '수정 사유를 입력해 주세요.';
  return '';
};

const payload = () => ({
  departmentId: Number(form.departmentId),
  admissionYear: Number(form.admissionYear),
  requiredMajorCredits: Number(form.requiredMajorCredits),
  requiredGeneralCredits: Number(form.requiredGeneralCredits),
  requiredTotalCredits: Number(form.requiredTotalCredits),
  ...(isEdit.value ? { reason: form.reason.trim() } : {}),
});

const save = async () => {
  const message = validate();
  if (message) return notify(message);
  if (!await confirmDialog(isEdit.value ? '졸업요건을 수정하시겠습니까?' : '졸업요건을 등록하시겠습니까?')) return;
  isSaving.value = true;
  try {
    const headers = { 'X-Request-Id': createRequestId() };
    if (isEdit.value) {
      await myAxios.patch(`${BASE_URL}/${form.id}`, payload(), { headers });
      await notify('졸업요건이 수정되었습니다.');
    } else {
      await myAxios.post(BASE_URL, payload(), { headers });
      await notify('졸업요건이 등록되었습니다.');
    }
    resetForm();
    await load(page.value.page || 1);
  } catch (error) {
    await notify(error.response?.data?.message || '졸업요건 저장에 실패했습니다.');
  } finally {
    isSaving.value = false;
  }
};

onMounted(async () => {
  await loadDepartments();
  await load();
});
</script>

<template>
  <MyPageContainer title="졸업요건 관리" subtitle="학과와 입학연도별 졸업 학점 기준을 관리합니다.">
    <MySearchFilter class="admin-search" submit-text="조회" @search="applyFilters">
      <div class="search-group"><label for="requirement-keyword">학과명/코드</label><MyInput id="requirement-keyword" v-model="filters.keyword" placeholder="컴퓨터공학과" /></div>
      <div class="search-group"><label for="requirement-department-filter">학과</label><MySelect id="requirement-department-filter" v-model="filters.departmentId"><option value="">전체</option><option v-for="department in departments" :key="department.id" :value="department.id">{{ department.name }}</option></MySelect></div>
      <div class="search-group"><label for="requirement-year-filter">입학연도</label><MyInput id="requirement-year-filter" v-model="filters.admissionYear" numeric-only placeholder="예: 2024" /></div>
    </MySearchFilter>

    <section class="form-card">
      <h3>{{ formTitle }}</h3>
      <div class="form-grid">
        <label>학과<MySelect v-model="form.departmentId"><option value="">선택</option><option v-for="department in departments" :key="department.id" :value="department.id">{{ department.name }}</option></MySelect></label>
        <label>입학연도<MyInput v-model="form.admissionYear" numeric-only placeholder="2024" /></label>
        <label>전공학점<MyInput v-model="form.requiredMajorCredits" numeric-only placeholder="60" /></label>
        <label>교양학점<MyInput v-model="form.requiredGeneralCredits" numeric-only placeholder="30" /></label>
        <label>총학점<MyInput v-model="form.requiredTotalCredits" numeric-only placeholder="130" /></label>
        <label v-if="isEdit" class="wide">수정 사유<MyInput v-model="form.reason" placeholder="교육과정 개편 반영" /></label>
      </div>
      <div class="actions">
        <MyButton v-if="isEdit" btn-type="button" class="secondary-button" color="white" size="middle" content="취소" @click="resetForm" />
        <MyButton btn-type="button" color="admin-indigo" size="middle" :content="isSaving ? '저장 중...' : '저장'" :disabled="isSaving" @click="save" />
      </div>
    </section>

    <MyTable :columns="columns" :loading="isLoading" :empty="!isLoading && requirements.length === 0" empty-message="조회된 졸업요건이 없습니다.">
      <tr v-for="item in requirements" :key="item.id">
        <td><div class="department-name">{{ item.departmentName }}</div><div class="department-code">{{ item.departmentCode }}</div></td>
        <td>{{ item.admissionYear }}</td>
        <td>{{ item.requiredMajorCredits }}학점</td>
        <td>{{ item.requiredGeneralCredits }}학점</td>
        <td>{{ item.requiredTotalCredits }}학점</td>
        <td><MyButton btn-type="button" class="secondary-button" color="white" size="small" content="수정" @click="edit(item)" /></td>
      </tr>
    </MyTable>
    <PrevNextPagination v-if="page.page > 1 || page.hasNext" :page="page.page" :has-next="page.hasNext" @page-change="load" />
  </MyPageContainer>
</template>

<style scoped>
.form-card { margin-bottom: 20px; padding: 18px; border: 1px solid var(--personal-color-border-mist); border-radius: 8px; background: var(--personal-color-white); }
.form-card h3 { margin: 0 0 14px; color: var(--personal-color-primary-text-navy); }
.form-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; }
.form-grid label { display: flex; flex-direction: column; gap: 8px; color: var(--personal-color-text-muted-slate); font-size: 0.85rem; font-weight: 700; }
.wide { grid-column: span 2; }
.actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px; }
.department-name { font-weight: 700; }
.department-code { margin-top: 3px; color: var(--personal-color-text-muted-slate); font-size: 0.8rem; }
.admin-search :deep(.deep-blue) { background: var(--personal-color-admin-secondary-indigo); }
:deep(.secondary-button) { border: 1px solid var(--personal-color-border-mist); color: var(--personal-color-admin-secondary-indigo); }
@media (max-width: 900px) { .form-grid { grid-template-columns: 1fr; } .wide { grid-column: auto; } }
</style>
