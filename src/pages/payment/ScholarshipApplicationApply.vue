<template>
  <MyPageContainer title="장학금 신청">
    <article class="scholarship-page">
      <div v-if="tuitionStore.isLoadingMyBills || appStore.isLoadingPeriod">
        <p class="notice">불러오는 중...</p>
      </div>
      <div v-else-if="!tuitionStore.myBills || tuitionStore.myBills.length === 0">
        <p class="notice">등록금 고지 내역이 없습니다.</p>
      </div>
      <div v-else>
        <section class="available-scholarships" aria-labelledby="available-scholarships-title">
          <p id="available-scholarships-title">신청 가능 장학금</p>
          <strong>성적우수 장학금 · 가계곤란장학금 · 기타 장학금</strong>
        </section>

        <div v-if="!appStore.applicationPeriod || !appStore.applicationPeriod.open">
          <p class="notice">
            현재 장학금 신청기간이 아닙니다.
            <span v-if="appStore.applicationPeriod">
              <br>
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
        <section v-else class="application-section" aria-labelledby="application-form-title">
          <h3 id="application-form-title">장학금 신청서</h3>
          <form class="application-form" @submit.prevent="onSubmit">
            <div class="form-row">
              <label class="form-group" for="scholarship-semester">
                <span>신청 학기 및 금액</span>
                <MySelect
                  id="scholarship-semester"
                  v-model="selectedBillId"
                  @change="onBillChange"
                >
                  <option
                    v-for="bill in tuitionStore.myBills"
                    :key="bill.id"
                    :value="bill.id"
                  >
                    {{ semesterStore.getSemesterLabel(bill.semesterId) }} | {{ formatCurrency(bill.billingAmount) }}
                  </option>
                </MySelect>
              </label>
              <label class="form-group" for="scholarship-type">
                <span>장학금 명칭</span>
                <MySelect id="scholarship-type" v-model="form.type">
                  <option value="MERIT">성적우수</option>
                  <option value="NEED_BASED">가계곤란</option>
                  <option value="OTHER">기타</option>
                </MySelect>
              </label>
            </div>

            <label class="form-group reason-group" for="scholarship-reason">
              <span>신청 사유</span>
              <textarea
                id="scholarship-reason"
                v-model="form.reason"
                maxlength="500"
                placeholder="장학금 신청 사유를 구체적으로 입력해 주세요."
              ></textarea>
            </label>

            <div class="form-group attachment-group">
              <span>증빙파일 (pdf 가능)</span>
              <div class="file-picker">
                <input
                  ref="fileInput"
                  class="visually-hidden"
                  type="file"
                  accept=".pdf"
                  multiple
                  @change="onFilesSelected"
                >
                <MyButton
                  btn-type="button"
                  class="file-select-action"
                  color="white"
                  size="middle"
                  content="파일 선택"
                  @click="openFilePicker"
                />
                <span
                  class="file-count"
                  :class="{ 'file-count--attached': form.files.length > 0 }"
                >
                  {{ form.files.length ? `${form.files.length}개 파일 첨부됨` : '선택된 파일 없음' }}
                </span>
                <div v-if="form.files.length" class="file-chips">
                  <span
                    v-for="(file, index) in form.files"
                    :key="`${file.name}-${file.size}-${file.lastModified}`"
                    class="file-chip"
                  >
                    <span class="file-icon" aria-hidden="true">▣</span>
                    <span class="file-name" :title="file.name">{{ file.name }}</span>
                    <MyButton
                      btn-type="button"
                      :content="'×'"
                      :aria-label="`${file.name} 삭제`"
                      @click="removeFile(index)"
                    />
                  </span>
                </div>
              </div>
            </div>

            <div class="action-area">
              <MyButton
                btn-type="button"
                class="cancel-button"
                color="white"
                content="취소"
                size="middle"
                @click="resetApplication"
              />
              <MyButton
                color="deep-blue"
                :content="appStore.isSubmittingApplication ? '제출 중...' : '신청서 제출'"
                size="big"
                type="submit"
                :disabled="appStore.isSubmittingApplication"
              />
            </div>
          </form>
        </section>
      </div>
    </article>
  </MyPageContainer>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { useTuitionStore } from '../../store/payment/useTuitionStore';
import { useScholarshipApplicationStore } from '../../store/payment/useScholarshipApplicationStore';
import { useSemesterStore } from '../../store/semester/useSemesterStore';
import MyPageContainer from '../../components/layout/MyPageContainer.vue';
import MyButton from '../../components/button/MyButton.vue';
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
  files: [],
});
const fileInput = ref(null);
const submitSuccess = ref(false);
const submitConflict = ref(false);

const selectedBill = computed(() =>
  tuitionStore.myBills.find((bill) => bill.id === selectedBillId.value),
);

onMounted(async () => {
  await Promise.all([tuitionStore.fetchMyBills(), semesterStore.fetchSemesters()]);
  if (tuitionStore.myBills?.length) {
    selectedBillId.value = tuitionStore.myBills[0].id;
    form.value.requestedAmount = String(tuitionStore.myBills[0].billingAmount);
    await fetchPeriod();
  }
});

const onBillChange = async () => {
  form.value.requestedAmount = selectedBill.value ? String(selectedBill.value.billingAmount) : '';
  submitSuccess.value = false;
  submitConflict.value = false;
  await fetchPeriod();
};

const fetchPeriod = async () => {
  if (selectedBill.value) {
    await appStore.fetchApplicationPeriod(selectedBill.value.semesterId);
  }
};

const openFilePicker = () => fileInput.value?.click();

const resetApplication = () => {
  form.value = {
    type: 'MERIT',
    requestedAmount: selectedBill.value ? String(selectedBill.value.billingAmount) : '',
    reason: '',
    files: [],
  };
  submitConflict.value = false;
  if (fileInput.value) fileInput.value.value = '';
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
      files: form.value.files,
    });
    submitSuccess.value = true;
  } catch (error) {
    if (error.response?.status === 409) {
      submitConflict.value = true;
    } else {
      await notify(error.response?.data?.message || '신청 중 오류가 발생했습니다.');
    }
  }
};
</script>

<style scoped>
.available-scholarships,
.application-form {
  border: 1px solid var(--personal-color-border-mist);
  border-radius: 6px;
  background: var(--personal-color-white);
}

.available-scholarships {
  margin-bottom: 40px;
  padding: 16px;
}

.available-scholarships p {
  margin: 0 0 9px;
  color: var(--personal-color-primary-navy);
  font-size: 0.75rem;
  font-weight: 600;
}

.available-scholarships strong {
  font-size: 0.95rem;
}

.application-section h3 {
  margin: 0 0 16px 2px;
  font-size: 1rem;
}

.application-form {
  display: flex;
  flex-direction: column;
  padding: 18px 14px;
}

.form-row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.form-group {
  display: block;
  margin: 0 0 16px;
}

.form-group > span {
  display: block;
  margin-bottom: 8px;
  color: var(--personal-color-primary-text-navy);
  font-size: 0.75rem;
  font-weight: 600;
}

select,
textarea {
  width: 100%;
  min-height: 31px;
  padding: 7px 9px;
  border: 1px solid var(--personal-color-border-mist);
  border-radius: 4px;
  background: var(--personal-color-white);
  color: var(--personal-color-primary-text-navy);
  font-size: 0.75rem;
}

textarea {
  height: 160px;
  resize: vertical;
}

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.file-picker {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  min-height: 31px;
  gap: 8px;
  padding: 2px 8px;
  border: 1px solid var(--personal-color-border-mist);
  border-radius: 4px;
  background: var(--personal-color-white);
}

.file-count {
  color: var(--personal-color-text-faint-fog);
  font-size: 0.75rem;
  font-weight: 400;
}

.file-count--attached {
  color: var(--personal-color-primary-navy);
  font-weight: 500;
}

.file-select-action {
  border: 1px solid var(--personal-color-border-mist);
}

.file-chips {
  display: flex;
  flex: 1 1 100%;
  flex-direction: column;
  min-width: 0;
  gap: 3px;
}

.file-chip {
  display: inline-flex;
  align-items: center;
  min-width: 0;
  min-height: 21px;
  max-width: 100%;
  gap: 6px;
  padding: 2px 7px;
  border: 1px solid var(--personal-color-border-mist);
  border-radius: 3px;
  background: var(--personal-color-bg-surface-frost);
  color: var(--personal-color-primary-navy);
  font-size: 0.72rem;
  font-weight: 500;
}

.file-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-chip :deep(button) {
  width: 18px;
  height: 18px;
  margin-left: auto;
  padding: 0;
  flex: none;
  color: var(--personal-color-danger-strong-crimson);
  font-size: 1rem;
  line-height: 1;
}

.notice,
.success-notice,
.error-notice {
  margin-bottom: 20px;
  padding: 20px;
  border-radius: 6px;
  font-weight: 500;
  text-align: center;
}

.notice {
  background-color: var(--personal-color-bg-subtle-snow);
  color: var(--personal-color-text-secondary-steel);
}

.success-notice {
  border: 1px solid var(--personal-color-success-text-forest);
  background-color: var(--personal-color-bg-success-soft-honeydew);
  color: var(--personal-color-success-text-forest);
}

.error-notice {
  border: 1px solid var(--personal-color-danger-strong-crimson);
  background-color: var(--personal-color-bg-danger-soft-rose);
  color: var(--personal-color-danger-strong-crimson);
}

.action-area {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: auto;
  padding-top: 18px;
}


@media (max-width: 640px) {
  .available-scholarships {
    margin-bottom: 28px;
  }

  .form-row {
    grid-template-columns: 1fr;
    gap: 0;
  }

  .file-picker {
    align-items: stretch;
    flex-direction: column;
  }
}
</style>
