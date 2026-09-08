<script setup>
import dayjs from 'dayjs';
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import MyButton from '../../components/button/MyButton.vue';
import MyPageContainer from '../../components/layout/MyPageContainer.vue';
import { notify } from '../../composables/useDialog';
import { useCounselingStore } from '../../store/counseling/useCounselingStore';

const route = useRoute();
const router = useRouter();
const store = useCounselingStore();
const answer = ref('');
const loading = ref(true);
const submitting = ref(false);
const errorMessage = ref('');
const counseling = computed(() => store.selected);

onMounted(async () => {
  try {
    const data = await store.fetchCounseling(route.params.counselingId);
    answer.value = data.answer || '';
  } catch (error) {
    await notify(error.response?.data?.message || '상담 정보를 불러오지 못했습니다.');
    await router.replace({ name: 'ProfessorCounselingList' });
  } finally {
    loading.value = false;
  }
});

const submit = async () => {
  errorMessage.value = '';
  if (!answer.value.trim()) {
    errorMessage.value = '답변 내용을 입력해 주세요.';
    return;
  }
  if (submitting.value) return;
  submitting.value = true;
  try {
    const wasAnswered = counseling.value.status === 'ANSWERED';
    await store.submitAnswer(route.params.counselingId, answer.value.trim());
    await notify(wasAnswered ? '상담 답변이 수정되었습니다.' : '상담 답변이 완료되었습니다.');
    await router.push({ name: 'ProfessorCounselingList' });
  } catch (error) {
    errorMessage.value = error.response?.data?.message || '상담 답변 저장에 실패했습니다.';
  } finally {
    submitting.value = false;
  }
};
</script>

<template>
  <MyPageContainer title="온라인 상담 답변">
    <p v-if="loading" class="loading">상담 정보를 불러오는 중입니다...</p>
    <template v-else-if="counseling">
      <section>
        <h3>상담 기본 정보</h3>
        <div class="info-card">
          <div><span>학생</span><strong>{{ counseling.studentName }}</strong></div>
          <div><span>학번</span><strong>{{ counseling.studentNumber || '-' }}</strong></div>
          <div><span>학과</span><strong>{{ counseling.studentDepartmentName || '-' }}</strong></div>
          <div><span>신청일</span><strong>{{ dayjs(counseling.createdAt).format('YYYY-MM-DD') }}</strong></div>
          <div class="topic"><span>상담 주제</span><strong>{{ counseling.title }}</strong></div>
          <div><span>처리 상태</span><strong>{{ counseling.status === 'ANSWERED' ? '답변 완료' : '답변 대기' }}</strong></div>
          <div><span>답변일</span><strong>{{ counseling.answeredAt ? dayjs(counseling.answeredAt).format('YYYY-MM-DD') : '-' }}</strong></div>
        </div>
      </section>

      <section>
        <h3>학생 상담 요청 내용</h3>
        <div class="content-card">{{ counseling.question }}</div>
      </section>

      <section>
        <h3>교수 답변</h3>
        <div class="answer-card">
          <label for="answer">답변 내용</label>
          <textarea id="answer" v-model="answer" maxlength="10000" placeholder="학생에게 전달할 상담 답변을 입력해 주세요." />
          <span class="count">{{ answer.length.toLocaleString() }} / 10,000</span>
        </div>
      </section>
      <p v-if="errorMessage" class="error">{{ errorMessage }}</p>
      <div class="actions">
        <MyButton color="white" size="middle" content="목록으로" @click="router.push({ name: 'ProfessorCounselingList' })" />
        <MyButton color="deep-blue" size="middle" :content="submitting ? '저장 중' : '답변 완료'" :disabled="submitting" @click="submit" />
      </div>
    </template>
  </MyPageContainer>
</template>

<style scoped>
section { margin-top: 30px; }
h3 { margin: 0 0 12px 6px; font-size: 1.1rem; }
.info-card, .content-card, .answer-card { background: white; border: 1px solid var(--personal-color-border-mist); border-radius: 9px; }
.info-card { display: grid; grid-template-columns: repeat(4, 1fr); padding: 20px; gap: 14px 20px; }
.info-card div { min-height: 60px; padding: 10px 14px; border-radius: 5px; background: var(--personal-color-bg-subtle-snow); display: flex; flex-direction: column; gap: 9px; }
.info-card .topic { grid-column: span 2; }
.info-card span, .answer-card label { color: var(--personal-color-text-muted-slate); font-size: .82rem; font-weight: 700; }
.content-card { min-height: 130px; padding: 28px 22px; line-height: 1.8; white-space: pre-wrap; }
.answer-card { position: relative; padding: 20px 22px 42px; }
.answer-card label { display: block; margin-bottom: 12px; }
textarea { width: 100%; min-height: 150px; padding: 16px; resize: vertical; border: 1px solid var(--personal-color-border-mist); border-radius: 6px; background: white; color: var(--personal-color-primary-text-navy); line-height: 1.7; outline: none; }
textarea:focus { border-color: var(--personal-color-primary-navy); }
textarea::placeholder { color: var(--personal-color-text-faint-fog); font-weight: 400; opacity: .78; }
.count { position: absolute; right: 28px; bottom: 18px; color: var(--personal-color-text-faint-fog); font-size: .8rem; }
.actions { display: flex; justify-content: flex-end; gap: 20px; margin-top: 20px; }
.actions :deep(.white) { border: 1px solid var(--personal-color-border-mist); color: var(--personal-color-primary-navy); }
.error { color: var(--personal-color-red); text-align: right; }
.loading { text-align: center; padding: 80px; }
@media (max-width: 850px) { .info-card { grid-template-columns: repeat(2, 1fr); } }
</style>
