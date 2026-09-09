<script setup>
import { onMounted, ref } from 'vue';
import {
  downloadAcademicChangeFile,
  getAcademicChangeRequest,
  reviewAcademicChangeByAdvisor,
  searchAcademicChangeRequests,
} from '../../api/academicChangeApi';
import MyButton from '../../components/button/MyButton.vue';
import MySelect from '../../components/input/MySelect.vue';
import MyPageContainer from '../../components/layout/MyPageContainer.vue';
import PrevNextPagination from '../../components/pagination/PrevNextPagination.vue';
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

defineOptions({ name: 'ProfessorDoubleMajorReview' });

const TYPE = 'double-major';
const columns = [
  { key: 'id', label: '신청번호' },
  { key: 'studentNumber', label: '학번' },
  { key: 'name', label: '이름' },
  { key: 'source', label: '주전공' },
  { key: 'target', label: '희망 복수전공' },
  { key: 'semester', label: '모집 학기' },
  { key: 'status', label: '검토 상태' },
  { key: 'management', label: '관리' },
];

const requests = ref([]);
const selectedRequest = ref(null);
const rejectReason = ref('');
const formError = ref('');
const isLoading = ref(false);
const isLoadingDetail = ref(false);
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
    page.value = {
      page: data.page,
      size: data.size,
      totalCount: data.totalCount,
      hasNext: data.hasNext,
    };
  } catch (error) {
    requests.value = [];
    await notify(error.response?.data?.message || '담당 학생의 복수전공 신청을 불러오지 못했습니다.');
  } finally {
    isLoading.value = false;
  }
};

const resetFilters = () => {
  filters.value = { keyword: '', status: 'PENDING' };
  load(1);
};

const selectRequest = async (requestId) => {
  isLoadingDetail.value = true;
  rejectReason.value = '';
  formError.value = '';
  try {
    const response = await getAcademicChangeRequest(TYPE, requestId);
    selectedRequest.value = response.data.data;
  } catch (error) {
    await notify(error.response?.data?.message || '복수전공 신청 상세를 불러오지 못했습니다.');
  } finally {
    isLoadingDetail.value = false;
  }
};

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
  const reason = rejectReason.value.trim();
  if (!approved && !reason) {
    formError.value = '반려 사유를 입력해 주세요.';
    return;
  }

  const action = approved ? '승인' : '반려';
  const confirmed = await confirmDialog(
    approved
      ? '복수전공 신청을 승인하시겠습니까? 승인 후 두 문서를 학장에게 전달해 주세요.'
      : '이 복수전공 신청을 반려하시겠습니까?',
  );
  if (!confirmed) return;

  isReviewing.value = true;
  try {
    const response = await reviewAcademicChangeByAdvisor(
      TYPE,
      selectedRequest.value.id,
      { approved, rejectReason: approved ? null : reason },
      createAcademicChangeKey(`double-major-advisor-${approved ? 'approve' : 'reject'}`),
    );
    selectedRequest.value = response.data.data;
    rejectReason.value = '';
    formError.value = '';
    await notify(`복수전공 신청을 ${action}했습니다.`);
    await load(page.value.page);
  } catch (error) {
    await notify(error.response?.data?.message || `복수전공 ${action} 처리 중 오류가 발생했습니다.`);
  } finally {
    isReviewing.value = false;
  }
};

onMounted(() => load());
</script>

<template>
  <MyPageContainer
    title="복수전공 신청 검토"
    subtitle="현재 지도학생의 신청 서류를 검토하고 승인된 문서를 학장에게 전달합니다."
  >
    <section class="filter-card professor-accent">
      <label>
        신청자
        <input
          v-model="filters.keyword"
          type="search"
          placeholder="이름·학과명"
          @keyup.enter="load(1)"
        >
      </label>
      <label>
        검토 상태
        <MySelect
          v-model="filters.status"
          :options="ACADEMIC_CHANGE_STATUS_OPTIONS"
        />
      </label>
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
      <section class="list-card">
        <div class="section-title">
          <h3>담당 학생 복수전공 신청</h3>
          <span>총 {{ page.totalCount }}건</span>
        </div>
        <div class="table-scroll">
          <MyTable
            :columns="columns"
            :loading="isLoading"
            :empty="!isLoading && !requests.length"
            empty-message="검토할 복수전공 신청이 없습니다."
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
                  content="선택"
                  :disabled="isLoadingDetail"
                  @click="selectRequest(item.id)"
                />
              </td>
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

      <aside class="detail-column">
        <section class="detail-card professor-border">
          <h3>선택한 신청 정보</h3>
          <p
            v-if="!selectedRequest"
            class="empty-detail"
          >
            목록에서 신청을 선택해 주세요.
          </p>
          <dl
            v-else
            class="detail-list"
          >
            <div><dt>신청자</dt><dd>{{ selectedRequest.studentName }} ({{ selectedRequest.studentNumber || '-' }})</dd></div>
            <div><dt>주전공</dt><dd>{{ selectedRequest.sourceDepartmentName }}</dd></div>
            <div><dt>희망 복수전공</dt><dd>{{ selectedRequest.targetDepartmentName }}</dd></div>
            <div><dt>모집 학기</dt><dd>{{ formatAcademicChangeSemester(selectedRequest, TYPE) }}</dd></div>
            <div><dt>신청일</dt><dd>{{ formatDate(selectedRequest.createdAt) }}</dd></div>
            <div><dt>현재 상태</dt><dd>{{ formatAcademicChangeStatus(selectedRequest.status) }}</dd></div>
          </dl>
        </section>

        <section
          v-if="selectedRequest"
          class="detail-card professor-border"
        >
          <h3>제출 문서</h3>
          <p class="guide">
            파일명과 순서가 아닌 문서 내용을 직접 확인해 주세요.
          </p>
          <button
            v-for="file in selectedRequest.files"
            :key="file.id"
            type="button"
            class="file-row"
            @click="downloadFile(file)"
          >
            <span>{{ file.originalName }}</span>
            <small>{{ formatFileSize(file.size) }}</small>
            <strong>다운로드</strong>
          </button>
        </section>

        <section
          v-if="selectedRequest?.status === 'PENDING'"
          class="detail-card review-card professor-border"
        >
          <h3>교수 검토</h3>
          <textarea
            v-model="rejectReason"
            maxlength="500"
            rows="3"
            placeholder="반려 시 사유를 입력하세요."
          />
          <p
            v-if="formError"
            class="form-error"
          >
            {{ formError }}
          </p>
          <div class="decision-actions">
            <MyButton
              color="red"
              size="big"
              content="반려"
              :disabled="isReviewing"
              @click="review(false)"
            />
            <MyButton
              class="professor-primary"
              color="deep-blue"
              size="big"
              content="승인"
              :disabled="isReviewing"
              @click="review(true)"
            />
          </div>
        </section>
      </aside>
    </div>
  </MyPageContainer>
</template>

<style scoped>
.filter-card {
  display: grid;
  grid-template-columns: 1.2fr 1fr auto;
  gap: 16px;
  align-items: end;
  padding: 20px;
  border: 1px solid var(--personal-color-border-mist);
  border-radius: 10px;
  background: white;
}

.professor-accent,
.professor-border {
  border-top: 3px solid var(--personal-color-professor-primary-navy);
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

.filter-actions,
.decision-actions {
  display: flex;
  gap: 8px;
}

.reset-action {
  border: 1px solid var(--personal-color-black);
}

.professor-primary {
  background: var(--personal-color-professor-primary-navy);
}

.review-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.75fr) minmax(300px, 0.85fr);
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
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
}

.section-title h3,
.detail-card h3 {
  margin: 0;
  font-size: 1rem;
}

.section-title span,
.file-row strong {
  color: var(--personal-color-professor-primary-navy);
}

.section-title span {
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
  text-align: right;
  font-size: 0.82rem;
  font-weight: 600;
}

.guide {
  margin: 6px 0 10px;
}

.file-row {
  width: 100%;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
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
  margin-top: 12px;
}

.decision-actions :deep(button) {
  width: auto;
  flex: 1;
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
</style>
