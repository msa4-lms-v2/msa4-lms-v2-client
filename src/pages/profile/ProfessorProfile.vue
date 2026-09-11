<script setup>
import { computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useProfileStore } from '../../store/profile/useProfileStore';
import { useAuthStore } from '../../store/auth/useAuthStore';
import PasswordChange from './PasswordChange.vue';
import MyButton from '../../components/button/MyButton.vue';
import MyPageContainer from '../../components/layout/MyPageContainer.vue';
import MyStatusBadge from '../../components/common/MyStatusBadge.vue';

defineOptions({ name: 'ProfessorProfile' });

const profileStore = useProfileStore();
const authStore = useAuthStore();
const router = useRouter();

onMounted(async () => {
  await profileStore.fetchProfessorProfile();
});

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
  hireYear: user.value.hireYear || '-',
}));

const statusVariant = computed(() => statusVariants[user.value.status] || 'processing');

const basicRows = computed(() => [
  { label: '이름', value: professor.value.name },
  { label: '교번', value: professor.value.employeeNo },
  { label: '소속 단과대학', value: professor.value.college },
  { label: '학과', value: professor.value.department },
  { label: '이메일', value: professor.value.email },
  { label: '연락처', value: professor.value.phone },
  { label: '주소', value: professor.value.address },
]);

const employmentRows = computed(() => [
  { label: '재직 상태', value: professor.value.status },
  { label: '임용 연도', value: professor.value.hireYear },
]);
</script>

<template>
  <MyPageContainer title="교적 조회">
    <article class="profile-hero">
      <div class="professor-intro">
        <div class="profile-image" aria-hidden="true"></div>

        <div class="professor-main">
          <div class="name-row">
            <h2>{{ professor.name }}</h2>
            <MyStatusBadge
              :label="professor.status"
              :variant="statusVariant"
            />
          </div>

          <ul class="quick-list" aria-label="교수 기본 요약">
            <li>
              <span>{{ professor.department }}</span>
            </li>
            <li>
              <span>교번 {{ professor.employeeNo }}</span>
            </li>
            <li>
              <span>{{ professor.email }}</span>
            </li>
          </ul>
        </div>
      </div>

      <div class="profile-actions">
        <PasswordChange />
        <MyButton
          btn-type="button"
          color="white"
          size="big"
          content="정보 변경 신청"
          @click="router.push('/professor/profile/info-change')"
        />
      </div>
    </article>

    <div class="info-grid">
      <article class="info-card">
        <div class="common-section-header">
          <h3>기본 정보</h3>
        </div>

        <dl class="info-list">
          <div v-for="row in basicRows" :key="row.label" class="info-row">
            <dt>{{ row.label }}</dt>
            <dd>{{ row.value }}</dd>
          </div>
        </dl>
      </article>

      <article class="info-card">
        <div class="common-section-header">
          <h3>임용 정보</h3>
        </div>

        <dl class="info-list">
          <div v-for="row in employmentRows" :key="row.label" class="info-row">
            <dt>{{ row.label }}</dt>
            <dd>{{ row.value }}</dd>
          </div>
        </dl>
      </article>
    </div>
  </MyPageContainer>
</template>

<style scoped>
.profile-hero,
.info-card {
  background: var(--personal-color-white);
  border: 1px solid var(--personal-color-border-mist);
  border-radius: 8px;
}

.profile-hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 28px;
  padding: 28px 50px;
}

.profile-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 0 0 auto;
}

.professor-intro {
  display: flex;
  align-items: center;
  gap: 32px;
  min-width: 0;
}

.profile-image {
  width: 96px;
  height: 96px;
  border-radius: 50%;
  background: var(--personal-color-bg-surface-frost);
  flex: 0 0 96px;
}

.professor-main {
  min-width: 0;
}

.name-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px 12px;
  margin-bottom: 18px;
}

.name-row h2 {
  color: var(--personal-color-primary-text-navy);
  font-size: 1.5rem;
}

.quick-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  list-style: none;
  padding: 0;
}

.quick-list li {
  color: var(--personal-color-primary-text-navy);
  font-size: 0.95rem;
}

.info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 26px;
  margin-bottom: 30px;
}

.info-card {
  padding: 26px 30px;
}

.info-card h3 {
  color: var(--personal-color-primary-text-navy);
  font-size: 1.1rem;
  margin: 0 0 16px;
}

.info-list {
  display: flex;
  flex-direction: column;
}

.info-row {
  display: grid;
  grid-template-columns: minmax(92px, 0.36fr) minmax(0, 1fr);
  min-height: 44px;
  padding: 13px 0;
  border-bottom: 1px solid var(--personal-color-border-mist);
}

.info-row:last-child {
  border-bottom: 0;
}

.info-row dt {
  color: var(--personal-color-text-muted-slate);
}

.info-row dd {
  min-width: 0;
  margin: 0;
  color: var(--personal-color-primary-text-navy);
  overflow-wrap: anywhere;
}

@media (max-width: 720px) {
  .info-grid {
    grid-template-columns: 1fr;
  }

  .profile-hero {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }

  .profile-actions {
    flex-wrap: wrap;
  }
}
</style>
