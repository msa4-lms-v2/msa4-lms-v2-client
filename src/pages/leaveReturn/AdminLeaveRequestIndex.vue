<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import MyButton from '../../components/button/MyButton.vue';
import MyStatusBadge from '../../components/common/MyStatusBadge.vue';
import MyPageContainer from '../../components/layout/MyPageContainer.vue';
import PrevNextPagination from '../../components/pagination/PrevNextPagination.vue';
import MyTable from '../../components/table/MyTable.vue';
import { notify } from '../../composables/useDialog';
import { useLeaveRequestStore } from '../../store/leaveReturn/useLeaveRequestStore';
import { useSemesterStore } from '../../store/semester/useSemesterStore';
import {
  LEAVE_REQUEST_STATUS_LABEL,
  LEAVE_REQUEST_STATUS_VARIANT,
} from '../../util/academic/enumLabels';
import { formatDate } from '../../util/format';

defineOptions({ name: 'AdminLeaveRequestIndex' });

const router = useRouter();
const leaveRequestStore = useLeaveRequestStore();
const semesterStore = useSemesterStore();

const filters = reactive({
  targetYear: '',
  targetSemester: '',
  requestType: '',
  status: '',
  keyword: '',
  requestedFrom: '',
  requestedTo: '',
  size: 20,
});
const appliedFilters = ref({ ...filters });

const columns = [
  { key: 'requestType', label: '신청 유형' },
  { key: 'studentNumber', label: '학번' },
  { key: 'studentName', label: '이름' },
  { key: 'departmentName', label: '소속 학과' },
  { key: 'targetSemester', label: '신청 학기' },
  { key: 'createdAt', label: '신청일' },
  { key: 'status', label: '처리 상태' },
  { key: 'action', label: '상세' },
];

const requestTypeLabel = {
  GENERAL_LEAVE: '일반휴학',
  MILITARY_LEAVE: '군휴학',
  GENERAL_RETURN: '일반복학',
  MILITARY_RETURN: '군복학',
};

const academicYears = computed(() => semesterStore.academicYears);

const toSearchParams = (source) => Object.fromEntries(
  Object.entries(source).filter(([, value]) => value !== '' && value !== null && value !== undefined),
);

const load = async (page = 1) => {
  try {
    await leaveRequestStore.fetchRequests(toSearchParams(appliedFilters.value), page);
  } catch (error) {
    await notify(error.response?.data?.message || '휴·복학 신청 목록을 불러오지 못했습니다.');
  }
};

const search = async () => {
  if (filters.requestedFrom && filters.requestedTo && filters.requestedFrom > filters.requestedTo) {
    await notify('신청일 시작은 종료일보다 늦을 수 없습니다.');
    return;
  }
  appliedFilters.value = { ...filters };
  await load();
};

const reset = async () => {
  Object.assign(filters, {
    targetYear: '',
    targetSemester: '',
    requestType: '',
    status: '',
    keyword: '',
    requestedFrom: '',
    requestedTo: '',
    size: 20,
  });
  appliedFilters.value = { ...filters };
  await load();
};

const openDetail = (request) => {
  router.push({ name: 'AdminLeaveRequestDetail', params: { requestId: request.id } });
};

onMounted(async () => {
  try {
    await semesterStore.fetchSemesters();
  } catch (error) {
    await notify(error.response?.data?.message || '학기 목록을 불러오지 못했습니다.');
  }
  await load();
});
</script>

<template>
  <MyPageContainer title="휴·복학 신청 목록">
    <section class="filter-card" aria-label="휴·복학 신청 검색 조건">
      <div class="filter-fields">
        <label class="filter-field" for="leave-request-year">
          <span>학년도</span>
          <select id="leave-request-year" v-model="filters.targetYear">
            <option value="">전체</option>
            <option v-for="year in academicYears" :key="year" :value="year">{{ year }}학년도</option>
          </select>
        </label>

        <label class="filter-field" for="leave-request-semester">
          <span>학기</span>
          <select id="leave-request-semester" v-model="filters.targetSemester">
            <option value="">전체</option>
            <option value="1">1학기</option>
            <option value="2">2학기</option>
          </select>
        </label>

        <label class="filter-field" for="leave-request-type">
          <span>신청 유형</span>
          <select id="leave-request-type" v-model="filters.requestType">
            <option value="">전체</option>
            <option value="GENERAL_LEAVE">일반휴학</option>
            <option value="MILITARY_LEAVE">군휴학</option>
            <option value="GENERAL_RETURN">일반복학</option>
            <option value="MILITARY_RETURN">군복학</option>
          </select>
        </label>

        <label class="filter-field" for="leave-request-status">
          <span>처리 상태</span>
          <select id="leave-request-status" v-model="filters.status">
            <option value="">전체</option>
            <option value="PENDING">교수 승인 대기</option>
            <option value="ADVISOR_APPROVED">교수 승인 완료</option>
            <option value="APPROVED">최종 승인</option>
            <option value="REJECTED">반려</option>
            <option value="CANCELLED">취소</option>
          </select>
        </label>

        <label class="filter-field" for="leave-request-keyword">
          <span>신청자</span>
          <input id="leave-request-keyword" v-model.trim="filters.keyword" maxlength="50" placeholder="학번·이름" @keyup.enter="search" />
        </label>

        <div class="filter-field date-field">
          <span>신청일</span>
          <div class="date-range">
            <input v-model="filters.requestedFrom" type="date" aria-label="신청일 시작" />
            <span aria-hidden="true">~</span>
            <input v-model="filters.requestedTo" type="date" aria-label="신청일 종료" />
          </div>
        </div>
      </div>

      <div class="filter-actions">
        <MyButton color="admin-indigo" size="middle" content="조회" @click="search" />
        <MyButton color="white" size="middle" content="초기화" @click="reset" />
      </div>
    </section>

    <section class="result-card">
      <div class="result-heading">
        <h3>휴·복학 신청 목록</h3>
        <p>총 {{ leaveRequestStore.pageInfo.totalCount }}건</p>
      </div>

      <MyTable
        :columns="columns"
        :loading="leaveRequestStore.isLoading"
        :empty="!leaveRequestStore.isLoading && leaveRequestStore.requests.length === 0"
        empty-message="조회된 휴·복학 신청이 없습니다."
      >
        <tr v-for="item in leaveRequestStore.requests" :key="item.id">
          <td>{{ requestTypeLabel[item.requestType] || item.requestType }}</td>
          <td>{{ item.studentNumber || '-' }}</td>
          <td>{{ item.studentName }}</td>
          <td>{{ item.departmentName }}</td>
          <td>{{ item.targetYear }}학년도 {{ item.targetSemester }}학기</td>
          <td>{{ formatDate(item.createdAt) }}</td>
          <td>
            <MyStatusBadge
              :label="LEAVE_REQUEST_STATUS_LABEL[item.status] || item.status"
              :variant="LEAVE_REQUEST_STATUS_VARIANT[item.status] || 'warning'"
            />
          </td>
          <td>
            <MyButton color="admin-indigo" size="small" content="상세" @click="openDetail(item)" />
          </td>
        </tr>
      </MyTable>

      <PrevNextPagination
        v-if="leaveRequestStore.pageInfo.page > 1 || leaveRequestStore.pageInfo.hasNext"
        :page="leaveRequestStore.pageInfo.page"
        :has-next="leaveRequestStore.pageInfo.hasNext"
        @page-change="load"
      />
    </section>
  </MyPageContainer>
</template>

<style scoped>
.filter-card,
.result-card {
  border: 1px solid var(--personal-color-border-mist);
  border-radius: var(--personal-radius);
  background: var(--personal-color-white);
}

.filter-card {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 20px;
  padding: 20px;
  margin-bottom: 16px;
}

.filter-fields {
  display: grid;
  grid-template-columns: repeat(3, minmax(150px, 1fr));
  flex: 1;
  gap: 16px;
}

.filter-field {
  display: flex;
  flex-direction: column;
  gap: 8px;
  color: var(--personal-color-primary-text-navy);
  font-size: 0.82rem;
  font-weight: 600;
}

.filter-field input,
.filter-field select {
  width: 100%;
  min-height: 38px;
  box-sizing: border-box;
  border: 1px solid var(--personal-color-border-mist);
  border-radius: 4px;
  padding: 0 10px;
  color: var(--personal-color-primary-text-navy);
  background: var(--personal-color-white);
  font: inherit;
  font-weight: 400;
}

.date-range {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--personal-color-text-muted-slate);
}

.filter-actions {
  display: flex;
  gap: 8px;
}

.filter-actions :deep(.white) {
  border: 1px solid var(--personal-color-border-mist);
  color: var(--personal-color-primary-text-navy);
}

.result-card {
  padding: 20px;
}

.result-heading {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.result-heading h3,
.result-heading p {
  margin: 0;
}

.result-heading h3 {
  color: var(--personal-color-primary-text-navy);
  font-size: 1rem;
}

.result-heading p {
  color: var(--personal-color-admin-secondary-indigo);
  font-size: 0.78rem;
  font-weight: 600;
}

@media (max-width: 960px) {
  .filter-card {
    flex-direction: column;
    align-items: stretch;
  }

  .filter-fields {
    grid-template-columns: repeat(2, minmax(150px, 1fr));
  }

  .filter-actions {
    justify-content: end;
  }
}

@media (max-width: 640px) {
  .filter-fields {
    grid-template-columns: 1fr;
  }

  .date-range input {
    min-width: 0;
  }
}
</style>
