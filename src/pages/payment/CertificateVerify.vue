<script setup>
import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import MyButton from '../../components/button/MyButton.vue';
import MyInput from '../../components/input/MyInput.vue';
import { useDocumentStore } from '../../store/payment/useDocumentStore';
import { formatDate } from '../../util/format';
import { DOCUMENT_TYPE_LABEL, DOCUMENT_VERIFICATION_RESULT_LABEL } from '../../util/payment/enumLabels';

defineOptions({ name: 'CertificateVerify' });

const route = useRoute();
const documentStore = useDocumentStore();
const tokenInput = ref(typeof route.query.token === 'string' ? route.query.token : '');
const qrHashInput = ref(typeof route.query.qrHash === 'string' ? route.query.qrHash : '');
const errorMessage = ref('');

const state = computed(() => {
  if (documentStore.isVerifying) return 'loading';
  if (errorMessage.value) return 'error';
  if (documentStore.verificationResult) {
    return documentStore.verificationResult.result === 'VALID' ? 'success' : 'error';
  }
  return 'idle';
});

const title = computed(() => {
  if (state.value === 'loading') return '확인 중';
  if (state.value === 'success') return '정상 발급된 증명서입니다';
  if (state.value === 'error' && documentStore.verificationResult) return '유효하지 않은 증명서입니다';
  if (state.value === 'error') return '조회 실패';
  return '증명서 진위확인';
});

const handleVerify = async () => {
  const token = tokenInput.value.trim();
  if (!token) {
    errorMessage.value = '검증 코드를 입력해 주세요.';
    return;
  }
  errorMessage.value = '';
  try {
    await documentStore.verifyCertificate({ token, qrHash: qrHashInput.value.trim() });
  } catch (error) {
    errorMessage.value = error.response?.data?.message || '증명서 정보를 확인할 수 없습니다.';
  }
};

onMounted(() => {
  if (tokenInput.value) handleVerify();
});
</script>

<template>
  <main class="verify-page">
    <section class="verify-card">
      <div class="brand">
        <img src="/로고.png" alt="미래대학교 로고" />
        <img src="/이름.png" alt="미래대학교" />
      </div>

      <h1 :class="`title-${state}`">{{ title }}</h1>

      <div class="form-area">
        <label for="verify-token">검증 코드</label>
        <MyInput
          id="verify-token"
          v-model="tokenInput"
          placeholder="증명서에 표시된 검증 코드를 입력해 주세요."
          @keyup-enter="handleVerify"
        />
        <div class="form-actions">
          <MyButton
            btn-type="button"
            color="deep-blue"
            size="middle"
            :content="documentStore.isVerifying ? '확인 중...' : '진위확인'"
            :disabled="documentStore.isVerifying"
            @click="handleVerify"
          />
        </div>
      </div>

      <p v-if="errorMessage" class="notice notice-error" role="alert">
        {{ errorMessage }}
      </p>

      <dl v-if="documentStore.verificationResult" class="result-details">
        <div>
          <dt>증명서 종류</dt>
          <dd>{{ DOCUMENT_TYPE_LABEL[documentStore.verificationResult.documentType] || documentStore.verificationResult.documentType }}</dd>
        </div>
        <div>
          <dt>발급 일시</dt>
          <dd>{{ formatDate(documentStore.verificationResult.issuedAt, 'YYYY-MM-DD HH:mm') }}</dd>
        </div>
        <div>
          <dt>검증 결과</dt>
          <dd :class="`result-${documentStore.verificationResult.result.toLowerCase()}`">
            {{ DOCUMENT_VERIFICATION_RESULT_LABEL[documentStore.verificationResult.result] || documentStore.verificationResult.result }}
          </dd>
        </div>
      </dl>
    </section>
  </main>
</template>

<style scoped>
.verify-page {
  min-height: 100vh;
  padding: 24px;
  display: grid;
  place-items: center;
  background: var(--personal-color-bg-surface-frost);
}

.verify-card {
  width: min(560px, 100%);
  padding: 30px;
  border: 1px solid var(--personal-color-border-mist);
  border-radius: 8px;
  background: var(--personal-color-white);
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  padding-bottom: 18px;
  border-bottom: 1px solid var(--personal-color-border-mist);
}

.brand img:first-child {
  width: 34px;
  height: 34px;
  object-fit: contain;
}

.brand img:last-child {
  width: auto;
  height: 25px;
  object-fit: contain;
}

h1 {
  margin: 24px 0;
  color: var(--personal-color-primary-text-navy);
  font-size: 1.5rem;
  text-align: center;
}

.title-success {
  color: var(--personal-color-status-success-text-forest);
}

.title-error {
  color: var(--personal-color-status-fail-text-maroon);
}

.form-area {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-area label {
  color: var(--personal-color-text-secondary-steel);
  font-size: 0.85rem;
  font-weight: 600;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 8px;
}

.notice {
  margin: 16px 0 0;
  font-size: 0.85rem;
}

.notice-error {
  color: var(--personal-color-status-fail-text-maroon);
}

.result-details {
  margin: 24px 0 0;
  border-top: 1px solid var(--personal-color-border-mist);
}

.result-details div {
  display: grid;
  grid-template-columns: 130px 1fr;
  gap: 16px;
  padding: 12px 0;
  border-bottom: 1px solid var(--personal-color-border-mist);
}

.result-details dt {
  color: var(--personal-color-text-muted-slate);
  font-size: 0.85rem;
}

.result-details dd {
  margin: 0;
  color: var(--personal-color-primary-text-navy);
  font-size: 0.9rem;
  font-weight: 600;
  text-align: right;
  overflow-wrap: anywhere;
}

.result-details dd.result-valid {
  color: var(--personal-color-status-success-text-forest);
}

.result-details dd.result-revoked,
.result-details dd.result-expired {
  color: var(--personal-color-status-fail-text-maroon);
}

@media (max-width: 520px) {
  .verify-card {
    padding: 22px 18px;
  }

  .result-details div {
    grid-template-columns: 1fr;
    gap: 5px;
  }

  .result-details dd {
    text-align: left;
  }
}
</style>
