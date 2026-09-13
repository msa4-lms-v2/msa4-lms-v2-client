import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import assert from 'node:assert/strict';
const source = fs.readFileSync(new URL('../src/pages/payment/ProfessorCertificateApply.vue', import.meta.url), 'utf8').split('<script setup>')[1].split('</script>')[0].replace(/^import.*;\s*$/gm, '');
const response = items => ({ data: { data: { items, page: 1, hasNext: false } } });
test('증명서 내역: 늦은 응답 격리와 폐기 문서 다운로드 차단', async () => {
  const pending = [];
  let downloads = 0;
  const page = vm.runInNewContext(source + ';({loadHistory,downloadAgain,issuedDocuments,historyLoading})', {
    ref: value => ({ value }), onMounted: () => {}, defineOptions: () => {},
    getProfessorCertificateHistory: () => new Promise(resolve => pending.push(resolve)),
    downloadCertificate: async () => { downloads++; }, notify: async () => {},
  });
  const stale = page.loadHistory();
  const fresh = page.loadHistory();
  pending[1](response([{ id: 2, documentType: 'CAREER', downloadable: true }]));
  await fresh;
  pending[0](response([{ id: 1, documentType: 'EMPLOYMENT', downloadable: true }]));
  await stale;
  assert.equal(page.issuedDocuments.value[0].id, 2);
  assert.equal(page.historyLoading.value, false);
  await page.downloadAgain({ id: 3, downloadable: false });
  assert.equal(downloads, 0);
});
test('발급 중 중복 요청 방지, 다운로드 실패 후 재발급 없이 재시도', async () => {
  let release;
  let issues = 0;
  let downloads = 0;
  const issue = () => { issues++; return new Promise(resolve => { release = resolve; }); };
  const page = vm.runInNewContext(source + ';({issueAndDownload,downloadAgain,certificateTypes,issuedDocuments,issuingType})', {
    ref: value => ({ value }), onMounted: () => {}, defineOptions: () => {}, notify: async () => {},
    issueEmploymentCertificate: issue, issueCareerCertificate: issue, issueLectureCareerCertificate: issue,
    getProfessorCertificateHistory: async () => { throw Error('history unavailable'); },
    downloadCertificate: async () => { downloads++; throw Error('download unavailable'); },
  });
  for (const certificate of page.certificateTypes) {
    const running = page.issueAndDownload(certificate);
    const count = issues;
    await page.issueAndDownload(certificate);
    assert.equal(issues, count);
    release({ data: { data: { id: count } } });
    await running;
    assert.equal(page.issuedDocuments.value.length, count);
    assert.equal(page.issuingType.value, null);
    await page.downloadAgain(page.issuedDocuments.value[0]);
    assert.equal(issues, count);
  }
  assert.equal(downloads, 6);
});
