<script setup>
import { onMounted, reactive, ref } from 'vue';
import MyPageContainer from '../../components/layout/MyPageContainer.vue';
import MyButton from '../../components/button/MyButton.vue';
import MyInput from '../../components/input/MyInput.vue';
import StatusBadge from '../../components/common/StatusBadge.vue';
import { useInfoChangeStore } from '../../store/infochange/useInfoChangeStore';
import { INFO_CHANGE_STATUS_LABEL, INFO_CHANGE_STATUS_VARIANT } from '../../util/academic/enumLabels';
import { formatDate } from '../../util/format';
import { notify } from '../../composables/useDialog';

const infoChangeStore = useInfoChangeStore();

const form = reactive({
  newName: '',
  newPhoneNumber: '',
  newEmail: '',
  newAddress: '',
  reason: '',
});
const profileImage = ref(null);
const attachments = ref([]);
const errorMessage = ref('');

const onProfileImageChange = (event) => {
  profileImage.value = event.target.files[0] || null;
};

const onAttachmentsChange = (event) => {
  attachments.value = Array.from(event.target.files || []);
};

const resetForm = () => {
  form.newName = '';
  form.newPhoneNumber = '';
  form.newEmail = '';
  form.newAddress = '';
  form.reason = '';
  profileImage.value = null;
  attachments.value = [];
};

const submit = async () => {
  errorMessage.value = '';

  const hasAnyChange = form.newName || form.newPhoneNumber || form.newEmail || form.newAddress || profileImage.value;
  if (!hasAnyChange) {
    errorMessage.value = '변경할 항목을 하나 이상 입력해 주세요.';
    return;
  }
  if (!form.reason.trim()) {
    errorMessage.value = '신청 사유를 입력해 주세요.';
    return;
  }

  try {
    await infoChangeStore.submitRequest({
      newName: form.newName.trim() || null,
      newPhoneNumber: form.newPhoneNumber.trim() || null,
      newEmail: form.newEmail.trim() || null,
      newAddress: form.newAddress.trim() || null,
      profileImage: profileImage.value,
      attachments: attachments.value,
      reason: form.reason.trim(),
    });
    resetForm();
    await notify('학적 정보 변경 신청이 접수되었습니다.');
    await infoChangeStore.fetchMyRequests();
  } catch (error) {
    await notify(error.response?.data?.message || '신청 처리 중 오류가 발생했습니다.');
  }
};

onMounted(() => {
  infoChangeStore.fetchMyRequests();
});
</script>

<template>
  <MyPageContainer title="정보 변경 신청" subtitle="이름, 연락처, 이메일, 주소, 프로필 사진의 변경을 신청할 수 있습니다.">
    <article class="form-card">
      <div class="common-section-header">
        <h3>신청 내용</h3>
      </div>

      <form class="change-form" @submit.prevent="submit">
        <div class="field-grid">
          <label class="field">
            <span>이름</span>
            <MyInput v-model="form.newName" placeholder="변경할 이름" />
          </label>
          <label class="field">
            <span>연락처</span>
            <MyInput v-model="form.newPhoneNumber" placeholder="변경할 연락처" />
          </label>
          <label class="field">
            <span>이메일</span>
            <MyInput v-model="form.newEmail" type="email" placeholder="변경할 이메일" />
          </label>
          <label class="field">
            <span>주소</span>
            <MyInput v-model="form.newAddress" placeholder="변경할 주소" />
          </label>
          <label class="field">
            <span>프로필 사진</span>
            <input type="file" accept="image/*" @change="onProfileImageChange" />
          </label>
          <label class="field">
            <span>증빙 파일</span>
            <input type="file" multiple @change="onAttachmentsChange" />
          </label>
        </div>

        <label class="field reason-field">
          <span>신청 사유</span>
          <textarea v-model="form.reason" rows="3" placeholder="변경 사유를 입력해 주세요."></textarea>
        </label>

        <p v-if="errorMessage" class="error" role="alert">{{ errorMessage }}</p>

        <div class="form-actions">
          <MyButton
            type="submit"
            color="deep-blue"
            size="middle"
            content="신청하기"
            :disabled="infoChangeStore.isSubmitting"
          />
        </div>
      </form>
    </article>

    <article class="history-card">
      <div class="common-section-header">
        <h3>나의 신청 내역</h3>
      </div>

      <p v-if="infoChangeStore.isLoadingMyRequests">불러오는 중...</p>
      <p v-else-if="infoChangeStore.myRequests.length === 0" class="empty">신청 내역이 없습니다.</p>
      <table v-else>
        <thead>
          <tr>
            <th>신청일</th>
            <th>사유</th>
            <th>상태</th>
            <th>반려 사유</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in infoChangeStore.myRequests" :key="item.id">
            <td>{{ formatDate(item.createdAt, 'YYYY-MM-DD HH:mm') }}</td>
            <td>{{ item.reason }}</td>
            <td>
              <StatusBadge
                :label="INFO_CHANGE_STATUS_LABEL[item.status]"
                :variant="INFO_CHANGE_STATUS_VARIANT[item.status]"
              />
            </td>
            <td>{{ item.rejectReason || '-' }}</td>
          </tr>
        </tbody>
      </table>
    </article>
  </MyPageContainer>
</template>

<style scoped>
.form-card,
.history-card {
  background: var(--personal-color-white);
  border: 1px solid #e5eaf2;
  border-radius: 8px;
  padding: 26px 30px;
  margin-bottom: 26px;
}

.field-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px 24px;
  margin-bottom: 16px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 0.9rem;
  color: #475569;
}

.field :deep(input) {
  width: 100%;
  box-sizing: border-box;
}

.reason-field {
  margin-bottom: 16px;
}

.reason-field textarea {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.9rem;
  font-family: inherit;
  resize: vertical;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
}

.error {
  color: #dc2626;
  margin-bottom: 12px;
}

.empty {
  color: #64748b;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th,
td {
  text-align: left;
  padding: 12px 10px;
  border-bottom: 1px solid #e5eaf2;
}

th {
  color: #64748b;
  font-weight: 500;
}

@media (max-width: 720px) {
  .field-grid {
    grid-template-columns: 1fr;
  }
}
</style>
