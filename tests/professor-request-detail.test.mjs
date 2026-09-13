import assert from 'node:assert/strict';
import test from 'node:test';
import { createRenderer, h, nextTick } from 'vue';
import { createMemoryHistory, createRouter } from 'vue-router';
import { useProfessorRequestDetail } from '../src/composables/useProfessorRequestDetail.js';

const renderer = createRenderer({
  createElement: () => ({}), createText: () => ({}), createComment: () => ({}),
  insert() {}, remove() {}, setText() {}, setElementText() {}, patchProp() {},
  parentNode: () => null, nextSibling: () => null,
});
const flush = async () => { await Promise.resolve(); await nextTick(); };

test('교수 신청 상세: 새로고침 경로, 목록 복귀, 늦은 응답과 다른 탭 격리', async () => {
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/review', component: {} }, { path: '/other', component: {} }] });
  await router.push('/review?filter=pending&requestId=11');
  const pending = new Map();
  let state;
  const app = renderer.createApp({ setup() {
    state = useProfessorRequestDetail({ fetchRequest: id => new Promise((resolve, reject) => pending.set(id, { resolve, reject })), resetForm() {} });
    return () => h('div');
  } });
  app.use(router); app.mount({});
  assert.equal(state.detailId.value, '11');
  assert.equal(state.isLoadingDetail.value, true);
  await state.openDetail(12); await flush();
  pending.get('11').resolve({ data: { data: { id: 11 } } }); await flush();
  assert.equal(state.selectedRequest.value, null, 'previous response must not replace current selection');
  pending.get('12').resolve({ data: { data: { id: 12 } } }); await flush();
  assert.equal(state.selectedRequest.value.id, 12);
  await state.closeDetail(); await flush();
  assert.equal(router.currentRoute.value.query.filter, 'pending');
  assert.equal(state.selectedRequest.value, null);
  await state.openDetail(13); await flush();
  await state.closeDetail(); await flush();
  pending.get('13').resolve({ data: { data: { id: 13 } } }); await flush();
  assert.equal(state.selectedRequest.value, null, 'back navigation must not reopen a late request');
  await router.push('/other?requestId=99'); await flush();
  assert.equal(pending.has('99'), false, 'cached review must not fetch another page request');
  await router.push('/review?requestId=14'); await flush();
  pending.get('14').reject({ response: { data: { message: '상세 조회 권한이 없습니다.' } } }); await flush();
  assert.equal(state.detailError.value, '상세 조회 권한이 없습니다.');
  assert.equal(state.isLoadingDetail.value, false);
  app.unmount();
});
