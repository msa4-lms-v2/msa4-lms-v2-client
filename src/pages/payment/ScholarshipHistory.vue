<template>
  <div class="scholarship-history-page">
    <h2>장학금 수혜 내역</h2>
    
    <div v-if="appStore.isLoadingMyScholarships">
      <p class="notice">불러오는 중...</p>
    </div>
    <div v-else>
      <div class="form-group" v-if="availableSemesters.length > 0">
        <label>학기 선택</label>
        <select v-model="selectedSemester">
          <option v-for="semesterId in availableSemesters" :key="semesterId" :value="semesterId">
            {{ semesterStore.getSemesterLabel(semesterId) }}
          </option>
        </select>
      </div>

      <div v-if="availableSemesters.length === 0 || filteredScholarships.length === 0">
        <p class="notice">장학금 수혜 내역이 없습니다.</p>
      </div>
      <div v-else>
        <MyTable
          :columns="[
            { key: 'type', label: '유형' },
            { key: 'amount', label: '금액' },
            { key: 'reason', label: '사유' },
            { key: 'date', label: '지급일' }
          ]"
        >
          <tr v-for="item in filteredScholarships" :key="item.id">
            <td>{{ SCHOLARSHIP_TYPE_LABEL[item.type] || item.type }}</td>
            <td>{{ formatCurrency(item.amount) }}</td>
            <td>{{ item.reason || '-' }}</td>
            <td>{{ formatDate(item.createdAt) }}</td>
          </tr>
        </MyTable>

        <div class="action-area" v-if="selectedTuitionBillId">
          <MyButton 
            color="black" 
            content="분할납부 신청" 
            size="middle"
            @click="goToInstallment" 
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useScholarshipApplicationStore } from '../../store/payment/useScholarshipApplicationStore';
import { useSemesterStore } from '../../store/semester/useSemesterStore';
import { SCHOLARSHIP_TYPE_LABEL } from '../../util/payment/enumLabels';
import { formatCurrency, formatDate } from '../../util/format';
import MyTable from '../../components/table/MyTable.vue';
import MyButton from '../../components/button/MyButton.vue';

const router = useRouter();
const appStore = useScholarshipApplicationStore();
const semesterStore = useSemesterStore();
const selectedSemester = ref(null);

onMounted(async () => {
  await Promise.all([appStore.fetchMyScholarships(), semesterStore.fetchSemesters()]);
  if (availableSemesters.value.length > 0) {
    selectedSemester.value = availableSemesters.value[0];
  }
});

const availableSemesters = computed(() => {
  const semesters = new Set(appStore.myScholarships.map(s => s.semesterId));
  return Array.from(semesters).sort((a, b) => b - a);
});

const filteredScholarships = computed(() => {
  if (!selectedSemester.value) return [];
  return appStore.myScholarships.filter(s => s.semesterId === selectedSemester.value);
});

const selectedTuitionBillId = computed(() => {
  if (filteredScholarships.value.length > 0) {
    return filteredScholarships.value[0].tuitionBillId;
  }
  return null;
});

const goToInstallment = () => {
  if (selectedTuitionBillId.value) {
    router.push(`/tuition/${selectedTuitionBillId.value}/installment`);
  }
};
</script>

<style scoped>
.scholarship-history-page {
  max-width: 960px;
  margin: 0 auto;
  padding: 32px;
}
h2 {
  margin: 0 0 20px;
  color: var(--primary-text-color);
}
.form-group {
  margin-bottom: 20px;
  padding: 16px 20px;
  background: var(--personal-color-white);
  border-radius: var(--personal-radius);
  border: 1px solid #e2e8f0;
  display: inline-flex;
  flex-direction: column;
  gap: 6px;
}
label {
  font-weight: 600;
  font-size: 0.85rem;
  color: #64748b;
}
select {
  padding: 8px 12px;
  min-width: 200px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background-color: var(--personal-color-white);
  font-size: 0.9rem;
}
.notice {
  padding: 40px;
  background-color: var(--personal-color-bg-surface);
  color: #4f566b;
  text-align: center;
  border-radius: var(--personal-radius-card);
  font-weight: 500;
}
.action-area {
  margin-top: 24px;
  display: flex;
  justify-content: flex-end;
}
@media (max-width: 640px) {
  .scholarship-history-page {
    padding: 20px;
  }
}
</style>
