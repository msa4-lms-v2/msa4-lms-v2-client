<script setup>
import { computed, onMounted, ref } from 'vue';
import { getCreditRequirementDiagnoses } from '../../api/gradeApi';
import MyPageContainer from '../../components/layout/MyPageContainer.vue';
import MyTable from '../../components/table/MyTable.vue';
import MyStatusBadge from '../../components/common/MyStatusBadge.vue';
import SummaryStatCard from '../../components/payment/SummaryStatCard.vue';
import { notify } from '../../composables/useDialog';
import { ACADEMIC_STATUS_LABEL, ACADEMIC_STATUS_VARIANT } from '../../util/academic/enumLabels';

defineOptions({ name: 'StudentGraduationDiagnosis' });

const columns = [
  { key: 'category', label: '구분' },
  { key: 'required', label: '요구 학점' },
  { key: 'earned', label: '취득 학점' },
  { key: 'shortage', label: '부족 학점' },
];

const statusLabels = {
  SATISFIED: '충족',
  NOT_SATISFIED: '미충족',
  REQUIREMENT_NOT_CONFIGURED: '요건 미설정',
};

const diagnosis = ref(null);
const isLoading = ref(false);

const statusVariant = computed(() => {
  if (diagnosis.value?.diagnosisStatus === 'SATISFIED') return 'success';
  if (diagnosis.value?.diagnosisStatus === 'REQUIREMENT_NOT_CONFIGURED') return 'warning';
  return 'fail';
});

const rows = computed(() => {
  const item = diagnosis.value;
  if (!item) return [];
  return [
    { label: '전공', required: item.requiredMajorCredits, earned: item.earnedMajorCredits, shortage: item.shortageMajorCredits },
    { label: '교양', required: item.requiredGeneralCredits, earned: item.earnedGeneralCredits, shortage: item.shortageGeneralCredits },
    { label: '필수', required: null, earned: item.earnedRequiredCredits, shortage: null },
    { label: '선택', required: null, earned: item.earnedElectiveCredits, shortage: null },
    { label: '총 학점', required: item.requiredTotalCredits, earned: item.earnedTotalCredits, shortage: item.shortageTotalCredits },
  ];
});

const creditText = (value) => (value === null || value === undefined ? '-' : `${value}학점`);

const load = async () => {
  isLoading.value = true;
  try {
    const response = await getCreditRequirementDiagnoses({ page: 1, size: 1 });
    diagnosis.value = response.data.data.items?.[0] || null;
  } catch (error) {
    diagnosis.value = null;
    await notify(error.response?.data?.message || '졸업 학점 진단을 불러오지 못했습니다.');
  } finally {
    isLoading.value = false;
  }
};

onMounted(load);
</script>

<template>
  <MyPageContainer title="졸업 학점 진단" subtitle="공개 성적 기준으로 졸업요건 충족 여부와 부족 학점을 확인합니다.">
    <section v-if="diagnosis" class="summary-card">
      <div class="student-info">
        <span>{{ diagnosis.studentName }}</span>
        <strong>{{ diagnosis.departmentName }} · {{ diagnosis.admissionYear }}학번</strong>
        <MyStatusBadge
          :label="ACADEMIC_STATUS_LABEL[diagnosis.academicStatus] || diagnosis.academicStatus"
          :variant="ACADEMIC_STATUS_VARIANT[diagnosis.academicStatus] || 'processing'"
        />
      </div>
      <MyStatusBadge :label="statusLabels[diagnosis.diagnosisStatus] || diagnosis.diagnosisStatus" :variant="statusVariant" />
    </section>

    <section v-if="diagnosis" class="summary-bar">
      <SummaryStatCard label="취득 총 학점" :value="creditText(diagnosis.earnedTotalCredits)" highlight />
      <SummaryStatCard label="요구 총 학점" :value="creditText(diagnosis.requiredTotalCredits)" />
      <SummaryStatCard label="부족 총 학점" :value="creditText(diagnosis.shortageTotalCredits)" />
      <SummaryStatCard label="진단 상태" :value="statusLabels[diagnosis.diagnosisStatus] || diagnosis.diagnosisStatus" />
    </section>

    <section v-if="diagnosis?.reason" class="reason-card">
      {{ diagnosis.reason }}
    </section>

    <MyTable
      :columns="columns"
      :loading="isLoading"
      :empty="!isLoading && !diagnosis"
      empty-message="졸업 학점 진단 결과가 없습니다."
    >
      <tr v-for="row in rows" :key="row.label">
        <td>{{ row.label }}</td>
        <td>{{ creditText(row.required) }}</td>
        <td>{{ creditText(row.earned) }}</td>
        <td>{{ creditText(row.shortage) }}</td>
      </tr>
    </MyTable>
  </MyPageContainer>
</template>

<style scoped>
.summary-card,
.reason-card {
  margin-bottom: 16px;
  padding: 18px;
  border: 1px solid var(--personal-color-border-mist);
  border-radius: 8px;
  background: var(--personal-color-white);
}

.summary-card {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: center;
}

.student-info {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.student-info span {
  color: var(--personal-color-primary-text-navy);
  font-size: 1.1rem;
  font-weight: 800;
}

.student-info strong {
  color: var(--personal-color-text-muted-slate);
}

.summary-bar {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 20px;
}

.reason-card {
  color: var(--personal-color-primary-text-navy);
  font-weight: 700;
}

@media (max-width: 900px) {
  .summary-card {
    align-items: flex-start;
    flex-direction: column;
  }

  .summary-bar {
    grid-template-columns: 1fr;
  }
}
</style>
