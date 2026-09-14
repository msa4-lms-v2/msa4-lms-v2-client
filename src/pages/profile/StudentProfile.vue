<script setup>
import { computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useProfileStore } from '../../store/profile/useProfileStore';
import { useAuthStore } from '../../store/auth/useAuthStore';
import MyProfileDetails from '../../components/profile/MyProfileDetails.vue';
import PasswordChange from './PasswordChange.vue';
import MyPageContainer from '../../components/layout/MyPageContainer.vue';
import MyButton from '../../components/button/MyButton.vue';
import { ACADEMIC_STATUS_LABEL, ACADEMIC_STATUS_VARIANT } from '../../util/academic/enumLabels';

const profileStore = useProfileStore();
const authStore = useAuthStore();
const router = useRouter();

onMounted(async () => {
  await profileStore.fetchStudentProfile();
});

const user = computed(() => profileStore.profile || {});

const student = computed(() => ({
  name: user.value.name || '-',
  status: ACADEMIC_STATUS_LABEL[user.value.academicStatus] || user.value.academicStatus || '-',
  college: user.value.collegeName || '-',
  department: user.value.departmentName || '-',
  grade: user.value.gradeLevel ? `${user.value.gradeLevel}학년` : '-',
  studentNo: authStore.userInfo?.loginId || '-',
  email: user.value.email || '-',
  phone: user.value.phoneNumber || '-',
  address: user.value.address || '-',
  advisor: user.value.advisorName || '-',
  entranceYear: user.value.admissionYear || '-',
  totalCredits: user.value.totalCredits ?? 0,
}));

const statusVariant = computed(() => ACADEMIC_STATUS_VARIANT[user.value.academicStatus] || 'processing');

const basicRows = computed(() => [
  { label: '이름', value: student.value.name },
  { label: '학번', value: student.value.studentNo },
  { label: '소속 단과대학', value: student.value.college },
  { label: '학과', value: student.value.department },
  { label: '학년', value: student.value.grade },
  { label: '이메일', value: student.value.email },
  { label: '연락처', value: student.value.phone },
  { label: '주소', value: student.value.address },
]);

const academicRows = computed(() => [
  { label: '학적 상태', value: student.value.status },
  { label: '입학년도', value: student.value.entranceYear },
  { label: '지도교수', value: student.value.advisor },
  { label: '총 취득 학점', value: `${student.value.totalCredits}학점` },
]);
</script>

<template>
  <MyPageContainer title="내 정보">
    <MyProfileDetails
      :profile="student"
      :status-variant="statusVariant"
      :summary="[student.department + ' ' + student.grade, '학번 ' + student.studentNo, student.email]"
      summary-label="학생 기본 요약"
      :sections="[{ title: '기본 정보', rows: basicRows }, { title: '학적 정보', rows: academicRows }]"
    >
      <template #actions>
        <PasswordChange />
        <MyButton
          btn-type="button"
          class="info-change-request-button"
          color="white"
          size="big"
          content="정보 변경 신청"
          @click="router.push('/profile/info-change')"
        />
      </template>
    </MyProfileDetails>
  </MyPageContainer>
</template>
