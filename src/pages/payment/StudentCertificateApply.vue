<script setup>
import { ref } from 'vue';
import { downloadCertificate, issueCertificate } from '../../api/certificateApi';
import MyButton from '../../components/button/MyButton.vue';
import MySelect from '../../components/input/MySelect.vue';
import MyPageContainer from '../../components/layout/MyPageContainer.vue';
import { notify } from '../../composables/useDialog';
import { formatDate } from '../../util/format';
import { DOCUMENT_TYPE_LABEL } from '../../util/payment/enumLabels';

defineOptions({ name: 'StudentCertificateApply' });

const DOCUMENT_TYPES = [
  { value: 'ENROLLMENT', label: '재학증명서' },
  { value: 'GRADE', label: '성적증명서' },
  { value: 'GRADUATION', label: '졸업증명서' },
];

const documentType = ref('ENROLLMENT');
const isIssuing = ref(false);
const issuedDocument = ref(null);
const isDownloading = ref(false);
const formError = ref('');

const issue = async () => {
  if (isIssuing.value) return;
  formError.value = '';
  issuedDocument.value = null;
  isIssuing.value = true;
  try {
    const response = await issueCertificate(documentType.value);
    issuedDocument.value = response.data.data;
    await notify(`${DOCUMENT_TYPE_LABEL[documentType.value]}가 발급되었습니다.`);
  } catch (error) {
    formError.value = error.response?.data?.message || '증명서 발급에 실패했습니다.';
  } finally {
    isIssuing.value = false;
  }
};

const download = async () => {
  if (!issuedDocument.value || isDownloading.value) return;
  isDownloading.value = true;
  try {
    const response = await downloadCertificate(issuedDocument.value.id);
    const url = URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `${DOCUMENT_TYPE_LABEL[issuedDocument.value.documentType] || '증명서'}.pdf`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  } catch (error) {
    await notify(error.response?.data?.message || '증명서 다운로드에 실패했습니다.');
  } finally {
    isDownloading.value = false;
  }
};
</script>

<template>
  <MyPageContainer title="증명서 발급">
    <section class="certificate-card">
      <div class="common-section-header">
        <h3>증명서 발급 신청</h3>
      </div>

      <div class="form-grid">
        <label for="certificate-type">증명서 종류</label>
        <MySelect id="certificate-type" v-model="documentType" :disabled="isIssuing">
          <option v-for="type in DOCUMENT_TYPES" :key="type.value" :value="type.value">
            {{ type.label }}
          </option>
        </MySelect>

        <span class="field-label">발급 형식</span>
        <span class="field-value">PDF 문서</span>
      </div>

      <p v-if="formError" class="form-error" role="alert">
        {{ formError }}
      </p>

      <div class="form-actions">
        <MyButton
          btn-type="button"
          color="deep-blue"
          size="big"
          :content="isIssuing ? '발급 중...' : '발급 신청'"
          :disabled="isIssuing"
          @click="issue"
        />
      </div>
    </section>

    <section v-if="issuedDocument" class="result-card" aria-live="polite">
      <div class="common-section-header">
        <div>
          <h3>발급 완료</h3>
          <p class="success-text">증명서가 정상적으로 발급되었습니다.</p>
        </div>
        <MyButton
          btn-type="button"
          class="secondary-button"
          color="white"
          size="middle"
          :content="isDownloading ? '받는 중...' : '다운로드'"
          :disabled="isDownloading"
          @click="download"
        />
      </div>

      <dl class="result-details">
        <div>
          <dt>증명서 종류</dt>
          <dd>{{ DOCUMENT_TYPE_LABEL[issuedDocument.documentType] || issuedDocument.documentType }}</dd>
        </div>
        <div>
          <dt>문서 번호</dt>
          <dd>{{ issuedDocument.id }}</dd>
        </div>
        <div>
          <dt>발급 일시</dt>
          <dd>{{ formatDate(issuedDocument.issuedAt, 'YYYY-MM-DD HH:mm') }}</dd>
        </div>
      </dl>
    </section>
  </MyPageContainer>
</template>

<style scoped>
.certificate-card,
.result-card {
  padding: 22px;
  border: 1px solid var(--personal-color-border-mist);
  border-radius: 8px;
  background: var(--personal-color-white);
}

.result-card {
  margin-top: 24px;
}

.common-section-header {
  align-items: flex-start;
}

.common-section-header h3 {
  margin: 0;
  color: var(--personal-color-primary-text-navy);
  font-size: 1rem;
}

.form-grid {
  display: grid;
  grid-template-columns: 150px minmax(220px, 360px);
  align-items: center;
  gap: 14px 20px;
  padding: 20px 0;
}

.form-grid label,
.field-label {
  color: var(--personal-color-text-secondary-steel);
  font-size: 0.85rem;
  font-weight: 600;
}

.field-value {
  color: var(--personal-color-primary-text-navy);
  font-size: 0.9rem;
}

.form-error {
  margin: 0 0 14px;
  color: var(--personal-color-status-fail-text-maroon);
  font-size: 0.85rem;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
}

.success-text {
  margin: 5px 0 0;
  color: var(--personal-color-status-success-text-forest);
  font-size: 0.84rem;
}

.result-details {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1px;
  overflow: hidden;
  margin: 18px 0 0;
  border: 1px solid var(--personal-color-border-mist);
  background: var(--personal-color-border-mist);
}

.result-details div {
  padding: 14px;
  background: var(--personal-color-white);
}

.result-details dt {
  color: var(--personal-color-text-muted-slate);
  font-size: 0.78rem;
}

.result-details dd {
  margin: 7px 0 0;
  color: var(--personal-color-primary-text-navy);
  font-size: 0.9rem;
  font-weight: 600;
}

:deep(.secondary-button) {
  border: 1px solid var(--personal-color-border-mist);
  color: var(--personal-color-primary-navy);
}

@media (max-width: 680px) {
  .form-grid,
  .result-details {
    grid-template-columns: 1fr;
  }
}
</style>
