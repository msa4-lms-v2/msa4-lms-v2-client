<script setup>
import { ref } from 'vue';
import { downloadCertificate, issueCertificate } from '../../api/certificateApi';
import MyPageContainer from '../../components/layout/MyPageContainer.vue';
import MyButton from '../../components/button/MyButton.vue';
import MySelect from '../../components/input/MySelect.vue';
import { notify } from '../../composables/useDialog';

defineOptions({ name: 'StudentCertificateApply' });

const DOCUMENT_TYPE_LABEL = { ENROLLMENT: '재학증명서', GRADUATION: '졸업증명서' };

const documentType = ref('ENROLLMENT');
const isIssuing = ref(false);
const issuedDocument = ref(null);
const isDownloading = ref(false);
const formError = ref('');

const issue = async () => {
  formError.value = '';
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
  if (!issuedDocument.value) return;
  isDownloading.value = true;
  try {
    const response = await downloadCertificate(issuedDocument.value.id);
    const url = URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `${DOCUMENT_TYPE_LABEL[issuedDocument.value.documentType]}.pdf`;
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
      <div class="form-field">
        <label for="certificate-type">증명서 종류</label>
        <MySelect id="certificate-type" v-model="documentType">
          <option value="ENROLLMENT">재학증명서</option>
          <option value="GRADUATION">졸업증명서</option>
        </MySelect>
      </div>

      <p v-if="formError" class="form-error" role="alert">{{ formError }}</p>

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

      <div v-if="issuedDocument" class="issued-notice">
        <p>{{ DOCUMENT_TYPE_LABEL[issuedDocument.documentType] }}가 발급되었습니다.</p>
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

.form-field {
  margin-bottom: 20px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-field label {
  font-weight: 600;
  color: var(--personal-color-black);
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
