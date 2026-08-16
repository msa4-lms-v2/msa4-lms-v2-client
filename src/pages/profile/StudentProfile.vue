<script setup>
import { computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useProfileStore } from '../../store/profile/useProfileStore';
import { useAuthStore } from '../../store/auth/useAuthStore';
import PasswordChange from './PasswordChange.vue';
import MyPageContainer from '../../components/layout/MyPageContainer.vue';
import MyButton from '../../components/button/MyButton.vue';

const profileStore = useProfileStore();
const authStore = useAuthStore();
const router = useRouter();

onMounted(async () => {
  await profileStore.fetchStudentProfile();
});

const user = computed(() => profileStore.profile || {});

const formatStatus = (status) => {
  if (status === 'ENROLLED') return '재학';
  if (status === 'GRADUATED') return '졸업';
  if (status === 'ON_LEAVE') return '휴학';
  if (status === 'WITHDRAWN') return '자퇴';
  if (status === 'DISMISSED') return '제적';
  return status || '-';
};

const student = computed(() => ({
  name: user.value.name || '-',
  status: formatStatus(user.value.academicStatus),
  college: user.value.collegeName || '-',
  department: user.value.departmentName || '-',
  major: user.value.majorName || '-',
  grade: user.value.gradeLevel ? `${user.value.gradeLevel}학년` : '-',
  studentNo: authStore.userInfo?.loginId || '-',
  email: user.value.email || '-',
  phone: user.value.phoneNumber || '-',
  address: user.value.address || '-',
  advisor: user.value.advisorName || '-',
  entranceYear: user.value.admissionYear || '-',
  totalCredits: user.value.totalCredits ?? 0,
}));

const basicRows = computed(() => [
  { label: '이름', value: student.value.name },
  { label: '학번', value: student.value.studentNo },
  { label: '소속 단과대학', value: student.value.college },
  { label: '학과', value: student.value.department },
  { label: '전공', value: student.value.major },
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
    <article class="profile-hero">
      <div class="student-intro">
        <div class="profile-image" aria-hidden="true"></div>

        <div class="student-main">
          <div class="name-row">
            <h2>{{ student.name }}</h2>
            <span class="status-badge">{{ student.status }}</span>
          </div>

          <ul class="quick-list" aria-label="학생 기본 요약">
            <li>
              <span>{{ student.department }} {{ student.grade }}</span>
            </li>
            <li>
              <span>학번 {{ student.studentNo }}</span>
            </li>
            <li>
              <span>{{ student.email }}</span>
            </li>
          </ul>
        </div>
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
          <h3>학적 정보</h3>
        </div>

        <dl class="info-list">
          <div v-for="row in academicRows" :key="row.label" class="info-row">
            <dt>{{ row.label }}</dt>
            <dd>{{ row.value }}</dd>
          </div>
        </dl>
      </article>
    </div>

    <article class="security-card">
      <div class="security-copy">
        <div>
          <h3>계정 보안</h3>
          <p>비밀번호를 변경하여 계정을 안전하게 관리하세요.</p>
        </div>
      </div>

      <PasswordChange />
    </article>

    <article class="security-card">
      <div class="security-copy">
        <div>
          <h3>학적 정보 변경</h3>
          <p>이름, 연락처, 이메일, 주소, 프로필 사진 변경을 신청할 수 있습니다.</p>
        </div>
      </div>

      <MyButton
        color="deep-blue"
        size="middle"
        content="정보 변경 신청"
        @click="router.push('/profile/info-change')"
      />
    </article>
  </MyPageContainer>
</template>

<style scoped>
.profile-hero,
.info-card,
.security-card {
  background: var(--personal-color-white);
  border: 1px solid #e5eaf2;
  border-radius: 8px;
}

.profile-hero {
  display: flex;
  align-items: center;
  margin-bottom: 28px;
  padding: 28px 50px;
}

.student-intro {
  display: flex;
  align-items: center;
  gap: 32px;
  min-width: 0;
}

.profile-image {
  width: 96px;
  height: 96px;
  border-radius: 50%;
  background: var(--personal-color-bg-surface);
  flex: 0 0 96px;
}

.student-main {
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
  color: var(--primary-text-color);
  font-size: 1.5rem;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  padding: 4px 12px;
  border-radius: 999px;
  background: #dbeafe;
  color: #1756b8;
  font-size: 0.88rem;
  font-weight: 500;
}

.quick-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  list-style: none;
  padding: 0;
}

.quick-list li {
  color: var(--primary-text-color);
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
  color: var(--primary-text-color);
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
  border-bottom: 1px solid #e5eaf2;
}

.info-row:last-child {
  border-bottom: 0;
}

.info-row dt {
  color: #64748b;
}

.info-row dd {
  min-width: 0;
  margin: 0;
  color: var(--primary-text-color);
  overflow-wrap: anywhere;
}

.security-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding: 26px 36px;
  border-left: 4px solid var(--personal-color-student-primary);
}

.security-copy h3 {
  color: var(--primary-text-color);
  font-size: 1.1rem;
  margin: 0 0 6px;
}

.security-copy p {
  margin: 0;
  color: #475569;
  font-size: 0.9rem;
}

@media (max-width: 720px) {
  .info-grid {
    grid-template-columns: 1fr;
  }

  .profile-hero,
  .security-card {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }
}
</style>
