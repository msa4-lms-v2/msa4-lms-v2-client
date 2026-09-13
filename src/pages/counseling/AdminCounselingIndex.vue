<script setup>
import { onMounted, ref } from 'vue';
import MyButton from '../../components/button/MyButton.vue';
import MySelect from '../../components/input/MySelect.vue';
import MyPageContainer from '../../components/layout/MyPageContainer.vue';
import MyTable from '../../components/table/MyTable.vue';
import { notify } from '../../composables/useDialog';
import { useCounselingStore } from '../../store/counseling/useCounselingStore';
import { formatDate } from '../../util/format';

defineOptions({ name: 'AdminCounselingIndex' });

const STATUS_LABELS = { WAITING: '답변 대기', ANSWERED: '답변 완료' };
const STATUS_OPTIONS = [
  { value: '', label: '전체' },
  { value: 'WAITING', label: '답변 대기' },
  { value: 'ANSWERED', label: '답변 완료' },
];

const store = useCounselingStore();
const statusFilter = ref('');
const isLoading = ref(false);
const isLoadingDetail = ref(false);

const columns = [
  { key: 'student', label: '학생' },
  { key: 'professor', label: '담당 교수' },
  { key: 'title', label: '상담 주제' },
  { key: 'status', label: '상태' },
  { key: 'createdAt', label: '신청일시' },
  { key: 'management', label: '관리' },
];

const load = async () => {
  isLoading.value = true;
  try {
    await store.fetchCounselings({ page: 1, size: 100, status: statusFilter.value || undefined });
  } catch (error) {
    await notify(error.response?.data?.message || '상담 목록을 불러오지 못했습니다.');
  } finally {
    isLoading.value = false;
  }
};

const selectItem = async (id) => {
  isLoadingDetail.value = true;
  try {
    await store.fetchCounseling(id);
  } catch (error) {
    await notify(error.response?.data?.message || '상담 상세를 불러오지 못했습니다.');
  } finally {
    isLoadingDetail.value = false;
  }
};

onMounted(load);
</script>

<template>
  <MyPageContainer title="상담 관리" subtitle="학생-교수 간 온라인 상담 내역을 조회합니다.">
    <section class="filter-card">
      <label>답변 상태<MySelect v-model="statusFilter" :options="STATUS_OPTIONS" /></label>
      <div class="filter-actions">
        <MyButton class="admin-primary" color="deep-blue" size="middle" content="조회" @click="load" />
      </div>
    </section>

    <div class="management-grid">
      <section class="list-card">
        <div class="section-title">
          <h3>상담 목록</h3><span>총 {{ store.page.totalCount }}건</span>
        </div>
        <div class="table-scroll">
          <MyTable
            :columns="columns"
            :loading="isLoading"
            :empty="!isLoading && !store.counselings.length"
            empty-message="조회된 상담이 없습니다."
          >
            <tr
              v-for="item in store.counselings"
              :key="item.id"
              :class="{ selected: store.selected?.id === item.id }"
            >
              <td>{{ item.studentName }} ({{ item.studentDepartmentName }})</td>
              <td>{{ item.professorName }}</td>
              <td class="title-cell">{{ item.title }}</td>
              <td>{{ STATUS_LABELS[item.status] || item.status }}</td>
              <td>{{ formatDate(item.createdAt, 'YYYY-MM-DD HH:mm') }}</td>
              <td>
                <MyButton color="white" size="small" content="선택" :disabled="isLoadingDetail" @click="selectItem(item.id)" />
              </td>
            </tr>
          </MyTable>
        </div>
      </section>

      <aside class="detail-card">
        <h3>선택한 상담</h3>
        <p v-if="!store.selected" class="empty-detail">목록에서 상담을 선택해 주세요.</p>
        <dl v-else class="detail-list">
          <div><dt>학생</dt><dd>{{ store.selected.studentName }} ({{ store.selected.studentNumber }})</dd></div>
          <div><dt>담당 교수</dt><dd>{{ store.selected.professorName }}</dd></div>
          <div><dt>제목</dt><dd>{{ store.selected.title }}</dd></div>
          <div class="block"><dt>상담 내용</dt><dd>{{ store.selected.question }}</dd></div>
          <div class="block">
            <dt>답변</dt>
            <dd>{{ store.selected.answer || '아직 답변이 등록되지 않았습니다.' }}</dd>
          </div>
          <div><dt>신청일</dt><dd>{{ formatDate(store.selected.createdAt, 'YYYY-MM-DD HH:mm') }}</dd></div>
          <div v-if="store.selected.answeredAt"><dt>답변일</dt><dd>{{ formatDate(store.selected.answeredAt, 'YYYY-MM-DD HH:mm') }}</dd></div>
        </dl>
      </aside>
    </div>
  </MyPageContainer>
</template>

<style scoped>
.filter-card { display: flex; gap: 16px; align-items: end; padding: 20px; margin-bottom: 20px; border: 1px solid var(--personal-color-border-mist); border-radius: 10px; background: white; }
.filter-card label { display: flex; flex-direction: column; gap: 6px; font-size: .78rem; font-weight: 600; }
.filter-actions { margin-left: auto; }
.admin-primary { background: var(--personal-color-admin-secondary-indigo); }
.management-grid { display: grid; grid-template-columns: minmax(0, 1.75fr) minmax(300px, .85fr); gap: 18px; align-items: start; }
.list-card, .detail-card { padding: 18px; border: 1px solid var(--personal-color-border-mist); border-radius: 10px; background: white; }
.section-title { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; }
.section-title h3, .detail-card h3 { margin: 0; font-size: 1rem; }
.section-title span { color: var(--personal-color-admin-secondary-indigo); font-size: .8rem; font-weight: 700; }
.table-scroll { overflow-x: auto; }
.title-cell { max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.selected { background: var(--personal-color-indigo-soft-lavender); }
.empty-detail { margin: 24px 0; color: var(--personal-color-text-muted-slate); text-align: center; }
.detail-list { margin: 12px 0 0; }
.detail-list div { display: grid; grid-template-columns: 90px 1fr; gap: 10px; padding: 8px 0; }
.detail-list div.block { grid-template-columns: 1fr; }
.detail-list dt { color: var(--personal-color-text-muted-slate); font-size: .8rem; }
.detail-list dd { margin: 0; text-align: right; font-size: .82rem; font-weight: 400; white-space: pre-wrap; }
.detail-list div.block dd { text-align: left; font-weight: 400; }
@media (max-width: 1100px) { .management-grid { grid-template-columns: 1fr; } }
</style>
