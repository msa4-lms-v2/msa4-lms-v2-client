<script setup>
import { ref } from 'vue';
import { useDocumentStore } from '../../store/payment/useDocumentStore';
import MyPageContainer from '../../components/layout/MyPageContainer.vue';
import MyButton from '../../components/button/MyButton.vue';
import { confirmDialog, notify } from '../../composables/useDialog';

const documentStore = useDocumentStore();

const documentId = ref('');
const reason = ref('');
const lastRevokedId = ref(null);

const handleRevoke = async () => {
  if (!documentId.value) {
    await notify('폐기할 증명서 ID를 입력해 주세요.');
    return;
  }
  if (!reason.value.trim()) {
    await notify('폐기 사유를 입력해 주세요.');
    return;
  }

  const confirmed = await confirmDialog(`증명서 #${documentId.value}을(를) 폐기하시겠습니까? 이후 진위확인 조회는 폐기됨으로 응답됩니다.`);
  if (!confirmed) return;

  try {
    await documentStore.revokeDocument({ documentId: Number(documentId.value), reason: reason.value.trim() });
    lastRevokedId.value = documentId.value;
    await notify('증명서를 폐기했습니다.');
    documentId.value = '';
    reason.value = '';
  } catch (error) {
    await notify(error.response?.data?.message || '증명서 폐기 중 오류가 발생했습니다.');
  }
};
</script>

<template>
  <MyPageContainer
    title="증명서 폐기"
    subtitle="학생·교수에게 발급된 증명서를 폐기합니다. 이후 진위확인 조회는 폐기됨으로 응답됩니다."
  >
    <section class="revoke-panel">
      <div class="form-grid">
        <label for="revoke-document-id">증명서 ID</label>
        <input id="revoke-document-id" v-model="documentId" type="number" min="1" placeholder="발급 시 안내된 증명서 ID를 입력하세요" />

        <label for="revoke-reason">폐기 사유</label>
        <textarea id="revoke-reason" v-model="reason" rows="3" placeholder="예: 학생 요청에 의한 재발급, 오발급 정정 등"></textarea>
      </div>

      <MyButton color="red" size="big" :disabled="documentStore.isRevoking" @click="handleRevoke">
        {{ documentStore.isRevoking ? '처리 중...' : '증명서 폐기' }}
      </MyButton>

      <p v-if="lastRevokedId" class="notice" role="status">
        증명서 #{{ lastRevokedId }}을(를) 폐기했습니다.
      </p>
    </section>
  </MyPageContainer>
</template>

<style scoped>
.revoke-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-width: 480px;
  padding: 24px;
  background: var(--personal-color-white);
  border-radius: var(--personal-radius-card);
}

.form-grid {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-grid label {
  font-size: 0.85rem;
  color: var(--personal-color-text-muted-slate);
  margin-top: 8px;
}

.form-grid label:first-child {
  margin-top: 0;
}

.form-grid input,
.form-grid textarea {
  width: 100%;
  box-sizing: border-box;
  padding: 8px 12px;
  border: 1px solid var(--personal-color-border-mist);
  border-radius: 4px;
  font-size: 0.9rem;
  font-family: inherit;
}

.notice {
  padding: 12px;
  background: var(--personal-color-status-success-bg-mint);
  color: var(--personal-color-status-success-text-forest);
  border-radius: var(--personal-radius);
  margin: 0;
}
</style>
