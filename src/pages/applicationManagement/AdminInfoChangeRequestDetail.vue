<script setup>
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import MyButton from '../../components/button/MyButton.vue';
import MyStatusBadge from '../../components/common/MyStatusBadge.vue';
import MyPageContainer from '../../components/layout/MyPageContainer.vue';
import { useAdminInfoChangeStore } from '../../store/infochange/useAdminInfoChangeStore';
import { INFO_CHANGE_STATUS_LABEL, INFO_CHANGE_STATUS_VARIANT } from '../../util/academic/enumLabels';
import { formatDate } from '../../util/format';
import { confirmDialog, notify } from '../../composables/useDialog';

const route = useRoute();
const router = useRouter();
const infoChangeStore = useAdminInfoChangeStore();
const rejectReason = ref('');

const requesterTypeLabel = computed(() => (
  infoChangeStore.currentRequesterType === 'PROFESSOR' ? '교수' : '학생'
));
const requesterName = computed(() => (
  infoChangeStore.currentRequesterType === 'PROFESSOR'
    ? infoChangeStore.currentRequest?.professorName
    : infoChangeStore.currentRequest?.studentName
));
const currentRequest = computed(() => infoChangeStore.currentRequest);
const canReview = computed(() => currentRequest.value?.status === 'REQUESTED');
const changedRows = computed(() => {
  if (!currentRequest.value) return [];

  return [
    { label: '이름', before: currentRequest.value.previousName, after: currentRequest.value.newName },
    { label: '연락처', before: currentRequest.value.previousPhoneNumber, after: currentRequest.value.newPhoneNumber },
    { label: '이메일', before: currentRequest.value.previousEmail, after: currentRequest.value.newEmail },
    { label: '주소', before: currentRequest.value.previousAddress, after: currentRequest.value.newAddress },
  ].filter((item) => item.after);
});
const hasProfileImageChange = computed(() => Boolean(currentRequest.value?.newProfileImageUrl));

const load = async () => {
  await infoChangeStore.fetchRequestDetail(route.params.requesterType, Number(route.params.requestId), { pageLoad: true });
};

const goList = () => {
  router.push({ name: 'AdminInfoChangeRequestIndex' });
};

const approve = async () => {
  const confirmed = await confirmDialog('이 신청을 승인하시겠습니까? 승인 시 요청한 정보가 즉시 반영됩니다.');
  if (!confirmed) return;

  try {
    await infoChangeStore.approveRequest();
    await notify('승인 처리되었습니다.');
  } catch (error) {
    await notify(error.response?.data?.message || '승인 처리 중 오류가 발생했습니다.');
  }
};

const reject = async () => {
  const reason = rejectReason.value.trim();
  if (!reason) {
    await notify('반려 사유를 입력해 주세요.');
    return;
  }

  const confirmed = await confirmDialog('이 신청을 반려하시겠습니까?');
  if (!confirmed) return;

  try {
    await infoChangeStore.rejectRequest(reason);
    await notify('반려 처리되었습니다.');
  } catch (error) {
    await notify(error.response?.data?.message || '반려 처리 중 오류가 발생했습니다.');
  }
};

onMounted(load);
</script>

<template>
  <MyPageContainer title="정보 변경 신청 상세">
    <template v-if="infoChangeStore.isLoadingDetail">
      <section class="state-card">정보 변경 신청을 불러오는 중입니다.</section>
    </template>

    <template v-else-if="currentRequest">
      <section class="request-summary">
        <div>
          <p class="summary-label">신청일</p>
          <strong>{{ formatDate(currentRequest.createdAt) }}</strong>
        </div>
        <div>
          <p class="summary-label">신청자 유형</p>
          <strong>{{ requesterTypeLabel }}</strong>
        </div>
        <div>
          <p class="summary-label">이름</p>
          <strong>{{ requesterName }}</strong>
        </div>
        <div>
          <p class="summary-label">소속</p>
          <strong>{{ currentRequest.departmentName || '-' }}</strong>
        </div>
        <div>
          <p class="summary-label">처리 상태</p>
          <MyStatusBadge
            :label="INFO_CHANGE_STATUS_LABEL[currentRequest.status] || currentRequest.status"
            :variant="INFO_CHANGE_STATUS_VARIANT[currentRequest.status] || 'warning'"
          />
        </div>
      </section>

      <div class="detail-layout">
        <div class="detail-column">
          <section class="content-card">
            <h3>변경 정보 비교</h3>
            <div v-if="changedRows.length" class="comparison-table-wrap">
              <table class="comparison-table">
                <thead>
                  <tr>
                    <th>항목</th>
                    <th>기존 정보</th>
                    <th>변경 요청 정보</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="item in changedRows" :key="item.label">
                    <td>{{ item.label }}</td>
                    <td>{{ item.before || '기존 정보 없음' }}</td>
                    <td>{{ item.after }}</td>
                  </tr>
                  <tr v-if="hasProfileImageChange">
                    <td>프로필 사진</td>
                    <td>
                      <a v-if="currentRequest.previousProfileImageUrl" :href="currentRequest.previousProfileImageUrl" target="_blank" rel="noopener">기존 사진 보기</a>
                      <span v-else>기존 정보 없음</span>
                    </td>
                    <td><a :href="currentRequest.newProfileImageUrl" target="_blank" rel="noopener">변경 사진 보기</a></td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p v-else class="empty-text">변경 요청 항목이 없습니다.</p>
          </section>

          <section class="content-card">
            <h3>신청 사유</h3>
            <p class="request-reason">{{ currentRequest.reason }}</p>
          </section>

          <section class="content-card">
            <h3>증빙 자료</h3>
            <ul v-if="currentRequest.files?.length" class="file-list">
              <li v-for="file in currentRequest.files" :key="file.id">
                <span>{{ file.fileName }}</span>
                <a :href="file.downloadUrl" target="_blank" rel="noopener">다운로드</a>
              </li>
            </ul>
            <p v-else class="empty-text">첨부된 증빙 자료가 없습니다.</p>
          </section>
        </div>

        <aside class="review-card">
          <h3>검토 및 처리</h3>
          <template v-if="canReview">
            <p>변경 요청 전체를 승인하거나 반려할 수 있습니다.</p>
            <label for="info-change-reject-reason">반려 사유</label>
            <textarea
              id="info-change-reject-reason"
              v-model="rejectReason"
              maxlength="500"
              rows="6"
              placeholder="반려하는 경우 사유를 입력해 주세요."
            ></textarea>
            <p class="character-count">{{ rejectReason.length }} / 500</p>
            <div class="review-actions">
              <MyButton color="red" size="middle" content="반려" :disabled="infoChangeStore.isReviewing" @click="reject" />
              <MyButton color="admin-indigo" size="middle" content="승인" :disabled="infoChangeStore.isReviewing" @click="approve" />
            </div>
          </template>
          <template v-else>
            <p>이미 처리된 신청입니다.</p>
            <dl class="review-history">
              <div>
                <dt>처리일</dt>
                <dd>{{ formatDate(currentRequest.reviewedAt) }}</dd>
              </div>
              <div v-if="currentRequest.rejectReason">
                <dt>반려 사유</dt>
                <dd>{{ currentRequest.rejectReason }}</dd>
              </div>
            </dl>
          </template>
        </aside>
      </div>

      <div class="page-actions">
        <MyButton color="white" size="middle" content="목록" @click="goList" />
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
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 20px;
  padding: 20px;
  margin-bottom: 16px;
}

.summary-label {
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

.comparison-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
}

.comparison-table th,
.comparison-table td {
  padding: 12px;
  border-bottom: 1px solid var(--personal-color-table-border-frost);
  overflow-wrap: anywhere;
}

.comparison-table th {
  background: var(--personal-color-table-header-smoke);
  color: var(--personal-color-text-secondary-steel);
  font-size: 0.8rem;
}

.comparison-table td {
  color: var(--personal-color-primary-text-navy);
  font-size: 0.86rem;
}

.comparison-table a,
.file-list a {
  color: var(--personal-color-admin-secondary-indigo);
  font-weight: 600;
}

.request-reason {
  margin: 0;
  white-space: pre-wrap;
  color: var(--personal-color-primary-text-navy);
  line-height: 1.6;
}

.file-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.file-list li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 12px 0;
  border-bottom: 1px solid var(--personal-color-table-border-frost);
  color: var(--personal-color-primary-text-navy);
  font-size: 0.86rem;
}

.review-card > p {
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

.page-actions :deep(.white) {
  border: 1px solid var(--personal-color-border-mist);
  color: var(--personal-color-primary-text-navy);
}

.review-history {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin: 20px 0 0;
}

.review-history div {
  display: grid;
  grid-template-columns: 80px 1fr;
  gap: 8px;
}

.review-history dt {
  color: var(--personal-color-text-muted-slate);
}

.review-history dd {
  margin: 0;
  color: var(--personal-color-primary-text-navy);
  overflow-wrap: anywhere;
}

.empty-text,
.state-card {
  color: var(--personal-color-text-muted-slate);
  font-size: 0.86rem;
}

.empty-text {
  margin: 0;
}

.state-card {
  padding: 40px;
  text-align: center;
}

@media (max-width: 960px) {
  .request-summary {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .detail-layout {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .request-summary {
    grid-template-columns: 1fr;
  }

  .comparison-table-wrap {
    overflow-x: auto;
  }

  .comparison-table {
    min-width: 520px;
  }
}
</style>
