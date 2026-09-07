<script setup>
import { computed, onMounted, ref } from 'vue';
import MyPageContainer from '../../components/layout/MyPageContainer.vue';
import { useProfileStore } from '../../store/profile/useProfileStore';
import { notify } from '../../composables/useDialog';

defineOptions({ name: 'StudentGradeIndex' });

const profileStore = useProfileStore();
const isLoading = ref(false);
const loadError = ref('');

const profile = computed(() => profileStore.profile || {});

onMounted(async () => {
  isLoading.value = true;
  try {
    await profileStore.fetchStudentProfile();
  } catch (error) {
    loadError.value = error.response?.data?.message || '학적 정보를 불러오지 못했습니다.';
    await notify(loadError.value);
  } finally {
    isLoading.value = false;
  }
});
</script>

<template>
  <MyPageContainer title="성적 조회" subtitle="확정된 취득 학점과 성적 상세를 확인합니다.">
    <section v-if="isLoading" class="state-card">
      학적 정보를 불러오는 중입니다...
    </section>

    <template v-else>
      <section class="summary-card">
        <div class="summary-item">
          <span class="summary-label">총 취득 학점</span>
          <strong class="summary-value">{{ profile.totalCredits ?? 0 }}학점</strong>
        </div>
        <div class="summary-item">
          <span class="summary-label">학적 상태</span>
          <strong class="summary-value">{{ profile.academicStatus || '-' }}</strong>
        </div>
        <div class="summary-item">
          <span class="summary-label">소속</span>
          <strong class="summary-value">{{ profile.departmentName || '-' }}</strong>
        </div>
      </section>

      <section class="notice-card" role="status">
        <p class="notice-title">과목별 성적 상세 조회는 현재 준비 중입니다.</p>
        <p class="notice-body">
          과목별 성적(중간·기말·과제·출석 점수, 등급)을 조회하는 화면입니다. 다만 백엔드 Academic
          서비스는 아직 학생 본인이 스스로 자신의 학번(Student ID)을 조회할 수 있는 API를 제공하지
          않아, 과목별 상세 성적을 안전하게 조회할 방법이 없습니다. 잘못된 식별자로 다른 학생의
          성적이 노출되는 것을 막기 위해 이 화면에서는 위 요약 정보만 제공합니다. 과목별 성적은
          학사지원팀 또는 지도교수를 통해 확인해 주세요.
        </p>
      </section>
    </template>
  </MyPageContainer>
</template>

<style scoped>
.state-card,
.notice-card {
  padding: 24px;
  border: 1px solid var(--personal-color-border-mist);
  border-radius: 8px;
  background: var(--personal-color-white);
  color: var(--personal-color-text-muted-slate);
}

.summary-card {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
  margin-bottom: 20px;
}

.summary-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 20px;
  border: 1px solid var(--personal-color-border-mist);
  border-radius: var(--personal-radius);
  background: var(--personal-color-white);
}

.summary-label {
  color: var(--personal-color-text-muted-slate);
  font-size: 0.85rem;
}

.summary-value {
  color: var(--personal-color-primary-text-navy);
  font-size: 1.2rem;
}

.notice-title {
  margin: 0 0 10px;
  color: var(--personal-color-primary-text-navy);
  font-weight: 700;
}

.notice-body {
  margin: 0;
  line-height: 1.6;
  font-size: 0.88rem;
}

@media (max-width: 640px) {
  .summary-card {
    grid-template-columns: 1fr;
  }
}
</style>
