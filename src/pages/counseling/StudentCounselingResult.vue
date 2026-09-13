<script setup>
import dayjs from 'dayjs';
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import MyButton from '../../components/button/MyButton.vue';
import MyPageContainer from '../../components/layout/MyPageContainer.vue';
import { notify } from '../../composables/useDialog';
import { useCounselingStore } from '../../store/counseling/useCounselingStore';

const route = useRoute();
const router = useRouter();
const store = useCounselingStore();
const loading = ref(true);

onMounted(async () => {
  try {
    const counseling = await store.fetchCounseling(route.params.counselingId, { pageLoad: true });
    if (counseling.status !== 'ANSWERED') {
      await notify('아직 교수 답변이 등록되지 않았습니다.');
      await router.replace({ name: 'StudentCounselingHistory' });
    }
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <MyPageContainer title="상담 결과">
    <p v-if="loading" class="loading">상담 결과를 불러오는 중입니다...</p>
    <template v-else-if="store.selected">
      <section>
        <h3>상담 기본 정보</h3>
        <div class="summary-card">
          <div><span>신청일</span><strong>{{ dayjs(store.selected.createdAt).format('YYYY-MM-DD') }}</strong></div>
          <div><span>상담 상태</span><strong>답변완료</strong></div>
          <div><span>담당 교수</span><strong>{{ store.selected.professorName }} 교수</strong></div>
          <div><span>답변일</span><strong>{{ dayjs(store.selected.answeredAt).format('YYYY-MM-DD') }}</strong></div>
        </div>
      </section>
      <section>
        <h3>상담 주제</h3>
        <div class="content-card">{{ store.selected.title }}</div>
      </section>
      <section>
        <h3>상담 요청 내용</h3>
        <div class="content-card">{{ store.selected.question }}</div>
      </section>
      <section>
        <h3>교수 답변</h3>
        <div class="content-card answer">{{ store.selected.answer }}</div>
      </section>
      <div class="actions">
        <MyButton color="deep-blue" size="middle" content="내역으로" @click="router.push({ name: 'StudentCounselingHistory' })" />
      </div>
    </template>
  </MyPageContainer>
</template>

<style scoped>
section { margin-top: 30px; }
h3 { margin: 0 0 12px 6px; font-size: 1.1rem; }
.summary-card, .content-card { background: white; border: 1px solid var(--personal-color-border-mist); border-radius: 9px; }
.summary-card { display: grid; grid-template-columns: repeat(4, 1fr); gap: 24px; padding: 30px 22px; }
.summary-card div { display: flex; flex-direction: column; gap: 14px; }
.summary-card span { color: var(--personal-color-text-muted-slate); font-size: .85rem; font-weight: 700; }
.content-card { min-height: 84px; padding: 28px 22px; line-height: 1.8; white-space: pre-wrap; }
.content-card.answer { min-height: 120px; }
.actions { display: flex; justify-content: flex-end; margin-top: 24px; }
.loading { text-align: center; padding: 80px; color: var(--personal-color-text-muted-slate); }
@media (max-width: 800px) { .summary-card { grid-template-columns: repeat(2, 1fr); } }
</style>
