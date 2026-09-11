<script setup>
import { onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { getAcademicScheduleTemplates, searchAcademicSchedules } from '../../api/academicScheduleApi';
import MyButton from '../../components/button/MyButton.vue';
import MySelect from '../../components/input/MySelect.vue';
import MyInput from '../../components/input/MyInput.vue';
import MyPageContainer from '../../components/layout/MyPageContainer.vue';
import PrevNextPagination from '../../components/pagination/PrevNextPagination.vue';
import MySearchFilter from '../../components/search/MySearchFilter.vue';
import MyTable from '../../components/table/MyTable.vue';
import { notify } from '../../composables/useDialog';

defineOptions({ name: 'AcademicScheduleIndex' });

const router = useRouter();
const columns = [
  { key: 'title', label: '일정명' },
  { key: 'targetRole', label: '공지 대상' },
  { key: 'academicYear', label: '연도' },
  { key: 'term', label: '학기' },
  { key: 'category', label: '일정 분류' },
  { key: 'createdAt', label: '작성일' },
  { key: 'detail', label: '상세' },
];
const targetRoleLabel = { ALL: '전체', STUDENT: '학생', PROFESSOR: '교수' };
const termLabel = { FIRST: '1학기', SECOND: '2학기' };

const filters = reactive({ keyword: '', targetRole: '', category: '', academicYear: '', term: '' });
const templates = ref([]);
const schedules = ref([]);
const page = ref({ page: 1, totalCount: 0, hasNext: false });
const loading = ref(false);

const formatDateTime = (value) => value ? value.replace('T', ' ').slice(0, 16) : '-';

const loadTemplates = async () => {
  try {
    templates.value = (await getAcademicScheduleTemplates()).data.data || [];
  } catch (error) {
    await notify(error.response?.data?.message || '일정 분류를 불러오지 못했습니다.');
  }
};

const load = async (pageNumber = 1) => {
  loading.value = true;
  try {
    const { data } = await searchAcademicSchedules({
      page: pageNumber,
      size: 20,
      keyword: filters.keyword.trim() || undefined,
      targetRole: filters.targetRole || undefined,
      category: filters.category || undefined,
      academicYear: filters.academicYear || undefined,
      term: filters.term || undefined,
    });
    schedules.value = data.data.items || [];
    page.value = data.data;
  } catch (error) {
    schedules.value = [];
    await notify(error.response?.data?.message || '학사일정 목록을 불러오지 못했습니다.');
  } finally {
    loading.value = false;
  }
};

const resetFilters = () => {
  Object.assign(filters, { keyword: '', targetRole: '', category: '', academicYear: '', term: '' });
  load(1);
};

onMounted(async () => {
  await loadTemplates();
  await load();
});
</script>

<template>
  <MyPageContainer title="학사일정 목록" subtitle="일정 분류와 기간을 관리하고, 실제 접수 기간을 함께 설정합니다.">
    <MySearchFilter :show-submit="false">
      <div class="search-group"><label for="schedule-keyword">통합 검색</label><MyInput id="schedule-keyword" v-model="filters.keyword" placeholder="일정명 검색" @keyup-enter="load(1)" /></div>
      <div class="search-group"><label for="schedule-target">대상</label><MySelect id="schedule-target" v-model="filters.targetRole"><option value="">전체</option><option value="ALL">전체 공지</option><option value="STUDENT">학생</option><option value="PROFESSOR">교수</option></MySelect></div>
      <div class="search-group"><label for="schedule-category">일정 분류</label><MySelect id="schedule-category" v-model="filters.category"><option value="">전체</option><option v-for="template in templates" :key="template.category" :value="template.category">{{ template.label }}</option></MySelect></div>
      <div class="search-group"><label for="schedule-year">연도</label><MyInput id="schedule-year" v-model="filters.academicYear" numeric-only placeholder="예: 2026" /></div>
      <div class="search-group"><label for="schedule-term">학기</label><MySelect id="schedule-term" v-model="filters.term"><option value="">전체</option><option value="FIRST">1학기</option><option value="SECOND">2학기</option></MySelect></div>
      <MyButton btn-type="button" color="deep-blue" size="middle" content="조회" @click="load(1)" />
      <MyButton btn-type="button" color="white" size="middle" content="초기화" @click="resetFilters" />
    </MySearchFilter>

    <div class="list-heading"><div><h3>검색 결과</h3><span>총 {{ page.totalCount || 0 }}개 일정</span></div><MyButton btn-type="button" color="deep-blue" size="middle" content="학사일정 작성" @click="router.push({ name: 'AcademicScheduleCreate' })" /></div>
    <MyTable :columns="columns" :loading="loading" :empty="!loading && schedules.length === 0" empty-message="조회된 학사일정이 없습니다.">
      <tr v-for="schedule in schedules" :key="schedule.id">
        <td>{{ schedule.title }}</td><td>{{ targetRoleLabel[schedule.targetRole] || schedule.targetRole }}</td><td>{{ schedule.academicYear }}학년도</td><td>{{ termLabel[schedule.term] || schedule.term }}</td><td>{{ schedule.categoryLabel }}</td><td>{{ formatDateTime(schedule.createdAt) }}</td>
        <td><MyButton btn-type="button" color="deep-blue" size="small" content="상세" @click="router.push({ name: 'AcademicScheduleDetail', params: { scheduleId: schedule.id } })" /></td>
      </tr>
    </MyTable>
    <PrevNextPagination v-if="page.page > 1 || page.hasNext" :page="page.page" :has-next="page.hasNext" @page-change="load" />
  </MyPageContainer>
</template>

<style scoped>
.list-heading { display:flex; justify-content:space-between; align-items:center; margin:24px 0 12px; }
.list-heading h3 { margin:0 0 4px; font-size:1rem; }.list-heading span { color:var(--personal-color-link-blue); font-size:.86rem; font-weight:600; }
</style>
