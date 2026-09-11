<script setup>
import { onMounted, ref } from 'vue';
import {
  applyAcademicChange,
  downloadAcademicChangeFile,
  getAcademicChangeRequest,
  rejectAcademicChangeByAdmin,
  searchAcademicChangeRequests,
} from '../../api/academicChangeApi';
import myAxios from '../../api/myAxios';
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

defineOptions({ name: 'AdminDepartmentTransferManagement' });

const TYPE = 'department-transfer';
const FILE_MAX_SIZE = 10 * 1024 * 1024;
const columns = [
  { key: 'id', label: '신청번호' },
  { key: 'studentNumber', label: '학번' },
  { key: 'name', label: '이름' },
  { key: 'source', label: '현재 학과' },
  { key: 'target', label: '희망 학과' },
  { key: 'advisor', label: '교수 검토' },
  { key: 'status', label: '처리 상태' },
  { key: 'management', label: '관리' },
];

const requests = ref([]);
const periods = ref([]);
const departments = ref([]);
const selectedRequest = ref(null);
const selectedFiles = ref([]);
const fileInput = ref(null);
const deanStampConfirmed = ref(false);
const rejectReason = ref('');
const formError = ref('');
const isLoading = ref(false);
const isLoadingDetail = ref(false);
const isProcessing = ref(false);
const page = ref({ page: 1, size: 20, totalCount: 0, hasNext: false });
const filters = ref({ semesterId: '', keyword: '', departmentId: '', status: '' });

const semesterOptions = ref([]);
const departmentOptions = ref([]);

const advisorDecision = (status) => {
  if (status === 'ADVISOR_REJECTED') return '반려';
  if (['ADVISOR_APPROVED', 'APPROVED', 'APPLIED', 'REJECTED'].includes(status)) return '승인';
  return '대기';
};

const loadCatalogs = async () => {
  try {
    const [periodResponse, departmentResponse] = await Promise.all([
      myAxios.get('/api/academic/catalog/department-transfer-periods', { params: { page: 1, size: 100 } }),
      myAxios.get('/api/academic/catalog/departments', { params: { page: 1, size: 100, active: true } }),
    ]);
    periods.value = periodResponse.data.data.items || [];
    departments.value = departmentResponse.data.data.items || [];
    semesterOptions.value = [
      { value: '', label: '전체' },
      ...periods.value.map((period) => ({
        value: period.semesterId,
        label: `${period.academicYear}학년도 ${period.term === 'FIRST' ? 1 : 2}학기`,
      })),
    ];
    departmentOptions.value = [
      { value: '', label: '전체' },
      ...departments.value.map((department) => ({
        value: department.id,
        label: department.name,
      })),
    ];
  } catch {
    periods.value = [];
    departments.value = [];
  }
};

const load = async (pageNumber = 1) => {
  isLoading.value = true;
  try {
    const response = await searchAcademicChangeRequests(TYPE, {
      page: pageNumber,
      size: 20,
      sort: 'CREATED_AT_DESC',
      status: filters.value.status || undefined,
      keyword: filters.value.keyword.trim() || undefined,
      targetSemesterId: filters.value.semesterId || undefined,
      targetDepartmentId: filters.value.departmentId || undefined,
    });
    const data = response.data.data;
    requests.value = data.items || [];
    page.value = { page: data.page, size: data.size, totalCount: data.totalCount, hasNext: data.hasNext };
  } catch (error) {
    requests.value = [];
    await notify(error.response?.data?.message || '전과 신청 목록을 불러오지 못했습니다.');
  } finally {
    isLoading.value = false;
  }
};

const resetFilters = () => {
  filters.value = { semesterId: '', keyword: '', departmentId: '', status: '' };
  load(1);
};

const resetProcessingForm = () => {
  selectedFiles.value = [];
  deanStampConfirmed.value = false;
  rejectReason.value = '';
  formError.value = '';
  if (fileInput.value) fileInput.value.value = '';
};

const selectRequest = async (requestId) => {
  isLoadingDetail.value = true;
  resetProcessingForm();
  try {
    const response = await getAcademicChangeRequest(TYPE, requestId);
    selectedRequest.value = response.data.data;
  } catch (error) {
    await notify(error.response?.data?.message || '전과 신청 상세를 불러오지 못했습니다.');
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

const onFileChange = (event) => {
  const files = Array.from(event.target.files || []);
  event.target.value = '';
  if (files.length !== 2) {
    formError.value = '학장 날인이 포함된 HWP/HWPX 파일을 정확히 2개 선택해 주세요.';
    return;
  }
  const invalidFile = files.find((file) => !/\.(hwp|hwpx)$/i.test(file.name) || file.size > FILE_MAX_SIZE);
  if (invalidFile) {
    formError.value = 'HWP/HWPX 파일만 가능하며 파일당 10MB 이하여야 합니다.';
    return;
  }
  selectedFiles.value = files;
  formError.value = '';
};

const applyRequest = async () => {
  if (!deanStampConfirmed.value) {
    formError.value = '두 문서의 학장 날인을 확인해 주세요.';
    return;
  }
  if (selectedFiles.value.length !== 2) {
    formError.value = '학장 날인본 HWP/HWPX 파일 2개를 선택해 주세요.';
    return;
  }
  const confirmed = await confirmDialog('학장 날인본으로 교체하고 전과를 학적에 반영하시겠습니까?');
  if (!confirmed) return;

  isProcessing.value = true;
  try {
    const response = await applyAcademicChange(
      TYPE,
      selectedRequest.value.id,
      selectedFiles.value,
      createAcademicChangeKey('transfer-application'),
    );
    selectedRequest.value = response.data.data;
    resetProcessingForm();
    await notify('전과 학적 반영이 완료되었습니다.');
    await load(page.value.page);
  } catch (error) {
    await notify(error.response?.data?.message || '전과 학적 반영 중 오류가 발생했습니다.');
  } finally {
    isProcessing.value = false;
  }
};

const rejectRequest = async () => {
  const reason = rejectReason.value.trim();
  if (!reason) {
    formError.value = '학장 날인 미확인 사유를 입력해 주세요.';
    return;
  }
  const confirmed = await confirmDialog('학장 날인 미확인으로 이 전과 신청을 반려하시겠습니까?');
  if (!confirmed) return;

  isProcessing.value = true;
  try {
    const response = await rejectAcademicChangeByAdmin(
      TYPE,
      selectedRequest.value.id,
      reason,
      createAcademicChangeKey('transfer-rejection'),
    );
    selectedRequest.value = response.data.data;
    resetProcessingForm();
    await notify('전과 신청을 반려했습니다.');
    await load(page.value.page);
  } catch (error) {
    await notify(error.response?.data?.message || '전과 반려 처리 중 오류가 발생했습니다.');
  } finally {
    isProcessing.value = false;
  }
};

onMounted(async () => {
  await Promise.all([loadCatalogs(), load()]);
});
</script>

<template>
  <MyPageContainer
    title="전과 신청 관리"
    subtitle="지도교수 승인 건의 학장 날인본을 확인하고 학적을 반영합니다."
  >
    <section class="filter-card">
      <label>학기<MySelect
        v-model="filters.semesterId"
        :options="semesterOptions"
      /></label>
      <label>신청자<input
        v-model="filters.keyword"
        type="search"
        placeholder="이름·학과명"
        @keyup.enter="load(1)"
      ></label>
      <label>희망 학과<MySelect
        v-model="filters.departmentId"
        :options="departmentOptions"
      /></label>
      <label>진행 상태<MySelect
        v-model="filters.status"
        :options="ACADEMIC_CHANGE_STATUS_OPTIONS"
      /></label>
      <div class="filter-actions">
        <MyButton
          class="admin-primary"
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

    <div class="management-grid">
      <section class="list-card">
        <div class="section-title">
          <h3>전과 신청 목록</h3><span>총 {{ page.totalCount }}건</span>
        </div>
        <div class="table-scroll">
          <MyTable
            :columns="columns"
            :loading="isLoading"
            :empty="!isLoading && !requests.length"
            empty-message="전과 신청이 없습니다."
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
              <td>{{ advisorDecision(item.status) }}</td>
              <td :class="{ rejected: ['ADVISOR_REJECTED', 'REJECTED'].includes(item.status) }">
                {{ formatAcademicChangeStatus(item.status) }}
              </td>
              <td>
                <MyButton
                  color="white"
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
        <section class="detail-card">
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
            <div><dt>현재 학과</dt><dd>{{ selectedRequest.sourceDepartmentName }}</dd></div>
            <div><dt>희망 학과</dt><dd>{{ selectedRequest.targetDepartmentName }}</dd></div>
            <div><dt>신청 학기</dt><dd>{{ formatAcademicChangeSemester(selectedRequest, TYPE) }}</dd></div>
            <div><dt>신청일</dt><dd>{{ formatDate(selectedRequest.createdAt) }}</dd></div>
            <div>
              <dt>현재 상태</dt>
              <dd :class="{ rejected: ['ADVISOR_REJECTED', 'REJECTED'].includes(selectedRequest.status) }">
                {{ formatAcademicChangeStatus(selectedRequest.status) }}
              </dd>
            </div>
          </dl>
        </section>

        <section
          v-if="selectedRequest"
          class="detail-card"
        >
          <h3>제출 문서</h3>
          <button
            v-for="file in selectedRequest.files"
            :key="file.id"
            type="button"
            class="file-row"
            @click="downloadFile(file)"
          >
            <span>{{ file.originalName }}</span><small>{{ formatFileSize(file.size) }}</small><strong>다운로드</strong>
          </button>
        </section>

        <section
          v-if="selectedRequest?.status === 'ADVISOR_APPROVED'"
          class="detail-card action-card"
        >
          <h3>학장 날인 확인</h3>
          <p>두 문서에 학장 날인이 있는지 직접 확인한 뒤 날인본 2개를 선택해 주세요.</p>
          <input
            ref="fileInput"
            class="visually-hidden"
            type="file"
            accept=".hwp,.hwpx"
            multiple
            @change="onFileChange"
          >
          <button
            type="button"
            class="file-picker"
            @click="fileInput?.click()"
          >
            {{ selectedFiles.length ? `${selectedFiles.length}개 날인본 선택됨` : '날인본 2개 선택' }}
          </button>
          <label class="stamp-check"><input
            v-model="deanStampConfirmed"
            type="checkbox"
          >두 문서 모두 학장 날인 확인</label>
          <textarea
            v-model="rejectReason"
            maxlength="500"
            rows="3"
            placeholder="날인이 확인되지 않을 경우 반려 사유를 입력하세요."
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
              :disabled="isProcessing"
              @click="rejectRequest"
            />
            <MyButton
              class="admin-primary"
              color="deep-blue"
              size="big"
              content="학적 반영"
              :disabled="isProcessing"
              @click="applyRequest"
            />
          </div>
        </section>
      </aside>
    </div>
  </MyPageContainer>
</template>

<style scoped>
.filter-card { display: grid; grid-template-columns: 1fr 1.2fr 1fr 1fr auto; gap: 16px; align-items: end; padding: 20px; border: 1px solid var(--personal-color-border-mist); border-radius: 10px; background: white; }
.filter-card label { display: flex; flex-direction: column; gap: 6px; font-size: .78rem; font-weight: 600; }
.filter-card input { height: 38px; padding: 0 12px; border: 1px solid var(--personal-color-border-mist); border-radius: 4px; background: white; }
.filter-actions { display: flex; gap: 8px; justify-content: flex-end; }
.reset-action { border: 1px solid var(--personal-color-black); }
.admin-primary { background: var(--personal-color-admin-secondary-indigo); }
.management-grid { display: grid; grid-template-columns: minmax(0, 1.75fr) minmax(300px, .85fr); gap: 18px; margin-top: 20px; }
.list-card, .detail-card { padding: 18px; border: 1px solid var(--personal-color-border-mist); border-radius: 10px; background: white; }
.section-title { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; }
.section-title h3, .detail-card h3 { margin: 0; font-size: 1rem; }
.section-title span { color: var(--personal-color-admin-secondary-indigo); font-size: .8rem; font-weight: 700; }
.table-scroll { overflow-x: auto; }
.selected { background: var(--personal-color-indigo-soft-lavender); }
.rejected { color: var(--personal-color-danger-coral); }
.detail-column { display: flex; flex-direction: column; gap: 14px; }
.empty-detail { margin: 24px 0; color: var(--personal-color-text-muted-slate); text-align: center; }
.detail-list { margin: 12px 0 0; }
.detail-list div { display: grid; grid-template-columns: 90px 1fr; gap: 10px; padding: 8px 0; }
.detail-list dt { color: var(--personal-color-text-muted-slate); font-size: .8rem; }
.detail-list dd { margin: 0; text-align: right; font-size: .82rem; font-weight: 400; }
.file-row { width: 100%; display: grid; grid-template-columns: minmax(0, 1fr) auto auto; gap: 8px; margin-top: 8px; padding: 10px; border: 1px solid var(--personal-color-border-mist); border-radius: 5px; background: var(--personal-color-bg-surface-frost); cursor: pointer; text-align: left; }
.file-row span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.file-row small { color: var(--personal-color-text-muted-slate); }
.file-row strong { color: var(--personal-color-admin-secondary-indigo); font-size: .75rem; }
.action-card > p { color: var(--personal-color-text-muted-slate); font-size: .8rem; line-height: 1.5; }
.file-picker { width: 100%; height: 38px; border: 1px dashed var(--personal-color-admin-secondary-indigo); border-radius: 5px; color: var(--personal-color-admin-secondary-indigo); background: var(--personal-color-indigo-soft-lavender); cursor: pointer; }
.stamp-check { display: flex; gap: 7px; margin: 12px 0; font-size: .8rem; font-weight: 600; }
.action-card textarea { width: 100%; padding: 9px; border: 1px solid var(--personal-color-border-mist); border-radius: 4px; resize: vertical; }
.form-error { color: var(--personal-color-danger-coral); font-size: .78rem; }
.decision-actions { display: flex; gap: 10px; margin-top: 12px; justify-content: flex-end; }
.decision-actions :deep(button) { width: auto; }
.visually-hidden { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }
@media (max-width: 1100px) { .filter-card { grid-template-columns: repeat(2, 1fr); } .management-grid { grid-template-columns: 1fr; } }
@media (max-width: 620px) { .filter-card { grid-template-columns: 1fr; } .filter-actions { justify-content: flex-end; } }
</style>
