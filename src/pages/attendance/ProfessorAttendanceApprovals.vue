<script setup>
import { onMounted, ref } from 'vue';
import { reviewExcuseRequest, searchExcuseRequests } from '../../api/attendanceApi';
import MyPageContainer from '../../components/layout/MyPageContainer.vue';
import MyButton from '../../components/button/MyButton.vue';
import MyModal from '../../components/common/MyModal.vue';
import MyTable from '../../components/table/MyTable.vue';
import MyStatusBadge from '../../components/common/MyStatusBadge.vue';
import PrevNextPagination from '../../components/pagination/PrevNextPagination.vue';
import { confirmDialog, notify } from '../../composables/useDialog';
import { formatDate } from '../../util/format';

defineOptions({ name: 'ProfessorAttendanceApprovals' });

const columns = [
  { key: 'student', label: '학생' },
  { key: 'course', label: '교과목' },
  { key: 'lectureDate', label: '결석일' },
  { key: 'reason', label: '신청 사유' },
  { key: 'attachment', label: '증빙' },
  { key: 'createdAt', label: '신청일' },
  { key: 'management', label: '관리' },
];

const requests = ref([]);
const page = ref({ page: 1, size: 20, totalCount: 0, hasNext: false });
const isLoading = ref(false);
const reviewTarget = ref(null);
const rejectReason = ref('');
const isReviewing = ref(false);

const createIdempotencyKey = (prefix) => {
  const suffix = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}-${suffix}`;
};

const load = async (pageNumber = 1) => {
  isLoading.value = true;
  try {
    const response = await searchExcuseRequests({ status: 'PENDING', page: pageNumber, size: 20 });
    const data = response.data.data;
    requests.value = data.items || [];
    page.value = { page: data.page, size: data.size, totalCount: data.totalCount, hasNext: data.hasNext };
  } catch (error) {
    requests.value = [];
    await notify(error.response?.data?.message || '공결 신청 목록을 불러오지 못했습니다.');
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
  const confirmed = await confirmDialog('이 공결 신청을 승인하시겠습니까?');
  if (!confirmed) return;

  isReviewing.value = true;
  try {
    await reviewExcuseRequest(reviewTarget.value.id, 'APPROVED', null, createIdempotencyKey('excuse-approve'));
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
    await reviewExcuseRequest(
      reviewTarget.value.id,
      'REJECTED',
      rejectReason.value.trim(),
      createIdempotencyKey('excuse-reject'),
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
  <MyPageContainer title="출결 승인" subtitle="담당 강의 학생의 공결 신청을 승인·반려합니다.">
    <MyTable
      :columns="columns"
      :loading="isLoading"
      :empty="!isLoading && requests.length === 0"
      empty-message="처리 대기 중인 공결 신청이 없습니다."
    >
      <tr v-for="item in requests" :key="item.id">
        <td>{{ item.studentName }}</td>
        <td>
          <div class="course-name">{{ item.courseName }}</div>
          <div class="course-code">{{ item.courseCode }} · {{ item.sectionNo }}분반</div>
        </td>
        <td>{{ formatDate(item.lectureDate) }} {{ item.period }}교시</td>
        <td class="reason-cell" :title="item.reason">{{ item.reason }}</td>
        <td>{{ item.attachmentOriginalName || '-' }}</td>
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

    <MyModal :is-open="Boolean(reviewTarget)" title="공결 신청 검토" max-width="520px" @close="closeReview">
      <template v-if="reviewTarget">
        <dl class="detail-list">
          <div class="detail-row">
            <dt>학생</dt>
            <dd>{{ reviewTarget.studentName }}</dd>
          </div>
          <div class="detail-row">
            <dt>교과목</dt>
            <dd>{{ reviewTarget.courseName }} ({{ reviewTarget.sectionNo }}분반)</dd>
          </div>
          <div class="detail-row">
            <dt>결석일</dt>
            <dd>{{ formatDate(reviewTarget.lectureDate) }} {{ reviewTarget.period }}교시</dd>
          </div>
          <div class="detail-row">
            <dt>신청 사유</dt>
            <dd>{{ reviewTarget.reason }}</dd>
          </div>
          <div v-if="reviewTarget.attachmentOriginalName" class="detail-row">
            <dt>증빙 파일</dt>
            <dd>{{ reviewTarget.attachmentOriginalName }}</dd>
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
.course-name {
  font-weight: 600;
}

.course-code {
  margin-top: 2px;
  color: var(--personal-color-text-muted-slate);
  font-size: 0.78rem;
}

.reason-cell {
  max-width: 220px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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
