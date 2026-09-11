<script setup>
import { onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import MyButton from '../../components/button/MyButton.vue';
import MyStatusBadge from '../../components/common/MyStatusBadge.vue';
import MyPageContainer from '../../components/layout/MyPageContainer.vue';
import PrevNextPagination from '../../components/pagination/PrevNextPagination.vue';
import MyTable from '../../components/table/MyTable.vue';
import { useAdminInfoChangeStore } from '../../store/infochange/useAdminInfoChangeStore';
import { INFO_CHANGE_STATUS_LABEL, INFO_CHANGE_STATUS_VARIANT } from '../../util/academic/enumLabels';
import { formatDate } from '../../util/format';
import { notify } from '../../composables/useDialog';

const router = useRouter();
const infoChangeStore = useAdminInfoChangeStore();

const filters = reactive({
  keyword: '',
  requesterType: '',
  status: '',
  requestedFrom: '',
  requestedTo: '',
  size: 20,
});
const appliedFilters = ref({ ...filters });

const columns = [
  { key: 'requesterType', label: '신청자 유형' },
  { key: 'requesterName', label: '이름' },
  { key: 'departmentName', label: '소속 학과' },
  { key: 'createdAt', label: '신청일' },
  { key: 'status', label: '처리 상태' },
  { key: 'action', label: '상세' },
];

const requesterTypeLabel = {
  STUDENT: '학생',
  PROFESSOR: '교수',
};

const toSearchParams = (source) => Object.fromEntries(
  Object.entries(source).filter(([, value]) => value !== '' && value !== null && value !== undefined),
);

const load = async (page = 1) => {
  try {
    await infoChangeStore.fetchRequests(toSearchParams(appliedFilters.value), page);
  } catch (error) {
    await notify(error.response?.data?.message || '정보 변경 신청 목록을 불러오지 못했습니다.');
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
    keyword: '',
    requesterType: '',
    status: '',
    requestedFrom: '',
    requestedTo: '',
    size: 20,
  });
  appliedFilters.value = { ...filters };
  await load();
};

const openDetail = (item) => {
  router.push({
    name: 'AdminInfoChangeRequestDetail',
    params: { requesterType: item.requesterType, requestId: item.requestId },
  });
};

onMounted(() => load());
</script>

<template>
  <MyPageContainer title="정보 변경 신청 목록">
    <section class="filter-card" aria-label="정보 변경 신청 검색 조건">
      <div class="filter-fields">
        <label class="filter-field" for="info-change-keyword">
          <span>통합 검색</span>
          <input id="info-change-keyword" v-model.trim="filters.keyword" maxlength="50" placeholder="이름 검색" @keyup.enter="search" />
        </label>

        <label class="filter-field" for="info-change-requester-type">
          <span>신청자 유형</span>
          <select id="info-change-requester-type" v-model="filters.requesterType">
            <option value="">전체</option>
            <option value="STUDENT">학생</option>
            <option value="PROFESSOR">교수</option>
          </select>
        </label>

        <label class="filter-field" for="info-change-status">
          <span>처리 상태</span>
          <select id="info-change-status" v-model="filters.status">
            <option value="">전체</option>
            <option value="REQUESTED">처리중</option>
            <option value="APPROVED">승인</option>
            <option value="REJECTED">반려</option>
            <option value="CANCELLED">취소</option>
          </select>
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
        <h3>정보 변경 신청 목록</h3>
        <p>총 {{ infoChangeStore.pageInfo.totalCount }}건</p>
      </div>

      <MyTable
        :columns="columns"
        :loading="infoChangeStore.isLoading"
        :empty="!infoChangeStore.isLoading && infoChangeStore.requests.length === 0"
        empty-message="조회된 정보 변경 신청이 없습니다."
      >
        <tr v-for="item in infoChangeStore.requests" :key="`${item.requesterType}-${item.requestId}`">
          <td>{{ requesterTypeLabel[item.requesterType] }}</td>
          <td>{{ item.requesterName }}</td>
          <td>{{ item.departmentName || '-' }}</td>
          <td>{{ formatDate(item.createdAt) }}</td>
          <td>
            <MyStatusBadge
              :label="INFO_CHANGE_STATUS_LABEL[item.status] || item.status"
              :variant="INFO_CHANGE_STATUS_VARIANT[item.status] || 'warning'"
            />
          </td>
          <td>
            <MyButton color="admin-indigo" size="small" content="상세" @click="openDetail(item)" />
          </td>
        </tr>
      </MyTable>

      <PrevNextPagination
        v-if="infoChangeStore.pageInfo.page > 1 || infoChangeStore.pageInfo.hasNext"
        :page="infoChangeStore.pageInfo.page"
        :has-next="infoChangeStore.pageInfo.hasNext"
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
  grid-template-columns: repeat(4, minmax(150px, 1fr));
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

.date-range input {
  min-width: 0;
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
  align-items: baseline;
  gap: 8px;
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
  font-size: 0.8rem;
}

@media (max-width: 960px) {
  .filter-card {
    align-items: stretch;
    flex-direction: column;
  }

  .filter-fields {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .filter-actions {
    justify-content: end;
  }
}

@media (max-width: 640px) {
  .filter-fields {
    grid-template-columns: 1fr;
  }

  .date-range {
    flex-wrap: wrap;
  }
}
</style>
