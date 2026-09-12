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
          <MySelect v-model="selectedBillId" @change="onBillChange">
            <option v-for="bill in tuitionStore.myBills" :key="bill.id" :value="bill.id">
              {{ semesterStore.getSemesterLabel(bill.semesterId) }} | 고지 금액: {{ formatCurrency(bill.billingAmount) }}
            </option>
          </MySelect>
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
            <MySelect v-model="form.type">
              <option value="MERIT">성적우수</option>
              <option value="NEED_BASED">가계곤란</option>
              <option value="OTHER">기타</option>
            </MySelect>
          </div>
          <div class="form-group">
            <label>신청 금액</label>
            <MyInput v-model="form.requestedAmount" numericOnly placeholder="금액을 입력하세요" />
          </div>
          <div class="form-group">
            <label>신청 사유</label>
            <textarea v-model="form.reason" maxlength="500" placeholder="500자 이내로 입력하세요"></textarea>
          </div>
          <div class="form-group">
            <label>증빙자료(PDF, 최대 5개)</label>
            <input ref="fileInput" type="file" accept=".pdf" multiple @change="onFilesSelected" />
            <ul v-if="form.files.length" class="file-list">
              <li v-for="(file, index) in form.files" :key="`${file.name}-${file.lastModified}`">
                {{ file.name }} ({{ formatFileSize(file.size) }})
                <button type="button" aria-label="첨부파일 제거" @click="removeFile(index)">×</button>
              </li>
            </ul>
          </div>
          <div class="action-area">
            <MyButton
              color="deep-blue"
              content="신청하기"
              size="big"
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
import { useSemesterStore } from '../../store/semester/useSemesterStore';
import MyPageContainer from '../../components/layout/MyPageContainer.vue';
import MyButton from '../../components/button/MyButton.vue';
import MyInput from '../../components/input/MyInput.vue';
import MySelect from '../../components/input/MySelect.vue';
import { notify } from '../../composables/useDialog';
import { formatCurrency } from '../../util/format';

const tuitionStore = useTuitionStore();
const appStore = useScholarshipApplicationStore();
const semesterStore = useSemesterStore();

const FILE_MAX_COUNT = 5;
const FILE_MAX_SIZE = 10 * 1024 * 1024;
const FILE_TOTAL_MAX_SIZE = 20 * 1024 * 1024;

const selectedBillId = ref(null);
const form = ref({
  type: 'MERIT',
  requestedAmount: '',
  reason: '',
  files: []
});
const fileInput = ref(null);
const submitSuccess = ref(false);
const submitConflict = ref(false);

const formatFileSize = (size) => `${(size / 1024 / 1024).toFixed(size < 1024 * 1024 ? 1 : 0)}MB`;

const selectedBill = computed(() => {
  return tuitionStore.myBills.find(b => b.id === selectedBillId.value);
});

onMounted(async () => {
  await Promise.all([tuitionStore.fetchMyBills(), semesterStore.fetchSemesters()]);
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

const onFilesSelected = async (event) => {
  const selected = Array.from(event.target.files || []);
  event.target.value = '';
  const combined = [...form.value.files, ...selected].filter((file, index, all) => all.findIndex((item) => (
    item.name === file.name && item.size === file.size && item.lastModified === file.lastModified
  )) === index);
  if (combined.length > FILE_MAX_COUNT) {
    await notify(`증빙자료는 최대 ${FILE_MAX_COUNT}개까지 첨부할 수 있습니다.`);
    return;
  }
  if (combined.some((file) => file.size > FILE_MAX_SIZE)) {
    await notify('증빙자료는 파일당 10MB 이하만 첨부할 수 있습니다.');
    return;
  }
  if (combined.reduce((sum, file) => sum + file.size, 0) > FILE_TOTAL_MAX_SIZE) {
    await notify('증빙자료 전체 용량은 20MB를 넘을 수 없습니다.');
    return;
  }
  form.value.files = combined;
};

const removeFile = (index) => form.value.files.splice(index, 1);

const onSubmit = async () => {
  submitConflict.value = false;
  if (!form.value.requestedAmount || !form.value.reason) {
    await notify('모든 항목을 입력해주세요.');
    return;
  }
  try {
    await appStore.submitApplication({
      tuitionBillId: selectedBillId.value,
      type: form.value.type,
      requestedAmount: Number(form.value.requestedAmount),
      reason: form.value.reason,
      files: form.value.files
    });
    submitSuccess.value = true;
  } catch (err) {
    if (err.response && err.response.status === 409) {
      submitConflict.value = true;
    } else {
      await notify(err.response?.data?.message || '신청 중 오류가 발생했습니다.');
    }
  }
};
</script>

<style scoped>
.form-card {
  padding: 26px 30px;
  background-color: var(--personal-color-white);
  border: 1px solid var(--personal-color-border-mist);
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
  border: 1px solid var(--personal-color-border-mist);
  border-radius: 4px;
  font-size: 0.9rem;
}
textarea {
  height: 120px;
  resize: vertical;
}
.file-list {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  margin: 8px 0 0;
  padding: 0;
  list-style: none;
}
.file-list li {
  padding: 5px 8px;
  font-size: 0.8rem;
  background: var(--personal-color-bg-subtle-snow);
  border: 1px solid var(--personal-color-border-mist);
  border-radius: 4px;
}
.file-list button {
  color: var(--personal-color-danger-strong-crimson);
  font-size: 1rem;
  cursor: pointer;
  background: transparent;
  border: 0;
}
.notice, .success-notice, .error-notice {
  padding: 20px;
  border-radius: 6px;
  margin-bottom: 20px;
  font-weight: 500;
  text-align: center;
}
.notice { background-color: var(--personal-color-bg-subtle-snow); color: var(--personal-color-text-secondary-steel); }
.success-notice { background-color: var(--personal-color-bg-success-soft-honeydew); color: var(--personal-color-success-text-forest); border: 1px solid var(--personal-color-success-text-forest); }
.error-notice { background-color: var(--personal-color-bg-danger-soft-rose); color: var(--personal-color-danger-strong-crimson); border: 1px solid var(--personal-color-danger-strong-crimson); }

.action-area {
  display: flex;
  justify-content: flex-end;
  margin-top: 20px;
}
</style>
