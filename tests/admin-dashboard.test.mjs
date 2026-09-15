import test from 'node:test';
import assert from 'node:assert/strict';
import { pendingTaskRoute, tuitionSegments } from '../src/util/adminDashboard.js';

test('대기 업무는 해당 심사 페이지에 연결하고 알 수 없는 업무는 추측하지 않는다', () => {
  assert.equal(pendingTaskRoute({ type: 'LEAVE' }), '/admin/application-management/leave-requests');
  assert.equal(pendingTaskRoute({ type: 'RETURN' }), '/admin/application-management/leave-requests');
  assert.equal(pendingTaskRoute({ type: 'LECTURE' }), '/admin/lecture-opening-requests');
  assert.equal(pendingTaskRoute({ type: 'WITHDRAWAL' }), '/admin/withdrawals');
  assert.equal(pendingTaskRoute({ type: 'INSTALLMENT', tuitionBillId: 10 }), '/admin/tuition/10');
  assert.equal(pendingTaskRoute({ type: 'INSTALLMENT', tuitionBillId: -1 }), null);
  assert.equal(pendingTaskRoute({ type: 'UNKNOWN' }), null);
  assert.deepEqual(tuitionSegments({ paid: 1, inProgress: 1, unpaid: 2 }), { total: 4, rate: 25, paidEnd: 25, progressEnd: 50 });
});
