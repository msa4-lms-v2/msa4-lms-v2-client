<script setup>
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useProfileStore } from '../../store/profile/useProfileStore';
import { useAuthStore } from '../../store/auth/useAuthStore';
import PasswordChange from './PasswordChange.vue';
import MyButton from '../../components/button/MyButton.vue';
import MyPageContainer from '../../components/layout/MyPageContainer.vue';
import MyStatusBadge from '../../components/common/MyStatusBadge.vue';
import MyCard from '../../components/common/MyCard.vue';

defineOptions({ name: 'ProfessorProfile' });
const profileStore = useProfileStore();
const authStore = useAuthStore();
const router = useRouter();
const loadError = ref('');
const imageFailed = ref(false);
const loadProfile = async () => {
  loadError.value = '';
  imageFailed.value = false;
  try {
    await profileStore.fetchProfessorProfile();
  } catch (error) {
    loadError.value = error.response?.data?.message || '교수 정보를 불러오지 못했습니다.';
  }
};
onMounted(loadProfile);
const user = computed(() => profileStore.profile || {});
const statusLabels = { ACTIVE: '재직', INACTIVE: '비활성' };
const statusVariants = { ACTIVE: 'processing', INACTIVE: 'fail' };
const professor = computed(() => ({
  name: user.value.name || '-',
  status: statusLabels[user.value.status] || user.value.status || '-',
  college: user.value.collegeName || '-',
  department: user.value.departmentName || '-',
  employeeNo: authStore.userInfo?.loginId || '-',
  email: user.value.email || '-',
  phone: user.value.phoneNumber || '-',
  address: user.value.address || '-',
  profileImageUrl: user.value.profileImageUrl || '',
  hireYear: user.value.hireYear || '-',
}));
const statusVariant = computed(() => statusVariants[user.value.status] || 'processing');
const basicRows = computed(() => [
  { label: '이름', value: professor.value.name },
  { label: '교번', value: professor.value.employeeNo },
  { label: '학과', value: professor.value.department },
  { label: '이메일', value: professor.value.email },
  { label: '연락처', value: professor.value.phone },
  { label: '주소', value: professor.value.address },
]);
const employmentRows = computed(() => [
  { label: '재직 상태', value: professor.value.status },
  { label: '임용 연도', value: professor.value.hireYear },
  { label: '소속 단과대학', value: professor.value.college },
  { label: '소속 학과', value: professor.value.department },
]);
</script>

<template>
  <MyPageContainer title="교적 조회">
    <p v-if="profileStore.isLoading" class="profile-state" role="status">교수 정보를 불러오는 중입니다.</p>
    <div v-else-if="loadError" class="profile-state" role="alert">
      <p>{{ loadError }}</p>
      <MyButton color="deep-blue" size="middle" content="다시 시도" @click="loadProfile" />
    </div>
    <template v-else>
      <MyCard class="profile-hero">
        <div class="professor-intro">
          <div class="profile-image">
            <img v-if="professor.profileImageUrl && !imageFailed" :src="professor.profileImageUrl" :alt="`${professor.name} 프로필 사진`" @error="imageFailed = true" />
            <span v-else class="avatar-placeholder" role="img" aria-label="등록된 프로필 사진 없음">
              <span class="avatar-head"></span><span class="avatar-body"></span>
            </span>
          </div>
          <div class="professor-main">
            <div class="name-row">
              <h2>{{ professor.name }}</h2>
              <MyStatusBadge :label="professor.status" :variant="statusVariant" />
            </div>
            <ul class="quick-list" aria-label="교수 기본 요약">
              <li>{{ professor.department }}</li>
              <li>교번 {{ professor.employeeNo }}</li>
              <li>{{ professor.email }}</li>
            </ul>
          </div>
        </div>
        <div class="profile-actions">
          <MyButton color="deep-blue" size="big" content="정보 변경 신청" @click="router.push('/professor/profile/info-change')" />
          <div class="password-action"><PasswordChange /></div>
        </div>
      </MyCard>
      <div class="info-grid">
        <MyCard class="info-card">
          <h3>기본 정보</h3>
          <dl class="info-list">
            <div v-for="row in basicRows" :key="row.label" class="info-row">
              <dt>{{ row.label }}</dt><dd>{{ row.value }}</dd>
            </div>
          </dl>
        </MyCard>
        <MyCard class="info-card">
          <h3>교직 정보</h3>
          <dl class="info-list">
            <div v-for="row in employmentRows" :key="row.label" class="info-row">
              <dt>{{ row.label }}</dt><dd>{{ row.value }}</dd>
            </div>
          </dl>
        </MyCard>
      </div>
    </template>
  </MyPageContainer>
</template>

<style scoped>
.profile-state { min-height: 220px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; }
.profile-hero { display: flex; align-items: center; justify-content: space-between; gap: 24px; margin-bottom: 20px; padding: 20px 24px; }
.profile-actions { display: flex; align-items: center; gap: 12px; flex: 0 0 auto; }
.professor-intro { display: flex; align-items: center; gap: 20px; min-width: 0; }
.profile-image { width: 104px; height: 104px; overflow: hidden; border-radius: 6px; flex: 0 0 104px; }
.profile-image img { width: 100%; height: 100%; object-fit: cover; }
/* 정보 변경 신청 화면에서 사용하는 기존 기본 프로필 모양을 재사용합니다. */
.avatar-placeholder { position: relative; display: block; width: 100%; height: 100%; background: var(--personal-color-border-mist); }
.avatar-head, .avatar-body { position: absolute; left: 50%; display: block; transform: translateX(-50%); background: var(--personal-color-tab-inactive-silver); }
.avatar-head { top: 15px; width: 44px; height: 44px; border-radius: 50%; }
.avatar-body { bottom: 11px; width: 64px; height: 36px; border-radius: 36px 36px 24px 24px; }
.professor-main { min-width: 0; }
.name-row { display: flex; flex-wrap: wrap; align-items: center; gap: 10px 12px; margin-bottom: 8px; }
.name-row h2 { margin: 0; color: var(--personal-color-primary-text-navy); font-size: 1.5rem; }
.quick-list { display: flex; flex-direction: column; gap: 6px; list-style: none; padding: 0; margin: 0; }
.quick-list li { color: var(--personal-color-primary-text-navy); font-size: 0.95rem; overflow-wrap: anywhere; }
.info-grid { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 20px; margin-bottom: 30px; }
.info-card { padding: 20px 24px; }
.info-card h3 { color: var(--personal-color-primary-text-navy); font-size: 1.1rem; margin: 0 0 16px; }
.info-list { display: flex; flex-direction: column; margin: 0; }
.info-row { display: grid; grid-template-columns: minmax(92px, 0.36fr) minmax(0, 1fr); min-height: 44px; padding: 13px 0; border-bottom: 1px solid var(--personal-color-border-mist); }
.info-row:last-child { border-bottom: 0; }
.info-row dt { color: var(--personal-color-text-muted-slate); }
.info-row dd { min-width: 0; margin: 0; color: var(--personal-color-primary-text-navy); overflow-wrap: anywhere; }
.password-action :deep(> button) { background: var(--personal-color-white); color: var(--personal-color-primary-navy); border: 1px solid var(--personal-color-border-mist); }
@media (max-width: 960px) {
  .profile-hero { flex-direction: column; align-items: flex-start; gap: 16px; }
  .profile-actions { flex-wrap: wrap; align-self: flex-end; }
}
@media (max-width: 720px) {
  .info-grid { grid-template-columns: 1fr; }
}
</style>
