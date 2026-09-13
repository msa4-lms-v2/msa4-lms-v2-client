<script setup>
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import MyButton from '../../components/button/MyButton.vue';
import MyStatusBadge from '../../components/common/MyStatusBadge.vue';
import MyPageContainer from '../../components/layout/MyPageContainer.vue';
import { confirmDialog, notify } from '../../composables/useDialog';
import { downloadLeaveRequestFile } from '../../api/leaveApi';
import { useLeaveRequestStore } from '../../store/leaveReturn/useLeaveRequestStore';
import {
  ACADEMIC_STATUS_LABEL,
  LEAVE_REQUEST_STATUS_LABEL,
  LEAVE_REQUEST_STATUS_VARIANT,
} from '../../util/academic/enumLabels';
import { formatDate } from '../../util/format';

defineOptions({ name: 'AdminLeaveRequestDetail' });

const props = defineProps({
  requestId: {
    type: String,
    required: true,
  },
});

const router = useRouter();
const leaveRequestStore = useLeaveRequestStore();
const rejectReason = ref('');
const loadError = ref('');

const request = computed(() => leaveRequestStore.currentRequest);
const canReview = computed(() => request.value?.status === 'ADVISOR_APPROVED');

const requestTypeLabel = {
  GENERAL_LEAVE: '일반휴학',
  MILITARY_LEAVE: '군휴학',
  GENERAL_RETURN: '일반복학',
  MILITARY_RETURN: '군복학',
};

const createIdempotencyKey = (action) => {
  const suffix = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `admin-leave-${action}-${suffix}`;
};

const load = async () => {
  loadError.value = '';
  try {
    await leaveRequestStore.fetchRequest(props.requestId);
  } catch (error) {
    loadError.value = error.response?.data?.message || '휴·복학 신청 상세를 불러오지 못했습니다.';
  }
};

const downloadFile = async (file) => {
  try {
    const response = await downloadLeaveRequestFile(request.value.id, file.id);
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
  const confirmed = await confirmDialog('지도교수 승인 완료 신청을 최종 승인하시겠습니까?');
  if (!confirmed) return;

  try {
    await leaveRequestStore.reviewRequest(
      request.value.id,
      'APPROVED',
      null,
      createIdempotencyKey('approve'),
    );
    await notify('최종 승인되었습니다. 학적 상태가 반영되었습니다.');
  } catch (error) {
    await notify(error.response?.data?.message || '최종 승인 처리 중 오류가 발생했습니다.');
  }
};

const reject = async () => {
  if (!rejectReason.value.trim()) {
    await notify('반려 사유를 입력해 주세요.');
    return;
  }

  const confirmed = await confirmDialog('이 신청을 최종 반려하시겠습니까?');
  if (!confirmed) return;

  try {
    await leaveRequestStore.reviewRequest(
      request.value.id,
      'REJECTED',
      rejectReason.value.trim(),
      createIdempotencyKey('reject'),
    );
    await notify('최종 반려되었습니다.');
  } catch (error) {
    await notify(error.response?.data?.message || '최종 반려 처리 중 오류가 발생했습니다.');
  }
};

const goList = () => {
  router.push({ name: 'AdminLeaveRequestIndex' });
};

onMounted(load);
</script>

<template>
  <MyPageContainer title="휴·복학 신청 상세">
    <p v-if="loadError" class="state-card">{{ loadError }}</p>
    <p v-else-if="leaveRequestStore.isLoadingDetail" class="state-card">신청 정보를 불러오는 중입니다.</p>

    <template v-else-if="request">
      <section class="request-summary">
        <div>
          <p>신청 유형</p>
          <strong>{{ requestTypeLabel[request.requestType] || request.requestType }}</strong>
        </div>
        <div>
          <p>신청일</p>
          <strong>{{ formatDate(request.createdAt, 'YYYY-MM-DD HH:mm') }}</strong>
        </div>
        <div>
          <p>지도교수 검토</p>
          <strong>{{ request.advisorReviewedAt ? formatDate(request.advisorReviewedAt, 'YYYY-MM-DD HH:mm') : '검토 대기' }}</strong>
        </div>
        <div>
          <p>처리 상태</p>
          <MyStatusBadge
            :label="LEAVE_REQUEST_STATUS_LABEL[request.status] || request.status"
            :variant="LEAVE_REQUEST_STATUS_VARIANT[request.status] || 'warning'"
          />
        </div>
      </section>

      <div class="detail-layout">
        <div class="detail-column">
          <section class="content-card">
            <h3>학생 정보</h3>
            <dl class="info-list">
              <div>
                <dt>학번</dt>
                <dd>{{ request.studentNumber || '-' }}</dd>
              </div>

              <div>
                <dt>이름</dt>
                <dd>{{ request.studentName }}</dd>
              </div>

              <div>
                <dt>소속 학과</dt>
                <dd>{{ request.departmentName }}</dd>
              </div>

              <div>
                <dt>학년</dt>
                <dd>{{ request.gradeLevel }}학년</dd>
              </div>

              <div>
                <dt>학적 상태</dt>
                <dd>{{ ACADEMIC_STATUS_LABEL[request.academicStatus] || request.academicStatus }}</dd>
              </div>

              <div>
                <dt>이메일</dt>
                <dd>{{ request.studentEmail || '-' }}</dd>
              </div>

              <div>
                <dt>연락처</dt>
                <dd>{{ request.studentPhoneNumber || '-' }}</dd>
              </div>
            </dl>
          </section>

          <section class="content-card">
            <h3>신청 정보</h3>
            <dl class="info-list">
              <div>
                <dt>신청 학기</dt>
                <dd>{{ request.targetYear }}학년도 {{ request.targetSemester }}학기</dd>
              </div>

              <div v-if="request.returnYear">
                <dt>복학 예정 학기</dt>
                <dd>{{ request.returnYear }}학년도 {{ request.returnSemester }}학기</dd>
              </div>

              <div>
                <dt>신청 사유</dt>
                <dd class="preserve-line">{{ request.reason }}</dd>
              </div>

              <div v-if="request.advisorReviewerName">
                <dt>지도교수</dt>
                <dd>{{ request.advisorReviewerName }}</dd>
              </div>

              <div v-if="request.advisorRejectReason">
                <dt>교수 반려 사유</dt>
                <dd class="preserve-line">{{ request.advisorRejectReason }}</dd>
              </div>

              <div v-if="request.rejectReason">
                <dt>최종 반려 사유</dt>
                <dd class="preserve-line">{{ request.rejectReason }}</dd>
              </div>

              <div v-if="request.cancelReason">
                <dt>취소 사유</dt>
                <dd class="preserve-line">{{ request.cancelReason }}</dd>
              </div>
            </dl>
          </section>

          <section class="content-card">
            <h3>증빙 서류</h3>
            <p v-if="request.files.length === 0" class="empty-text">첨부된 증빙 서류가 없습니다.</p>
            <ul v-else class="file-list">
              <li v-for="file in request.files" :key="file.id">
                <span>{{ file.originalName }}</span>
                <MyButton color="white" size="small" content="다운로드" @click="downloadFile(file)" />
              </li>
            </ul>
          </section>
        </div>

        <aside class="review-card">
          <h3>최종 처리</h3>
          <template v-if="canReview">
            <p>지도교수 승인이 완료된 신청입니다. 최종 승인 시 학생의 학적 상태가 즉시 변경됩니다.</p>
            <label for="leave-request-reject-reason">반려 사유</label>
            <textarea id="leave-request-reject-reason" v-model="rejectReason" maxlength="500" rows="5" placeholder="반려 시 사유를 입력해 주세요." />
            <p class="character-count">{{ rejectReason.length }} / 500</p>
            <div class="review-actions">
              <MyButton color="red" size="middle" content="반려" :disabled="leaveRequestStore.isReviewing" @click="reject" />
              <MyButton color="admin-indigo" size="middle" content="최종 승인" :disabled="leaveRequestStore.isReviewing" @click="approve" />
            </div>
          </template>
          <template v-else-if="request.status === 'PENDING'">
            <p>지도교수 승인을 기다리는 신청입니다. 지도교수 승인 후 최종 처리할 수 있습니다.</p>
          </template>
          <template v-else>
            <p>이미 처리된 신청입니다.</p>
          </template>
        </aside>
      </div>

      <div class="page-actions">
        <MyButton color="white" size="middle" content="목록으로" @click="goList" />
      </div>
    </template>
  </MyPageContainer>
</template>

<style scoped>
.request-summary,
.content-card,
.review-card,
.state-card {
  border: 1px solid var(--personal-color-border-mist);
  border-radius: var(--personal-radius);
  background: var(--personal-color-white);
}

.request-summary {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 20px;
  padding: 20px;
  margin-bottom: 16px;
}

.request-summary p {
  margin: 0 0 8px;
  color: var(--personal-color-text-muted-slate);
  font-size: 0.78rem;
}

.request-summary strong {
  color: var(--personal-color-primary-text-navy);
  font-size: 0.9rem;
}

.detail-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(280px, 0.85fr);
  align-items: start;
  gap: 16px;
}

.detail-column {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.content-card,
.review-card {
  padding: 20px;
}

.content-card h3,
.review-card h3 {
  margin: 0 0 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--personal-color-border-mist);
  color: var(--personal-color-primary-text-navy);
  font-size: 1rem;
}

.info-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 24px;
}

.info-list div {
  display: grid;
  grid-template-columns: 108px minmax(0, 1fr);
  gap: 8px;
  padding: 10px 0;
  border-bottom: 1px solid var(--personal-color-table-border-frost);
}

.info-list dt {
  color: var(--personal-color-text-muted-slate);
  font-size: 0.84rem;
}

.info-list dd {
  margin: 0;
  color: var(--personal-color-primary-text-navy);
  font-size: 0.86rem;
  overflow-wrap: anywhere;
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
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 10px 0;
  border-bottom: 1px solid var(--personal-color-table-border-frost);
  color: var(--personal-color-primary-text-navy);
  font-size: 0.86rem;
  overflow-wrap: anywhere;
}

.file-list :deep(.white),
.page-actions :deep(.white) {
  border: 1px solid var(--personal-color-border-mist);
  color: var(--personal-color-primary-text-navy);
}

.review-card > p,
.empty-text {
  margin: 0;
  color: var(--personal-color-text-muted-slate);
  font-size: 0.86rem;
  line-height: 1.5;
}

.review-card label {
  display: block;
  margin: 20px 0 8px;
  color: var(--personal-color-primary-text-navy);
  font-size: 0.86rem;
  font-weight: 600;
}

.review-card textarea {
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

.review-actions,
.page-actions {
  display: flex;
  justify-content: end;
  gap: 8px;
  margin-top: 20px;
}

.state-card {
  margin: 0;
  padding: 40px;
  color: var(--personal-color-text-muted-slate);
  text-align: center;
}

@media (max-width: 960px) {
  .request-summary,
  .info-list {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .detail-layout {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .request-summary,
  .info-list {
    grid-template-columns: 1fr;
  }
}
</style>
