<script setup>
import { onMounted, ref } from 'vue';
import { getProfessorCertificateHistory, downloadCertificate, issueEmploymentCertificate, issueCareerCertificate, issueLectureCareerCertificate } from '../../api/certificateApi';
import MyButton from '../../components/button/MyButton.vue';
import MyCard from '../../components/common/MyCard.vue';
import MyPageContainer from '../../components/layout/MyPageContainer.vue';
import MyTable from '../../components/table/MyTable.vue';
import { notify } from '../../composables/useDialog';
import { formatDate } from '../../util/format';

import PrevNextPagination from '../../components/pagination/PrevNextPagination.vue';

defineOptions({ name: 'ProfessorCertificateApply' });

const certificateTypes = [
  { value: 'EMPLOYMENT', label: '재직증명서' },
  { value: 'CAREER', label: '경력증명서' },
  { value: 'LECTURE_CAREER', label: '강의경력증명서' },
];

const historyColumns = [
  { key: 'documentType', label: '증명서' },
  { key: 'issuedAt', label: '요청일' },
  { key: 'status', label: '처리 상태' },
];

const issuingType = ref(null);
const issuedDocuments = ref([]);
const historyLoading = ref(false);
const historyError = ref('');
const historyPage = ref(1);
const historyHasNext = ref(false);
let historyRevision = 0;
const loadHistory = async (page = 1) => {
 const revision = ++historyRevision;
 historyLoading.value = true;
 historyError.value = '';
 try {
  const { data } = await getProfessorCertificateHistory({ page, size: 10 });
  if (revision !== historyRevision) return;
  const result = data.data;
  issuedDocuments.value = result.items.map(item => ({ ...item,
   documentTypeLabel: certificateTypes.find(type => type.value === item.documentType)?.label || item.documentType,
   status: item.revoked ? '폐기' : item.downloadable ? '발급 완료' : '다운로드 불가' }));
  historyPage.value = result.page; historyHasNext.value = result.hasNext;
 } catch (error) { if (revision !== historyRevision) return; historyError.value = error.response?.data?.message || '발급 내역을 불러오지 못했습니다.'; }
 finally { if (revision === historyRevision) historyLoading.value = false; }
};
onMounted(() => loadHistory());

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
  let issued = null;
  try {
    const issuers = { EMPLOYMENT: issueEmploymentCertificate, CAREER: issueCareerCertificate, LECTURE_CAREER: issueLectureCareerCertificate };
    const issueResponse = await issuers[certificate.value]();
    issued = issueResponse.data.data;
    const historyItem = {
      ...issued,
      documentTypeLabel: certificate.label.replaceAll(' ', ''),
      status: '발급 완료', downloadable: true,
    };

    issuedDocuments.value.unshift(historyItem);
    await loadHistory(1);
    const downloadResponse = await downloadCertificate(issued.id);
    savePdf(historyItem, downloadResponse);
    await notify(`${certificate.label}가 발급되었습니다.`);
  } catch (error) {
    await notify(issued ? '증명서는 발급되었지만 PDF 다운로드에 실패했습니다. 발급 내역의 발급 완료를 눌러 다시 다운로드해 주세요.' : (error.response?.data?.message || '증명서 발급에 실패했습니다.'));
  } finally {
    issuingType.value = null;
  }
};
const downloadAgain = async (item) => {
  if (issuingType.value || !item.downloadable) return;
  issuingType.value = 'DOWNLOAD';
  try {
    savePdf(item, await downloadCertificate(item.id));
  } catch (error) {
    await notify(error.response?.data?.message || 'PDF 다운로드에 실패했습니다. 발급 내역에서 다시 시도해 주세요.');
  } finally {
    issuingType.value = null;
  }
};
</script>

<template>
  <MyPageContainer title="증명서 발급" class="certificate-page">
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
          size="big"
          :content="issuingType === certificate.value ? '발급 중...' : 'PDF 발급'"
          :disabled="Boolean(issuingType)"
          @click="issueAndDownload(certificate)"
        />
      </MyCard>
    </section>

    <section class="history-section" aria-labelledby="certificate-history-title">
      <h3 id="certificate-history-title">발급 내역</h3>
      <div class="history-actions"><MyButton content="새로고침" color="deep-blue" size="small" :disabled="historyLoading || Boolean(issuingType)" @click="loadHistory(historyPage)" /></div>
      <p v-if="historyError" role="alert">{{ historyError }}</p>
      <MyTable
        :columns="historyColumns"
        :loading="historyLoading"
        :empty="issuedDocuments.length === 0"
        empty-message="발급한 증명서가 없습니다."
      >
        <tr v-for="item in issuedDocuments" :key="item.id">
          <td>{{ item.documentTypeLabel }}</td>
          <td>{{ formatDate(item.issuedAt) }}</td>
                    <td class="status-cell">
            <button class="download-again" type="button" :disabled="Boolean(issuingType) || !item.downloadable"
              :aria-label="`${item.documentTypeLabel} 다시 다운로드`" @click="downloadAgain(item)">{{ item.status }}</button>
          </td>
        </tr>
      </MyTable>
      <PrevNextPagination :page="historyPage" :has-next="historyHasNext" :inert="historyLoading || Boolean(issuingType)" @page-change="loadHistory" />
    </section>
  </MyPageContainer>
</template>

<style scoped>
.certificate-page { max-width: 1048px; margin-left: 0; }
.history-actions { display:flex; justify-content:flex-end; margin-bottom:12px; }
.certificate-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
  margin-top: 44px;
}

.certificate-card {
  position: relative;
  min-height: 176px;
  padding: 18px 16px;
}

.certificate-heading {
  display: flex;
  align-items: center;
  gap: 13px;
}

.certificate-icon {
  display: inline-flex;
  width: 48px;
  height: 48px;
  align-items: center;
  justify-content: center;
  border: 1px solid #7ca6ff;
  border-radius: 50%;
  color: #2463ff;
  background: #eff6ff;
}

.document-icon {
  display: grid;
  width: 18px;
  height: 24px;
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
  font-size: 16px;
  font-weight: 700;
}

.issue-button {
  position: absolute;
  right: 18px;
  bottom: 16px;
  width: 132px;
  height: 38px;
}

.history-section {
  margin-top: 32px;
}

.history-section h3 {
  margin-bottom: 10px;
}

.history-section :deep(.table-container) {
  border-color: var(--personal-color-border-mist);
  border-radius: 6px;
}

.history-section :deep(.my-table th) {
  padding: 18px 30px; text-align: center;
  border-bottom-width: 1px;
  font-size: 0.69rem;
  font-weight: 600;
}

.history-section :deep(.my-table td) {
  padding: 22px 30px; text-align: center;
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
.download-again { border: 0; background: transparent; color: inherit; font: inherit; cursor: pointer; }
.download-again:hover { text-decoration: underline; }
.download-again:disabled { cursor: wait; }
</style>
