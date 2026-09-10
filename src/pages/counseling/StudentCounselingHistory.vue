<script setup>
import dayjs from 'dayjs';
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import MyButton from '../../components/button/MyButton.vue';
import MyModal from '../../components/common/MyModal.vue';
import MyPageContainer from '../../components/layout/MyPageContainer.vue';
import MySelect from '../../components/input/MySelect.vue';
import MySearchFilter from '../../components/search/MySearchFilter.vue';
import MyTable from '../../components/table/MyTable.vue';
import { notify } from '../../composables/useDialog';
import { useCounselingStore } from '../../store/counseling/useCounselingStore';

const store = useCounselingStore();
const router = useRouter();
const loading = ref(false);
const detailLoading = ref(false);
const modalOpen = ref(false);
const selectedYear = ref(String(new Date().getFullYear()));
const selectedTerm = ref('');
const selectedStatus = ref('');

const columns = [
  { key: 'createdAt', label: '신청일' },
  { key: 'professor', label: '담당교수' },
  { key: 'title', label: '상담 주제' },
  { key: 'status', label: '상태' },
  { key: 'detail', label: '상세' },
];
const years = computed(() => {
  const set = new Set([new Date().getFullYear(), ...store.counselings.map((item) => dayjs(item.createdAt).year())]);
  return [...set].sort((a, b) => b - a).map((year) => ({ value: String(year), label: `${year}년` }));
});
const terms = [
  { value: '', label: '전체' },
  { value: 'FIRST', label: '1학기' },
  { value: 'SECOND', label: '2학기' },
];
const statuses = [
  { value: '', label: '전체' },
  { value: 'WAITING', label: '대기중' },
  { value: 'ANSWERED', label: '답변완료' },
];
const filtered = computed(() => store.counselings.filter((item) => {
  const date = dayjs(item.createdAt);
  const term = date.month() < 6 ? 'FIRST' : 'SECOND';
  return (!selectedYear.value || String(date.year()) === selectedYear.value)
    && (!selectedTerm.value || term === selectedTerm.value)
    && (!selectedStatus.value || item.status === selectedStatus.value);
}));

const load = async () => {
  loading.value = true;
  try {
    await store.fetchCounselings();
  } catch (error) {
    await notify(error.response?.data?.message || '상담 내역을 불러오지 못했습니다.');
  } finally {
    loading.value = false;
  }
};
onMounted(load);

const showDetail = async (item) => {
  if (item.status === 'ANSWERED') {
    await router.push({ name: 'StudentCounselingResult', params: { counselingId: item.id } });
    return;
  }
  detailLoading.value = true;
  modalOpen.value = true;
  try {
    await store.fetchCounseling(item.id);
  } catch (error) {
    modalOpen.value = false;
    await notify(error.response?.data?.message || '상담 상세 정보를 불러오지 못했습니다.');
  } finally {
    detailLoading.value = false;
  }
};
const statusLabel = (status) => status === 'ANSWERED' ? '답변완료' : '대기중';
</script>

<template>
  <MyPageContainer title="상담 내역">
    <MySearchFilter submit-text="조회" submit-at-end @search="load">
      <div class="search-group">
        <label for="counseling-filter-year">연도</label>
        <MySelect id="counseling-filter-year" v-model="selectedYear" :options="years" />
      </div>
      <div class="search-group">
        <label for="counseling-filter-term">학기</label>
        <MySelect id="counseling-filter-term" v-model="selectedTerm" :options="terms" />
      </div>
      <div class="search-group">
        <label for="counseling-filter-status">처리 상태</label>
        <MySelect id="counseling-filter-status" v-model="selectedStatus" :options="statuses" />
      </div>
    </MySearchFilter>

    <section class="history-section">
      <h3>나의 상담 신청</h3>
      <MyTable :columns="columns" :loading="loading" :empty="!filtered.length" empty-message="상담 신청 내역이 없습니다.">
        <tr v-for="item in filtered" :key="item.id">
          <td>{{ dayjs(item.createdAt).format('YYYY-MM-DD') }}</td>
          <td>{{ item.professorName }} 교수</td>
          <td class="title-cell">{{ item.title }}</td>
          <td><span class="status">{{ statusLabel(item.status) }}</span></td>
          <td><MyButton color="deep-blue" size="middle" content="상세보기" @click="showDetail(item)" /></td>
        </tr>
      </MyTable>
    </section>

    <MyModal :is-open="modalOpen" title="상담 신청 상세" max-width="900px" @close="modalOpen = false">
      <p v-if="detailLoading" class="loading">상담 내용을 불러오는 중입니다...</p>
      <div v-else-if="store.selected" class="detail-card">
        <div class="detail-summary">
          <div><span>신청일</span><strong>{{ dayjs(store.selected.createdAt).format('YYYY-MM-DD') }}</strong></div>
          <div><span>담당교수</span><strong>{{ store.selected.professorName }} 교수</strong></div>
        </div>
        <div class="detail-content">
          <span>상담 주제</span><strong>{{ store.selected.title }}</strong>
          <span>상담 요청 내용</span><p>{{ store.selected.question }}</p>
        </div>
      </div>
      <template #footer><MyButton color="deep-blue" size="middle" content="닫기" @click="modalOpen = false" /></template>
    </MyModal>
  </MyPageContainer>
</template>

<style scoped>
.history-section { margin-top: 36px; }
.history-section h3 { font-size: 1.15rem; margin: 0 0 14px; }
.title-cell { max-width: 320px; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.status { color: var(--personal-color-primary-text-navy); font-size: .9rem; font-weight: 400; }
.detail-card { border: 1px solid var(--personal-color-border-mist); border-radius: 8px; overflow: hidden; }
.detail-summary { display: flex; justify-content: space-between; gap: 30px; padding: 24px; border-bottom: 1px solid var(--personal-color-border-mist); }
.detail-summary div { display: flex; gap: 22px; }
.detail-card span { color: var(--personal-color-text-muted-slate); font-size: .88rem; font-weight: 700; }
.detail-content { display: grid; grid-template-columns: 120px 1fr; gap: 18px; padding: 24px; line-height: 1.7; }
.detail-content p, .detail-content strong { margin: 0; white-space: pre-wrap; }
.loading { text-align: center; padding: 50px; }
@media (max-width: 850px) {
  .detail-summary { flex-direction: column; }
}
</style>
