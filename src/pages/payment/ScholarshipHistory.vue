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
            {{ semesterId }} 학기
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
            <td>{{ Number(item.amount || 0).toLocaleString() }}원</td>
            <td>{{ item.reason || '-' }}</td>
            <td>{{ item.createdAt ? new Date(item.createdAt).toLocaleDateString() : '-' }}</td>
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
import { SCHOLARSHIP_TYPE_LABEL } from '../../util/payment/enumLabels';
import MyTable from '../../components/table/MyTable.vue';
import MyButton from '../../components/button/MyButton.vue';

const router = useRouter();
const appStore = useScholarshipApplicationStore();
const selectedSemester = ref(null);

onMounted(async () => {
  await appStore.fetchMyScholarships();
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
  padding: 20px;
  background-color: var(--personal-color-white);
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}
h2 {
  margin-bottom: 20px;
  color: var(--personal-color-black);
}
.form-group {
  margin-bottom: 20px;
}
label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: var(--personal-color-black);
}
select {
  padding: 10px;
  width: 250px;
  border: 1px solid var(--personal-color-gray);
  border-radius: 4px;
  font-size: 0.95rem;
}
.notice {
  padding: 40px;
  background-color: #f8f9fa;
  color: #4f566b;
  text-align: center;
  border-radius: 6px;
  font-weight: 500;
}
.action-area {
  margin-top: 30px;
  display: flex;
  justify-content: flex-end;
}
</style>
