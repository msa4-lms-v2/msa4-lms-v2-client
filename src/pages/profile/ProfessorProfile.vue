<script setup>
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useProfileStore } from '../../store/profile/useProfileStore';
import { useAuthStore } from '../../store/auth/useAuthStore';
import MyProfileDetails from '../../components/profile/MyProfileDetails.vue';
import PasswordChange from './PasswordChange.vue';
import MyButton from '../../components/button/MyButton.vue';
import MyPageContainer from '../../components/layout/MyPageContainer.vue';

defineOptions({ name: 'ProfessorProfile' });
const profileStore = useProfileStore();
const authStore = useAuthStore();
const router = useRouter();
const loadError = ref('');
const loadProfile = async () => {
  loadError.value = '';
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
  { label: '소속 학과', value: professor.value.department },
]);
</script>

<template>
  <MyPageContainer title="교적 조회">
    <p
      v-if="profileStore.isLoading"
      class="profile-state"
      role="status"
    >
      교수 정보를 불러오는 중입니다.
    </p>
    <div
      v-else-if="loadError"
      class="profile-state"
      role="alert"
    >
      <p>{{ loadError }}</p>
      <MyButton
        color="deep-blue"
        size="middle"
        content="다시 시도"
        @click="loadProfile"
      />
    </div>
    <MyProfileDetails
      v-else
      :profile="professor"
      :status-variant="statusVariant"
      :summary="[professor.department, '교번 ' + professor.employeeNo, professor.email]"
      summary-label="교수 기본 요약"
      :sections="[{ title: '기본 정보', rows: basicRows }, { title: '교직 정보', rows: employmentRows }]"
    >
      <template #actions>
        <PasswordChange />
        <MyButton
          btn-type="button"
          class="info-change-request-button"
          color="white"
          size="big"
          content="정보 변경 신청"
          @click="router.push('/professor/profile/info-change')"
        />
      </template>
    </MyProfileDetails>
  </MyPageContainer>
</template>

<style scoped>
.profile-state { min-height: 220px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; }
</style>
