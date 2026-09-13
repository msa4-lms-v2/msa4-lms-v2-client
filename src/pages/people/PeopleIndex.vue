<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { getDepartments, peopleStatuses, searchPeople } from '../../api/peopleManagementApi';
import MyButton from '../../components/button/MyButton.vue';
import MyStatusBadge from '../../components/common/MyStatusBadge.vue';
import MyInput from '../../components/input/MyInput.vue';
import MySelect from '../../components/input/MySelect.vue';
import MyPageContainer from '../../components/layout/MyPageContainer.vue';
import PrevNextPagination from '../../components/pagination/PrevNextPagination.vue';
import MySearchFilter from '../../components/search/MySearchFilter.vue';
import MyTable from '../../components/table/MyTable.vue';
import { formatDate } from '../../util/format';
import './peopleManagement.css';

defineOptions({ name: 'PeopleIndex' });

const props = defineProps({ kind: { type: String, required: true } });
const router = useRouter();
const admission = computed(() => props.kind === 'admission');
const base = computed(() => (admission.value ? '/admin/admissions' : '/admin/professors'));
const title = computed(() => (admission.value ? '입학 예정자' : '교수'));
const pageTitle = computed(() => `${title.value} 관리`);

const filters = reactive({ keyword: '', departmentId: '', status: '', admissionYear: '' });
const applied = ref({});
const departments = ref([]);
const rows = ref([]);
const page = ref({ page: 1, size: 10, totalCount: 0, hasNext: false });
const loading = ref(false);
const error = ref('');
const departmentError = ref('');

const columns = computed(() => (admission.value
  ? [
      { key: 'studentNumber', label: '학번' },
      { key: 'name', label: '이름' },
      { key: 'department', label: '소속 학과' },
      { key: 'createdAt', label: '등록일' },
      { key: 'status', label: '등록 상태' },
      { key: 'detail', label: '상세' },
    ]
  : [
      { key: 'professorNumber', label: '교번' },
      { key: 'name', label: '이름' },
      { key: 'email', label: '이메일' },
      { key: 'department', label: '소속 학과' },
      { key: 'hireYear', label: '임용 연도' },
      { key: 'status', label: '계정 상태' },
      { key: 'detail', label: '상세' },
    ]));

const statusVariants = {
  PROVISIONING: 'processing',
  REGISTERED: 'warning',
  CONFIRMED: 'processing',
  PROVISIONED: 'success',
  CANCELLED: 'fail',
  ACTIVE: 'success',
  INACTIVE: 'warning',
  LOCKED: 'fail',
  PENDING: 'processing',
};

const rowId = (row) => row.id ?? row.professorId;
const numberLabel = (row) => (
  (admission.value ? row.studentNumber : row.professorNumber)
  || (row.status === 'PROVISIONING' ? '발급 대기' : '-')
);

const load = async (nextPage = 1) => {
  if (loading.value) return;
  loading.value = true;
  error.value = '';
  try {
    const response = await searchPeople(props.kind, { ...applied.value, page: nextPage, size: 10 });
    const data = response.data.data;
    rows.value = data.items || [];
    page.value = {
      page: data.page,
      size: data.size,
      totalCount: data.totalCount,
      hasNext: data.hasNext,
    };
  } catch (requestError) {
    rows.value = [];
    page.value = { page: 1, size: 10, totalCount: 0, hasNext: false };
    error.value = requestError.response?.data?.message || '목록을 불러오지 못했습니다. 다시 조회해 주세요.';
  } finally {
    loading.value = false;
  }
};

const search = () => {
  applied.value = Object.fromEntries(
    Object.entries(filters)
      .map(([key, value]) => [key, typeof value === 'string' ? value.trim() : value])
      .filter(([, value]) => value !== ''),
  );
  load(1);
};

const reset = () => {
  Object.keys(filters).forEach((key) => { filters[key] = ''; });
  search();
};

const openDetail = (row) => router.push(`${base.value}/${rowId(row)}`);
const openCreate = () => router.push(`${base.value}/new`);

onMounted(async () => {
  load();
  try {
    departments.value = await getDepartments();
  } catch {
    departmentError.value = '학과 목록을 불러오지 못했습니다. 페이지를 새로고침해 주세요.';
  }
});
</script>

<template>
  <MyPageContainer :title="pageTitle">
    <p v-if="departmentError" class="people-error" role="alert">
      {{ departmentError }}
    </p>

    <MySearchFilter :show-submit="false" aria-label="구성원 검색 조건">
      <div class="search-group keyword-filter">
        <label for="people-keyword">통합 검색</label>
        <MyInput
          id="people-keyword"
          v-model="filters.keyword"
          maxlength="100"
          :placeholder="admission ? '이름을 입력해 주세요.' : '이름 또는 이메일을 입력해 주세요.'"
          @keyup-enter="search"
        />
      </div>

      <div v-if="admission" class="search-group">
        <label for="people-admission-year">입학 연도</label>
        <MyInput id="people-admission-year" v-model="filters.admissionYear" numeric-only placeholder="예: 2027" />
      </div>

      <div class="search-group">
        <label for="people-department">소속 학과</label>
        <MySelect id="people-department" v-model="filters.departmentId">
          <option value="">전체</option>
          <option v-for="department in departments" :key="department.id" :value="department.id">
            {{ department.name }}
          </option>
        </MySelect>
      </div>

      <div class="search-group">
        <label for="people-status">{{ admission ? '등록 상태' : '계정 상태' }}</label>
        <MySelect id="people-status" v-model="filters.status">
          <option value="">전체</option>
          <option v-for="(label, value) in peopleStatuses[kind]" :key="value" :value="value">
            {{ label }}
          </option>
        </MySelect>
      </div>

      <div class="people-filter-actions">
        <MyButton color="admin-indigo" size="middle" content="조회" :disabled="loading" @click="search" />
        <MyButton class="secondary-button" color="white" size="middle" content="초기화" :disabled="loading" @click="reset" />
      </div>
    </MySearchFilter>

    <section class="people-results" :aria-busy="loading">
      <div class="people-results-heading">
        <h3>{{ title }} 목록 <span>총 {{ page.totalCount }}건</span></h3>
        <MyButton color="admin-indigo" size="big" :content="`${title} 등록`" @click="openCreate" />
      </div>

      <p v-if="error" class="people-error" role="alert">
        {{ error }}
      </p>

      <MyTable
        :columns="columns"
        :loading="loading"
        :empty="!loading && rows.length === 0"
        empty-message="검색 결과가 없습니다."
      >
        <tr v-for="row in rows" :key="rowId(row)">
          <td>{{ numberLabel(row) }}</td>
          <td>{{ row.name }}</td>
          <td v-if="!admission">{{ row.email || '-' }}</td>
          <td>{{ row.departmentName || '-' }}</td>
          <td>{{ admission ? formatDate(row.createdAt) : (row.hireYear || '-') }}</td>
          <td>
            <MyStatusBadge
              :label="peopleStatuses[kind][row.status] || row.status"
              :variant="statusVariants[row.status] || 'processing'"
            />
          </td>
          <td>
            <MyButton color="admin-indigo" size="small" content="상세" @click="openDetail(row)" />
          </td>
        </tr>
      </MyTable>

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
.keyword-filter {
  flex: 1 1 220px;
}

.people-filter-actions {
  display: flex;
  gap: 8px;
  margin-left: auto;
}

.people-results {
  min-height: 430px;
}

.people-results-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
}

.people-results-heading h3 {
  margin: 0;
  color: var(--personal-color-primary-text-navy);
  font-size: 1rem;
}

.people-results-heading h3 span {
  margin-left: 12px;
  color: var(--personal-color-admin-secondary-indigo);
  font-size: 0.8rem;
  font-weight: 500;
}

:deep(.secondary-button) {
  border: 1px solid var(--personal-color-border-mist);
  color: var(--personal-color-primary-text-navy);
}

@media (max-width: 640px) {
  .people-filter-actions {
    margin-left: 0;
  }

  .people-results-heading {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
