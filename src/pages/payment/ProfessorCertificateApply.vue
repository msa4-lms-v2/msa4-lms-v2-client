<script setup>
import { ref } from 'vue';
import { downloadCertificate, issueEmploymentCertificate } from '../../api/certificateApi';
import MyButton from '../../components/button/MyButton.vue';
import MyPageContainer from '../../components/layout/MyPageContainer.vue';
import { notify } from '../../composables/useDialog';
import { formatDate } from '../../util/format';

defineOptions({ name: 'ProfessorCertificateApply' });

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
    const response = await issueEmploymentCertificate();
    issuedDocument.value = response.data.data;
    await notify('재직증명서가 발급되었습니다.');
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
    link.download = '재직증명서.pdf';
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
        <h3>재직증명서 발급</h3>
      </div>

      <dl class="certificate-info">
        <div>
          <dt>증명서 종류</dt>
          <dd>재직증명서</dd>
        </div>
        <div>
          <dt>발급 형식</dt>
          <dd>PDF 문서</dd>
        </div>
      </dl>

      <p v-if="formError" class="form-error" role="alert">
        {{ formError }}
      </p>

      <div class="form-actions">
        <MyButton
          btn-type="button"
          class="professor-primary"
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
          <p class="success-text">재직증명서가 정상적으로 발급되었습니다.</p>
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
          <dd>재직증명서</dd>
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

.certificate-info,
.result-details {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1px;
  overflow: hidden;
  margin: 20px 0;
  border: 1px solid var(--personal-color-border-mist);
  background: var(--personal-color-border-mist);
}

.result-details {
  grid-template-columns: repeat(3, minmax(0, 1fr));
  margin-bottom: 0;
}

.certificate-info div,
.result-details div {
  padding: 14px;
  background: var(--personal-color-white);
}

.certificate-info dt,
.result-details dt {
  color: var(--personal-color-text-muted-slate);
  font-size: 0.78rem;
}

.certificate-info dd,
.result-details dd {
  margin: 7px 0 0;
  color: var(--personal-color-primary-text-navy);
  font-size: 0.9rem;
  font-weight: 600;
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

.professor-primary {
  background: var(--personal-color-professor-primary-navy);
}

:deep(.secondary-button) {
  border: 1px solid var(--personal-color-border-mist);
  color: var(--personal-color-professor-primary-navy);
}

@media (max-width: 680px) {
  .certificate-info,
  .result-details {
    grid-template-columns: 1fr;
  }
}
</style>
