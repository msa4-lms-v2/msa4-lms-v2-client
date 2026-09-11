<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import {
  createLectureOpeningRequest,
  getLectureOpeningRequest,
  getLectureOpeningRequests,
  updateLectureOpeningRequest,
} from '../../api/lectureApi';
import MyPageContainer from '../../components/layout/MyPageContainer.vue';
import MyButton from '../../components/button/MyButton.vue';
import MyInput from '../../components/input/MyInput.vue';
import MySelect from '../../components/input/MySelect.vue';
import MyTable from '../../components/table/MyTable.vue';
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

const statusLabels = { PENDING: '심사중', APPROVED: '승인', REJECTED: '반려' };

const historyColumns = [
  { key: 'course', label: '교과목' },
  { key: 'semester', label: '학기' },
  { key: 'sectionNo', label: '분반' },
  { key: 'status', label: '처리 상태' },
  { key: 'createdAt', label: '신청일' },
  { key: 'action', label: '관리' },
];

const semesterStore = useSemesterStore();

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

const schedules = ref([{ dayOfWeek: 'MON', startPeriod: '1', endPeriod: '2' }]);
const weeklyPlans = ref([{ week: '1', content: '' }]);
const formError = ref('');
const isSubmitting = ref(false);
const editingRequestId = ref(null);
const isLoadingEdit = ref(false);
const history = ref([]);
const isLoadingHistory = ref(false);
const historyStatus = ref('');
const historyPage = ref({ page: 1, size: 20, totalCount: 0, hasNext: false });

const ratioTotal = computed(() => (
  [form.midtermRatio, form.finalRatio, form.assignmentRatio, form.attendanceRatio]
    .reduce((sum, value) => sum + (Number(value) || 0), 0)
));

const serializeWeeklyPlans = () => weeklyPlans.value
  .map((plan) => `${Number(plan.week)}주차: ${plan.content.trim()}`)
  .join('\n');

const parseWeeklyPlans = (syllabus) => {
  const plans = String(syllabus || '')
    .split('\n')
    .map((line) => line.match(/^(\d{1,2})주차:\s*(.*)$/))
    .filter(Boolean)
    .map((matched) => ({ week: matched[1], content: matched[2] }));

  return plans.length > 0
    ? plans
    : [{ week: '1', content: String(syllabus || '').trim() }];
};

const addWeeklyPlan = async () => {
  if (weeklyPlans.value.length >= 16) {
    await notify('주차별 강의 내용은 최대 16개까지 입력할 수 있습니다.');
    return;
  }
  weeklyPlans.value.push({ week: String(weeklyPlans.value.length + 1), content: '' });
};

const removeWeeklyPlan = (index) => {
  if (weeklyPlans.value.length <= 1) return;
  weeklyPlans.value.splice(index, 1);
};

const addScheduleRow = async () => {
  if (schedules.value.length >= 10) {
    await notify('강의 시간표는 최대 10개까지 입력할 수 있습니다.');
    return;
  }
  schedules.value.push({ dayOfWeek: 'MON', startPeriod: '1', endPeriod: '1' });
};

const removeScheduleRow = (index) => {
  if (schedules.value.length <= 1) return;
  schedules.value.splice(index, 1);
};

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
  schedules.value = [{ dayOfWeek: 'MON', startPeriod: '1', endPeriod: '2' }];
  weeklyPlans.value = [{ week: '1', content: '' }];
  formError.value = '';
  editingRequestId.value = null;
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
  const weekSet = new Set();
  for (const plan of weeklyPlans.value) {
    const week = Number(plan.week);
    if (!Number.isInteger(week) || week < 1 || week > 16 || !plan.content.trim()) {
      return '주차와 주차별 강의 내용을 모두 입력해 주세요.';
    }
    if (weekSet.has(week)) return '같은 주차를 중복해서 입력할 수 없습니다.';
    weekSet.add(week);
  }
  if (serializeWeeklyPlans().length > 65535) return '강의계획서는 65,535자 이하여야 합니다.';
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

const editRequest = async (item) => {
  if (item.status !== 'PENDING' || isLoadingEdit.value) return;
  isLoadingEdit.value = true;
  try {
    const response = await getLectureOpeningRequest(item.openingRequestId);
    const detail = response.data.data;
    editingRequestId.value = detail.openingRequestId;
    form.courseId = String(detail.courseId);
    form.semesterId = detail.semesterId;
    form.sectionNo = detail.sectionNo || '';
    form.requestedCapacity = String(detail.requestedCapacity ?? '');
    form.classroom = detail.classroom || '';
    form.midtermRatio = String(detail.midtermRatio ?? 0);
    form.finalRatio = String(detail.finalRatio ?? 0);
    form.assignmentRatio = String(detail.assignmentRatio ?? 0);
    form.attendanceRatio = String(detail.attendanceRatio ?? 0);
    form.syllabus = detail.syllabus || '';
    weeklyPlans.value = parseWeeklyPlans(detail.syllabus);
    schedules.value = (detail.schedules || []).map((schedule) => ({
      dayOfWeek: schedule.dayOfWeek,
      startPeriod: String(schedule.startPeriod),
      endPeriod: String(schedule.endPeriod),
    }));
    if (schedules.value.length === 0) {
      schedules.value = [{ dayOfWeek: 'MON', startPeriod: '1', endPeriod: '2' }];
    }
    formError.value = '';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } catch (error) {
    await notify(error.response?.data?.message || '강의 개설 신청 상세를 불러오지 못했습니다.');
  } finally {
    isLoadingEdit.value = false;
  }
};

const submitRequest = async () => {
  if (isSubmitting.value) return;
  formError.value = validate();
  if (formError.value) return;

  const isEditing = Boolean(editingRequestId.value);
  const confirmed = await confirmDialog(
    isEditing ? '수정한 내용으로 강의 개설 신청을 보완하시겠습니까?' : '입력한 내용으로 강의 개설을 신청하시겠습니까?',
  );
  if (!confirmed) return;

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
    syllabus: serializeWeeklyPlans(),
    schedules: schedules.value.map((schedule) => ({
      dayOfWeek: schedule.dayOfWeek,
      startPeriod: Number(schedule.startPeriod),
      endPeriod: Number(schedule.endPeriod),
    })),
  };

  isSubmitting.value = true;
  try {
    const response = isEditing
      ? await updateLectureOpeningRequest(editingRequestId.value, payload)
      : await createLectureOpeningRequest(payload);
    const saved = response.data.data;
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
  <MyPageContainer :title="editingRequestId ? '강의 개설 신청 수정' : '강의 개설 신청'">
    <form class="request-card" @submit.prevent="submitRequest">
      <div v-if="editingRequestId" class="edit-notice">
        <strong>신청 번호 {{ editingRequestId }} 수정 중</strong>
        <span>처리 대기 상태에서만 수정할 수 있습니다.</span>
      </div>
      <p class="course-guide">교과목 번호(교과목 ID)는 학과사무실 교과목 안내 자료를 통해 확인할 수 있습니다.</p>

      <div class="form-grid">
        <label class="form-field" for="opening-course-id">
          <span>교과목 번호</span>
          <MyInput id="opening-course-id" v-model="form.courseId" numeric-only placeholder="예: 31" />
        </label>

        <label class="form-field" for="opening-semester">
          <span>개설 학기</span>
          <MySelect id="opening-semester" v-model="form.semesterId">
            <option value="" disabled>학기를 선택해 주세요</option>
            <option v-for="semester in semesterStore.semesters" :key="semester.id" :value="semester.id">
              {{ semester.academicYear }}학년도 {{ semester.term === 'FIRST' ? 1 : 2 }}학기
            </option>
          </MySelect>
        </label>

        <label class="form-field" for="opening-section">
          <span>분반</span>
          <MyInput id="opening-section" v-model="form.sectionNo" maxlength="10" placeholder="예: 01" />
        </label>

        <label class="form-field" for="opening-capacity">
          <span>신청 정원</span>
          <MyInput id="opening-capacity" v-model="form.requestedCapacity" numeric-only :max-number="1000" placeholder="예: 40" />
        </label>

        <label class="form-field" for="opening-classroom">
          <span>강의실</span>
          <MyInput id="opening-classroom" v-model="form.classroom" maxlength="50" placeholder="예: 공학관 301호" />
        </label>
      </div>

      <div class="ratio-grid">
        <label class="form-field" for="opening-midterm">
          <span>중간고사(%)</span>
          <MyInput id="opening-midterm" v-model="form.midtermRatio" numeric-only :max-number="100" />
        </label>
        <label class="form-field" for="opening-final">
          <span>기말고사(%)</span>
          <MyInput id="opening-final" v-model="form.finalRatio" numeric-only :max-number="100" />
        </label>
        <label class="form-field" for="opening-assignment">
          <span>과제(%)</span>
          <MyInput id="opening-assignment" v-model="form.assignmentRatio" numeric-only :max-number="100" />
        </label>
        <label class="form-field" for="opening-attendance">
          <span>출석(%)</span>
          <MyInput id="opening-attendance" v-model="form.attendanceRatio" numeric-only :max-number="100" />
        </label>
        <div class="ratio-total" :class="{ 'ratio-total--invalid': ratioTotal !== 100 }">합계 {{ ratioTotal }}%</div>
      </div>

      <div class="schedule-section">
        <div class="schedule-header">
          <span>강의 시간표</span>
          <MyButton
            btn-type="button"
            class="schedule-add-button"
            color="white"
            size="small"
            content="시간 추가"
            :disabled="schedules.length >= 10"
            @click="addScheduleRow"
          />
        </div>
        <div v-for="(schedule, index) in schedules" :key="index" class="schedule-row">
          <MySelect v-model="schedule.dayOfWeek" class="schedule-day">
            <option v-for="day in DAY_OPTIONS" :key="day.value" :value="day.value">{{ day.label }}</option>
          </MySelect>
          <MyInput v-model="schedule.startPeriod" numeric-only :max-number="20" placeholder="시작 교시" />
          <span class="schedule-tilde">~</span>
          <MyInput v-model="schedule.endPeriod" numeric-only :max-number="20" placeholder="종료 교시" />
          <MyButton
            btn-type="button"
            color="white"
            size="small"
            content="삭제"
            :disabled="schedules.length <= 1"
            @click="removeScheduleRow(index)"
          />
        </div>
      </div>

      <section class="weekly-plan-section">
        <div class="weekly-plan-header">
          <div>
            <span>강의 계획서</span>
          </div>
          <MyButton
            btn-type="button"
            color="white"
            size="big"
            content="주차 입력란 추가"
            :disabled="weeklyPlans.length >= 16"
            @click="addWeeklyPlan"
          />
        </div>

        <div v-for="(plan, index) in weeklyPlans" :key="index" class="weekly-plan-row">
          <MySelect v-model="plan.week" :aria-label="`${index + 1}번째 주차 선택`">
            <option v-for="week in 16" :key="week" :value="String(week)">{{ week }}주차</option>
          </MySelect>
          <MyInput
            v-model="plan.content"
            maxlength="500"
            :placeholder="`${plan.week}주차 강의 내용을 입력하세요.`"
            :aria-label="`${plan.week}주차 강의 내용`"
          />
          <MyButton
            btn-type="button"
            color="white"
            size="small"
            content="삭제"
            :disabled="weeklyPlans.length <= 1"
            @click="removeWeeklyPlan(index)"
          />
        </div>
      </section>

      <p v-if="formError" class="form-error" role="alert">{{ formError }}</p>

      <div class="form-actions">
        <MyButton
          v-if="editingRequestId"
          btn-type="button"
          color="white"
          size="middle"
          content="수정 취소"
          :disabled="isSubmitting"
          @click="resetForm"
        />
        <MyButton
          btn-type="submit"
          color="deep-blue"
          size="middle"
          :content="isSubmitting
            ? (editingRequestId ? '수정 중...' : '신청 중...')
            : (editingRequestId ? '신청 수정' : '개설 신청')"
          :disabled="isSubmitting"
        />
      </div>
    </form>

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
          <td :class="{ rejected: item.status === 'REJECTED' }">
            {{ statusLabels[item.status] || item.status }}
            <div v-if="item.status === 'REJECTED' && item.rejectReason" class="reject-reason">{{ item.rejectReason }}</div>
          </td>
          <td>{{ formatDate(item.createdAt, 'YYYY-MM-DD HH:mm') }}</td>
          <td>
            <MyButton
              v-if="item.status === 'PENDING'"
              btn-type="button"
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
.request-card {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.05fr);
  align-items: start;
  gap: 14px 16px;
  padding: 20px;
  margin-bottom: 28px;
  border: 1px solid var(--personal-color-border-mist);
  border-radius: 8px;
  background: var(--personal-color-white);
}

.course-guide {
  grid-column: 1;
  margin: 0 0 14px;
  color: var(--personal-color-text-muted-slate);
  font-size: 0.82rem;
}

.edit-notice {
  grid-column: 1 / -1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  margin-bottom: 14px;
  border: 1px solid var(--personal-color-professor-primary-navy);
  border-radius: 4px;
  background: var(--personal-color-info-soft-ice);
  color: var(--personal-color-primary-text-navy);
  font-size: 0.8rem;
}

.form-grid {
  grid-column: 1;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  margin-bottom: 16px;
}

.ratio-grid {
  grid-column: 1;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr)) auto;
  align-items: end;
  gap: 12px;
  margin-bottom: 16px;
}

.ratio-total {
  padding-bottom: 9px;
  color: var(--personal-color-text-muted-slate);
  font-size: 0.85rem;
  font-weight: 600;
  white-space: nowrap;
}

.ratio-total--invalid {
  color: var(--personal-color-red);
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  color: var(--personal-color-primary-text-navy);
  font-size: 0.82rem;
  font-weight: 600;
}

.form-field textarea {
  width: 100%;
  box-sizing: border-box;
  padding: 10px 12px;
  border: 1px solid var(--personal-color-border-mist);
  border-radius: 4px;
  font-size: 0.88rem;
  font-family: inherit;
  font-weight: 400;
  resize: vertical;
}

.schedule-section {
  grid-column: 1;
  margin-bottom: 16px;
}

.schedule-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  color: var(--personal-color-primary-text-navy);
  font-size: 0.82rem;
  font-weight: 600;
}

.schedule-row {
  display: grid;
  grid-template-columns: 90px 1fr auto 1fr auto;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.schedule-tilde {
  text-align: center;
  color: var(--personal-color-text-muted-slate);
}

.weekly-plan-section {
  grid-column: 2;
  grid-row: 2 / span 4;
  min-height: 420px;
  margin-bottom: 16px;
  padding: 16px;
  border: 1px solid var(--personal-color-border-mist);
  border-radius: 6px;
  background: var(--personal-color-bg-subtle-snow);
}

.weekly-plan-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
  color: var(--personal-color-primary-text-navy);
  font-size: 0.86rem;
  font-weight: 700;
}

.weekly-plan-header small {
  display: block;
  margin-top: 4px;
  color: var(--personal-color-text-muted-slate);
  font-size: 0.76rem;
  font-weight: 400;
}

.weekly-plan-row {
  display: grid;
  grid-template-columns: 110px minmax(0, 1fr) auto;
  gap: 8px;
  margin-top: 8px;
}

.form-error {
  grid-column: 1 / -1;
  margin: 8px 0 0;
  color: var(--personal-color-red);
  font-size: 0.82rem;
}

.form-actions {
  grid-column: 1 / -1;
  display: flex;
  justify-content: flex-end;
  margin-top: 14px;
}

.section-title {
  margin: 0;
  color: var(--personal-color-primary-text-navy);
  font-size: 1rem;
  font-weight: 700;
}

.schedule-add-button {
  width: 72px;
  flex: 0 0 72px;
  white-space: nowrap;
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

.rejected {
  color: var(--personal-color-danger-coral);
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

:deep(.page-container) {
  max-width: 1120px;
  padding: 18px 16px 40px;
}

:deep(.page-heading h2) {
  margin: 0 0 16px;
  font-size: 1.4rem;
}

@media (max-width: 860px) {
  .request-card {
    grid-template-columns: 1fr;
  }

  .course-guide,
  .form-grid,
  .ratio-grid,
  .schedule-section,
  .weekly-plan-section,
  .form-error,
  .form-actions {
    grid-column: 1;
    grid-row: auto;
  }

  .form-grid {
    grid-template-columns: 1fr 1fr;
  }

  .ratio-grid {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 560px) {
  .edit-notice,
  .history-header {
    align-items: stretch;
    flex-direction: column;
  }

  .history-status {
    max-width: 100%;
  }

  .form-grid,
  .ratio-grid {
    grid-template-columns: 1fr;
  }

  .schedule-row {
    grid-template-columns: 1fr 1fr;
  }

  .weekly-plan-header {
    align-items: stretch;
    flex-direction: column;
  }

  .weekly-plan-row {
    grid-template-columns: 1fr;
  }
}
</style>
