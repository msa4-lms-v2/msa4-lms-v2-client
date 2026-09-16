import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import assert from 'node:assert/strict';

const source = fs.readFileSync(new URL('../src/pages/payment/AdminTuitionIndex.vue', import.meta.url), 'utf8')
  .split('<script setup>')[1].split('</script>')[0].replace(/^import.*;\s*$/gm, '');
const response = data => ({ data: { data } });

const setup = (bills, overrides = {}) => vm.runInNewContext(
  source + ';({load,personFor,studentNumberFor,detailPath,errorMessage,loading})', {
    ref: value => ({ value }), onMounted() {},
    useTuitionStore: () => ({ adminBills: bills, fetchAdminBills: async () => {} }),
    useSemesterStore: () => ({ fetchSemesters: async () => {} }),
    ...overrides,
  },
);

test('고지 목록은 내부 ID 대신 실제 학번을 연결하고 예정자는 입학 상세로 이동한다', async () => {
  const student = { id: 1, studentId: 2200006 };
  const candidate = { id: 2, studentId: null, admissionCandidateId: 12 };
  let lookups = 0;
  const page = setup([student, candidate, { ...student, id: 3 }], {
    myAxios: { get: async (url, config) => {
      lookups++;
      assert.equal(url, '/api/academic/students/identities');
      assert.equal(config.params.studentIds, '2200006');
      return response([{ studentId: 2200006, studentNumber: '25010006', name: '테스트학생' }]);
    } },
    getPerson: async (kind, id) => {
      assert.equal(kind, 'admission');
      assert.equal(id, 12);
      return response({ name: '테스트예정자', departmentName: '미술학과' });
    },
  });
  await page.load();
  assert.equal(lookups, 1);
  assert.equal(page.studentNumberFor(student), '25010006');
  assert.equal(page.studentNumberFor(candidate), '발급 대기');
  assert.equal(page.personFor(candidate).departmentName, '미술학과');
  assert.equal(page.detailPath(candidate), '/admin/admissions/12');
  assert.equal(page.detailPath(student), '/admin/tuition/1');
});

test('학생 정보 조회 실패 시 내부 ID를 학번으로 대체하지 않고 재조회할 수 있다', async () => {
  const student = { id: 1, studentId: 2200006 };
  const page = setup([student], {
    myAxios: { get: async () => { throw new Error('unavailable'); } },
  });
  await page.load();
  assert.equal(page.studentNumberFor(student), '확인 불가');
  assert.match(page.errorMessage.value, /다시 조회/);
  assert.equal(page.loading.value, false);
});
