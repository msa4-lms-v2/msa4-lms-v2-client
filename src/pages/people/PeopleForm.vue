<script setup>
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  cancelAdmissionProvisioning,
  createPerson,
  getAccount,
  getAdmissionAccount,
  getDepartments,
  getPerson,
  getProfessorsByDepartment,
  peopleStatuses,
  retryAdmissionProvisioning,
  updatePerson,
} from '../../api/peopleManagementApi';
import MyButton from '../../components/button/MyButton.vue';
import MyInput from '../../components/input/MyInput.vue';
import MySelect from '../../components/input/MySelect.vue';
import MyPageContainer from '../../components/layout/MyPageContainer.vue';
import { notify } from '../../composables/useDialog';
import './peopleManagement.css';

defineOptions({ name: 'PeopleForm' });

const props = defineProps({ kind: { type: String, required: true } });
const route = useRoute();
const router = useRouter();
const admission = computed(() => props.kind === 'admission');
const detail = computed(() => Boolean(route.params.id));
const base = computed(() => (admission.value ? '/admin/admissions' : '/admin/professors'));
const title = computed(() => (admission.value ? '입학 예정자' : '교수'));
const pageTitle = computed(() => {
  if (!detail.value) return `${title.value} 등록`;
  return admission.value ? '입학 예정자 상세 수정' : '교수 상세 수정';
});

const year = new Date().getFullYear();
const yesterday = new Date();
yesterday.setDate(yesterday.getDate() - 1);
const maxBirth = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;

const form = reactive({
  name: '',
  birthDate: '',
  email: '',
  phoneNumber: '',
  address: '',
  departmentId: '',
  advisorProfessorId: '',
  admissionYear: year,
  hireYear: year,
});
const changeReason = ref('');
const departments = ref([]);
const professors = ref([]);
const professorsLoading = ref(false);
const departmentQuery = ref('');
const departmentName = ref('');
const loading = ref(false);
const saving = ref(false);
const ready = ref(false);
const error = ref('');
const status = ref('');
const registration = ref(null);
const issuedNumber = ref('');
const checking = ref(false);
const needsReview = ref(false);
const provisioningAction = ref('');
const provisioningNotice = ref('');
const confirmCancellation = ref(false);

const fields = computed(() => [
  { key: 'name', label: '이름', type: 'text', max: 50, required: true },
  ...(admission.value ? [{ key: 'birthDate', label: '생년월일', type: 'date', required: true }] : []),
  { key: 'email', label: '이메일', type: 'email', max: 100, required: !detail.value },
  { key: 'phoneNumber', label: '연락처', type: 'tel', max: 20 },
  { key: 'address', label: '주소', type: 'text', max: 255 },
]);

const filteredDepartments = computed(() => departments.value.filter((department) => (
  department.name.includes(departmentQuery.value.trim()) || department.id === Number(form.departmentId)
)));

const canEditDetail = computed(() => (
  detail.value && (!admission.value || status.value === 'REGISTERED')
));
const canManageProvisioning = computed(() => (
  admission.value && detail.value && status.value === 'PROVISIONING'
));

const preview = computed(() => [
  ...(issuedNumber.value ? [{ label: admission.value ? '학번' : '교번', value: issuedNumber.value }] : []),
  ...fields.value.map((field) => ({ label: field.label, value: form[field.key] })),
  {
    label: '소속 학과',
    value: departments.value.find((department) => department.id === Number(form.departmentId))?.name || departmentName.value,
  },
  ...(!detail.value && admission.value
    ? [{ label: '지도교수', value: professors.value.find((professor) => professor.professorId === Number(form.advisorProfessorId))?.name }]
    : []),
  {
    label: admission.value ? '입학 연도' : '임용 연도',
    value: admission.value ? form.admissionYear : form.hireYear,
  },
  ...(detail.value
    ? [{ label: admission.value ? '등록 상태' : '계정 상태', value: peopleStatuses[props.kind][status.value] || status.value }]
    : []),
]);

let detailTimer;
let detailRefreshVersion = 0;
let disposed = false;
let checkTimer;

const applyDetailData = (data) => {
  Object.keys(form).forEach((key) => {
    if (data[key] !== undefined && data[key] !== null) form[key] = data[key];
    else if (['email', 'phoneNumber', 'address'].includes(key)) form[key] = '';
  });
  departmentName.value = data.departmentName || '';
  status.value = data.status || '';
  issuedNumber.value = data.studentNumber || data.professorNumber || '';
};

const scheduleDetailRefresh = () => {
  clearTimeout(detailTimer);
  if (!disposed && canManageProvisioning.value) detailTimer = setTimeout(refreshProvisioning, 5000);
};

async function refreshProvisioning() {
  if (disposed || provisioningAction.value || !canManageProvisioning.value) return;
  const refreshVersion = ++detailRefreshVersion;
  try {
    const response = await getPerson(props.kind, route.params.id);
    if (disposed || refreshVersion !== detailRefreshVersion) return;
    applyDetailData(response.data.data);
    if (!canManageProvisioning.value) {
      confirmCancellation.value = false;
      provisioningNotice.value = status.value === 'PROVISIONED' ? '학생 계정 생성이 완료되었습니다.' : '';
    }
  } catch {
    // 다음 자동 조회에서 다시 확인한다.
  } finally {
    scheduleDetailRefresh();
  }
}

const manageProvisioning = async (cancel) => {
  if (provisioningAction.value || !canManageProvisioning.value) return;
  provisioningAction.value = cancel ? 'cancel' : 'retry';
  detailRefreshVersion += 1;
  error.value = '';
  provisioningNotice.value = '';
  try {
    const response = await (cancel
      ? cancelAdmissionProvisioning(route.params.id)
      : retryAdmissionProvisioning(route.params.id));
    applyDetailData(response.data.data);
    confirmCancellation.value = false;
    provisioningNotice.value = cancel
      ? '등록을 취소했습니다.'
      : '계정 생성을 다시 요청했습니다. 처리 결과를 확인하고 있습니다.';
  } catch (requestError) {
    error.value = requestError.response?.data?.message || '요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.';
    provisioningAction.value = '';
    await refreshProvisioning();
  } finally {
    provisioningAction.value = '';
    scheduleDetailRefresh();
  }
};

const checkRegistration = async (attempt = 0) => {
  if (disposed || !registration.value) return;
  checking.value = true;
  error.value = '';
  try {
    const response = await (admission.value
      ? getAdmissionAccount(registration.value.id)
      : getAccount(registration.value.id));
    const account = response.data.data;
    if (account?.provisioningStatus === 'MANUAL_REVIEW_REQUIRED') {
      needsReview.value = true;
      error.value = '계정 생성에 실패하여 서버 확인이 필요합니다. 중복 등록하지 말고 관리자에게 문의해 주세요.';
      checking.value = false;
      return;
    }
    if (account?.status === 'ACTIVE' && account.loginId) {
      issuedNumber.value = account.loginId;
      checking.value = false;
      return;
    }
    if (attempt < 10 && !disposed) {
      checkTimer = setTimeout(() => checkRegistration(attempt + 1), 2000);
      return;
    }
  } catch {
    error.value = '등록 요청은 저장되었습니다. 계정 생성 상태를 다시 확인해 주세요.';
  }
  checking.value = false;
};

const initialize = async () => {
  loading.value = true;
  error.value = '';
  try {
    departments.value = await getDepartments();
    if (detail.value) {
      const response = await getPerson(props.kind, route.params.id);
      applyDetailData(response.data.data);
    }
    ready.value = true;
    scheduleDetailRefresh();
  } catch (requestError) {
    error.value = requestError.response?.data?.message || '정보를 불러오지 못했습니다. 다시 시도해 주세요.';
  } finally {
    loading.value = false;
  }
};

const create = async () => {
  const payload = Object.fromEntries(fields.value.map((field) => [
    field.key,
    typeof form[field.key] === 'string' ? form[field.key].trim() : form[field.key],
  ]));
  if (fields.value.some((field) => field.required && !payload[field.key])) {
    error.value = '필수 항목을 입력해 주세요.';
    return;
  }
  if (!form.departmentId || (admission.value && !form.advisorProfessorId)) {
    error.value = '소속 학과와 지도교수를 확인해 주세요.';
    return;
  }
  payload.departmentId = Number(form.departmentId);
  if (admission.value) payload.advisorProfessorId = Number(form.advisorProfessorId);
  payload[admission.value ? 'admissionYear' : 'hireYear'] = Number(
    admission.value ? form.admissionYear : form.hireYear,
  );

  const response = await createPerson(props.kind, payload);
  registration.value = response.data.data;
  checkRegistration();
};

const update = async () => {
  if (!canEditDetail.value) return;

  let payload;
  if (admission.value) {
    payload = {
      name: form.name.trim(),
      birthDate: form.birthDate,
      email: form.email.trim(),
      phoneNumber: form.phoneNumber.trim(),
      address: form.address.trim(),
      departmentId: Number(form.departmentId),
      admissionYear: Number(form.admissionYear),
    };
  } else {
    if (!changeReason.value.trim()) {
      error.value = '교수 정보 변경 사유를 입력해 주세요.';
      return;
    }
    payload = {
      departmentId: Number(form.departmentId),
      hireYear: Number(form.hireYear),
      reason: changeReason.value.trim(),
    };
  }

  const response = await updatePerson(props.kind, route.params.id, payload);
  applyDetailData(response.data.data);
  changeReason.value = '';
  await notify(`${title.value} 정보가 수정되었습니다.`);
};

const submit = async () => {
  if (saving.value || registration.value || !ready.value) return;
  saving.value = true;
  error.value = '';
  try {
    if (detail.value) await update();
    else await create();
  } catch (requestError) {
    error.value = requestError.response?.data?.message
      || `${title.value} 정보 ${detail.value ? '수정' : '등록'}에 실패했습니다. 입력 내용을 확인해 주세요.`;
  } finally {
    saving.value = false;
  }
};

watch(() => form.departmentId, async (departmentId) => {
  if (!admission.value || detail.value) return;
  form.advisorProfessorId = '';
  professors.value = [];
  if (!departmentId) return;
  professorsLoading.value = true;
  try {
    professors.value = await getProfessorsByDepartment(Number(departmentId));
  } catch {
    error.value = '해당 학과의 교수 목록을 불러오지 못했습니다.';
  } finally {
    professorsLoading.value = false;
  }
});

onMounted(initialize);
onUnmounted(() => {
  disposed = true;
  clearTimeout(checkTimer);
  clearTimeout(detailTimer);
});
</script>

<template>
  <MyPageContainer :title="pageTitle">
    <p v-if="loading" role="status">정보를 불러오는 중입니다.</p>

    <div v-if="error" class="people-error" role="alert">
      {{ error }}
      <MyButton
        v-if="!ready"
        color="admin-indigo"
        size="middle"
        content="다시 시도"
        :disabled="loading"
        @click="initialize"
      />
    </div>

    <section v-if="registration" class="people-card registration-result" role="status">
      <h3>{{ issuedNumber ? '계정 생성 완료' : needsReview ? '계정 생성 확인 필요' : '등록 완료 · 계정 생성 중' }}</h3>
      <p v-if="issuedNumber">
        {{ admission ? '학번' : '교번' }}: <strong>{{ issuedNumber }}</strong> (로그인 ID)
      </p>
      <p v-else-if="!needsReview">등록 요청이 저장되었습니다. 번호 발급과 계정 활성화가 자동으로 진행됩니다.</p>
      <div class="people-actions">
        <MyButton
          v-if="!issuedNumber"
          class="secondary-button"
          color="white"
          size="big"
          :content="checking ? '확인 중...' : '발급 상태 확인'"
          :disabled="checking"
          @click="checkRegistration()"
        />
        <MyButton color="admin-indigo" size="middle" content="목록" @click="router.push(base)" />
      </div>
    </section>

    <form v-if="ready && !registration" class="people-registration" @submit.prevent="submit">
      <section class="people-card people-basic">
        <div class="people-section-heading">
          <h3>{{ title }} 기본 정보</h3>
          <span v-if="detail" class="status-text" :class="status.toLowerCase()">
            {{ peopleStatuses[kind][status] || status }}
          </span>
        </div>

        <p v-if="detail && admission && !canEditDetail" class="people-help">
          입학 예정자 정보는 등록 완료 상태에서만 수정할 수 있습니다.
        </p>

        <fieldset :disabled="saving">
          <label v-for="field in fields" :key="field.key">
            {{ field.label }} <em v-if="field.required && !detail">*</em>
            <MyInput
              v-model="form[field.key]"
              :type="field.type"
              :maxlength="field.max"
              :required="field.required"
              :max="field.type === 'date' ? maxBirth : undefined"
              :disabled="detail && (!admission || !canEditDetail)"
              :placeholder="`${field.label}을 입력해 주세요.`"
            />
          </label>

          <div v-if="!detail" class="people-two-fields">
            <label>
              학과 검색
              <MyInput v-model="departmentQuery" placeholder="학과를 검색해 주세요." />
            </label>
            <label>
              학과 선택 <em>*</em>
              <MySelect v-model="form.departmentId" required>
                <option value="" disabled>학과를 선택해 주세요.</option>
                <option v-for="department in filteredDepartments" :key="department.id" :value="department.id">
                  {{ department.name }}
                </option>
              </MySelect>
            </label>
          </div>

          <label v-else>
            소속 학과
            <MySelect v-model="form.departmentId" :disabled="!canEditDetail">
              <option v-for="department in departments" :key="department.id" :value="department.id">
                {{ department.name }}
              </option>
            </MySelect>
          </label>

          <label v-if="admission && !detail">
            지도교수 <em>*</em>
            <MySelect v-model="form.advisorProfessorId" :disabled="!form.departmentId || professorsLoading" required>
              <option value="" disabled>
                {{ professorsLoading ? '교수 목록을 불러오는 중...' : professors.length ? '지도교수를 선택해 주세요.' : '해당 학과에 활성 교수가 없습니다.' }}
              </option>
              <option v-for="professor in professors" :key="professor.professorId" :value="professor.professorId">
                {{ professor.name }}{{ professor.professorNumber ? ` (${professor.professorNumber})` : '' }}
              </option>
            </MySelect>
          </label>

          <label v-if="admission">
            입학 연도 <em v-if="!detail">*</em>
            <MySelect v-if="!detail" v-model="form.admissionYear" required>
              <option :value="year">{{ year }}</option>
              <option :value="year + 1">{{ year + 1 }}</option>
            </MySelect>
            <MyInput
              v-else
              v-model="form.admissionYear"
              numeric-only
              :disabled="!canEditDetail"
              placeholder="입학 연도를 입력해 주세요."
            />
          </label>

          <label v-else>
            임용 연도 <em v-if="!detail">*</em>
            <MyInput
              v-model="form.hireYear"
              numeric-only
              :max-number="year"
              :disabled="detail && !canEditDetail"
              required
              placeholder="임용 연도를 입력해 주세요."
            />
          </label>

          <label v-if="detail && !admission" class="reason-field">
            변경 사유 <em>*</em>
            <textarea
              v-model="changeReason"
              rows="3"
              maxlength="255"
              placeholder="변경 사유를 입력해 주세요."
            ></textarea>
          </label>
        </fieldset>
      </section>

      <div class="people-aside">
        <section v-if="canManageProvisioning || provisioningNotice" class="people-card" aria-label="계정 생성 관리">
          <h3>계정 생성 상태</h3>
          <p v-if="provisioningNotice" class="success-text" role="status">{{ provisioningNotice }}</p>
          <template v-if="canManageProvisioning">
            <p class="people-help">처리가 중단되었다면 계정 생성을 재시도하거나 등록을 취소할 수 있습니다.</p>
            <div class="people-actions">
              <MyButton
                color="red"
                size="big"
                content="등록 취소"
                :disabled="Boolean(provisioningAction)"
                @click="confirmCancellation = true"
              />
              <MyButton
                color="admin-indigo"
                size="big"
                :content="provisioningAction === 'retry' ? '요청 중...' : '계정 생성 재시도'"
                :disabled="Boolean(provisioningAction)"
                @click="manageProvisioning(false)"
              />
            </div>
            <div v-if="confirmCancellation" class="cancel-confirmation" role="group" aria-label="등록 취소 확인">
              <p>입학 예정자 등록을 취소하고 계정 생성을 중단할까요?</p>
              <div class="people-actions">
                <MyButton
                  class="secondary-button"
                  color="white"
                  size="middle"
                  content="돌아가기"
                  :disabled="Boolean(provisioningAction)"
                  @click="confirmCancellation = false"
                />
                <MyButton
                  color="red"
                  size="big"
                  :content="provisioningAction === 'cancel' ? '취소 중...' : '등록 취소 확인'"
                  :disabled="Boolean(provisioningAction)"
                  @click="manageProvisioning(true)"
                />
              </div>
            </div>
          </template>
        </section>

        <section class="people-card">
          <h3>등록 정보 확인</h3>
          <dl>
            <div v-for="item in preview" :key="item.label">
              <dt>{{ item.label }}</dt>
              <dd>{{ item.value || '-' }}</dd>
            </div>
          </dl>
        </section>

        <section v-if="!detail" class="people-card people-guide">
          <h3>등록 안내</h3>
          <p>입력한 정보는 {{ admission ? '입학 전형 및 학사' : '교수' }} 관리에 활용됩니다.</p>
          <p>저장 전 필수 항목과 소속 정보를 확인해 주세요.</p>
          <p>등록하면 {{ admission ? '학생 계정과 학번' : '교수 계정과 교번' }}이 자동으로 생성됩니다.</p>
        </section>

        <div class="people-actions page-actions">
          <MyButton
            class="secondary-button"
            color="white"
            size="middle"
            :content="detail ? '목록' : '취소'"
            :disabled="saving"
            @click="router.push(base)"
          />
          <MyButton
            v-if="!detail || canEditDetail"
            btn-type="submit"
            color="admin-indigo"
            size="big"
            :content="saving ? (detail ? '수정 중...' : '등록 중...') : (detail ? '수정 저장' : '등록')"
            :disabled="saving || !form.departmentId || (!detail && admission && !form.advisorProfessorId)"
          />
        </div>
      </div>
    </form>
  </MyPageContainer>
</template>
