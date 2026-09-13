<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import MyButton from '../../components/button/MyButton.vue';
import MyInput from '../../components/input/MyInput.vue';
import ProfessorApplicationDetail from '../../components/academic/ProfessorApplicationDetail.vue';
import { useProfessorRequestDetail } from '../../composables/useProfessorRequestDetail';
import MyPageContainer from '../../components/layout/MyPageContainer.vue';
import PrevNextPagination from '../../components/pagination/PrevNextPagination.vue';
import MyTable from '../../components/table/MyTable.vue';
import { downloadLeaveRequestFile, getLeaveRequest } from '../../api/leaveApi';
import { confirmDialog, notify } from '../../composables/useDialog';
import { useLeaveRequestStore } from '../../store/leaveReturn/useLeaveRequestStore';
import {
  ACADEMIC_STATUS_LABEL,
  LEAVE_REQUEST_STATUS_LABEL,
} from '../../util/academic/enumLabels';
import { formatDate } from '../../util/format';

defineOptions({ name: 'ProfessorLeaveReturnApproval' });

const leaveRequestStore = useLeaveRequestStore();
const filters = reactive({ requestType: '', status: 'PENDING', keyword: '', size: 20 });
const appliedFilters = ref({ ...filters });
const rejectReason = ref('');

const columns = [
  { key: 'id', label: '신청번호' },
  { key: 'studentNumber', label: '학번' },
  { key: 'studentName', label: '이름' },
  { key: 'departmentName', label: '소속 학과' },
  { key: 'targetSemester', label: '신청 학기' },
  { key: 'createdAt', label: '신청일' },
  { key: 'status', label: '처리 상태' },
  { key: 'action', label: '확인' },
];

const requestTypeLabel = {
  GENERAL_LEAVE: '일반휴학',
  MILITARY_LEAVE: '군휴학',
  GENERAL_RETURN: '일반복학',
  MILITARY_RETURN: '군복학',
};

const toSearchParams = (source) => Object.fromEntries(
  Object.entries(source).filter(([, value]) => value !== '' && value !== null && value !== undefined),
);

const createIdempotencyKey = (action) => {
  const suffix = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `professor-leave-${action}-${suffix}`;
};

const load = async (page = 1) => {
  try {
    await leaveRequestStore.fetchRequests(toSearchParams(appliedFilters.value), page);
  } catch (error) {
    await notify(error.response?.data?.message || '담당 학생의 휴·복학 신청을 불러오지 못했습니다.');
  }
};

const search = async () => {
  appliedFilters.value = { ...filters };
  await load();
};

const reset = async () => {
  Object.assign(filters, { requestType: '', status: 'PENDING', keyword: '', size: 20 });
  appliedFilters.value = { ...filters };
  await load();
};

const { detailId, selectedRequest, isLoadingDetail, detailError, openDetail, closeDetail } = useProfessorRequestDetail({
  fetchRequest: getLeaveRequest,
  resetForm: () => { rejectReason.value = ''; },
});
const studentFields = computed(() => {
  const item = selectedRequest.value || {};
  return [
    { label: '이름', value: item.studentName }, { label: '학번', value: item.studentNumber }, { label: '소속 단과대학', value: item.collegeName },
    { label: '소속 학과', value: item.departmentName }, { label: '학년', value: item.gradeLevel ? item.gradeLevel + '학년' : undefined },
    { label: '학적 상태', value: ACADEMIC_STATUS_LABEL[item.academicStatus] },
  ];
});
const applicationFields = computed(() => {
  const item = selectedRequest.value || {};
  const fields = [
    { label: '신청 유형', value: requestTypeLabel[item.requestType] }, { label: '신청번호', value: item.id }, { label: '신청일', value: formatDate(item.createdAt) },
    { label: '적용 학기', value: item.targetYear ? item.targetYear + '학년도 ' + item.targetSemester + '학기' : undefined },
    { label: '희망 학과', value: '해당 없음' }, { label: '처리 상태', value: LEAVE_REQUEST_STATUS_LABEL[item.status] },
  ];
  if (item.returnYear) fields.push({ label: '복학 예정 학기', value: item.returnYear + '학년도 ' + item.returnSemester + '학기' });
  return fields;
});

const downloadFile = async (file) => {
  try {
    const response = await downloadLeaveRequestFile(selectedRequest.value.id, file.id);
    const url = URL.createObjectURL(response.data);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = file.originalName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  } catch (error) {
    await notify(error.response?.data?.message || '증빙 파일을 내려받지 못했습니다.');
  }
};

const approve = async () => {
  if (!selectedRequest.value || leaveRequestStore.isReviewing) return;
  const requestId = selectedRequest.value.id;
  const confirmed = await confirmDialog('이 신청을 승인하여 관리자 최종 승인 단계로 넘기겠습니까?');
  if (!confirmed || leaveRequestStore.isReviewing || selectedRequest.value?.id !== requestId || selectedRequest.value?.status !== 'PENDING') return;

  try {
    await leaveRequestStore.reviewRequest(
      requestId,
      'APPROVED',
      null,
      createIdempotencyKey('approve'),
    );
    await notify('교수 승인되었습니다. 학적 상태는 관리자 최종 승인 시 변경됩니다.');
    closeDetail();
    await load(leaveRequestStore.pageInfo.page);
  } catch (error) {
    await notify(error.response?.data?.message || '교수 승인 처리 중 오류가 발생했습니다.');
  }
};

const reject = async () => {
  if (!selectedRequest.value || leaveRequestStore.isReviewing) return;
  const requestId = selectedRequest.value.id;
  if (!rejectReason.value.trim()) {
    await notify('반려 사유를 입력해 주세요.');
    return;
  }

  const confirmed = await confirmDialog('이 신청을 반려하시겠습니까?');
  if (!confirmed || leaveRequestStore.isReviewing || selectedRequest.value?.id !== requestId || selectedRequest.value?.status !== 'PENDING') return;

  try {
    await leaveRequestStore.reviewRequest(
      requestId,
      'REJECTED',
      rejectReason.value.trim(),
      createIdempotencyKey('reject'),
    );
    await notify('교수 반려되었습니다.');
    closeDetail();
    await load(leaveRequestStore.pageInfo.page);
  } catch (error) {
    await notify(error.response?.data?.message || '교수 반려 처리 중 오류가 발생했습니다.');
  }
};

onMounted(() => load());
</script>

<template>
  <MyPageContainer :title="detailId ? '휴·복학 신청 확인 · 상세' : '휴·복학 신청 확인'">
    <section v-if="!detailId" class="filter-card" aria-label="휴·복학 신청 검색 조건">
      <div class="filter-fields">
        <label class="filter-field" for="professor-leave-request-type">
          <span>신청 유형</span>
          <select id="professor-leave-request-type" v-model="filters.requestType">
            <option value="">전체</option>
            <option value="GENERAL_LEAVE">일반휴학</option>
            <option value="MILITARY_LEAVE">군휴학</option>
            <option value="GENERAL_RETURN">일반복학</option>
            <option value="MILITARY_RETURN">군복학</option>
          </select>
        </label>

        <label class="filter-field" for="professor-leave-request-status">
          <span>처리 상태</span>
          <select id="professor-leave-request-status" v-model="filters.status">
            <option value="">전체</option>
            <option value="PENDING">교수 승인 대기</option>
            <option value="ADVISOR_APPROVED">교수 승인 완료</option>
            <option value="APPROVED">최종 승인</option>
            <option value="REJECTED">반려</option>
            <option value="CANCELLED">취소</option>
          </select>
        </label>
        <label class="filter-field" for="professor-leave-keyword">
          <span>학번 / 이름</span>
          <MyInput id="professor-leave-keyword" v-model="filters.keyword" maxlength="50" placeholder="학번 / 이름 검색" @keyup-enter="search" />
        </label>
      </div>

      <div class="filter-actions">
        <MyButton color="deep-blue" size="middle" content="조회" @click="search" />
        <MyButton color="white" size="middle" content="초기화" @click="reset" />
      </div>
    </section>

    <section v-if="!detailId" class="result-card">
      <div class="result-heading">
        <h3>담당 학생 휴·복학 신청</h3>
        <p>총 {{ leaveRequestStore.pageInfo.totalCount }}건</p>
      </div>

      <MyTable
        :columns="columns"
        :loading="leaveRequestStore.isLoading"
        :empty="!leaveRequestStore.isLoading && leaveRequestStore.requests.length === 0"
        empty-message="담당 학생의 휴·복학 신청이 없습니다."
      >
        <tr v-for="item in leaveRequestStore.requests" :key="item.id">
          <td>{{ item.id }}</td>
          <td>{{ item.studentNumber || '-' }}</td>
          <td>{{ item.studentName }}</td>
          <td>{{ item.departmentName }}</td>
          <td>{{ item.targetYear }}학년도 {{ item.targetSemester }}학기</td>
          <td>{{ formatDate(item.createdAt) }}</td>
          <td :class="{ rejected: item.status === 'REJECTED' }">
            {{ LEAVE_REQUEST_STATUS_LABEL[item.status] || item.status }}
          </td>
          <td>
            <MyButton color="deep-blue" size="small" content="확인" @click="openDetail(item.id)" />
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

    <div v-if="detailId" :aria-busy="isLoadingDetail">
      <p v-if="isLoadingDetail" role="status">신청 정보를 불러오는 중입니다.</p>
      <template v-else-if="detailError"><p role="alert">{{ detailError }}</p><MyButton color="white" size="middle" content="목록" @click="closeDetail" /></template>
      <ProfessorApplicationDetail v-else-if="selectedRequest" v-model:review-reason="rejectReason" :student-fields="studentFields" :application-fields="applicationFields" :reason="selectedRequest.reason" :reviewable="selectedRequest.status === 'PENDING'" :busy="leaveRequestStore.isReviewing" @back="closeDetail" @approve="approve" @reject="reject">
        <template #files>
          <p v-if="!selectedRequest.files?.length">첨부된 증빙 서류가 없습니다.</p>
          <ul v-else class="file-list"><li v-for="file in selectedRequest.files" :key="file.id"><span>{{ file.originalName }}</span><MyButton color="white" size="small" content="다운로드" @click="downloadFile(file)" /></li></ul>
        </template>
        <template v-if="selectedRequest.advisorRejectReason || selectedRequest.rejectReason" #history><p class="rejected preserve-line">반려 사유: {{ selectedRequest.advisorRejectReason || selectedRequest.rejectReason }}</p></template>
      </ProfessorApplicationDetail>
    </div>
  </MyPageContainer>
</template>

<style scoped>
.filter-card {
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
  grid-template-columns: repeat(3, minmax(140px, 220px));
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

.filter-field select {
  min-height: 38px;
  border: 1px solid var(--personal-color-border-mist);
  border-radius: 4px;
  padding: 0 10px;
  color: var(--personal-color-primary-text-navy);
  background: var(--personal-color-white);
  font: inherit;
  font-weight: 400;
}

.filter-actions,
.result-heading,
.modal-summary,
.file-list li {
  display: flex;
  align-items: center;
}

.filter-actions {
  gap: 8px;
}

.filter-actions :deep(.white),
.file-list :deep(.white) {
  border: 1px solid var(--personal-color-border-mist);
  color: var(--personal-color-primary-text-navy);
}

.result-card {
  padding: 0;
}

.result-heading {
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
  color: var(--personal-color-primary-navy);
  font-size: 0.78rem;
  font-weight: 600;
}

.modal-summary {
  justify-content: space-between;
  gap: 16px;
  padding: 0 0 16px;
  border-bottom: 1px solid var(--personal-color-border-mist);
}

.modal-summary div {
  display: flex;
  align-items: center;
  gap: 12px;
}

.modal-summary span,
.info-list dt {
  color: var(--personal-color-text-muted-slate);
  font-size: 0.84rem;
}

.modal-summary strong,
.info-list dd {
  color: var(--personal-color-primary-text-navy);
  font-size: 0.86rem;
}

.rejected strong,
td.rejected {
  color: var(--personal-color-danger-coral);
}

.detail-section {
  margin-top: 20px;
}

.detail-section h3 {
  margin: 0 0 10px;
  color: var(--personal-color-primary-text-navy);
  font-size: 0.92rem;
}

.info-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 20px;
  margin: 0;
}

.info-list div {
  display: grid;
  grid-template-columns: 104px minmax(0, 1fr);
  gap: 8px;
  padding: 8px 0;
  border-bottom: 1px solid var(--personal-color-table-border-frost);
}

.info-list dd {
  margin: 0;
  overflow-wrap: anywhere;
}

.single-column {
  grid-template-columns: 1fr;
}

.preserve-line {
  white-space: pre-wrap;
}

.file-list {
  display: flex;
  flex-direction: column;
  list-style: none;
  margin: 0;
  padding: 0;
}

.file-list li {
  justify-content: space-between;
  gap: 16px;
  padding: 8px 0;
  border-bottom: 1px solid var(--personal-color-table-border-frost);
  color: var(--personal-color-primary-text-navy);
  font-size: 0.86rem;
}

.reject-label {
  display: block;
  margin: 20px 0 8px;
  color: var(--personal-color-primary-text-navy);
  font-size: 0.86rem;
  font-weight: 600;
}

textarea {
  width: 100%;
  box-sizing: border-box;
  resize: vertical;
  border: 1px solid var(--personal-color-border-mist);
  border-radius: 4px;
  padding: 10px;
  color: var(--personal-color-primary-text-navy);
  font: inherit;
}

.character-count {
  margin: 4px 0 0;
  text-align: right;
  color: var(--personal-color-text-faint-fog);
  font-size: 0.75rem;
}

.state-text {
  margin: 0;
  color: var(--personal-color-text-muted-slate);
  font-size: 0.86rem;
}

@media (max-width: 640px) {
  .filter-card {
    flex-direction: column;
    align-items: stretch;
  }

  .filter-fields,
  .info-list {
    grid-template-columns: 1fr;
  }

  .filter-actions {
    justify-content: end;
  }
}
</style>
