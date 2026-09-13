<script setup>
import { ref } from 'vue';
import { downloadCertificate, issueEmploymentCertificate } from '../../api/certificateApi';
import MyCard from '../../components/common/MyCard.vue';
import MyTable from '../../components/table/MyTable.vue';
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
  if (isIssuing.value || isDownloading.value) return;
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
  if (!issuedDocument.value || isDownloading.value || isIssuing.value) return;
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
    <div class="certificate-grid">
      <MyCard class="certificate-card">
        <h3>재직증명서</h3>
        <div class="form-actions">
          <MyButton btn-type="button" color="deep-blue" size="big"
            :content="isIssuing ? '발급 중...' : 'PDF 발급'"
            :disabled="isIssuing || isDownloading" @click="issue" />
        </div>
      </MyCard>
    </div>
    <p v-if="formError" class="form-error" role="alert">{{ formError }}</p>

    <section class="result-section" aria-live="polite">
      <h3>이번 발급 내역</h3>
      <MyTable class="result-table"
        :columns="[{ key: 'type', label: '증명서' }, { key: 'id', label: '문서 번호' }, { key: 'date', label: '발급 일시' }, { key: 'download', label: '다운로드' }]"
        :empty="!issuedDocument" empty-message="이 화면에서 발급한 증명서가 없습니다.">
        <tr v-if="issuedDocument">
          <td>재직증명서</td>
          <td>{{ issuedDocument.id }}</td>
          <td>{{ formatDate(issuedDocument.issuedAt, 'YYYY-MM-DD HH:mm') }}</td>
          <td class="download-cell">
            <MyButton btn-type="button" color="deep-blue" size="middle"
              :content="isDownloading ? '받는 중...' : '다운로드'"
              :disabled="isDownloading || isIssuing" @click="download" />
          </td>
        </tr>
      </MyTable>
    </section>
  </MyPageContainer>
</template>

<style scoped>
.certificate-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 20px;
}
.certificate-card {
  min-height: 180px;
  box-sizing: border-box;
  padding: 20px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 24px;
}
h3 {
  margin: 0;
  color: var(--personal-color-primary-text-navy);
  font-size: 1rem;
}
.form-actions {
  display: flex;
  justify-content: flex-end;
}
.form-error {
  margin: 16px 0 0;
  color: var(--personal-color-status-fail-text-maroon);
  font-size: 0.85rem;
}
.result-section {
  margin-top: 24px;
}
.result-section h3 {
  margin-bottom: 12px;
}
.result-table {
  overflow-x: auto;
}
.result-table :deep(table) {
  min-width: 600px;
}
.result-table :deep(td.download-cell) {
  text-align: right;
}
@media (max-width: 760px) {
  .certificate-grid {
    grid-template-columns: 1fr;
  }
}
</style>
