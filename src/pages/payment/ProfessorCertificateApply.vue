<script setup>
import { ref } from 'vue';
import { downloadCertificate, issueEmploymentCertificate } from '../../api/certificateApi';
import MyPageContainer from '../../components/layout/MyPageContainer.vue';
import MyButton from '../../components/button/MyButton.vue';
import { notify } from '../../composables/useDialog';

defineOptions({ name: 'ProfessorCertificateApply' });

const isIssuing = ref(false);
const issuedDocument = ref(null);
const isDownloading = ref(false);
const formError = ref('');

const issue = async () => {
  formError.value = '';
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
  if (!issuedDocument.value) return;
  isDownloading.value = true;
  try {
    const response = await downloadCertificate(issuedDocument.value.id);
    const url = URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = '재직증명서.pdf';
    link.click();
    URL.revokeObjectURL(url);
  } catch (error) {
    await notify(error.response?.data?.message || '증명서 다운로드에 실패했습니다.');
  } finally {
    isDownloading.value = false;
  }
};
</script>

<template>
  <MyPageContainer title="증명서 발급">
    <section class="apply-card">
      <p class="apply-guide">재직 중인 교수는 재직증명서를 발급받을 수 있습니다.</p>

      <p v-if="formError" class="form-error" role="alert">{{ formError }}</p>

      <div class="form-actions">
        <MyButton
          btn-type="button"
          color="deep-blue"
          size="big"
          :content="isIssuing ? '발급 중...' : '재직증명서 발급'"
          :disabled="isIssuing"
          @click="issue"
        />
      </div>

      <div v-if="issuedDocument" class="issued-notice">
        <p>재직증명서가 발급되었습니다.</p>
        <MyButton
          btn-type="button"
          color="white"
          size="middle"
          :content="isDownloading ? '다운로드 중...' : 'PDF 다운로드'"
          :disabled="isDownloading"
          @click="download"
        />
      </div>
    </section>
  </MyPageContainer>
</template>

<style scoped>
.apply-card {
  padding: 26px 30px;
  background-color: var(--personal-color-white);
  border: 1px solid var(--personal-color-border-mist);
  border-radius: 8px;
}

.apply-guide {
  margin: 0 0 20px;
  color: var(--personal-color-text-muted-slate);
  font-size: 0.9rem;
}

.form-error {
  margin: 0 0 12px;
  color: var(--personal-color-red);
  font-size: 0.85rem;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
}

.issued-notice {
  margin-top: 20px;
  padding: 18px;
  border-radius: 6px;
  background-color: var(--personal-color-bg-success-soft-honeydew);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.issued-notice p {
  margin: 0;
  color: var(--personal-color-success-text-forest);
  font-weight: 500;
}
</style>
