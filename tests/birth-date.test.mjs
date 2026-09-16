import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeBirthDate } from '../src/util/birthDate.js';

const today = new Date(2026, 8, 16);

test('생년월일 숫자 직접 입력과 기존 날짜 값을 서버 형식으로 변환한다', () => {
  assert.equal(normalizeBirthDate('20000101', today), '2000-01-01');
  assert.equal(normalizeBirthDate('2000-01-01', today), '2000-01-01');
  assert.equal(normalizeBirthDate('20000229', today), '2000-02-29');
  assert.equal(normalizeBirthDate('20260915', today), '2026-09-15');
});

test('불완전한 입력, 존재하지 않는 날짜, 오늘과 미래 날짜는 거부한다', () => {
  for (const value of ['', null, '2000010', '200001011', '2000/01/01', '2000-0101', 'abcdefgh', '00000101', '19000229', '20010229', '20000431', '20001301', '20000001', '20000100', '20260916', '20260917']) {
    assert.equal(normalizeBirthDate(value, today), null, String(value));
  }
});
