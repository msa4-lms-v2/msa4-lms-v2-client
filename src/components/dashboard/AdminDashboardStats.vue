<script setup>
import { onMounted, ref } from 'vue';
import { searchStudents } from '../../api/studentApi';
import { searchAcademicChangeRequests } from '../../api/academicChangeApi';
import myAxios from '../../api/myAxios';
import SummaryStatCard from '../payment/SummaryStatCard.vue';

const enrolledStudentCount = ref(null);
const pendingDepartmentTransferCount = ref(null);
const pendingDoubleMajorCount = ref(null);
const pendingInfoChangeCount = ref(null);
const isLoading = ref(true);

const fetchCount = async (request) => {
  try {
    const response = await request();
    return response.data.data.totalCount ?? 0;
  } catch {
    return null;
  }
};

onMounted(async () => {
  isLoading.value = true;
  [
    enrolledStudentCount.value,
    pendingDepartmentTransferCount.value,
    pendingDoubleMajorCount.value,
    pendingInfoChangeCount.value,
  ] = await Promise.all([
    fetchCount(() => searchStudents({ academicStatus: 'ENROLLED', page: 1, size: 1 })),
    fetchCount(() => searchAcademicChangeRequests('department-transfer', { status: 'PENDING', page: 1, size: 1 })),
    fetchCount(() => searchAcademicChangeRequests('double-major', { status: 'PENDING', page: 1, size: 1 })),
    fetchCount(() => myAxios.get('/api/academic/info-change-requests', { params: { status: 'REQUESTED', page: 1, size: 1 } })),
  ]);
  isLoading.value = false;
});

const formatCount = (value) => (value === null ? '-' : `${value}건`);
</script>

<template>
  <section class="admin-stats" aria-label="관리자 요약 통계">
    <SummaryStatCard label="재학생 수" :value="isLoading ? '...' : formatCount(enrolledStudentCount)" />
    <SummaryStatCard label="전과 신청 대기" :value="isLoading ? '...' : formatCount(pendingDepartmentTransferCount)" />
    <SummaryStatCard label="복수전공 신청 대기" :value="isLoading ? '...' : formatCount(pendingDoubleMajorCount)" />
    <SummaryStatCard label="정보변경 신청 대기" :value="isLoading ? '...' : formatCount(pendingInfoChangeCount)" />
  </section>
</template>

<style scoped>
.admin-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 20px;
}

@media (max-width: 760px) {
  .admin-stats {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
