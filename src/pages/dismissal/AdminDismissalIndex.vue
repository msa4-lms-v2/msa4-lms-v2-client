<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { changeDismissalStatus, createDismissal, getDismissal, searchDismissals, updateDismissal } from '../../api/dismissalApi';
import MyButton from '../../components/button/MyButton.vue';
import MyInput from '../../components/input/MyInput.vue';
import MySelect from '../../components/input/MySelect.vue';
import MyPageContainer from '../../components/layout/MyPageContainer.vue';
import PrevNextPagination from '../../components/pagination/PrevNextPagination.vue';
import MySearchFilter from '../../components/search/MySearchFilter.vue';
import MyTable from '../../components/table/MyTable.vue';
import { confirmDialog, notify } from '../../composables/useDialog';
import { ACADEMIC_STATUS_LABEL } from '../../util/academic/enumLabels';

const reasonTypeLabel = {
  LEAVE_EXPIRED: '휴학 만료',
  NON_REGISTRATION: '미등록',
  DISCIPLINARY: '징계',
  ACADEMIC_WARNING: '학사경고',
  ACADEMIC_WARNING_REPEAT: '재제적',
};
const statusLabel = { PENDING: '대기', CONFIRMED: '확정', CANCELLED: '취소' };

const columns = [
  { key: 'student', label: '학생' },
  { key: 'academicStatus', label: '학적' },
  { key: 'reasonType', label: '제적 종류' },
  { key: 'status', label: '상태' },
  { key: 'createdAt', label: '등록일' },
  { key: 'actions', label: '처리' },
];

const filters = reactive({ studentId: '', studentName: '', departmentId: '', reasonType: '', status: '', direction: 'DESC' });
const form = reactive({ studentId: '', reasonType: 'DISCIPLINARY', reason: '', version: 0 });
const cancelReason = ref('');
const selected = ref(null);
const dismissals = ref([]);
const page = ref({ page: 1, totalCount: 0, hasNext: false });
const loading = ref(false);
const saving = ref(false);

const isEditing = computed(() => Boolean(selected.value));
const reasonLength = computed(() => form.reason.length);
const cancelReasonLength = computed(() => cancelReason.value.length);

const formatDateTime = (value) => (value ? value.replace('T', ' ').slice(0, 16) : '-');

const params = (pageNumber) => ({
  page: pageNumber,
  size: 20,
  studentId: filters.studentId || undefined,
  studentName: filters.studentName.trim() || undefined,
  departmentId: filters.departmentId || undefined,
  reasonType: filters.reasonType || undefined,
  status: filters.status || undefined,
  direction: filters.direction || undefined,
});

const load = async (pageNumber = 1) => {
  loading.value = true;
  try {
    const { data } = await searchDismissals(params(pageNumber));
    dismissals.value = data.data?.items || [];
    page.value = data.data || { page: pageNumber, totalCount: 0, hasNext: false };
  } catch (error) {
    dismissals.value = [];
    await notify(error.response?.data?.message || '제적 후보 목록을 불러오지 못했습니다.');
  } finally {
    loading.value = false;
  }
};

const resetFilters = () => {
  Object.assign(filters, { studentId: '', studentName: '', departmentId: '', reasonType: '', status: '', direction: 'DESC' });
  load(1);
};

const resetForm = () => {
  selected.value = null;
  cancelReason.value = '';
  Object.assign(form, { studentId: '', reasonType: 'DISCIPLINARY', reason: '', version: 0 });
};

const selectDismissal = async (item) => {
  try {
    const { data } = await getDismissal(item.id);
    selected.value = data.data;
    cancelReason.value = data.data.cancelReason || '';
    Object.assign(form, {
      studentId: String(data.data.studentId),
      reasonType: data.data.reasonType,
      reason: data.data.reason || '',
      version: data.data.version,
    });
  } catch (error) {
    await notify(error.response?.data?.message || '제적 후보 상세를 불러오지 못했습니다.');
  }
};

const validateForm = async () => {
  if (!form.studentId) {
    await notify('학생 ID를 입력해 주세요.');
    return false;
  }
  if (!form.reason.trim()) {
    await notify('제적 상세 근거를 입력해 주세요.');
    return false;
  }
  if (form.reason.length > 500) {
    await notify('제적 상세 근거는 500자 이하여야 합니다.');
    return false;
  }
  return true;
};

const save = async () => {
  if (!(await validateForm())) return;
  saving.value = true;
  try {
    const payload = { reasonType: form.reasonType, reason: form.reason.trim() };
    if (isEditing.value) {
      await updateDismissal(selected.value.id, { ...payload, version: form.version });
      await notify('제적 후보 근거를 수정했습니다.');
    } else {
      await createDismissal({ ...payload, studentId: Number(form.studentId) });
      await notify('제적 후보를 등록했습니다.');
    }
    resetForm();
    await load(page.value.page || 1);
  } catch (error) {
    await notify(error.response?.data?.message || '제적 후보 저장에 실패했습니다.');
  } finally {
    saving.value = false;
  }
};

const confirmDismissal = async (item) => {
  const ok = await confirmDialog('제적을 확정하면 학생 학적이 즉시 제적으로 변경됩니다. 확정할까요?');
  if (!ok) return;
  try {
    const detail = selected.value?.id === item.id ? selected.value : (await getDismissal(item.id)).data.data;
    await changeDismissalStatus(item.id, { version: detail.version, status: 'CONFIRMED', cancelReason: null });
    await notify('제적을 확정했습니다.');
    resetForm();
    await load(page.value.page || 1);
  } catch (error) {
    await notify(error.response?.data?.message || '제적 확정에 실패했습니다.');
  }
};

const cancelDismissal = async () => {
  if (!selected.value) {
    await notify('취소할 제적 후보를 먼저 선택해 주세요.');
    return;
  }
  if (selected.value.status !== 'PENDING') {
    await notify('대기 중인 제적 후보만 취소할 수 있습니다.');
    return;
  }
  if (!cancelReason.value.trim()) {
    await notify('취소 사유를 입력해 주세요.');
    return;
  }
  if (cancelReason.value.length > 500) {
    await notify('취소 사유는 500자 이하여야 합니다.');
    return;
  }
  const ok = await confirmDialog('선택한 제적 후보를 취소할까요?');
  if (!ok) return;
  try {
    await changeDismissalStatus(selected.value.id, { version: selected.value.version, status: 'CANCELLED', cancelReason: cancelReason.value.trim() });
    await notify('제적 후보를 취소했습니다.');
    resetForm();
    await load(page.value.page || 1);
  } catch (error) {
    await notify(error.response?.data?.message || '제적 후보 취소에 실패했습니다.');
  }
};

onMounted(() => load());
</script>

<template>
  <MyPageContainer title="제적 처리" subtitle="관리자가 제적 후보를 등록하고 대기 건을 확정 또는 취소합니다.">
    <MySearchFilter submit-text="조회" @search="load(1)">
      <div class="search-group"><label for="dismissal-student-id">학생 ID</label><MyInput id="dismissal-student-id" v-model="filters.studentId" numeric-only placeholder="예: 1" /></div>
      <div class="search-group"><label for="dismissal-student-name">학생명</label><MyInput id="dismissal-student-name" v-model="filters.studentName" placeholder="학생명" @keyup-enter="load(1)" /></div>
      <div class="search-group"><label for="dismissal-department-id">학과 ID</label><MyInput id="dismissal-department-id" v-model="filters.departmentId" numeric-only placeholder="예: 130" /></div>
      <div class="search-group"><label for="dismissal-reason-type">제적 종류</label><MySelect id="dismissal-reason-type" v-model="filters.reasonType"><option value="">전체</option><option v-for="(label, value) in reasonTypeLabel" :key="value" :value="value">{{ label }}</option></MySelect></div>
      <div class="search-group"><label for="dismissal-status">상태</label><MySelect id="dismissal-status" v-model="filters.status"><option value="">전체</option><option value="PENDING">대기</option><option value="CONFIRMED">확정</option><option value="CANCELLED">취소</option></MySelect></div>
      <MyButton btn-type="button" color="white" size="middle" content="초기화" @click="resetFilters" />
    </MySearchFilter>

    <section class="dismissal-layout">
      <div>
        <div class="list-heading"><div><h3>검색 결과</h3><span>총 {{ page.totalCount || 0 }}건</span></div><MyButton btn-type="button" color="white" size="middle" content="신규 등록" @click="resetForm" /></div>
        <MyTable :columns="columns" :loading="loading" :empty="!loading && dismissals.length === 0" empty-message="조회된 제적 후보가 없습니다.">
          <tr v-for="item in dismissals" :key="item.id">
            <td><strong>{{ item.studentName }}</strong><br><span class="muted">ID {{ item.studentId }} · 학과 {{ item.departmentId }}</span></td>
            <td>{{ ACADEMIC_STATUS_LABEL[item.academicStatus] || item.academicStatus }}</td>
            <td>{{ reasonTypeLabel[item.reasonType] || item.reasonType }}</td>
            <td><span class="status-chip" :class="item.status.toLowerCase()">{{ statusLabel[item.status] }}</span></td>
            <td>{{ formatDateTime(item.createdAt) }}</td>
            <td class="action-cell">
              <MyButton btn-type="button" color="deep-blue" size="small" content="상세" @click="selectDismissal(item)" />
              <MyButton v-if="item.status === 'PENDING'" btn-type="button" color="white" size="small" content="확정" @click="confirmDismissal(item)" />
            </td>
          </tr>
        </MyTable>
        <PrevNextPagination v-if="page.page > 1 || page.hasNext" :page="page.page" :has-next="page.hasNext" @page-change="load" />
      </div>

      <form class="dismissal-form" @submit.prevent="save">
        <div class="form-header"><div><h3>{{ isEditing ? '제적 후보 상세' : '제적 후보 등록' }}</h3><p>{{ isEditing ? '대기 상태 후보의 근거를 수정하거나 취소할 수 있습니다.' : '학생 ID와 실제 확인 근거를 입력합니다.' }}</p></div><MyButton v-if="isEditing" btn-type="button" color="white" size="small" content="등록 모드" @click="resetForm" /></div>
        <div class="form-row">
          <div class="form-group"><label for="dismissal-form-student">학생 ID</label><MyInput id="dismissal-form-student" v-model="form.studentId" numeric-only :disabled="isEditing" placeholder="Academic 학생 ID" /></div>
          <div class="form-group"><label for="dismissal-form-reason-type">제적 종류</label><MySelect id="dismissal-form-reason-type" v-model="form.reasonType" :disabled="isEditing && selected?.status !== 'PENDING'"><option v-for="(label, value) in reasonTypeLabel" :key="value" :value="value">{{ label }}</option></MySelect></div>
        </div>
        <div v-if="isEditing" class="detail-box">
          <p><strong>상태</strong> {{ statusLabel[selected.status] }} · <strong>버전</strong> {{ selected.version }}</p>
          <p v-if="selected.processedAt"><strong>처리일</strong> {{ formatDateTime(selected.processedAt) }}</p>
        </div>
        <div class="form-group"><label for="dismissal-reason">상세 근거 <span>{{ reasonLength }}/500</span></label><textarea id="dismissal-reason" v-model="form.reason" rows="7" :disabled="isEditing && selected?.status !== 'PENDING'" placeholder="관리자용 상세 근거를 입력해 주세요."></textarea></div>
        <div class="button-row"><MyButton btn-type="submit" color="deep-blue" size="middle" :content="saving ? '저장 중...' : (isEditing ? '근거 수정' : '후보 등록')" :disabled="saving || (isEditing && selected?.status !== 'PENDING')" /></div>

        <div v-if="isEditing && selected?.status === 'PENDING'" class="cancel-box">
          <div class="form-group"><label for="dismissal-cancel-reason">취소 사유 <span>{{ cancelReasonLength }}/500</span></label><textarea id="dismissal-cancel-reason" v-model="cancelReason" rows="4" placeholder="취소 사유를 입력해 주세요."></textarea></div>
          <MyButton btn-type="button" color="white" size="middle" content="후보 취소" @click="cancelDismissal" />
        </div>
      </form>
    </section>
  </MyPageContainer>
</template>

<style scoped>
.dismissal-layout { display:grid; grid-template-columns:minmax(0, 1fr) 380px; gap:24px; align-items:start; }
.list-heading { display:flex; justify-content:space-between; align-items:center; margin:24px 0 12px; }
.list-heading h3, .form-header h3 { margin:0 0 4px; font-size:1rem; }
.list-heading span, .form-header p, .muted { color:var(--personal-color-text-secondary-steel); font-size:.84rem; }
.action-cell { display:flex; gap:6px; flex-wrap:wrap; }
.status-chip.pending { color:var(--personal-color-warning-text-brown); }
.status-chip.confirmed { color:var(--personal-color-danger-strong-crimson); }
.status-chip.cancelled { color:var(--personal-color-text-secondary-steel); }
.dismissal-form { margin-top:24px; padding:20px; border:1px solid var(--personal-color-border-soft); border-radius:14px; background:var(--personal-color-white); box-shadow:0 8px 20px rgba(8, 20, 49, .06); }
.form-header { display:flex; justify-content:space-between; align-items:flex-start; gap:12px; margin-bottom:18px; }
.form-row { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
.form-group { display:flex; flex-direction:column; gap:7px; margin-bottom:14px; }
.form-group label { display:flex; justify-content:space-between; color:var(--personal-color-text-primary-deep); font-weight:700; font-size:.88rem; }
.form-group label span { color:var(--personal-color-text-secondary-steel); font-weight:600; }
textarea { width:100%; resize:vertical; border:1px solid var(--personal-color-border-soft); border-radius:8px; padding:12px; font:inherit; box-sizing:border-box; }
textarea:focus { outline:none; border-color:var(--personal-color-link-blue); box-shadow:0 0 0 3px rgba(0, 39, 139, .1); }
.detail-box, .cancel-box { border:1px solid var(--personal-color-border-soft); border-radius:10px; padding:12px; background:var(--personal-color-bg-subtle-snow); margin-bottom:14px; }
.detail-box p { margin:4px 0; color:var(--personal-color-text-secondary-steel); }
.button-row { display:flex; justify-content:flex-end; }
@media (max-width: 1180px) { .dismissal-layout { grid-template-columns:1fr; } }
</style>
