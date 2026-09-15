<script setup>
import { computed, onMounted, ref } from 'vue';
import { useProfessorRequestDetail } from '../../composables/useProfessorRequestDetail';
import {
  downloadAcademicChangeFile,
  getAcademicChangeRequest,
  reviewAcademicChangeByAdvisor,
  searchAcademicChangeRequests,
} from '../../api/academicChangeApi';
import ProfessorApplicationDetail from '../../components/academic/ProfessorApplicationDetail.vue';
import MyButton from '../../components/button/MyButton.vue';
import MySelect from '../../components/input/MySelect.vue';
import MyPageContainer from '../../components/layout/MyPageContainer.vue';
import NumberedPagination from '../../components/pagination/NumberedPagination.vue';
import MyTable from '../../components/table/MyTable.vue';
import { confirmDialog, notify } from '../../composables/useDialog';
import {
  ACADEMIC_CHANGE_STATUS_OPTIONS,
  createAcademicChangeKey,
  formatAcademicChangeSemester,
  formatAcademicChangeStatus,
  formatFileSize,
} from '../../util/academic/academicChangeLabels';
import { formatDate } from '../../util/format';

defineOptions({ name: 'ProfessorDepartmentTransferReview' });

const TYPE = 'department-transfer';
const columns = [
  { key: 'id', label: '신청번호' },
  { key: 'studentNumber', label: '학번' },
  { key: 'name', label: '이름' },
  { key: 'source', label: '현재 학과' },
  { key: 'target', label: '희망 학과' },
  { key: 'semester', label: '적용 학기' },
  { key: 'status', label: '검토 상태' },
  { key: 'management', label: '관리' },
];

const requests = ref([]);
const rejectReason = ref('');
const formError = ref('');
const isLoading = ref(false);
const isReviewing = ref(false);
const page = ref({ page: 1, size: 20, totalCount: 0, hasNext: false });
const filters = ref({ keyword: '', status: 'PENDING' });

const load = async (pageNumber = 1) => {
  isLoading.value = true;
  try {
    const response = await searchAcademicChangeRequests(TYPE, {
      page: pageNumber,
      size: 20,
      sort: 'CREATED_AT_DESC',
      status: filters.value.status || undefined,
      keyword: filters.value.keyword.trim() || undefined,
    });
    const data = response.data.data;
    requests.value = data.items || [];
    page.value = { page: data.page, size: data.size, totalCount: data.totalCount, hasNext: data.hasNext };
  } catch (error) {
    requests.value = [];
    await notify(error.response?.data?.message || '담당 학생의 전과 신청을 불러오지 못했습니다.');
  } finally {
    isLoading.value = false;
  }
};

const resetFilters = () => {
  filters.value = { keyword: '', status: 'PENDING' };
  load(1);
};

const { detailId, selectedRequest, isLoadingDetail, detailError, openDetail: selectRequest, closeDetail } = useProfessorRequestDetail({
  fetchRequest: (id) => getAcademicChangeRequest(TYPE, id),
  resetForm: () => { rejectReason.value = ''; formError.value = ''; },
});

const studentFields = computed(() => {
  const item = selectedRequest.value || {};
  return [
    { label: '이름', value: item.studentName }, { label: '학번', value: item.studentNumber },
    { label: '소속 단과대학', value: item.sourceCollegeName || item.collegeName },
    { label: '소속 학과', value: item.sourceDepartmentName }, { label: '학년', value: item.gradeLevel ? item.gradeLevel + '학년' : undefined },
    { label: '학적 상태', value: item.academicStatusName },
  ];
});
const applicationFields = computed(() => {
  const item = selectedRequest.value || {};
  return [
    { label: '신청 유형', value: '전과' }, { label: '신청번호', value: item.id }, { label: '신청일', value: formatDate(item.createdAt) },
    { label: '적용 학기', value: formatAcademicChangeSemester(item, TYPE) }, { label: '희망 학과', value: item.targetDepartmentName },
    { label: '처리 상태', value: formatAcademicChangeStatus(item.status) },
  ];
});

const downloadFile = async (file) => {
  try {
    const response = await downloadAcademicChangeFile(TYPE, selectedRequest.value.id, file.id);
    const url = URL.createObjectURL(response.data);
    const link = document.createElement('a');
    link.href = url;
    link.download = file.originalName;
    link.click();
    URL.revokeObjectURL(url);
  } catch {
    await notify('제출 문서를 다운로드하지 못했습니다.');
  }
};

const review = async (approved) => {
  if (!selectedRequest.value || isReviewing.value) return;
  const requestId = selectedRequest.value.id;
  const reason = rejectReason.value.trim();
  if (!approved && !reason) {
    formError.value = '반려 사유를 입력해 주세요.';
    await notify(formError.value);
    return;
  }
  const action = approved ? '승인' : '반려';
  const confirmed = await confirmDialog(
    approved
      ? '전과 신청을 승인하시겠습니까? 승인 후 두 문서를 학장에게 전달해 주세요.'
      : '이 전과 신청을 반려하시겠습니까?',
  );
  if (!confirmed || isReviewing.value) return;
  if (selectedRequest.value?.id !== requestId || selectedRequest.value?.status !== 'PENDING') {
    await notify('검토 대상 또는 상태가 변경되었습니다. 신청 상세를 다시 확인해 주세요.');
    return;
  }

  isReviewing.value = true;
  try {
    const response = await reviewAcademicChangeByAdvisor(
      TYPE,
      requestId,
      { approved, rejectReason: approved ? null : reason },
      createAcademicChangeKey(`transfer-advisor-${approved ? 'approve' : 'reject'}`),
    );
    if (String(detailId.value) === String(requestId)) selectedRequest.value = response.data.data;
    rejectReason.value = '';
    formError.value = '';
    await notify(`전과 신청을 ${action}했습니다.`);
    await load(page.value.page);
  } catch (error) {
    await notify(error.response?.data?.message || `전과 ${action} 처리 중 오류가 발생했습니다.`);
  } finally {
    isReviewing.value = false;
  }
};

onMounted(() => load());
</script>

<template>
  <MyPageContainer class="professor-page"
    :title="detailId ? '전과 지도교수 검토 · 상세' : '전과 지도교수 검토'"
  >
    <section v-if="!detailId" class="filter-card">
      <label>신청자<input
        v-model="filters.keyword"
        type="search"
        placeholder="이름·학과명"
        @keyup.enter="load(1)"
      ></label>
      <label>검토 상태<MySelect
        v-model="filters.status"
        :options="ACADEMIC_CHANGE_STATUS_OPTIONS"
      /></label>
      <div class="filter-actions">
        <MyButton
          class="professor-primary"
          color="deep-blue"
          size="middle"
          content="조회"
          @click="load(1)"
        />
        <MyButton
          class="reset-action"
          color="white"
          size="middle"
          content="초기화"
          @click="resetFilters"
        />
      </div>
    </section>

    <div class="review-grid">
      <section v-if="!detailId" class="list-card">
        <div class="section-title">
          <h3>담당 학생 전과 신청</h3><span>총 {{ page.totalCount }}건</span>
        </div>
        <div class="table-scroll">
          <MyTable
            :columns="columns"
            :loading="isLoading"
            :empty="!isLoading && !requests.length"
            empty-message="검토할 전과 신청이 없습니다."
          >
            <tr
              v-for="item in requests"
              :key="item.id"
              :class="{ selected: selectedRequest?.id === item.id }"
            >
              <td>{{ item.id }}</td>
              <td>{{ item.studentNumber || '-' }}</td>
              <td>{{ item.studentName }}</td>
              <td>{{ item.sourceDepartmentName }}</td>
              <td>{{ item.targetDepartmentName }}</td>
              <td>{{ formatAcademicChangeSemester(item, TYPE) }}</td>
              <td :class="{ rejected: item.status === 'ADVISOR_REJECTED' }">
                {{ formatAcademicChangeStatus(item.status) }}
              </td>
              <td>
                <MyButton
                  class="professor-primary"
                  color="deep-blue"
                  size="small"
                  content="상세"
                  :disabled="isLoadingDetail"
                  @click="selectRequest(item.id)"
                />
              </td>
            </tr>
          </MyTable>
        </div>
        <NumberedPagination
          v-if="page.totalCount > page.size"
          :page="page.page"
          :total-count="page.totalCount"
          :size="page.size"
          color="professor-navy"
          @page-change="load"
        />
      </section>

      <div v-if="detailId" :aria-busy="isLoadingDetail">
        <p v-if="isLoadingDetail" role="status">신청 정보를 불러오는 중입니다.</p>
        <template v-else-if="detailError">
          <p class="form-error" role="alert">{{ detailError }}</p>
          <MyButton color="white" size="middle" content="목록" @click="closeDetail" />
        </template>
        <ProfessorApplicationDetail v-else-if="selectedRequest" v-model:review-reason="rejectReason" :student-fields="studentFields" :application-fields="applicationFields" :reason="selectedRequest.reason" :reviewable="selectedRequest.status === 'PENDING'" :busy="isReviewing" :error="formError" @back="closeDetail" @approve="review(true)" @reject="review(false)">
          <template #files>
            <p v-if="!selectedRequest.files?.length">첨부된 증빙 서류가 없습니다.</p>
            <button v-for="file in selectedRequest.files" :key="file.id" type="button" class="file-row" @click="downloadFile(file)">
              <span>{{ file.originalName }}</span><small>{{ formatFileSize(file.size) }}</small><strong>다운로드</strong>
            </button>
          </template>
          <template v-if="selectedRequest.advisorRejectReason" #history><p class="form-error">반려 사유: {{ selectedRequest.advisorRejectReason }}</p></template>
        </ProfessorApplicationDetail>
      </div>
    </div>
  </MyPageContainer>
</template>

<style scoped>
.detail-toolbar { display: flex; justify-content: flex-end; }
.detail-column .detail-list { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); column-gap: 40px; }
@media (max-width: 760px) { .detail-column .detail-list { grid-template-columns: 1fr; } }
.filter-card {
  display: grid;
  grid-template-columns: minmax(140px, 220px) minmax(140px, 220px) 1fr;
  align-items: end;
  gap: 16px;
  padding: 20px;
  border: 1px solid var(--personal-color-border-mist);
  border-radius: 10px;
  background: white;
}

.filter-card label {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 0.78rem;
  font-weight: 600;
}

.filter-card input {
  height: 38px;
  padding: 0 12px;
  border: 1px solid var(--personal-color-border-mist);
  border-radius: 4px;
  background: white;
}

.filter-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.professor-primary { background: var(--personal-color-primary-navy); }

.review-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 18px;
  margin-top: 20px;
}

.list-card,
.detail-card {
  padding: 18px;
  border: 1px solid var(--personal-color-border-mist);
  border-radius: 10px;
  background: white;
}

.section-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}

.section-title h3,
.detail-card h3 {
  margin: 0;
  font-size: 1rem;
}

.section-title span {
  color: var(--personal-color-professor-primary-navy);
  font-size: 0.8rem;
  font-weight: 700;
}

.table-scroll {
  overflow-x: auto;
}

.selected {
  background: var(--personal-color-info-soft-ice);
}

.rejected,
.form-error {
  color: var(--personal-color-danger-coral);
}

.detail-column {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.empty-detail {
  margin: 24px 0;
  color: var(--personal-color-text-muted-slate);
  text-align: center;
}

.detail-list {
  margin: 12px 0 0;
}

.detail-list div {
  display: grid;
  grid-template-columns: 90px 1fr;
  gap: 10px;
  padding: 8px 0;
}

.detail-list dt,
.guide {
  color: var(--personal-color-text-muted-slate);
  font-size: 0.8rem;
}

.detail-list dd {
  margin: 0;
  font-size: 0.82rem;
  font-weight: 400;
  text-align: right;
}

.guide {
  margin: 6px 0 10px;
}

.file-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  width: 100%;
  gap: 8px;
  margin-top: 8px;
  padding: 10px;
  border: 1px solid var(--personal-color-border-mist);
  border-radius: 5px;
  background: var(--personal-color-bg-surface-frost);
  cursor: pointer;
  text-align: left;
}

.file-row span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-row small {
  color: var(--personal-color-text-muted-slate);
}

.file-row strong {
  color: var(--personal-color-professor-primary-navy);
  font-size: 0.75rem;
}

.review-card textarea {
  width: 100%;
  margin-top: 12px;
  padding: 9px;
  border: 1px solid var(--personal-color-border-mist);
  border-radius: 4px;
  resize: vertical;
}

.form-error {
  font-size: 0.78rem;
}

.decision-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 12px;
}


@media (max-width: 1000px) {
  .review-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 620px) {
  .filter-card {
    grid-template-columns: 1fr;
  }

  .filter-actions {
    justify-content: flex-end;
  }
}
.list-card { padding: 0; border: 0; border-radius: 0; background: transparent; }
</style>
