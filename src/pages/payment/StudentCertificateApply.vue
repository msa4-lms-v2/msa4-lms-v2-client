<script setup>
import { ref } from 'vue';
import { downloadCertificate, issueCertificate } from '../../api/certificateApi';
import MyButton from '../../components/button/MyButton.vue';
import MyCard from '../../components/common/MyCard.vue';
import MyPageContainer from '../../components/layout/MyPageContainer.vue';
import MyTable from '../../components/table/MyTable.vue';
import { notify } from '../../composables/useDialog';
import { formatDate } from '../../util/format';

defineOptions({ name: 'StudentCertificateApply' });

const certificateTypes = [
  { value: 'ENROLLMENT', label: '재학 증명서' },
  { value: 'GRADE', label: '성적 증명서' },
  { value: 'GRADUATION', label: '졸업/졸업예정 증명서' },
];

const historyColumns = [
  { key: 'documentType', label: '증명서' },
  { key: 'issuedAt', label: '요청일' },
  { key: 'status', label: '처리 상태' },
];

const issuingType = ref(null);
const issuedDocuments = ref([]);

const savePdf = (issuedDocument, response) => {
  const url = URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `${issuedDocument.documentTypeLabel}.pdf`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
};

const issueAndDownload = async (certificate) => {
  if (issuingType.value) return;

  issuingType.value = certificate.value;
  try {
    const issueResponse = await issueCertificate(certificate.value);
    const issued = issueResponse.data.data;
    const historyItem = {
      ...issued,
      documentTypeLabel: certificate.label.replaceAll(' ', ''),
      status: '발급 완료',
    };

    const downloadResponse = await downloadCertificate(issued.id);
    savePdf(historyItem, downloadResponse);
    issuedDocuments.value.unshift(historyItem);
    await notify(`${certificate.label}가 발급되었습니다.`);
  } catch (error) {
    await notify(error.response?.data?.message || '증명서 발급에 실패했습니다.');
  } finally {
    issuingType.value = null;
  }
};
</script>

<template>
  <MyPageContainer title="증명서 발급">
    <section class="certificate-grid" aria-label="증명서 발급 목록">
      <MyCard v-for="certificate in certificateTypes" :key="certificate.value" class="certificate-card">
        <div class="certificate-heading">
          <span class="certificate-icon" aria-hidden="true">
            <span class="document-icon">
              <i></i>
              <i></i>
              <i></i>
            </span>
          </span>
          <h3>{{ certificate.label }}</h3>
        </div>

        <MyButton
          btn-type="button"
          class="issue-button"
          color="deep-blue"
          size="middle"
          :content="issuingType === certificate.value ? '발급 중...' : 'PDF 발급'"
          :disabled="Boolean(issuingType)"
          @click="issueAndDownload(certificate)"
        />
      </MyCard>
    </section>

    <section class="history-section" aria-labelledby="certificate-history-title">
      <h3 id="certificate-history-title">발급 내역</h3>
      <MyTable
        :columns="historyColumns"
        :empty="issuedDocuments.length === 0"
        empty-message="발급한 증명서가 없습니다."
      >
        <tr v-for="item in issuedDocuments" :key="item.id">
          <td>{{ item.documentTypeLabel }}</td>
          <td>{{ formatDate(item.issuedAt) }}</td>
          <td class="status-cell">{{ item.status }}</td>
        </tr>
      </MyTable>
    </section>
  </MyPageContainer>
</template>

<style scoped>
.certificate-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.certificate-card {
  position: relative;
  min-height: 123px;
  padding: 18px 16px;
}

.certificate-heading {
  display: flex;
  align-items: center;
  gap: 13px;
}

.certificate-icon {
  display: inline-flex;
  width: 34px;
  height: 34px;
  align-items: center;
  justify-content: center;
  border: 1px solid #7ca6ff;
  border-radius: 50%;
  color: var(--personal-color-primary-navy);
}

.document-icon {
  display: grid;
  width: 12px;
  height: 14px;
  grid-template-rows: repeat(3, 1px);
  align-content: center;
  gap: 2px;
  padding: 2px;
  border: 1px solid currentcolor;
  border-radius: 1px;
}

.document-icon i {
  display: block;
  width: 100%;
  background: currentcolor;
}

.certificate-heading h3,
.history-section h3 {
  margin: 0;
  color: var(--personal-color-primary-text-navy);
  font-size: 0.95rem;
  font-weight: 700;
}

.issue-button {
  position: absolute;
  right: 25px;
  bottom: 12px;
  width: 105px;
  height: 30px;
  font-size: 0.72rem;
  font-weight: 700;
}

.history-section {
  margin-top: 24px;
}

.history-section h3 {
  margin-bottom: 10px;
}

.history-section :deep(.table-container) {
  border-color: var(--personal-color-border-mist);
  border-radius: 6px;
}

.history-section :deep(.my-table th) {
  padding: 11px 16px;
  border-bottom-width: 1px;
  font-size: 0.69rem;
  font-weight: 600;
}

.history-section :deep(.my-table td) {
  padding: 12px 16px;
  border-bottom: 1px solid var(--personal-color-table-border-frost);
  font-size: 0.72rem;
}

.history-section :deep(.my-table tbody tr:last-child td) {
  border-bottom: 0;
}

.history-section :deep(.empty-text) {
  padding: 26px !important;
  font-size: 0.78rem;
}

.status-cell {
  font-weight: 500;
}

@media (max-width: 860px) {
  .certificate-grid {
    grid-template-columns: 1fr;
  }
}
</style>
