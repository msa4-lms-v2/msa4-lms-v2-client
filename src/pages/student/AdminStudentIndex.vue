<script setup>
import { onMounted, reactive, ref } from 'vue';
import myAxios from '../../api/myAxios';
import { searchStudents } from '../../api/studentApi';
import MyPageContainer from '../../components/layout/MyPageContainer.vue';
import MySearchFilter from '../../components/search/MySearchFilter.vue';
import MySelect from '../../components/input/MySelect.vue';
import MyInput from '../../components/input/MyInput.vue';
import MyTable from '../../components/table/MyTable.vue';
import MyStatusBadge from '../../components/common/MyStatusBadge.vue';
import PrevNextPagination from '../../components/pagination/PrevNextPagination.vue';
import { notify } from '../../composables/useDialog';

defineOptions({ name: 'AdminStudentIndex' });

const columns = [
  { key: 'name', label: '이름' },
  { key: 'department', label: '소속 학과' },
  { key: 'gradeLevel', label: '학년' },
  { key: 'admissionYear', label: '입학년도' },
  { key: 'status', label: '학적 상태' },
  { key: 'advisor', label: '지도교수' },
];

const statusLabels = { ENROLLED: '재학', ON_LEAVE: '휴학', WITHDRAWN: '자퇴', GRADUATED: '졸업', DISMISSED: '제적' };
const statusVariants = { ENROLLED: 'processing', GRADUATED: 'success', ON_LEAVE: 'warning', WITHDRAWN: 'fail', DISMISSED: 'fail' };

const filters = reactive({
  keyword: '',
  departmentId: '',
  gradeLevel: '',
  admissionYear: '',
  academicStatus: '',
});

const departments = ref([]);
const students = ref([]);
const page = ref({ page: 1, size: 20, totalCount: 0, hasNext: false });
const isLoading = ref(false);

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

const load = async (pageNumber = 1) => {
  isLoading.value = true;
  try {
    const response = await searchStudents({
      keyword: filters.keyword.trim() || undefined,
      departmentId: filters.departmentId || undefined,
      gradeLevel: filters.gradeLevel || undefined,
      admissionYear: filters.admissionYear || undefined,
      academicStatus: filters.academicStatus || undefined,
      page: pageNumber,
      size: 20,
    });
    const data = response.data.data;
    students.value = data.items || [];
    page.value = { page: data.page, size: data.size, totalCount: data.totalCount, hasNext: data.hasNext };
  } catch (error) {
    students.value = [];
    await notify(error.response?.data?.message || '학생 목록을 불러오지 못했습니다.');
  } finally {
    isLoading.value = false;
  }
};

const applyFilters = () => load(1);

onMounted(async () => {
  await loadDepartments();
  await load();
});
</script>

<template>
  <MyPageContainer title="학생 관리" subtitle="전체 학생을 이름·학과·학년·입학년도·학적 상태로 검색합니다.">
    <MySearchFilter submit-text="조회" @search="applyFilters">
      <div class="search-group">
        <label for="student-keyword">이름</label>
        <MyInput id="student-keyword" v-model="filters.keyword" placeholder="학생 이름" @keyup-enter="applyFilters" />
      </div>
      <div class="search-group">
        <label for="student-department">학과</label>
        <MySelect id="student-department" v-model="filters.departmentId">
          <option value="">전체</option>
          <option v-for="department in departments" :key="department.id" :value="department.id">
            {{ department.name }}
          </option>
        </MySelect>
      </div>
      <div class="search-group">
        <label for="student-grade">학년</label>
        <MyInput id="student-grade" v-model="filters.gradeLevel" numeric-only :max-number="10" placeholder="예: 3" />
      </div>
      <div class="search-group">
        <label for="student-year">입학년도</label>
        <MyInput id="student-year" v-model="filters.admissionYear" numeric-only placeholder="예: 2024" />
      </div>
      <div class="search-group">
        <label for="student-status">학적 상태</label>
        <MySelect id="student-status" v-model="filters.academicStatus">
          <option value="">전체</option>
          <option value="ENROLLED">재학</option>
          <option value="ON_LEAVE">휴학</option>
          <option value="WITHDRAWN">자퇴</option>
          <option value="GRADUATED">졸업</option>
          <option value="DISMISSED">제적</option>
        </MySelect>
      </div>
    </MySearchFilter>

    <MyTable
      :columns="columns"
      :loading="isLoading"
      :empty="!isLoading && students.length === 0"
      empty-message="조회된 학생이 없습니다."
    >
      <tr v-for="student in students" :key="student.studentId">
        <td>{{ student.name }}</td>
        <td>{{ student.departmentName }}</td>
        <td>{{ student.gradeLevel }}학년</td>
        <td>{{ student.admissionYear }}</td>
        <td>
          <MyStatusBadge :label="statusLabels[student.academicStatus] || student.academicStatus" :variant="statusVariants[student.academicStatus] || 'processing'" />
        </td>
        <td>{{ student.advisorName || '-' }}</td>
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
