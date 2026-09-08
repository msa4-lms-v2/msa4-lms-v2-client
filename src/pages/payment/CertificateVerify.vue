<script setup>
import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import { useDocumentStore } from '../../store/payment/useDocumentStore';
import { formatDate } from '../../util/format';
import { DOCUMENT_TYPE_LABEL, DOCUMENT_VERIFICATION_RESULT_LABEL } from '../../util/payment/enumLabels';

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
  if (!tokenInput.value.trim()) {
    errorMessage.value = '검증 코드를 입력해 주세요.';
    return;
  }
  errorMessage.value = '';
  try {
    await documentStore.verifyCertificate({ token: tokenInput.value.trim(), qrHash: qrHashInput.value.trim() });
  } catch (error) {
    errorMessage.value = error.response?.data?.message || '증명서 정보를 확인할 수 없습니다.';
  }
};

onMounted(() => {
  if (tokenInput.value) {
    handleVerify();
  }
});
</script>

<template>
  <main class="verify-page">
    <section class="verify-card">
      <p class="brand">MIRAE UNIVERSITY</p>
      <h1>{{ title }}</h1>
      <p class="message">문서번호·QR·검증 코드로 증명서의 발급 여부를 확인합니다. 로그인이 필요하지 않습니다.</p>

      <div class="form-area">
        <label for="verify-token">검증 코드</label>
        <input
          id="verify-token"
          v-model="tokenInput"
          type="text"
          placeholder="증명서에 표시된 검증 코드를 입력하세요"
          @keyup.enter="handleVerify"
        />
        <button type="button" :disabled="documentStore.isVerifying" @click="handleVerify">
          {{ documentStore.isVerifying ? '확인 중...' : '진위확인' }}
        </button>
      </div>

      <p v-if="errorMessage" class="notice notice--error" role="alert">{{ errorMessage }}</p>

      <dl v-if="documentStore.verificationResult" class="result-details">
        <div>
          <dt>증명서 종류</dt>
          <dd>{{ DOCUMENT_TYPE_LABEL[documentStore.verificationResult.documentType] || documentStore.verificationResult.documentType }}</dd>
        </div>
        <div>
          <dt>발급일시</dt>
          <dd>{{ formatDate(documentStore.verificationResult.issuedAt, 'YYYY-MM-DD HH:mm') }}</dd>
        </div>
        <div>
          <dt>검증 결과</dt>
          <dd>{{ DOCUMENT_VERIFICATION_RESULT_LABEL[documentStore.verificationResult.result] || documentStore.verificationResult.result }}</dd>
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
  color: #172033;
  background: #f3f6fb;
}

.verify-card {
  width: min(440px, 100%);
  padding: 38px 26px;
  border: 1px solid #dbe3f0;
  border-radius: 22px;
  background: #fff;
  box-shadow: 0 18px 50px #1d397018;
  text-align: center;
}

.brand {
  color: #3153a4;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.13em;
}

h1 {
  margin: 8px 0 10px;
  font-size: 24px;
}

.message {
  color: #657188;
  line-height: 1.6;
}

.form-area {
  margin-top: 20px;
  text-align: left;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-area label {
  font-size: 0.85rem;
  color: #657188;
}

.form-area input {
  width: 100%;
  box-sizing: border-box;
  height: 44px;
  padding: 0 14px;
  border: 1px solid #dbe3f0;
  border-radius: 10px;
  font-size: 0.95rem;
}

.form-area button {
  width: 100%;
  height: 50px;
  margin-top: 8px;
  border: 0;
  border-radius: 11px;
  color: #fff;
  background: #3153a4;
  font-weight: 700;
  cursor: pointer;
}

.form-area button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.notice {
  margin-top: 16px;
  padding: 12px;
  border-radius: 10px;
}

.notice--error {
  color: #b3261e;
  background: #fdecea;
}

.result-details {
  margin: 24px 0 0;
  padding: 6px 16px;
  border-radius: 14px;
  background: #f6f8fc;
  text-align: left;
}

.result-details div {
  padding: 11px 0;
  display: flex;
  justify-content: space-between;
  gap: 16px;
  border-bottom: 1px solid #e5eaf2;
}

.result-details div:last-child {
  border-bottom: 0;
}

.result-details dt {
  color: #778197;
}

.result-details dd {
  margin: 0;
  font-weight: 700;
  text-align: right;
}
</style>
