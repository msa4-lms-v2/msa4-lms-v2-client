<template>
  <MyPageContainer title="장학금 신청">
    <article class="form-card">
      <div v-if="tuitionStore.isLoadingMyBills || appStore.isLoadingPeriod">
        <p class="notice">불러오는 중...</p>
      </div>
      <div v-else-if="!tuitionStore.myBills || tuitionStore.myBills.length === 0">
        <p class="notice">등록금 고지 내역이 없습니다.</p>
      </div>
      <div v-else>
        <div class="form-group">
          <label>신청 대상 고지 선택</label>
          <select v-model="selectedBillId" @change="onBillChange">
            <option v-for="bill in tuitionStore.myBills" :key="bill.id" :value="bill.id">
              {{ bill.semesterId }} 학기 | 고지 금액: {{ Number(bill.billingAmount || 0).toLocaleString() }}원
            </option>
          </select>
        </div>

        <div v-if="!appStore.applicationPeriod || !appStore.applicationPeriod.open">
          <p class="notice">
            현재 장학금 신청기간이 아닙니다.
            <span v-if="appStore.applicationPeriod">
              <br />
              (신청기간: {{ appStore.applicationPeriod.startDate }} ~ {{ appStore.applicationPeriod.endDate }})
            </span>
          </p>
        </div>
        <div v-else-if="submitSuccess">
          <p class="success-notice">신청 완료, 관리자 심사를 기다려주세요.</p>
        </div>
        <div v-else-if="submitConflict">
          <p class="error-notice">이미 심사 중인 신청이 있습니다.</p>
        </div>
        <div v-else class="apply-form">
          <div class="form-group">
            <label>장학금 유형</label>
            <select v-model="form.type">
              <option value="MERIT">성적우수</option>
              <option value="NEED_BASED">가계곤란</option>
              <option value="OTHER">기타</option>
            </select>
          </div>
          <div class="form-group">
            <label>신청 금액</label>
            <MyInput v-model="form.requestedAmount" numericOnly placeholder="금액을 입력하세요" />
          </div>
          <div class="form-group">
            <label>신청 사유</label>
            <textarea v-model="form.reason" maxlength="500" placeholder="500자 이내로 입력하세요"></textarea>
          </div>
          <div class="action-area">
            <MyButton
              color="deep-blue"
              content="신청하기"
              size="middle"
              @click="onSubmit"
              :disabled="appStore.isSubmittingApplication"
            />
          </div>
        </div>
      </div>
    </article>
  </MyPageContainer>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useTuitionStore } from '../../store/payment/useTuitionStore';
import { useScholarshipApplicationStore } from '../../store/payment/useScholarshipApplicationStore';
import MyPageContainer from '../../components/layout/MyPageContainer.vue';
import MyButton from '../../components/button/MyButton.vue';
import MyInput from '../../components/input/MyInput.vue';

const tuitionStore = useTuitionStore();
const appStore = useScholarshipApplicationStore();

const selectedBillId = ref(null);
const form = ref({
  type: 'MERIT',
  requestedAmount: '',
  reason: ''
});
const submitSuccess = ref(false);
const submitConflict = ref(false);

const selectedBill = computed(() => {
  return tuitionStore.myBills.find(b => b.id === selectedBillId.value);
});

onMounted(async () => {
  await tuitionStore.fetchMyBills();
  if (tuitionStore.myBills && tuitionStore.myBills.length > 0) {
    selectedBillId.value = tuitionStore.myBills[0].id;
    await fetchPeriod();
  }
});

const onBillChange = async () => {
  submitSuccess.value = false;
  submitConflict.value = false;
  await fetchPeriod();
};

const fetchPeriod = async () => {
  if (selectedBill.value) {
    await appStore.fetchApplicationPeriod(selectedBill.value.semesterId);
  }
};

const onSubmit = async () => {
  submitConflict.value = false;
  if (!form.value.requestedAmount || !form.value.reason) {
    alert('모든 항목을 입력해주세요.');
    return;
  }
  try {
    await appStore.submitApplication({
      tuitionBillId: selectedBillId.value,
      type: form.value.type,
      requestedAmount: Number(form.value.requestedAmount),
      reason: form.value.reason
    });
    submitSuccess.value = true;
  } catch (err) {
    if (err.response && err.response.status === 409) {
      submitConflict.value = true;
    } else {
      alert('신청 중 오류가 발생했습니다.');
    }
  }
};
</script>

<style scoped>
.form-card {
  padding: 26px 30px;
  background-color: var(--personal-color-white);
  border: 1px solid #e5eaf2;
  border-radius: 8px;
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
select, textarea {
  width: 100%;
  padding: 10px;
  border: 1px solid var(--personal-color-gray);
  border-radius: 4px;
  font-size: 0.95rem;
}
textarea {
  height: 120px;
  resize: vertical;
}
.notice, .success-notice, .error-notice {
  padding: 20px;
  border-radius: 6px;
  margin-bottom: 20px;
  font-weight: 500;
  text-align: center;
}
.notice { background-color: #f8f9fa; color: #4f566b; }
.success-notice { background-color: #e6ffed; color: #1a7f37; border: 1px solid #1a7f37; }
.error-notice { background-color: #ffebe9; color: #cf222e; border: 1px solid #cf222e; }

.action-area {
  display: flex;
  justify-content: flex-end;
  margin-top: 20px;
}
</style>
