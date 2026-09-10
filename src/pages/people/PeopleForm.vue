<script setup>
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import MyPageContainer from '../../components/layout/MyPageContainer.vue';
import { createPerson, getAdmissionAccount, getAccount, getPerson, getDepartments, getProfessorsByDepartment, peopleStatuses, retryAdmissionProvisioning, cancelAdmissionProvisioning } from '../../api/peopleManagementApi';
import './peopleManagement.css';

const props = defineProps({ kind: { type: String, required: true } });
const route = useRoute();
const router = useRouter();
const admission = computed(() => props.kind === 'admission');
const detail = Boolean(route.params.id);
const base = admission.value ? '/admin/admissions' : '/admin/professors';
const title = admission.value ? '입학 예정자' : '교수';
const year = new Date().getFullYear();
const yesterday = new Date();
yesterday.setDate(yesterday.getDate() - 1);
const maxBirth = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
const form = reactive({ name: '', birthDate: '', email: '', phoneNumber: '', address: '', departmentId: '', advisorProfessorId: '', admissionYear: year, hireYear: year });
const departments = ref([]);
const professors = ref([]);
const professorsLoading = ref(false);
const departmentQuery = ref('');
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
const canManageProvisioning = computed(() => admission.value && detail && status.value === 'PROVISIONING');
let detailTimer;
let detailRefreshVersion = 0;
let disposed = false;
let checkTimer;
onUnmounted(() => { disposed = true; clearTimeout(checkTimer); clearTimeout(detailTimer); });
function scheduleDetailRefresh() {
  clearTimeout(detailTimer);
  if (!disposed && canManageProvisioning.value) detailTimer = setTimeout(refreshProvisioning, 5000);
}
async function refreshProvisioning() {
  if (disposed || provisioningAction.value || !canManageProvisioning.value) return;
  const refreshVersion = ++detailRefreshVersion;
  try {
    const response = await getPerson(props.kind, route.params.id);
    if (disposed || refreshVersion !== detailRefreshVersion) return;
    status.value = response.data.data.status;
    issuedNumber.value = response.data.data.studentNumber || '';
    if (!canManageProvisioning.value) {
      confirmCancellation.value = false;
      provisioningNotice.value = status.value === 'PROVISIONED' ? '학생 계정 생성이 완료되었습니다.' : '';
    }
  } catch { /* Keep the last known state; action endpoints revalidate it. */ }
  finally { scheduleDetailRefresh(); }
}
async function manageProvisioning(cancel) {
  if (provisioningAction.value || !canManageProvisioning.value) return;
  provisioningAction.value = cancel ? 'cancel' : 'retry';
  detailRefreshVersion++;
  error.value = '';
  provisioningNotice.value = '';
  try {
    const response = await (cancel ? cancelAdmissionProvisioning : retryAdmissionProvisioning)(route.params.id);
    status.value = response.data.data.status;
    issuedNumber.value = response.data.data.studentNumber || '';
    confirmCancellation.value = false;
    provisioningNotice.value = cancel ? '등록을 취소했습니다.' : '계정 생성을 다시 요청했습니다. 처리 결과를 확인하고 있습니다.';
  } catch (e) {
    error.value = e.response?.data?.message || '요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.';
    provisioningAction.value = '';
    await refreshProvisioning();
  } finally {
    provisioningAction.value = '';
    scheduleDetailRefresh();
  }
}
async function checkRegistration(attempt = 0) {
  if (disposed || !registration.value) return;
  checking.value = true;
  error.value = '';
  try {
    const response = await (admission.value ? getAdmissionAccount(registration.value.id) : getAccount(registration.value.id));
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
}
const departmentName = ref('');
const filteredDepartments = computed(() => departments.value.filter(d => d.name.includes(departmentQuery.value.trim()) || d.id === form.departmentId));
const fields = computed(() => [
  { key: 'name', label: '이름', type: 'text', max: 50, required: true },
  ...(admission.value ? [{ key: 'birthDate', label: '생년월일', type: 'date', required: true }] : []),
  { key: 'email', label: '이메일', type: 'email', max: 100, required: true },
  { key: 'phoneNumber', label: '연락처', type: 'tel', max: 20 },
  { key: 'address', label: '주소', type: 'text', max: 255 },
]);
const preview = computed(() => [
  ...(issuedNumber.value ? [{ label: admission.value ? '학번' : '교번', value: issuedNumber.value }] : []),
  ...fields.value.map(f => ({ label: f.label, value: form[f.key] })),
  { label: '소속 학과', value: departments.value.find(d => d.id === form.departmentId)?.name || departmentName.value },
  ...(admission.value ? [{ label: '지도교수', value: professors.value.find(p => p.professorId === form.advisorProfessorId)?.name }] : []),
  { label: admission.value ? '입학 연도' : '임용 연도', value: admission.value ? form.admissionYear : form.hireYear },
  ...(detail ? [{ label: admission.value ? '등록 상태' : '계정 상태', value: peopleStatuses[props.kind][status.value] || status.value }] : []),
]);
async function initialize() {
  loading.value = true;
  error.value = '';
  try {
    if (detail) {
      const response = await getPerson(props.kind, route.params.id);
      const data = response.data.data;
      Object.keys(form).forEach(k => { if (data[k] != null) form[k] = data[k]; });
      departmentName.value = data.departmentName;
      status.value = data.status;
      issuedNumber.value = data.studentNumber || data.professorNumber || '';
    } else { departments.value = await getDepartments(); }
    ready.value = true;
    scheduleDetailRefresh();
  } catch (e) { error.value = e.response?.data?.message || '정보를 불러오지 못했습니다. 다시 시도해 주세요.'; }
  finally { loading.value = false; }
}
async function submit() {
  if (saving.value || registration.value || !ready.value || detail) return;
  saving.value = true;
  error.value = '';
  const payload = Object.fromEntries(fields.value.map(f => [f.key, typeof form[f.key] === 'string' ? form[f.key].trim() : form[f.key]]));
  if (fields.value.some(f => f.required && !payload[f.key])) {
    error.value = '필수 항목을 입력해 주세요.';
    saving.value = false;
    return;
  }
  payload.departmentId = Number(form.departmentId);
  if (admission.value) payload.advisorProfessorId = Number(form.advisorProfessorId);
  payload[admission.value ? 'admissionYear' : 'hireYear'] = Number(admission.value ? form.admissionYear : form.hireYear);
  try {
    const response = await createPerson(props.kind, payload);
    registration.value = response.data.data;
    checkRegistration();
  } catch (e) { error.value = e.response?.data?.message || '등록에 실패했습니다. 입력 내용을 확인해 주세요.'; }
  finally { saving.value = false; }
}
onMounted(initialize);
watch(() => form.departmentId, async departmentId => {
  if (!admission.value || detail) return;
  form.advisorProfessorId = '';
  professors.value = [];
  if (!departmentId) return;
  professorsLoading.value = true;
  try { professors.value = await getProfessorsByDepartment(Number(departmentId)); }
  catch { error.value = '해당 학과의 교수 목록을 불러오지 못했습니다.'; }
  finally { professorsLoading.value = false; }
});
</script>

<template>
  <MyPageContainer :title="`${title} ${detail ? '상세' : '등록'}`">
    <div class="people-page">
      <p
        v-if="loading"
        role="status"
      >
        정보를 불러오는 중입니다.
      </p>
      <div
        v-if="error"
        class="people-error"
        role="alert"
      >
        {{ error }} <button
          v-if="!ready"
          type="button"
          :disabled="loading"
          @click="initialize"
        >
          다시 시도
        </button>
      </div>
      <section
        v-if="registration"
        class="people-card"
        role="status"
      >
        <h3>{{ issuedNumber ? '계정 생성 완료' : needsReview ? '계정 생성 확인 필요' : '등록 완료 · 계정 생성 중' }}</h3>
        <p v-if="issuedNumber">
          {{ admission ? '학번' : '교번' }}: <strong>{{ issuedNumber }}</strong> (로그인 ID)
        </p>
        <p v-else-if="!needsReview">
          등록 요청이 저장되었습니다. 번호 발급과 계정 활성화가 자동으로 진행됩니다.
        </p>
        <button
          v-if="!issuedNumber"
          type="button"
          :disabled="checking"
          @click="checkRegistration()"
        >
          {{ checking ? '발급 확인 중…' : '발급 상태 확인' }}
        </button>
        <button
          type="button"
          @click="router.push(base)"
        >
          목록으로
        </button>
      </section>
      <form
        v-if="ready && !registration"
        class="people-registration"
        @submit.prevent="submit"
      >
        <section class="people-card people-basic">
          <h3>{{ title }} 기본정보</h3><p class="people-help">
            {{ detail ? '등록된 정보를 확인하세요.' : '필수 항목을 정확하게 입력해 주세요.' }}
          </p>
          <fieldset :disabled="saving || detail">
            <label
              v-for="field in fields"
              :key="field.key"
            >{{ field.label }} <em v-if="field.required && !detail">*</em><input
              v-model="form[field.key]"
              :type="field.type"
              :maxlength="field.max"
              :required="field.required"
              :max="field.type === 'date' ? maxBirth : undefined"
              :placeholder="`${field.label} 입력`"
            ></label>
            <div
              v-if="!detail"
              class="people-two-fields"
            >
              <label>학과 검색<input
                v-model="departmentQuery"
                placeholder="학과를 검색해 주세요."
              ></label><label>학과 선택 <em>*</em><select
                v-model="form.departmentId"
                required
              ><option
                value=""
                disabled
              >학과를 선택해 주세요.</option><option
                v-for="d in filteredDepartments"
                :key="d.id"
                :value="d.id"
              >{{ d.name }}</option></select></label>
            </div>
            <label v-if="admission && !detail">지도교수 <em>*</em><select
              v-model="form.advisorProfessorId"
              :disabled="!form.departmentId || professorsLoading"
              required
            ><option value="" disabled>{{ professorsLoading ? '교수 목록을 불러오는 중…' : professors.length ? '지도교수를 선택해 주세요.' : '해당 학과에 활성 교수가 없습니다.' }}</option><option
              v-for="professor in professors"
              :key="professor.professorId"
              :value="professor.professorId"
            >{{ professor.name }}{{ professor.professorNumber ? ` (${professor.professorNumber})` : '' }}</option></select></label>
            <label v-if="detail">소속 학과<input :value="departmentName"></label>
            <label v-if="admission">입학 연도 <em v-if="!detail">*</em><input
              v-if="detail"
              :value="form.admissionYear"
            ><select
              v-else
              v-model="form.admissionYear"
              required
            ><option :value="year">{{ year }}</option><option :value="year + 1">{{ year + 1 }}</option></select></label>
            <label v-else>임용 연도 <em v-if="!detail">*</em><input
              v-model="form.hireYear"
              type="number"
              min="1900"
              :max="year"
              required
            ></label>
          </fieldset>
        </section>
        <div class="people-aside">
          <section
            v-if="canManageProvisioning || provisioningNotice"
            class="people-card"
            aria-label="계정 생성 관리"
          >
            <h3>계정 생성 상태</h3>
            <p
              v-if="provisioningNotice"
              role="status"
            >
              {{ provisioningNotice }}
            </p>
            <template v-if="canManageProvisioning">
              <p>계정 생성 중입니다. 처리가 중단되었다면 재시도하거나 등록을 취소할 수 있습니다.</p>
              <div class="people-actions">
                <button
                  type="button"
                  :disabled="Boolean(provisioningAction)"
                  @click="manageProvisioning(false)"
                >
                  {{ provisioningAction === 'retry' ? '재시도 요청 중…' : '계정 생성 재시도' }}
                </button>
                <button
                  type="button"
                  :disabled="Boolean(provisioningAction)"
                  @click="confirmCancellation = true"
                >
                  등록 취소
                </button>
              </div>
              <div
                v-if="confirmCancellation"
                role="group"
                aria-label="등록 취소 확인"
              >
                <p>입학 예정자 등록을 취소하고 계정 생성을 중단할까요?</p>
                <button
                  type="button"
                  :disabled="Boolean(provisioningAction)"
                  @click="manageProvisioning(true)"
                >
                  {{ provisioningAction === 'cancel' ? '취소 중…' : '등록 취소 확인' }}
                </button>
                <button
                  type="button"
                  :disabled="Boolean(provisioningAction)"
                  @click="confirmCancellation = false"
                >
                  돌아가기
                </button>
              </div>
            </template>
          </section>
          <section class="people-card">
            <h3>등록 정보 확인</h3><p class="people-help">
              입력한 정보를 다시 한번 확인해 주세요.
            </p><dl>
              <div
                v-for="item in preview"
                :key="item.label"
              >
                <dt>{{ item.label }}</dt><dd>{{ item.value || '—' }}</dd>
              </div>
            </dl>
          </section>
          <section class="people-card people-guide">
            <h3>등록 안내</h3><p>• 입력한 정보는 {{ admission ? '입학 전형 및 학사' : '교수' }} 관리에 활용됩니다.</p><p>• 저장 전 필수 항목과 소속 정보를 확인해 주세요.</p><p v-if="admission">
              • 등록하면 학생 계정과 학번이 자동으로 생성됩니다.
            </p><p v-else>
              • 등록하면 교수 계정과 교번이 자동으로 생성됩니다.
            </p>
          </section>
          <div class="people-actions">
            <button
              type="button"
              :disabled="saving"
              @click="router.push(base)"
            >
              {{ detail ? '목록' : '취소' }}
            </button><button
              v-if="!detail"
              class="primary"
              :disabled="saving || !form.departmentId || (admission && !form.advisorProfessorId)"
            >
              {{ saving ? '등록 중…' : '등록' }}
            </button>
          </div>
        </div>
      </form>
    </div>
  </MyPageContainer>
</template>
