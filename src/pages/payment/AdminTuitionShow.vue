<script setup>
import { onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useTuitionStore } from '../../store/payment/useTuitionStore';
import TuitionStatusPanel from '../../components/payment/TuitionStatusPanel.vue';
import ScholarshipAllocationPanel from '../../components/payment/ScholarshipAllocationPanel.vue';
import ScholarshipApplyForm from '../../components/payment/ScholarshipApplyForm.vue';
import MyPageContainer from '../../components/layout/MyPageContainer.vue';

const route = useRoute();
const tuitionBillId = Number(route.params.id);
const tuitionStore = useTuitionStore();

const handleApplyScholarship = (payload) => {
  tuitionStore.applyScholarship({ tuitionBillId, ...payload });
};

onMounted(() => {
  tuitionStore.fetchStatus(tuitionBillId);
  tuitionStore.fetchAllocation(tuitionBillId);
});
</script>

<template>
  <MyPageContainer :title="`등록금 고지 #${tuitionBillId}`">
    <div class="panels">
      <TuitionStatusPanel v-if="tuitionStore.currentStatus" :status="tuitionStore.currentStatus" />
      <p v-else-if="tuitionStore.isLoadingStatus">불러오는 중...</p>

      <ScholarshipAllocationPanel
        v-if="tuitionStore.currentAllocation"
        :allocation="tuitionStore.currentAllocation"
      />
      <p v-else-if="tuitionStore.isLoadingAllocation">불러오는 중...</p>

      <ScholarshipApplyForm
        :is-submitting="tuitionStore.isSubmittingScholarship"
        @submit="handleApplyScholarship"
      />
    </div>
  </MyPageContainer>
</template>

<style scoped>
.panels {
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-width: 640px;
}
</style>
