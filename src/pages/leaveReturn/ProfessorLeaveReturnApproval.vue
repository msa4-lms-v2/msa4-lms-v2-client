<script setup>
import { onMounted, ref } from 'vue';
import { changeLeaveRequestStatus, searchLeaveRequests } from '../../api/leaveApi';
import MyPageContainer from '../../components/layout/MyPageContainer.vue';
import MyButton from '../../components/button/MyButton.vue';
import MyModal from '../../components/common/MyModal.vue';
import MyTable from '../../components/table/MyTable.vue';
import MyStatusBadge from '../../components/common/MyStatusBadge.vue';
import PrevNextPagination from '../../components/pagination/PrevNextPagination.vue';
import { confirmDialog, notify } from '../../composables/useDialog';
import { formatDate } from '../../util/format';

defineOptions({ name: 'ProfessorLeaveReturnApproval' });

const REQUEST_TYPE_LABELS = {
  GENERAL_LEAVE: '일반휴학',
  GENERAL_RETURN: '일반복학',
  MILITARY_LEAVE: '군휴학',
  MILITARY_RETURN: '군복학',
};

const statusLabels = { PENDING: '대기', APPROVED: '승인', REJECTED: '반려', CANCELLED: '취소' };
const statusVariants = { PENDING: 'processing', APPROVED: 'success', REJECTED: 'fail', CANCELLED: 'warning' };

const columns = [
  { key: 'student', label: '학생' },
  { key: 'type', label: '유형' },
  { key: 'targetSemester', label: '적용 학기' },
  { key: 'status', label: '상태' },
  { key: 'createdAt', label: '신청일' },
  { key: 'management', label: '관리' },
];

const isLoading = ref(true);
const isAccessDenied = ref(false);
const loadError = ref('');
const requests = ref([]);
const page = ref({ page: 1, size: 20, totalCount: 0, hasNext: false });
const reviewTarget = ref(null);
const rejectReason = ref('');
const isReviewing = ref(false);

const createIdempotencyKey = (prefix) => {
  const suffix = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}-${suffix}`;
};

const load = async (pageNumber = 1) => {
  isLoading.value = true;
  loadError.value = '';
  try {
    const response = await searchLeaveRequests({ status: 'PENDING', page: pageNumber, size: 20 });
    const data = response.data.data;
    requests.value = data.items || [];
    page.value = { page: data.page, size: data.size, totalCount: data.totalCount, hasNext: data.hasNext };
    isAccessDenied.value = false;
  } catch (error) {
    requests.value = [];
    if (error.response?.status === 403) {
      isAccessDenied.value = true;
    } else {
      loadError.value = error.response?.data?.message || '휴·복학 신청 목록을 불러오지 못했습니다.';
      await notify(loadError.value);
    }
  } finally {
    isLoading.value = false;
  }
};

const openReview = (request) => {
  reviewTarget.value = request;
  rejectReason.value = '';
};

const closeReview = () => {
  if (isReviewing.value) return;
  reviewTarget.value = null;
  rejectReason.value = '';
};

const approve = async () => {
  const confirmed = await confirmDialog('이 신청을 승인하시겠습니까?');
  if (!confirmed) return;

  isReviewing.value = true;
  try {
    await changeLeaveRequestStatus(reviewTarget.value.id, 'APPROVED', null, createIdempotencyKey('leave-approve'));
    await notify('승인 처리되었습니다.');
    closeReview();
    await load(page.value.page);
  } catch (error) {
    await notify(error.response?.data?.message || '승인 처리 중 오류가 발생했습니다.');
  } finally {
    isReviewing.value = false;
  }
};

const reject = async () => {
  if (!rejectReason.value.trim()) {
    await notify('반려 사유를 입력해 주세요.');
    return;
  }

  isReviewing.value = true;
  try {
    await changeLeaveRequestStatus(
      reviewTarget.value.id,
      'REJECTED',
      rejectReason.value.trim(),
      createIdempotencyKey('leave-reject'),
    );
    await notify('반려 처리되었습니다.');
    closeReview();
    await load(page.value.page);
  } catch (error) {
    await notify(error.response?.data?.message || '반려 처리 중 오류가 발생했습니다.');
  } finally {
    isReviewing.value = false;
  }
};

onMounted(() => load());
</script>

<template>
  <MyPageContainer title="휴/복학 결재" subtitle="대기 중인 휴학·복학 신청을 승인·반려합니다.">
    <section v-if="isAccessDenied" class="notice-card" role="status">
      <p class="notice-title">교수 권한으로는 아직 이용할 수 없습니다.</p>
      <p class="notice-body">
        현재 백엔드 Academic 서비스의 휴·복학 승인 API는 학생 본인과 관리자(ADMIN) 권한만 허용하고
        있어, 교수 계정으로는 신청 목록을 조회하거나 승인·반려할 수 없습니다. 이 화면은 향후
        백엔드가 교수 권한을 지원하면 그대로 동작하도록 실제 API를 호출하는 구조로 만들어졌지만,
        현재는 서버가 접근을 거부합니다. 휴·복학 승인이 필요하면 관리자에게 문의해 주세요.
      </p>
    </section>

    <template v-else>
      <MyTable
        :columns="columns"
        :loading="isLoading"
        :empty="!isLoading && requests.length === 0"
        empty-message="처리 대기 중인 휴·복학 신청이 없습니다."
      >
        <tr v-for="item in requests" :key="item.id">
          <td>{{ item.studentName }}</td>
          <td>{{ REQUEST_TYPE_LABELS[item.requestType] || item.requestType }}</td>
          <td>{{ item.targetYear }}학년도 {{ item.targetSemester }}학기</td>
          <td>
            <MyStatusBadge :label="statusLabels[item.status] || item.status" :variant="statusVariants[item.status] || 'processing'" />
          </td>
          <td>{{ formatDate(item.createdAt, 'YYYY-MM-DD HH:mm') }}</td>
          <td>
            <MyButton btn-type="button" color="deep-blue" size="small" content="검토" @click="openReview(item)" />
          </td>
        </tr>
      </MyTable>

      <PrevNextPagination
        v-if="page.page > 1 || page.hasNext"
        :page="page.page"
        :has-next="page.hasNext"
        @page-change="load"
      />
    </template>

    <MyModal :is-open="Boolean(reviewTarget)" title="휴·복학 신청 검토" max-width="520px" @close="closeReview">
      <template v-if="reviewTarget">
        <dl class="detail-list">
          <div class="detail-row">
            <dt>학생</dt>
            <dd>{{ reviewTarget.studentName }}</dd>
          </div>
          <div class="detail-row">
            <dt>유형</dt>
            <dd>{{ REQUEST_TYPE_LABELS[reviewTarget.requestType] || reviewTarget.requestType }}</dd>
          </div>
          <div class="detail-row">
            <dt>적용 학기</dt>
            <dd>{{ reviewTarget.targetYear }}학년도 {{ reviewTarget.targetSemester }}학기</dd>
          </div>
          <div v-if="reviewTarget.reason" class="detail-row">
            <dt>신청 사유</dt>
            <dd>{{ reviewTarget.reason }}</dd>
          </div>
        </dl>
        <div class="review-area">
          <textarea v-model="rejectReason" rows="2" placeholder="반려 시 사유를 입력해 주세요."></textarea>
        </div>
      </template>

      <template #footer>
        <MyButton color="gray" size="small" content="닫기" :disabled="isReviewing" @click="closeReview" />
        <MyButton color="red" size="small" content="반려" :disabled="isReviewing" @click="reject" />
        <MyButton color="deep-blue" size="small" content="승인" :disabled="isReviewing" @click="approve" />
      </template>
    </MyModal>
  </MyPageContainer>
</template>

<style scoped>
.notice-card {
  padding: 24px;
  border: 1px solid var(--personal-color-border-mist);
  border-radius: 8px;
  background: var(--personal-color-white);
}

.notice-title {
  margin: 0 0 10px;
  color: var(--personal-color-primary-text-navy);
  font-weight: 700;
}

.notice-body {
  margin: 0;
  color: var(--personal-color-text-muted-slate);
  line-height: 1.6;
  font-size: 0.88rem;
}

.detail-list {
  display: flex;
  flex-direction: column;
}

.detail-row {
  display: grid;
  grid-template-columns: minmax(88px, 0.32fr) minmax(0, 1fr);
  padding: 10px 0;
  border-bottom: 1px solid var(--personal-color-border-mist);
}

.detail-row dt {
  color: var(--personal-color-text-muted-slate);
}

.detail-row dd {
  margin: 0;
}

.review-area {
  margin-top: 16px;
}

.review-area textarea {
  width: 100%;
  box-sizing: border-box;
  padding: 8px 12px;
  border: 1px solid var(--personal-color-border-mist);
  border-radius: 4px;
  font-size: 0.9rem;
  font-family: inherit;
  resize: vertical;
}
</style>
