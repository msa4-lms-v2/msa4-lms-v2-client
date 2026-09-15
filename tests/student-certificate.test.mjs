import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import assert from 'node:assert/strict';

const source = fs.readFileSync(new URL('../src/pages/payment/StudentCertificateApply.vue', import.meta.url), 'utf8')
  .split('<script setup>')[1].split('</script>')[0].replace(/^import.*;\s*$/gm, '');
const response = items => ({ data: { data: { items, page: 1, totalCount: items.length } } });
const defaults = { ref: value => ({ value }), onMounted() {}, defineOptions() {}, notify: async () => {} };

test('학생 발급 내역은 서버에서 복구하고 늦은 응답으로 덮어쓰지 않는다', async () => {
  const pending = [];
  const page = vm.runInNewContext(source + ';({loadHistory,issuedDocuments,historyLoading})', {
    ...defaults, getStudentCertificateHistory: () => new Promise(resolve => pending.push(resolve)),
  });
  const old = page.loadHistory();
  const fresh = page.loadHistory();
  pending[1](response([{ id: 2, documentType: 'ENROLLMENT', downloadable: true }]));
  await fresh;
  pending[0](response([{ id: 1, documentType: 'ENROLLMENT', downloadable: true }]));
  await old;
  assert.equal(page.issuedDocuments.value[0].id, 2);
  assert.equal(page.historyLoading.value, false);
});

test('학생 PDF 실패 후 발급 내역 유지, 중복 발급 방지, 기존 PDF 재시도', async () => {
  let release;
  let issues = 0;
  let downloads = 0;
  let saved = 0;
  const messages = [];
  const page = vm.runInNewContext(source + ';({issueAndDownload,downloadAgain,certificateTypes,issuedDocuments,issuingType})', {
    ...defaults, notify: async message => messages.push(message),
    issueCertificate: () => { issues++; return new Promise(resolve => { release = resolve; }); },
    getStudentCertificateHistory: async () => { throw Error('history down'); },
    downloadCertificate: async () => { if (++downloads === 1) throw Error('download down'); return { data: 'fixture' }; },
    URL: { createObjectURL: () => 'blob:fixture', revokeObjectURL() {} }, Blob,
    document: { body: { appendChild() {} }, createElement: () => ({ click: () => { saved++; }, remove() {} }) }, setTimeout: fn => fn(),
  });
  const issuing = page.issueAndDownload(page.certificateTypes[0]);
  await page.issueAndDownload(page.certificateTypes[0]);
  assert.equal(issues, 1);
  release({ data: { data: { id: 1, documentType: 'ENROLLMENT' } } });
  await issuing;
  assert.equal(page.issuedDocuments.value.length, 1);
  assert.match(messages[0], /발급되었지만 PDF 다운로드/);
  await page.downloadAgain(page.issuedDocuments.value[0]);
  assert.equal(issues, 1);
  assert.equal(saved, 1);
  assert.equal(page.issuingType.value, null);
  await page.downloadAgain({ id: 2, downloadable: false });
  assert.equal(downloads, 2);
});
