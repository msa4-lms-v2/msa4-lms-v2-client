<script setup>
import { onMounted, ref } from 'vue';
import MyPageContainer from '../../components/layout/MyPageContainer.vue';
import MyButton from '../../components/button/MyButton.vue';
import MyModal from '../../components/common/MyModal.vue';
import PrevNextPagination from '../../components/pagination/PrevNextPagination.vue';
import StatusBadge from '../../components/common/StatusBadge.vue';
import { useInfoChangeStore } from '../../store/infochange/useInfoChangeStore';
import { INFO_CHANGE_STATUS_LABEL, INFO_CHANGE_STATUS_VARIANT } from '../../util/academic/enumLabels';
import { formatDate } from '../../util/format';
import { notify, confirmDialog } from '../../composables/useDialog';

const infoChangeStore = useInfoChangeStore();

const isModalOpen = ref(false);
const rejectReason = ref('');
const isRejecting = ref(false);

const load = (page = 1) => infoChangeStore.fetchAdminRequests(page);

const openDetail = async (requestId) => {
  await infoChangeStore.fetchRequestDetail(requestId);
  rejectReason.value = '';
  isRejecting.value = false;
  isModalOpen.value = true;
};

const closeDetail = () => {
  isModalOpen.value = false;
};

const approve = async () => {
  const confirmed = await confirmDialog('이 신청을 승인하시겠습니까? 승인 시 학적 정보에 즉시 반영됩니다.');
  if (!confirmed) return;

  try {
    await infoChangeStore.approveRequest(infoChangeStore.currentRequest.id);
    await notify('승인 처리되었습니다.');
    closeDetail();
    await load(infoChangeStore.adminRequestsPage.page);
  } catch (error) {
    await notify(error.response?.data?.message || '승인 처리 중 오류가 발생했습니다.');
  }
};

const reject = async () => {
  if (!rejectReason.value.trim()) {
    await notify('반려 사유를 입력해 주세요.');
    return;
  }

  try {
    await infoChangeStore.rejectRequest(infoChangeStore.currentRequest.id, rejectReason.value.trim());
    await notify('반려 처리되었습니다.');
    closeDetail();
    await load(infoChangeStore.adminRequestsPage.page);
  } catch (error) {
    await notify(error.response?.data?.message || '반려 처리 중 오류가 발생했습니다.');
  }
};

onMounted(() => load());
</script>

<template>
  <MyPageContainer title="학적 정보 변경 승인" subtitle="학생이 신청한 정보 변경 요청을 확인하고 승인/반려합니다.">
    <article class="list-card">
      <p v-if="infoChangeStore.isLoadingAdminRequests">불러오는 중...</p>
      <p v-else-if="infoChangeStore.adminRequests.length === 0" class="empty">신청 내역이 없습니다.</p>
      <table v-else>
        <thead>
          <tr>
            <th>신청일</th>
            <th>학생</th>
            <th>사유</th>
            <th>상태</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in infoChangeStore.adminRequests" :key="item.id">
            <td>{{ formatDate(item.createdAt, 'YYYY-MM-DD HH:mm') }}</td>
            <td>{{ item.studentName }}</td>
            <td class="reason-cell">{{ item.reason }}</td>
            <td>
              <StatusBadge
                :label="INFO_CHANGE_STATUS_LABEL[item.status]"
                :variant="INFO_CHANGE_STATUS_VARIANT[item.status]"
              />
            </td>
            <td>
              <MyButton color="deep-blue" size="small" content="상세" @click="openDetail(item.id)" />
            </td>
          </tr>
        </tbody>
      </table>

      <PrevNextPagination
        :page="infoChangeStore.adminRequestsPage.page"
        :has-next="infoChangeStore.adminRequestsPage.hasNext"
        @page-change="load"
      />
    </article>

    <MyModal :is-open="isModalOpen" title="학적 정보 변경 신청 상세" max-width="560px" @close="closeDetail">
      <template v-if="infoChangeStore.currentRequest">
        <dl class="detail-list">
          <div class="detail-row">
            <dt>학생</dt>
            <dd>{{ infoChangeStore.currentRequest.studentName }}</dd>
          </div>
          <div class="detail-row">
            <dt>상태</dt>
            <dd>
              <StatusBadge
                :label="INFO_CHANGE_STATUS_LABEL[infoChangeStore.currentRequest.status]"
                :variant="INFO_CHANGE_STATUS_VARIANT[infoChangeStore.currentRequest.status]"
              />
            </dd>
          </div>
          <div v-if="infoChangeStore.currentRequest.newName" class="detail-row">
            <dt>변경 이름</dt>
            <dd>{{ infoChangeStore.currentRequest.newName }}</dd>
          </div>
          <div v-if="infoChangeStore.currentRequest.newPhoneNumber" class="detail-row">
            <dt>변경 연락처</dt>
            <dd>{{ infoChangeStore.currentRequest.newPhoneNumber }}</dd>
          </div>
          <div v-if="infoChangeStore.currentRequest.newEmail" class="detail-row">
            <dt>변경 이메일</dt>
            <dd>{{ infoChangeStore.currentRequest.newEmail }}</dd>
          </div>
          <div v-if="infoChangeStore.currentRequest.newAddress" class="detail-row">
            <dt>변경 주소</dt>
            <dd>{{ infoChangeStore.currentRequest.newAddress }}</dd>
          </div>
          <div v-if="infoChangeStore.currentRequest.newProfileImageUrl" class="detail-row">
            <dt>변경 프로필 사진</dt>
            <dd><a :href="infoChangeStore.currentRequest.newProfileImageUrl" target="_blank" rel="noopener">보기</a></dd>
          </div>
          <div class="detail-row">
            <dt>사유</dt>
            <dd>{{ infoChangeStore.currentRequest.reason }}</dd>
          </div>
          <div v-if="infoChangeStore.currentRequest.files?.length" class="detail-row">
            <dt>증빙 파일</dt>
            <dd>
              <ul class="file-list">
                <li v-for="file in infoChangeStore.currentRequest.files" :key="file.id">
                  <a :href="file.downloadUrl" target="_blank" rel="noopener">{{ file.fileName }}</a>
                </li>
              </ul>
            </dd>
          </div>
          <div v-if="infoChangeStore.currentRequest.rejectReason" class="detail-row">
            <dt>반려 사유</dt>
            <dd>{{ infoChangeStore.currentRequest.rejectReason }}</dd>
          </div>
        </dl>

        <div v-if="infoChangeStore.currentRequest.status === 'REQUESTED'" class="review-area">
          <textarea v-model="rejectReason" rows="2" placeholder="반려 시 사유를 입력해 주세요."></textarea>
        </div>
      </template>

      <template #footer>
        <MyButton color="gray" size="small" content="닫기" @click="closeDetail" />
        <template v-if="infoChangeStore.currentRequest?.status === 'REQUESTED'">
          <MyButton color="red" size="small" content="반려" :disabled="infoChangeStore.isReviewing" @click="reject" />
          <MyButton
            color="deep-blue"
            size="small"
            content="승인"
            :disabled="infoChangeStore.isReviewing"
            @click="approve"
          />
        </template>
      </template>
    </MyModal>
  </MyPageContainer>
</template>

<style scoped>
.list-card {
  background: var(--personal-color-white);
  border: 1px solid var(--personal-color-border-soft);
  border-radius: 8px;
  padding: 26px 30px;
}

.empty {
  color: var(--personal-color-text-muted);
}

table {
  width: 100%;
  border-collapse: collapse;
}

th,
td {
  text-align: left;
  padding: 12px 10px;
  border-bottom: 1px solid var(--personal-color-border-soft);
}

th {
  color: var(--personal-color-text-muted);
  font-weight: 500;
}

.reason-cell {
  max-width: 320px;
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
  grid-template-columns: minmax(96px, 0.32fr) minmax(0, 1fr);
  padding: 10px 0;
  border-bottom: 1px solid var(--personal-color-border-light);
}

.detail-row dt {
  color: var(--personal-color-text-muted);
}

.detail-row dd {
  margin: 0;
  overflow-wrap: anywhere;
}

.file-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.review-area {
  margin-top: 16px;
}

.review-area textarea {
  width: 100%;
  box-sizing: border-box;
  padding: 8px 12px;
  border: 1px solid var(--personal-color-border-input);
  border-radius: 4px;
  font-size: 0.9rem;
  font-family: inherit;
  resize: vertical;
}
</style>
