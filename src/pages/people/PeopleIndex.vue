<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import MyPageContainer from '../../components/layout/MyPageContainer.vue';
import { getDepartments, searchPeople, peopleStatuses } from '../../api/peopleManagementApi';
import './peopleManagement.css';

const props = defineProps({ kind: { type: String, required: true } });
const router = useRouter();
const admission = computed(() => props.kind === 'admission');
const base = computed(() => admission.value ? '/admin/admissions' : '/admin/professors');
const title = computed(() => admission.value ? '입학 예정자' : '교수');
const filters = reactive({ keyword: '', departmentId: '', status: '', admissionYear: '' });
const applied = ref({});
const departments = ref([]);
const rows = ref([]);
const page = ref(1);
const total = ref(0);
const loading = ref(false);
const error = ref('');
const departmentError = ref('');
const pages = computed(() => Math.max(1, Math.ceil(total.value / 10)));
const visiblePages = computed(() => {
  const start = Math.max(1, Math.min(page.value - 2, pages.value - 4));
  return Array.from({ length: Math.min(5, pages.value) }, (_, i) => start + i);
});
async function load(next = 1) {
  if (loading.value) return;
  loading.value = true;
  error.value = '';
  try {
    const { data } = await searchPeople(props.kind, { ...applied.value, page: next, size: 10 });
    rows.value = data.data.items;
    total.value = data.data.totalCount;
    page.value = data.data.page;
  } catch (e) {
    rows.value = [];
    total.value = 0;
    error.value = e.response?.data?.message || '목록을 불러오지 못했습니다. 다시 조회해 주세요.';
  } finally { loading.value = false; }
}
function search() {
  applied.value = Object.fromEntries(Object.entries(filters).map(([k, v]) => [k, typeof v === 'string' ? v.trim() : v]).filter(([, v]) => v !== ''));
  load(1);
}
function reset() {
  Object.keys(filters).forEach(key => { filters[key] = ''; });
  search();
}
onMounted(async () => {
  load();
  try { departments.value = await getDepartments(); }
  catch { departmentError.value = '학과 목록을 불러오지 못했습니다. 페이지를 새로고침해 주세요.'; }
});
</script>

<template>
  <MyPageContainer :title="`${title} 목록`">
    <div class="people-page">
      <p
        v-if="departmentError"
        class="people-error"
        role="alert"
      >
        {{ departmentError }}
      </p>
      <form
        class="people-card people-filters"
        @submit.prevent="search"
      >
        <label class="wide">통합 검색<input
          v-model="filters.keyword"
          maxlength="100"
          :placeholder="admission ? '이름 검색' : '이름 · 이메일 검색'"
        ></label>
        <label v-if="admission">입학 연도<input
          v-model="filters.admissionYear"
          type="number"
          min="1900"
          placeholder="전체"
        ></label>
        <label>소속 학과<select v-model="filters.departmentId"><option value="">전체</option><option
          v-for="d in departments"
          :key="d.id"
          :value="d.id"
        >{{ d.name }}</option></select></label>
        <label>{{ admission ? '등록 상태' : '계정 상태' }}<select v-model="filters.status"><option value="">전체</option><option
          v-for="(label, value) in peopleStatuses[kind]"
          :key="value"
          :value="value"
        >{{ label }}</option></select></label>
        <button
          class="primary"
          :disabled="loading"
        >
          조회
        </button><button
          type="button"
          :disabled="loading"
          @click="reset"
        >
          초기화
        </button>
      </form>
      <section
        class="people-card people-results"
        :aria-busy="loading"
      >
        <div class="people-results-heading">
          <h3>{{ title }} 목록 검색 결과 <span>총 {{ total }}건</span></h3><router-link
            class="people-button primary"
            :to="`${base}/new`"
          >
            {{ title }} 등록
          </router-link>
        </div>
        <p
          v-if="error"
          class="people-error"
          role="alert"
        >
          {{ error }}
        </p>
        <div class="people-table-scroll">
          <table>
            <thead>
              <tr>
                <th>{{ admission ? '학번' : '교번' }}</th><th>이름</th><th v-if="!admission">
                  이메일
                </th><th>소속 학과</th><th>{{ admission ? '등록일' : '임용 연도' }}</th><th>{{ admission ? '등록 상태' : '계정 상태' }}</th><th>상세</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="loading">
                <td :colspan="admission ? 6 : 7">
                  불러오는 중입니다.
                </td>
              </tr>
              <tr v-else-if="!rows.length">
                <td :colspan="admission ? 6 : 7">
                  {{ error ? '조회에 실패했습니다.' : '검색 결과가 없습니다.' }}
                </td>
              </tr>
              <template v-else>
                <tr
                  v-for="row in rows"
                  :key="row.id ?? row.professorId"
                >
                  <td>{{ (admission ? row.studentNumber : row.professorNumber) || (row.status === 'PROVISIONING' ? '발급 대기' : '—') }}</td><td>{{ row.name }}</td><td v-if="!admission">
                    {{ row.email || '—' }}
                  </td><td>{{ row.departmentName }}</td><td>{{ admission ? row.createdAt?.slice(0, 10) : row.hireYear }}</td><td :class="{ 'people-error': row.status === 'CANCELLED' }">
                    {{ peopleStatuses[kind][row.status] || row.status }}
                  </td><td>
                    <button
                      class="primary small"
                      @click="router.push(`${base}/${row.id ?? row.professorId}`)"
                    >
                      상세
                    </button>
                  </td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>
        <nav
          class="people-pagination"
          aria-label="목록 페이지"
        >
          <button
            :disabled="loading || page === 1"
            @click="load(page - 1)"
          >
            이전
          </button><button
            v-for="p in visiblePages"
            :key="p"
            :aria-current="p === page ? 'page' : undefined"
            :class="{ selected: p === page }"
            :disabled="loading"
            @click="load(p)"
          >
            {{ p }}
          </button><button
            :disabled="loading || page >= pages"
            @click="load(page + 1)"
          >
            다음
          </button>
        </nav>
      </section>
    </div>
  </MyPageContainer>
</template>
