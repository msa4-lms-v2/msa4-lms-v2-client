<script setup>
import dayjs from 'dayjs';
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import MyButton from '../../components/button/MyButton.vue';
import MyPageContainer from '../../components/layout/ProfessorPageContainer.vue';
import MyTable from '../../components/table/MyTable.vue';
import { getCounselings } from '../../api/counselingApi';
import PrevNextPagination from '../../components/pagination/PrevNextPagination.vue';

const counselings = ref([]);
const page = ref(1);
const visibleCounselings = computed(() => counselings.value.slice((page.value - 1) * 10, page.value * 10));
const router = useRouter();
const loading = ref(false);
const columns = [
  { key: 'student', label: '학생' },
  { key: 'department', label: '학과' },
  { key: 'createdAt', label: '신청일시' },
  { key: 'title', label: '상담 주제' },
  { key: 'status', label: '상태' },
  { key: 'detail', label: '상세보기' },
];

const todayCount = computed(() => counselings.value.filter(
  (item) => dayjs(item.createdAt).isSame(dayjs(), 'day'),
).length);
const waitingCount = computed(() => counselings.value.filter((item) => item.status === 'WAITING').length);
const answeredCount = computed(() => counselings.value.filter((item) => item.status === 'ANSWERED').length);

const load = async () => {
  loading.value = true;
  try {
    const items = [];
    let nextPage = 1;
    let hasNext = true;
    while (hasNext) {
      const response = await getCounselings({ page: nextPage, size: 100 }, { pageLoad: true });
      const result = response.data.data;
      items.push(...(result.items || []));
      hasNext = Boolean(result.hasNext) && Boolean(result.items?.length);
      nextPage += 1;
    }
    counselings.value = items;
    page.value = 1;
  } finally {
    loading.value = false;
  }
};
onMounted(load);
</script>

<template>
  <MyPageContainer title="온라인 상담">
    <section class="summary-grid">
      <article><span>오늘의 상담</span><strong>{{ todayCount }}건</strong></article>
      <article><span>답변 대기</span><strong>{{ waitingCount }}건</strong></article>
      <article><span>답변 완료</span><strong>{{ answeredCount }}건</strong></article>
    </section>

    <section class="records">
      <h3>상담 기록</h3>
      <MyTable :columns="columns" :loading="loading" :empty="!counselings.length" empty-message="신청된 상담이 없습니다.">
        <tr v-for="item in visibleCounselings" :key="item.id">
          <td>{{ item.studentName }}</td>
          <td>{{ item.studentDepartmentName }}</td>
          <td>{{ dayjs(item.createdAt).format('MM-DD HH:mm') }}</td>
          <td class="title-cell">{{ item.title }}</td>
          <td><span class="status">{{ item.status === 'ANSWERED' ? '답변 완료' : '답변 대기' }}</span></td>
          <td>
            <MyButton
              color="deep-blue"
              size="middle"
              content="상세보기"
              @click="router.push({ name: 'ProfessorCounselingAnswer', params: { counselingId: item.id } })"
            />
          </td>
        </tr>
      </MyTable>
      <PrevNextPagination :page="page" :has-next="page * 10 < counselings.length" :inert="loading" @page-change="page = $event" />
    </section>
  </MyPageContainer>
</template>

<style scoped>
.summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; margin-top: 32px; }
.summary-grid article { min-height: 108px; padding: 24px; border: 1px solid var(--personal-color-border-mist); border-radius: 12px; background: white; display: flex; flex-direction: column; justify-content: space-between; }
.summary-grid span { color: var(--personal-color-text-secondary-steel); }
.summary-grid strong { color: var(--personal-color-black); font-size: 2rem; }
.records { margin-top: 56px; }
.records h3 { margin: 0 0 18px; font-size: 1.25rem; }
.title-cell { max-width: 260px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.status { color: var(--personal-color-primary-text-navy); font-size: .9rem; font-weight: 400; }
@media (max-width: 800px) { .summary-grid { grid-template-columns: 1fr; margin-top: 28px; } }
</style>
