<script setup>
import { ref } from 'vue';
import MyButton from '../../components/button/MyButton.vue';
import MyInput from '../../components/input/MyInput.vue';
import MyPageContainer from '../../components/layout/MyPageContainer.vue';
import { confirmDialog, notify } from '../../composables/useDialog';
import { useDocumentStore } from '../../store/payment/useDocumentStore';

defineOptions({ name: 'AdminCertificateRevoke' });

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

  const confirmed = await confirmDialog(`증명서 #${documentId.value}을(를) 폐기하시겠습니까?`);
  if (!confirmed) return;

  try {
    await documentStore.revokeDocument({ documentId: Number(documentId.value), reason: reason.value.trim() });
    lastRevokedId.value = documentId.value;
    documentId.value = '';
    reason.value = '';
    await notify('증명서를 폐기했습니다.');
  } catch (error) {
    await notify(error.response?.data?.message || '증명서 폐기 중 오류가 발생했습니다.');
  }
};
</script>

<template>
  <MyPageContainer title="증명서 폐기">
    <section class="revoke-panel">
      <div class="common-section-header">
        <h3>폐기 대상 입력</h3>
      </div>

      <div class="form-grid">
        <label for="revoke-document-id">증명서 ID</label>
        <MyInput
          id="revoke-document-id"
          v-model="documentId"
          numeric-only
          placeholder="증명서 ID를 입력해 주세요."
        />

        <label for="revoke-reason">폐기 사유</label>
        <textarea
          id="revoke-reason"
          v-model="reason"
          rows="4"
          maxlength="500"
          placeholder="폐기 사유를 입력해 주세요."
        ></textarea>
      </div>

      <div class="form-actions">
        <MyButton
          btn-type="button"
          color="red"
          size="big"
          :content="documentStore.isRevoking ? '처리 중...' : '증명서 폐기'"
          :disabled="documentStore.isRevoking"
          @click="handleRevoke"
        />
      </div>

      <p v-if="lastRevokedId" class="notice" role="status">
        증명서 #{{ lastRevokedId }}을(를) 폐기했습니다.
      </p>
    </section>
  </MyPageContainer>
</template>

<style scoped>
.revoke-panel {
  padding: 22px;
  border: 1px solid var(--personal-color-border-mist);
  border-radius: 8px;
  background: var(--personal-color-white);
}

.common-section-header h3 {
  margin: 0;
  color: var(--personal-color-primary-text-navy);
  font-size: 1rem;
}

.form-grid {
  display: grid;
  grid-template-columns: 150px minmax(240px, 560px);
  align-items: start;
  gap: 14px 20px;
  padding: 20px 0;
}

.form-grid label {
  padding-top: 9px;
  color: var(--personal-color-text-secondary-steel);
  font-size: 0.85rem;
  font-weight: 600;
}

.form-grid textarea {
  width: 100%;
  box-sizing: border-box;
  padding: 9px 12px;
  border: 1px solid var(--personal-color-border-mist);
  border-radius: 4px;
  color: var(--personal-color-primary-text-navy);
  font: inherit;
  font-size: 0.9rem;
  line-height: 1.5;
  resize: vertical;
}

.form-grid textarea:focus {
  border-color: var(--personal-color-admin-secondary-indigo);
  outline: none;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
}

.notice {
  margin: 16px 0 0;
  color: var(--personal-color-status-success-text-forest);
  font-size: 0.85rem;
}

@media (max-width: 680px) {
  .form-grid {
    grid-template-columns: 1fr;
  }

  .form-grid label {
    padding-top: 0;
  }
}
</style>
