<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { getCollegeOptions, searchDepartments } from '../../api/departmentApi';
import MyButton from '../../components/button/MyButton.vue';
import MyInput from '../../components/input/MyInput.vue';
import MySelect from '../../components/input/MySelect.vue';
import MyPageContainer from '../../components/layout/MyPageContainer.vue';
import NumberedPagination from '../../components/pagination/NumberedPagination.vue';
import MySearchFilter from '../../components/search/MySearchFilter.vue';
import MyTable from '../../components/table/MyTable.vue';
import { notify } from '../../composables/useDialog';

defineOptions({ name: 'AdminDepartmentIndex' });

const router = useRouter();
const columns = [
  { key: 'code', label: '학과 코드' },
  { key: 'name', label: '학과명' },
  { key: 'college', label: '단과대학' },
  { key: 'status', label: '운영 상태' },
  { key: 'detail', label: '상세' },
];

const filters = reactive({
  keyword: '',
  collegeId: '',
  active: '',
});
const colleges = ref([]);
const departments = ref([]);
const page = ref({ page: 1, totalCount: 0, hasNext: false });
const isLoading = ref(false);

const totalCount = computed(() => page.value.totalCount || 0);

const loadColleges = async () => {
  try {
    colleges.value = await getCollegeOptions();
  } catch {
    colleges.value = [];
  }
};

const load = async (pageNumber = 1) => {
  isLoading.value = true;

  try {
    const { data } = await searchDepartments({
      page: pageNumber,
      size: 20,
      keyword: filters.keyword.trim() || undefined,
      collegeId: filters.collegeId || undefined,
      active: filters.active === '' ? undefined : filters.active === 'true',
    });
    const result = data.data;

    departments.value = result.items || [];
    page.value = {
      page: result.page,
      totalCount: result.totalCount,
      hasNext: result.hasNext,
    };
  } catch (error) {
    departments.value = [];
    await notify(error.response?.data?.message || '학과 목록을 불러오지 못했습니다.');
  } finally {
    isLoading.value = false;
  }
};

const resetFilters = () => {
  Object.assign(filters, { keyword: '', collegeId: '', active: '' });
  load(1);
};

onMounted(async () => {
  await loadColleges();
  await load();
});
</script>

<template>
  <MyPageContainer title="학과 목록">
    <MySearchFilter :show-submit="false">
      <div class="search-group">
        <label for="department-keyword">통합 검색</label>
        <MyInput
          id="department-keyword"
          v-model="filters.keyword"
          placeholder="학과 코드 · 학과명 검색"
          @keyup-enter="load(1)"
        />
      </div>
      <div class="search-group">
        <label for="department-college">단과대학</label>
        <MySelect
          id="department-college"
          v-model="filters.collegeId"
        >
          <option value="">
            전체
          </option>
          <option
            v-for="college in colleges"
            :key="college.id"
            :value="college.id"
          >
            {{ college.name }}
          </option>
        </MySelect>
      </div>
      <div class="search-group">
        <label for="department-status">운영 상태</label>
        <MySelect
          id="department-status"
          v-model="filters.active"
        >
          <option value="">
            전체
          </option>
          <option value="true">
            운영 중
          </option>
          <option value="false">
            운영 중지
          </option>
        </MySelect>
      </div>
      <MyButton
        btn-type="button"
        color="admin-indigo"
        size="middle"
        content="조회"
        @click="load(1)"
      />
      <MyButton
        btn-type="button"
        color="white"
        size="middle"
        content="초기화"
        @click="resetFilters"
      />
    </MySearchFilter>

    <div class="list-heading">
      <div>
        <h3>학과 목록 검색 결과</h3>
        <span>총 {{ totalCount }}개</span>
      </div>
      <MyButton
        btn-type="button"
        color="admin-indigo"
        size="big"
        content="학과 등록"
        @click="router.push({ name: 'AdminDepartmentCreate' })"
      />
    </div>

    <MyTable
      :columns="columns"
      :loading="isLoading"
      :empty="!isLoading && departments.length === 0"
      empty-message="조회된 학과가 없습니다."
    >
      <tr
        v-for="department in departments"
        :key="department.id"
      >
        <td>{{ department.code }}</td>
        <td>{{ department.name }}</td>
        <td>{{ department.college?.name || '-' }}</td>
        <td>
          <span :class="department.active ? 'status-active' : 'status-inactive'">
            {{ department.active ? '운영 중' : '운영 중지' }}
          </span>
        </td>
        <td>
          <MyButton
            btn-type="button"
            color="admin-indigo"
            size="small"
            content="상세"
            @click="router.push({ name: 'AdminDepartmentDetail', params: { departmentId: department.id } })"
          />
        </td>
      </tr>
    </MyTable>

    <NumberedPagination
      v-if="page.totalCount > page.size"
      :page="page.page"
      :total-count="page.totalCount"
      :size="page.size"
      @page-change="load"
    />
  </MyPageContainer>
</template>

<style scoped>
.list-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 24px 0 12px;
}

.list-heading h3 {
  margin: 0 0 4px;
  font-size: 1rem;
}

.list-heading span {
  color: var(--personal-color-admin-secondary-indigo);
  font-size: 0.86rem;
  font-weight: 600;
}

.status-active {
  color: var(--personal-color-status-success-text-forest);
  font-weight: 700;
}

.status-inactive {
  color: var(--personal-color-text-tertiary-slate);
  font-weight: 700;
}
</style>
