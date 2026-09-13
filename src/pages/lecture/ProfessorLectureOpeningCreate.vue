<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import {
  createLectureOpeningRequest,
  getLectureOpeningRequest,
  getLectureOpeningRequests,
  updateLectureOpeningRequest,
} from '../../api/lectureApi';
import MyPageContainer from '../../components/layout/ProfessorPageContainer.vue';
import MyButton from '../../components/button/MyButton.vue';
import MyInput from '../../components/input/MyInput.vue';
import MySelect from '../../components/input/MySelect.vue';
import MyTable from '../../components/table/MyTable.vue';
import MyCard from '../../components/common/MyCard.vue';
import ProfessorWeeklySyllabus from './ProfessorWeeklySyllabus.vue';
import { useAuthStore } from '../../store/auth/useAuthStore';
import PrevNextPagination from '../../components/pagination/PrevNextPagination.vue';
import { useSemesterStore } from '../../store/semester/useSemesterStore';
import { confirmDialog, notify } from '../../composables/useDialog';
import { formatDate } from '../../util/format';

defineOptions({ name: 'ProfessorLectureOpeningCreate' });

const DAY_OPTIONS = [
  { value: 'MON', label: '월' },
  { value: 'TUE', label: '화' },
  { value: 'WED', label: '수' },
  { value: 'THU', label: '목' },
  { value: 'FRI', label: '금' },
];
const PERIOD_OPTIONS = Array.from({ length: 20 }, (_, index) => ({
  value: String(index + 1),
  label: `${index + 1}교시`,
}));
const DAY_LABELS = Object.fromEntries(DAY_OPTIONS.map(({ value, label }) => [value, label]));

const statusLabels = { PENDING: '심사중', APPROVED: '승인', REJECTED: '반려' };
const statusClass = (status) => `opening-status ${(status || '').toLowerCase()}`;

const historyColumns = [
  { key: 'course', label: '교과목' },
  { key: 'semester', label: '학기' },
  { key: 'sectionNo', label: '분반' },
  { key: 'status', label: '처리 상태' },
  { key: 'createdAt', label: '신청일' },
  { key: 'action', label: '관리' },
];

const semesterStore = useSemesterStore();
const authStore = useAuthStore();
const syllabusEditorKey = ref(0);

const form = reactive({
  courseId: '',
  semesterId: '',
  sectionNo: '',
  requestedCapacity: '',
  classroom: '',
  midtermRatio: '30',
  finalRatio: '30',
  assignmentRatio: '30',
  attendanceRatio: '10',
  syllabus: '',
});

const schedules = ref([]);
const scheduleDraft = reactive({ dayOfWeek: 'MON', startPeriod: '1', endPeriod: '2' });
const formError = ref('');
const isSubmitting = ref(false);
const editingRequestId = ref(null);
const isLoadingEdit = ref(false);
const history = ref([]);
const isLoadingHistory = ref(false);
const importRequestId = ref('');
const draftKey = () => {
  const userId = authStore.userInfo?.userId;
  return userId ? `professor-opening-draft-v1:${userId}` : null;
};
const saveDraft = async () => {
  if (isSubmitting.value || isLoadingEdit.value || editingRequestId.value) return;
  try {
    const key = draftKey();
    if (!key) throw new Error();
    sessionStorage.setItem(key, JSON.stringify({ form: { ...form }, schedules: schedules.value }));
    await notify('이 브라우저 탭에 임시저장했습니다.');
  } catch {
    await notify('임시저장할 수 없습니다. 로그인 상태와 브라우저 저장소를 확인해 주세요.');
  }
};
const restoreDraft = async () => {
  if (isSubmitting.value || isLoadingEdit.value || editingRequestId.value) return;
  try {
    const raw = draftKey() && sessionStorage.getItem(draftKey());
    if (!raw) { await notify('임시저장한 내용이 없습니다.'); return; }
    const draft = JSON.parse(raw);
    if (!draft.form || !Array.isArray(draft.schedules)) throw new Error();
    if (!await confirmDialog('임시저장한 내용으로 현재 입력을 바꾸시겠습니까?')) return;
    for (const key of Object.keys(form)) form[key] = String(draft.form[key] ?? '');
    schedules.value = draft.schedules.slice(0, 10).map(({ dayOfWeek, startPeriod, endPeriod }) => ({ dayOfWeek, startPeriod: String(startPeriod), endPeriod: String(endPeriod) }));
    syllabusEditorKey.value += 1;
    formError.value = '';
  } catch { await notify('임시저장한 내용을 불러올 수 없습니다.'); }
};
const historyStatus = ref('');
const historyPage = ref({ page: 1, size: 20, totalCount: 0, hasNext: false });

const ratioTotal = computed(() => (
  [form.midtermRatio, form.finalRatio, form.assignmentRatio, form.attendanceRatio]
    .reduce((sum, value) => sum + (Number(value) || 0), 0)
));

const addScheduleRow = async () => {
  if (schedules.value.length >= 10) {
    await notify('강의 시간표는 최대 10개까지 입력할 수 있습니다.');
    return;
  }
  const start = Number(scheduleDraft.startPeriod);
  const end = Number(scheduleDraft.endPeriod);
  if (!scheduleDraft.dayOfWeek || !Number.isInteger(start) || !Number.isInteger(end)
    || start < 1 || end > 20 || start > end) {
    await notify('요일과 시작·종료 교시를 올바르게 선택해 주세요.');
    return;
  }
  const overlaps = schedules.value.some((schedule) => (
    schedule.dayOfWeek === scheduleDraft.dayOfWeek
    && start <= Number(schedule.endPeriod)
    && end >= Number(schedule.startPeriod)
  ));
  if (overlaps) {
    await notify('같은 요일의 강의 시간이 서로 겹칠 수 없습니다.');
    return;
  }
  schedules.value.push({
    dayOfWeek: scheduleDraft.dayOfWeek,
    startPeriod: String(start),
    endPeriod: String(end),
  });
};

const removeScheduleRow = (index) => {
  schedules.value.splice(index, 1);
};

const getDayLabel = (dayOfWeek) => DAY_LABELS[dayOfWeek] || dayOfWeek;

const resetForm = () => {
  form.courseId = '';
  form.semesterId = '';
  form.sectionNo = '';
  form.requestedCapacity = '';
  form.classroom = '';
  form.midtermRatio = '30';
  form.finalRatio = '30';
  form.assignmentRatio = '30';
  form.attendanceRatio = '10';
  form.syllabus = '';
  schedules.value = [];
  scheduleDraft.dayOfWeek = 'MON';
  scheduleDraft.startPeriod = '1';
  scheduleDraft.endPeriod = '2';
  formError.value = '';
  editingRequestId.value = null;
  syllabusEditorKey.value += 1;
};

const validate = () => {
  if (!form.courseId || Number(form.courseId) <= 0) return '교과목 번호를 입력해 주세요.';
  if (!form.semesterId) return '개설 학기를 선택해 주세요.';
  if (!/^[0-9A-Za-z-]{1,10}$/.test(form.sectionNo.trim())) return '분반은 영문, 숫자, 하이픈 10자 이내로 입력해 주세요.';
  const capacity = Number(form.requestedCapacity);
  if (!Number.isInteger(capacity) || capacity < 1 || capacity > 1000) return '신청 정원은 1~1000 사이로 입력해 주세요.';
  if (!form.classroom.trim() || form.classroom.trim().length > 50) return '강의실은 50자 이내로 입력해 주세요.';
  const ratios = [form.midtermRatio, form.finalRatio, form.assignmentRatio, form.attendanceRatio].map(Number);
  if (ratios.some((value) => !Number.isInteger(value) || value < 0 || value > 100)) {
    return '성적 반영 비율은 각각 0~100 사이로 입력해 주세요.';
  }
  if (ratioTotal.value !== 100) return '성적 반영 비율(중간·기말·과제·출석)의 합은 100이어야 합니다.';
  if (!form.syllabus.trim()) return '강의계획서 내용을 입력해 주세요.';
  if (form.syllabus.trim().length > 65535) return '강의계획서는 65,535자 이하여야 합니다.';
  if (schedules.value.length === 0) return '강의 시간표를 하나 이상 입력해 주세요.';
  if (schedules.value.length > 10) return '강의 시간표는 최대 10개까지 입력할 수 있습니다.';
  const occupiedPeriods = new Set();
  for (const schedule of schedules.value) {
    const start = Number(schedule.startPeriod);
    const end = Number(schedule.endPeriod);
    if (!schedule.dayOfWeek || !Number.isInteger(start) || !Number.isInteger(end)
      || start < 1 || end > 20 || start > end) {
      return '강의 시간표의 요일과 교시를 올바르게 입력해 주세요.';
    }
    for (let period = start; period <= end; period += 1) {
      const key = `${schedule.dayOfWeek}:${period}`;
      if (occupiedPeriods.has(key)) return '같은 요일의 강의 시간이 서로 겹칠 수 없습니다.';
      occupiedPeriods.add(key);
    }
  }
  return '';
};

const loadHistory = async (pageNumber = 1) => {
  isLoadingHistory.value = true;
  try {
    const response = await getLectureOpeningRequests({
      status: historyStatus.value || undefined,
      page: pageNumber,
      size: 20,
    });
    const data = response.data.data;
    history.value = data.items || [];
    historyPage.value = {
      page: data.page,
      size: data.size,
      totalCount: data.totalCount,
      hasNext: data.hasNext,
    };
  } catch (error) {
    history.value = [];
    historyPage.value = { page: 1, size: 20, totalCount: 0, hasNext: false };
    await notify(error.response?.data?.message || '강의 개설 신청 내역을 불러오지 못했습니다.');
  } finally {
    isLoadingHistory.value = false;
  }
};

const editRequest = async (item, copy = false) => {
  if ((!copy && item.status !== 'PENDING') || isLoadingEdit.value || isSubmitting.value) return;
  isLoadingEdit.value = true;
  try {
    const response = await getLectureOpeningRequest(item.openingRequestId);
    const detail = response.data.data;
    editingRequestId.value = copy ? null : detail.openingRequestId;
    form.courseId = String(detail.courseId);
    form.semesterId = copy ? '' : detail.semesterId;
    form.sectionNo = detail.sectionNo || '';
    form.requestedCapacity = String(detail.requestedCapacity ?? '');
    form.classroom = detail.classroom || '';
    form.midtermRatio = String(detail.midtermRatio ?? 0);
    form.finalRatio = String(detail.finalRatio ?? 0);
    form.assignmentRatio = String(detail.assignmentRatio ?? 0);
    form.attendanceRatio = String(detail.attendanceRatio ?? 0);
    form.syllabus = detail.syllabus || '';
    syllabusEditorKey.value += 1;
    schedules.value = (detail.schedules || []).map((schedule) => ({
      dayOfWeek: schedule.dayOfWeek,
      startPeriod: String(schedule.startPeriod),
      endPeriod: String(schedule.endPeriod),
    }));
    formError.value = '';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } catch (error) {
    await notify(error.response?.data?.message || '강의 개설 신청 상세를 불러오지 못했습니다.');
  } finally {
    isLoadingEdit.value = false;
  }
};

const importRequest = async () => {
  const item = history.value.find((entry) => String(entry.openingRequestId) === String(importRequestId.value));
  if (!item || isLoadingEdit.value || isSubmitting.value) return;
  if (await confirmDialog('선택한 신청 내역으로 현재 입력을 바꾸시겠습니까? 개설 학기는 다시 선택해야 합니다.')) await editRequest(item, true);
};

const submitRequest = async () => {
  if (isSubmitting.value || isLoadingEdit.value) return;
  formError.value = validate();
  if (formError.value) return;

  const isEditing = Boolean(editingRequestId.value);
  const requestId = editingRequestId.value;

  const payload = {
    courseId: Number(form.courseId),
    semesterId: Number(form.semesterId),
    sectionNo: form.sectionNo.trim(),
    requestedCapacity: Number(form.requestedCapacity),
    classroom: form.classroom.trim(),
    midtermRatio: Number(form.midtermRatio),
    finalRatio: Number(form.finalRatio),
    assignmentRatio: Number(form.assignmentRatio),
    attendanceRatio: Number(form.attendanceRatio),
    syllabus: form.syllabus.trim(),
    schedules: schedules.value.map((schedule) => ({
      dayOfWeek: schedule.dayOfWeek,
      startPeriod: Number(schedule.startPeriod),
      endPeriod: Number(schedule.endPeriod),
    })),
  };

  isSubmitting.value = true;
  try {
    const confirmed = await confirmDialog(
      isEditing ? '수정한 내용으로 강의 개설 신청을 보완하시겠습니까?' : '입력한 내용으로 강의 개설을 신청하시겠습니까?',
    );
    if (!confirmed) return;
    const response = isEditing
      ? await updateLectureOpeningRequest(requestId, payload)
      : await createLectureOpeningRequest(payload);
    const saved = response.data.data;
    if (!isEditing) {
      try { if (draftKey()) sessionStorage.removeItem(draftKey()); } catch { /* 신청 성공 결과는 유지한다. */ }
    }
    resetForm();
    await notify(
      isEditing
        ? `강의 개설 신청이 수정되었습니다. (${saved.courseName} · ${saved.sectionNo}분반)`
        : `강의 개설 신청이 접수되었습니다. (${saved.courseName} · ${saved.sectionNo}분반)`,
    );
    await loadHistory(1);
  } catch (error) {
    await notify(error.response?.data?.message || '강의 개설 신청 중 오류가 발생했습니다.');
  } finally {
    isSubmitting.value = false;
  }
};

onMounted(async () => {
  try {
    await semesterStore.fetchSemesters();
  } catch (error) {
    await notify(error.response?.data?.message || '개설 가능한 학기 목록을 불러오지 못했습니다.');
  }
  await loadHistory();
});
</script>

<template>
  <MyPageContainer title="강의 개설 신청">
    <div class="content-card">
      <form class="create-form-layout" :inert="isSubmitting || isLoadingEdit" @submit.prevent="submitRequest">
        <div v-if="editingRequestId" class="edit-notice full-width">
          <strong>신청 번호 {{ editingRequestId }} 수정 중</strong>
          <span>처리 대기 상태에서만 수정할 수 있습니다.</span>
        </div>

        <div class="form-column">
          <MyCard class="section-box">
            <div class="common-section-header">
              <h3>기본 정보 설정</h3>
            </div>
            <div class="info-grid">
              <div class="form-group full-width">
                <label for="opening-import">기존 신청 불러오기</label>
                <div class="import-controls">
                  <MySelect id="opening-import" v-model="importRequestId" :disabled="isLoadingHistory || isLoadingEdit || isSubmitting || Boolean(editingRequestId)">
                    <option value="">신청 내역에서 선택</option>
                    <option v-for="item in history" :key="item.openingRequestId" :value="String(item.openingRequestId)">{{ item.academicYear }} · {{ item.courseName }} ({{ item.sectionNo }}분반)</option>
                  </MySelect>
                  <MyButton btn-type="button" color="deep-blue" size="middle" content="불러오기" :disabled="!importRequestId || isLoadingEdit || isSubmitting || Boolean(editingRequestId)" @click="importRequest" />
                </div>
              </div>
              <div class="form-group full-width">
                <label for="opening-course-id">교과목 번호 (필수)</label>
                <MyInput id="opening-course-id" v-model="form.courseId" numeric-only placeholder="교과목 번호를 입력해 주세요." />
              </div>
              <div class="form-group">
                <label for="opening-section">분반</label>
                <MyInput id="opening-section" v-model="form.sectionNo" maxlength="10" placeholder="예: 01" />
              </div>
              <div class="form-group">
                <label for="opening-capacity">수강 정원 (명)</label>
                <MyInput id="opening-capacity" v-model="form.requestedCapacity" numeric-only :max-number="1000" placeholder="예: 40" />
              </div>
              <div class="form-group full-width">
                <label for="opening-classroom">강의실</label>
                <MyInput id="opening-classroom" v-model="form.classroom" maxlength="50" placeholder="강의실을 입력해 주세요." />
              </div>
            </div>
          </MyCard>

          <MyCard class="schedule-section">
            <div class="common-section-header">
              <h3>강의 시간표 설정</h3>
            </div>
            <div class="schedule-creator">
              <div class="form-group">
                <label for="opening-day">요일</label>
                <MySelect id="opening-day" v-model="scheduleDraft.dayOfWeek" :options="DAY_OPTIONS" />
              </div>
              <div class="form-group">
                <label for="opening-start-period">시작 교시</label>
                <MySelect id="opening-start-period" v-model="scheduleDraft.startPeriod" :options="PERIOD_OPTIONS" />
              </div>
              <div class="form-group">
                <label for="opening-end-period">종료 교시</label>
                <MySelect id="opening-end-period" v-model="scheduleDraft.endPeriod" :options="PERIOD_OPTIONS" />
              </div>
              <MyButton
                btn-type="button"
                class="add-button"
                color="deep-blue"
                size="small"
                content="추가"
                :disabled="schedules.length >= 10"
                @click="addScheduleRow"
              />
            </div>

            <div v-if="schedules.length" class="schedule-list">
              <div v-for="(schedule, index) in schedules" :key="`${schedule.dayOfWeek}-${schedule.startPeriod}-${schedule.endPeriod}-${index}`" class="schedule-item">
                <span>{{ getDayLabel(schedule.dayOfWeek) }}요일 {{ schedule.startPeriod }}교시 ~ {{ schedule.endPeriod }}교시</span>
                <MyButton btn-type="button" color="red" size="small" content="삭제" @click="removeScheduleRow(index)" />
              </div>
            </div>
            <p v-else class="empty-schedule-text">등록된 강의 시간이 없습니다. 최소 1개 이상 추가해 주세요.</p>
          </MyCard>

          <MyCard class="ratio-section">
            <div class="common-section-header">
              <h3>성적 평가 비율 설정 (합계 100%)</h3>
            </div>
            <div class="ratio-inputs">
              <div class="ratio-group">
                <label for="opening-midterm">중간고사 (%)</label>
                <MyInput id="opening-midterm" v-model="form.midtermRatio" numeric-only :max-number="100" />
              </div>
              <div class="ratio-group">
                <label for="opening-final">기말고사 (%)</label>
                <MyInput id="opening-final" v-model="form.finalRatio" numeric-only :max-number="100" />
              </div>
              <div class="ratio-group">
                <label for="opening-assignment">과제 비율 (%)</label>
                <MyInput id="opening-assignment" v-model="form.assignmentRatio" numeric-only :max-number="100" />
              </div>
              <div class="ratio-group">
                <label for="opening-attendance">출결 비율 (%)</label>
                <MyInput id="opening-attendance" v-model="form.attendanceRatio" numeric-only :max-number="100" />
              </div>
            </div>
            <div class="ratio-indicator" :class="{ invalid: ratioTotal !== 100 }">
              현재 평가 비율 합계: <strong>{{ ratioTotal }}%</strong>
              <span v-if="ratioTotal !== 100"> (100%가 되어야 신청할 수 있습니다)</span>
            </div>
          </MyCard>
        </div>

        <div class="form-column">
          <MyCard class="syllabus-section">
            <div class="common-section-header">
              <h3>강의계획서</h3>
            </div>
            <div class="info-grid syllabus-meta">
              <div class="form-group">
                <label for="opening-semester">개설 학기 (필수)</label>
                <MySelect id="opening-semester" v-model="form.semesterId">
                  <option value="" disabled>학기를 선택해 주세요.</option>
                  <option v-for="semester in semesterStore.semesters" :key="semester.id" :value="semester.id">
                    {{ semester.academicYear }}학년도 {{ semester.term === 'FIRST' ? 1 : 2 }}학기
                  </option>
                </MySelect>
              </div>
              <div class="form-group">
                <label for="opening-professor">담당 교수</label>
                <MyInput id="opening-professor" :model-value="authStore.userInfo?.name || ''" placeholder="로그인한 교수" readonly />
              </div>
            </div>
            <h4 class="syllabus-label">강의 내용 (필수)</h4>
            <ProfessorWeeklySyllabus :key="syllabusEditorKey" v-model="form.syllabus" />
          </MyCard>
        </div>

        <p v-if="formError" class="form-error full-width" role="alert">{{ formError }}</p>

        <div class="form-actions full-width">
          <MyButton v-if="!editingRequestId" btn-type="button" color="white" size="big" content="임시저장 불러오기" :disabled="isSubmitting || isLoadingEdit" @click="restoreDraft" />
          <MyButton v-if="!editingRequestId" btn-type="button" color="white" size="middle" content="임시저장" :disabled="isSubmitting || isLoadingEdit" @click="saveDraft" />
          <MyButton
            v-if="editingRequestId"
            btn-type="button"
            class="secondary-button"
            color="white"
            size="middle"
            content="수정 취소"
            :disabled="isSubmitting"
            @click="resetForm"
          />
          <MyButton
            btn-type="submit"
            color="deep-blue"
            size="big"
            :content="isSubmitting
              ? (editingRequestId ? '수정 중...' : '신청 중...')
              : (editingRequestId ? '신청 수정' : '강의 개설 신청')"
            :disabled="isSubmitting || ratioTotal !== 100 || schedules.length === 0"
          />
        </div>
      </form>
    </div>

    <section class="history-section">
      <div class="history-header">
        <h3 class="section-title">나의 강의 개설 신청 내역</h3>
        <MySelect v-model="historyStatus" class="history-status" aria-label="신청 상태" @change="loadHistory(1)">
          <option value="">전체 상태</option>
          <option value="PENDING">심사중</option>
          <option value="APPROVED">승인</option>
          <option value="REJECTED">반려</option>
        </MySelect>
      </div>
      <MyTable
        :columns="historyColumns"
        :loading="isLoadingHistory"
        :empty="!isLoadingHistory && history.length === 0"
        empty-message="강의 개설 신청 내역이 없습니다."
      >
        <tr v-for="item in history" :key="item.openingRequestId">
          <td>{{ item.courseName }} ({{ item.courseCode }})</td>
          <td>{{ item.academicYear }}학년도 {{ item.term === 'FIRST' ? 1 : 2 }}학기</td>
          <td>{{ item.sectionNo }}</td>
          <td :class="statusClass(item.status)">
            {{ statusLabels[item.status] || item.status }}
            <div v-if="item.status === 'REJECTED' && item.rejectReason" class="reject-reason">{{ item.rejectReason }}</div>
          </td>
          <td>{{ formatDate(item.createdAt, 'YYYY-MM-DD HH:mm') }}</td>
          <td>
            <MyButton
              v-if="item.status === 'PENDING'"
              btn-type="button"
              class="secondary-button"
              color="white"
              size="small"
              :content="isLoadingEdit ? '불러오는 중...' : '수정'"
              :disabled="isLoadingEdit"
              @click="editRequest(item)"
            />
            <span v-else class="action-disabled">수정 불가</span>
          </td>
        </tr>
      </MyTable>
      <PrevNextPagination
        v-if="historyPage.page > 1 || historyPage.hasNext"
        :page="historyPage.page"
        :has-next="historyPage.hasNext"
        @page-change="loadHistory"
      />
    </section>
  </MyPageContainer>
</template>

<style scoped>
.import-controls { display: flex; gap: 8px; align-items: end; }
.import-controls select { flex: 1; min-width: 0; }
.content-card {
  margin-bottom: 28px;
}

.create-form-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 20px;
}

.full-width {
  grid-column: 1 / -1;
}

.form-column {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.edit-notice {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  border: 1px solid var(--personal-color-professor-primary-navy);
  border-radius: 4px;
  background: var(--personal-color-info-soft-ice);
  color: var(--personal-color-primary-text-navy);
  font-size: 0.8rem;
}

.section-box,
.schedule-section,
.ratio-section,
.syllabus-section {
  padding: 20px;
}

.syllabus-meta { margin-bottom: 20px; }
.syllabus-label { margin: 0 0 10px; font-size: 0.88rem; }

.common-section-header {
  margin-bottom: 20px;
}

.common-section-header h3 {
  margin: 0;
  color: var(--personal-color-primary-text-navy);
  font-size: 1rem;
  font-weight: 700;
}

.course-guide {
  margin: -8px 0 18px;
  color: var(--personal-color-text-muted-slate);
  font-size: 0.82rem;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
}

.form-group,
.ratio-group {
  display: flex;
  min-width: 0;
  flex-direction: column;
  text-align: left;
}

.form-group.full-width {
  grid-column: span 2;
}

.form-group label,
.ratio-group label {
  margin-bottom: 8px;
  color: var(--personal-color-primary-text-navy);
  font-size: 0.88rem;
  font-weight: 600;
}

.form-group :deep(input),
.ratio-group :deep(input) {
  width: 100%;
  min-width: 0;
}

.schedule-creator {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr auto;
  align-items: end;
  gap: 12px;
}

.add-button {
  margin-bottom: 4px;
}

.schedule-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 24px;
}

.schedule-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 10px 16px;
  border: 1px solid var(--personal-color-border-mist);
  border-radius: 6px;
  background: var(--personal-color-info-soft-ice);
  color: var(--personal-color-primary-text-navy);
  font-size: 0.9rem;
}

.schedule-item span {
  font-weight: 600;
}

.empty-schedule-text {
  margin: 24px 0 0;
  color: var(--personal-color-text-muted-slate);
  font-size: 0.85rem;
  font-style: italic;
}

.ratio-inputs {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.ratio-group :deep(input) {
  text-align: center;
}

.ratio-indicator {
  margin-top: 18px;
  color: var(--personal-color-primary-text-navy);
  font-size: 0.9rem;
  font-weight: 500;
}

.ratio-indicator.invalid {
  color: var(--personal-color-red);
}

.syllabus-section {
  display: flex;
  height: 100%;
  min-height: 100%;
  flex-direction: column;
}

.syllabus-section textarea {
  width: 100%;
  min-height: 520px;
  flex: 1;
  box-sizing: border-box;
  padding: 12px 16px;
  border: 1px solid var(--personal-color-border-mist);
  border-radius: 8px;
  color: var(--personal-color-primary-text-navy);
  background: var(--personal-color-white);
  font-size: 0.9rem;
  font-family: inherit;
  font-weight: 400;
  line-height: 1.6;
  outline: none;
  resize: none;
}

.syllabus-section textarea:focus {
  border-color: var(--personal-color-professor-primary-navy);
}

.form-error {
  margin: 0;
  color: var(--personal-color-red);
  font-size: 0.82rem;
}

.form-actions {
  display: flex;
  grid-column: 1 / -1;
  justify-content: flex-end;
  gap: 16px;
  margin-top: 14px;
  padding-top: 24px;
  border-top: 1px solid var(--personal-color-border-mist);
}

.history-section {
  margin-top: 28px;
}

.section-title {
  margin: 0;
  color: var(--personal-color-primary-text-navy);
  font-size: 1rem;
  font-weight: 700;
}

.history-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.history-status {
  max-width: 150px;
}

.reject-reason {
  margin-top: 4px;
  color: var(--personal-color-red);
  font-size: 0.74rem;
}

.action-disabled {
  color: var(--personal-color-text-faint-fog);
  font-size: 0.76rem;
}

.opening-status.pending {
  color: var(--personal-color-status-warning-text-amber);
}

.opening-status.approved {
  color: var(--personal-color-status-success-text-forest);
}

.opening-status.rejected {
  color: var(--personal-color-status-fail-text-maroon);
}

:deep(.secondary-button) {
  border: 1px solid var(--personal-color-border-mist);
  color: var(--personal-color-primary-navy);
}

@media (max-width: 1000px) {
  .create-form-layout {
    grid-template-columns: 1fr;
  }

  .full-width,
  .form-actions {
    grid-column: 1;
  }

  .syllabus-section textarea {
    min-height: 320px;
  }
}

@media (max-width: 640px) {
  .edit-notice,
  .history-header {
    align-items: stretch;
    flex-direction: column;
  }

  .history-status {
    max-width: 100%;
  }

  .info-grid,
  .ratio-inputs,
  .schedule-creator {
    grid-template-columns: 1fr;
  }

  .form-group.full-width {
    grid-column: 1;
  }

  .add-button {
    margin-bottom: 0;
  }
}
</style>
