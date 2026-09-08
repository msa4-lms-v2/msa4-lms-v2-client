<script setup>
import dayjs from 'dayjs';
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import MyButton from '../../components/button/MyButton.vue';
import MyPageContainer from '../../components/layout/MyPageContainer.vue';
import MyTable from '../../components/table/MyTable.vue';
import { notify } from '../../composables/useDialog';
import { useCounselingStore } from '../../store/counseling/useCounselingStore';

const store = useCounselingStore();
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

const todayCount = computed(() => store.counselings.filter(
  (item) => dayjs(item.createdAt).isSame(dayjs(), 'day'),
).length);
const waitingCount = computed(() => store.counselings.filter((item) => item.status === 'WAITING').length);
const answeredCount = computed(() => store.counselings.filter((item) => item.status === 'ANSWERED').length);

const load = async () => {
  loading.value = true;
  try {
    await store.fetchCounselings({ page: 1, size: 100 });
  } catch (error) {
    await notify(error.response?.data?.message || '상담 목록을 불러오지 못했습니다.');
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
      <MyTable :columns="columns" :loading="loading" :empty="!store.counselings.length" empty-message="신청된 상담이 없습니다.">
        <tr v-for="item in store.counselings" :key="item.id">
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
    </section>
  </MyPageContainer>
</template>

<style scoped>
.summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 28px; margin-top: 56px; }
.summary-grid article { min-height: 120px; padding: 28px; border: 1px solid var(--personal-color-border-mist); border-radius: 12px; background: white; display: flex; flex-direction: column; justify-content: space-between; }
.summary-grid span { color: var(--personal-color-text-secondary-steel); }
.summary-grid strong { color: var(--personal-color-black); font-size: 2rem; }
.records { margin-top: 56px; }
.records h3 { margin: 0 0 18px; font-size: 1.25rem; }
.title-cell { max-width: 260px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.status { color: var(--personal-color-primary-text-navy); font-size: .9rem; font-weight: 400; }
@media (max-width: 800px) { .summary-grid { grid-template-columns: 1fr; margin-top: 28px; } }
</style>
