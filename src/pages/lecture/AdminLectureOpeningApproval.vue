<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import {
  getLectureOpeningRequest,
  getLectureOpeningRequests,
  reviewLectureOpeningRequest,
} from '../../api/lectureApi';
import MyButton from '../../components/button/MyButton.vue';
import MyStatusBadge from '../../components/common/MyStatusBadge.vue';
import MyInput from '../../components/input/MyInput.vue';
import MySelect from '../../components/input/MySelect.vue';
import MyPageContainer from '../../components/layout/MyPageContainer.vue';
import PrevNextPagination from '../../components/pagination/PrevNextPagination.vue';
import MyTable from '../../components/table/MyTable.vue';
import { confirmDialog, notify } from '../../composables/useDialog';
import { useSemesterStore } from '../../store/semester/useSemesterStore';
import { formatDate } from '../../util/format';

defineOptions({ name: 'AdminLectureOpeningApproval' });

const DAY_OPTIONS = [
  { value: 'MON', label: '월' },
  { value: 'TUE', label: '화' },
  { value: 'WED', label: '수' },
  { value: 'THU', label: '목' },
  { value: 'FRI', label: '금' },
];
const DAY_LABELS = Object.fromEntries(DAY_OPTIONS.map((day) => [day.value, day.label]));
const STATUS_LABELS = { PENDING: '승인 대기', APPROVED: '승인 완료', REJECTED: '반려' };
const STATUS_VARIANTS = { PENDING: 'processing', APPROVED: 'success', REJECTED: 'fail' };
const STATUS_OPTIONS = [
  { value: '', label: '전체 상태' },
  { value: 'PENDING', label: '승인 대기' },
  { value: 'APPROVED', label: '승인 완료' },
  { value: 'REJECTED', label: '반려' },
];
const columns = [
  { key: 'id', label: '신청번호' },
  { key: 'course', label: '교과목' },
  { key: 'professor', label: '담당 교수' },
  { key: 'semester', label: '개설 학기' },
  { key: 'schedule', label: '강의 시간' },
  { key: 'status', label: '처리 상태' },
  { key: 'createdAt', label: '신청일' },
  { key: 'action', label: '관리' },
];

const semesterStore = useSemesterStore();
const filters = reactive({ status: 'PENDING' });
const requests = ref([]);
const selectedRequest = ref(null);
const schedules = ref([]);
const rejectReason = ref('');
const formError = ref('');
const isLoading = ref(false);
const isLoadingDetail = ref(false);
const isProcessing = ref(false);
const page = ref({ page: 1, size: 20, totalCount: 0, hasNext: false });
const correction = reactive({
  courseId: '',
  semesterId: '',
  sectionNo: '',
  requestedCapacity: '',
  classroom: '',
  midtermRatio: '',
  finalRatio: '',
  assignmentRatio: '',
  attendanceRatio: '',
  syllabus: '',
});

const ratioTotal = computed(() => (
  [correction.midtermRatio, correction.finalRatio, correction.assignmentRatio, correction.attendanceRatio]
    .reduce((sum, value) => sum + (Number(value) || 0), 0)
));
const isPending = computed(() => selectedRequest.value?.status === 'PENDING');

const semesterLabel = (item) => `${item.academicYear}학년도 ${item.term === 'FIRST' ? 1 : 2}학기`;
const scheduleLabel = (items = []) => items.length
  ? items.map((item) => `${DAY_LABELS[item.dayOfWeek] || item.dayOfWeek} ${item.startPeriod}~${item.endPeriod}교시`).join(', ')
  : '-';

const fillCorrection = (detail) => {
  correction.courseId = String(detail.courseId ?? '');
  correction.semesterId = detail.semesterId ?? '';
  correction.sectionNo = detail.sectionNo || '';
  correction.requestedCapacity = String(detail.requestedCapacity ?? '');
  correction.classroom = detail.classroom || '';
  correction.midtermRatio = String(detail.midtermRatio ?? '');
  correction.finalRatio = String(detail.finalRatio ?? '');
  correction.assignmentRatio = String(detail.assignmentRatio ?? '');
  correction.attendanceRatio = String(detail.attendanceRatio ?? '');
  correction.syllabus = detail.syllabus || '';
  schedules.value = (detail.schedules || []).map((schedule) => ({
    dayOfWeek: schedule.dayOfWeek,
    startPeriod: String(schedule.startPeriod),
    endPeriod: String(schedule.endPeriod),
  }));
  if (!schedules.value.length) schedules.value = [{ dayOfWeek: 'MON', startPeriod: '1', endPeriod: '1' }];
};

const load = async (pageNumber = 1) => {
  isLoading.value = true;
  try {
    const response = await getLectureOpeningRequests({
      status: filters.status || undefined,
      page: pageNumber,
      size: 20,
    });
    const data = response.data.data;
    requests.value = data.items || [];
    page.value = {
      page: data.page,
      size: data.size,
      totalCount: data.totalCount,
      hasNext: data.hasNext,
    };
  } catch (error) {
    requests.value = [];
    page.value = { page: 1, size: 20, totalCount: 0, hasNext: false };
    await notify(error.response?.data?.message || '강의 개설 신청 목록을 불러오지 못했습니다.');
  } finally {
    isLoading.value = false;
  }
};

const selectRequest = async (requestId) => {
  if (isLoadingDetail.value || isProcessing.value) return;
  isLoadingDetail.value = true;
  formError.value = '';
  rejectReason.value = '';
  try {
    const response = await getLectureOpeningRequest(requestId);
    selectedRequest.value = response.data.data;
    fillCorrection(selectedRequest.value);
  } catch (error) {
    await notify(error.response?.data?.message || '강의 개설 신청 상세를 불러오지 못했습니다.');
  } finally {
    isLoadingDetail.value = false;
  }
};

const resetFilters = () => {
  filters.status = 'PENDING';
  selectedRequest.value = null;
  load(1);
};

const addSchedule = async () => {
  if (schedules.value.length >= 10) {
    await notify('강의 시간표는 최대 10개까지 입력할 수 있습니다.');
    return;
  }
  schedules.value.push({ dayOfWeek: 'MON', startPeriod: '1', endPeriod: '1' });
};

const removeSchedule = (index) => {
  if (schedules.value.length <= 1) return;
  schedules.value.splice(index, 1);
};

const validateCorrection = () => {
  if (!correction.courseId || Number(correction.courseId) <= 0) return '교과목 번호를 확인해 주세요.';
  if (!correction.semesterId || Number(correction.semesterId) <= 0) return '개설 학기를 선택해 주세요.';
  if (!/^[0-9A-Za-z-]{1,10}$/.test(correction.sectionNo.trim())) return '분반은 영문, 숫자, 하이픈 10자 이내로 입력해 주세요.';
  const capacity = Number(correction.requestedCapacity);
  if (!Number.isInteger(capacity) || capacity < 1 || capacity > 1000) return '정원은 1~1000 사이로 입력해 주세요.';
  if (!correction.classroom.trim() || correction.classroom.trim().length > 50) return '강의실은 50자 이내로 입력해 주세요.';
  const ratios = [correction.midtermRatio, correction.finalRatio, correction.assignmentRatio, correction.attendanceRatio].map(Number);
  if (ratios.some((value) => !Number.isInteger(value) || value < 0 || value > 100)) return '성적 반영 비율은 각각 0~100 사이여야 합니다.';
  if (ratioTotal.value !== 100) return '성적 반영 비율의 합은 100이어야 합니다.';
  if (!correction.syllabus.trim()) return '강의계획서 내용을 입력해 주세요.';
  if (correction.syllabus.trim().length > 65535) return '강의계획서는 65,535자 이하여야 합니다.';
  if (!schedules.value.length || schedules.value.length > 10) return '강의 시간표를 1~10개 입력해 주세요.';
  const occupied = new Set();
  for (const schedule of schedules.value) {
    const start = Number(schedule.startPeriod);
    const end = Number(schedule.endPeriod);
    if (!schedule.dayOfWeek || !Number.isInteger(start) || !Number.isInteger(end) || start < 1 || end > 20 || start > end) {
      return '강의 시간표의 요일과 교시를 올바르게 입력해 주세요.';
    }
    for (let period = start; period <= end; period += 1) {
      const key = `${schedule.dayOfWeek}:${period}`;
      if (occupied.has(key)) return '같은 요일의 강의 시간이 서로 겹칠 수 없습니다.';
      occupied.add(key);
    }
  }
  return '';
};

const correctionPayload = () => ({
  courseId: Number(correction.courseId),
  semesterId: Number(correction.semesterId),
  sectionNo: correction.sectionNo.trim(),
  requestedCapacity: Number(correction.requestedCapacity),
  classroom: correction.classroom.trim(),
  midtermRatio: Number(correction.midtermRatio),
  finalRatio: Number(correction.finalRatio),
  assignmentRatio: Number(correction.assignmentRatio),
  attendanceRatio: Number(correction.attendanceRatio),
  syllabus: correction.syllabus.trim(),
  schedules: schedules.value.map((schedule) => ({
    dayOfWeek: schedule.dayOfWeek,
    startPeriod: Number(schedule.startPeriod),
    endPeriod: Number(schedule.endPeriod),
  })),
});

const approve = async () => {
  if (!isPending.value || isProcessing.value) return;
  formError.value = validateCorrection();
  if (formError.value) return;
  const confirmed = await confirmDialog('검토한 내용으로 강의 개설을 승인하시겠습니까? 승인 즉시 강의와 시간표가 생성됩니다.');
  if (!confirmed) return;

  isProcessing.value = true;
  try {
    const response = await reviewLectureOpeningRequest({
      openingRequestId: selectedRequest.value.openingRequestId,
      approved: true,
      rejectReason: null,
      correction: correctionPayload(),
    });
    selectedRequest.value = response.data.data;
    fillCorrection(selectedRequest.value);
    await notify('강의 개설 신청을 승인했습니다.');
    await load(page.value.page);
  } catch (error) {
    await notify(error.response?.data?.message || '강의 개설 승인 중 오류가 발생했습니다.');
  } finally {
    isProcessing.value = false;
  }
};

const reject = async () => {
  if (!isPending.value || isProcessing.value) return;
  const reason = rejectReason.value.trim();
  if (!reason) {
    formError.value = '반려 사유를 입력해 주세요.';
    return;
  }
  if (reason.length > 500) {
    formError.value = '반려 사유는 500자 이하여야 합니다.';
    return;
  }
  const confirmed = await confirmDialog('입력한 사유로 강의 개설 신청을 반려하시겠습니까?');
  if (!confirmed) return;

  isProcessing.value = true;
  try {
    const response = await reviewLectureOpeningRequest({
      openingRequestId: selectedRequest.value.openingRequestId,
      approved: false,
      rejectReason: reason,
      correction: null,
    });
    selectedRequest.value = response.data.data;
    fillCorrection(selectedRequest.value);
    await notify('강의 개설 신청을 반려했습니다.');
    await load(page.value.page);
  } catch (error) {
    await notify(error.response?.data?.message || '강의 개설 반려 중 오류가 발생했습니다.');
  } finally {
    isProcessing.value = false;
  }
};

onMounted(async () => {
  try {
    await semesterStore.fetchSemesters();
  } catch (error) {
    await notify(error.response?.data?.message || '학기 목록을 불러오지 못했습니다.');
  }
  await load();
});
</script>

<template>
  <MyPageContainer
    title="강의 개설 승인"
    subtitle="교수의 강의 개설 신청을 검토하고 필요한 정보를 보정한 뒤 승인하거나 반려합니다."
  >
    <section class="filter-card">
      <label for="opening-status">처리 상태</label>
      <MySelect
        id="opening-status"
        v-model="filters.status"
        :options="STATUS_OPTIONS"
        @change="load(1)"
      />
      <div class="filter-actions">
        <MyButton
          color="admin-indigo"
          size="middle"
          content="조회"
          @click="load(1)"
        />
        <MyButton
          class="reset-button"
          color="white"
          size="middle"
          content="초기화"
          @click="resetFilters"
        />
      </div>
    </section>

    <div class="management-grid">
      <section class="list-card">
        <div class="section-heading">
          <h3>강의 개설 신청 목록</h3>
          <span>총 {{ page.totalCount }}건</span>
        </div>
        <div class="table-scroll">
          <MyTable
            :columns="columns"
            :loading="isLoading"
            :empty="!isLoading && requests.length === 0"
            empty-message="조건에 맞는 강의 개설 신청이 없습니다."
          >
            <tr
              v-for="item in requests"
              :key="item.openingRequestId"
              :class="{ selected: selectedRequest?.openingRequestId === item.openingRequestId }"
            >
              <td>{{ item.openingRequestId }}</td>
              <td class="course-cell">
                <strong>{{ item.courseName }}</strong><span>{{ item.courseCode }} · {{ item.sectionNo }}분반</span>
              </td>
              <td>{{ item.professorName }}</td>
              <td>{{ semesterLabel(item) }}</td>
              <td>{{ scheduleLabel(item.schedules) }}</td>
              <td>
                <MyStatusBadge
                  :label="STATUS_LABELS[item.status] || item.status"
                  :variant="STATUS_VARIANTS[item.status] || 'processing'"
                />
              </td>
              <td>{{ formatDate(item.createdAt, 'YYYY-MM-DD HH:mm') }}</td>
              <td>
                <MyButton
                  color="white"
                  size="small"
                  :content="isLoadingDetail ? '조회 중' : '상세'"
                  :disabled="isLoadingDetail || isProcessing"
                  @click="selectRequest(item.openingRequestId)"
                />
              </td>
            </tr>
          </MyTable>
        </div>
        <PrevNextPagination
          v-if="page.page > 1 || page.hasNext"
          :page="page.page"
          :has-next="page.hasNext"
          @page-change="load"
        />
      </section>

      <aside class="review-card">
        <div class="section-heading">
          <h3>신청 상세 및 검토</h3>
          <MyStatusBadge
            v-if="selectedRequest"
            :label="STATUS_LABELS[selectedRequest.status] || selectedRequest.status"
            :variant="STATUS_VARIANTS[selectedRequest.status] || 'processing'"
          />
        </div>

        <p
          v-if="!selectedRequest"
          class="empty-detail"
        >
          목록에서 검토할 신청을 선택해 주세요.
        </p>

        <template v-else>
          <dl class="request-summary">
            <div><dt>신청번호</dt><dd>{{ selectedRequest.openingRequestId }}</dd></div>
            <div><dt>담당 교수</dt><dd>{{ selectedRequest.professorName }}</dd></div>
            <div><dt>교과목</dt><dd>{{ selectedRequest.courseName }} ({{ selectedRequest.courseCode }})</dd></div>
            <div><dt>신청일</dt><dd>{{ formatDate(selectedRequest.createdAt, 'YYYY-MM-DD HH:mm') }}</dd></div>
            <div v-if="selectedRequest.reviewedAt">
              <dt>처리일</dt><dd>{{ formatDate(selectedRequest.reviewedAt, 'YYYY-MM-DD HH:mm') }}</dd>
            </div>
            <div v-if="selectedRequest.lectureId">
              <dt>생성 강의번호</dt><dd>{{ selectedRequest.lectureId }}</dd>
            </div>
          </dl>

          <div class="form-grid">
            <label>교과목 번호<MyInput
              v-model="correction.courseId"
              numeric-only
              :disabled="!isPending"
            /></label>
            <label>개설 학기<MySelect
              v-model="correction.semesterId"
              :disabled="!isPending"
            >
              <option
                v-for="semester in semesterStore.semesters"
                :key="semester.id"
                :value="semester.id"
              >
                {{ semester.academicYear }}학년도 {{ semester.term === 'FIRST' ? 1 : 2 }}학기
              </option>
            </MySelect></label>
            <label>분반<MyInput
              v-model="correction.sectionNo"
              maxlength="10"
              :disabled="!isPending"
            /></label>
            <label>정원<MyInput
              v-model="correction.requestedCapacity"
              numeric-only
              :max-number="1000"
              :disabled="!isPending"
            /></label>
            <label class="wide-field">강의실<MyInput
              v-model="correction.classroom"
              maxlength="50"
              :disabled="!isPending"
            /></label>
          </div>

          <div class="ratio-grid">
            <label>중간(%)<MyInput
              v-model="correction.midtermRatio"
              numeric-only
              :max-number="100"
              :disabled="!isPending"
            /></label>
            <label>기말(%)<MyInput
              v-model="correction.finalRatio"
              numeric-only
              :max-number="100"
              :disabled="!isPending"
            /></label>
            <label>과제(%)<MyInput
              v-model="correction.assignmentRatio"
              numeric-only
              :max-number="100"
              :disabled="!isPending"
            /></label>
            <label>출석(%)<MyInput
              v-model="correction.attendanceRatio"
              numeric-only
              :max-number="100"
              :disabled="!isPending"
            /></label>
            <strong :class="{ invalid: ratioTotal !== 100 }">합계 {{ ratioTotal }}%</strong>
          </div>

          <section class="schedule-section">
            <div class="subheading">
              <h4>강의 시간표</h4>
              <MyButton
                v-if="isPending"
                color="white"
                size="small"
                content="추가"
                :disabled="schedules.length >= 10"
                @click="addSchedule"
              />
            </div>
            <div
              v-for="(schedule, index) in schedules"
              :key="index"
              class="schedule-row"
            >
              <MySelect
                v-model="schedule.dayOfWeek"
                :disabled="!isPending"
                :options="DAY_OPTIONS"
              />
              <MyInput
                v-model="schedule.startPeriod"
                numeric-only
                :max-number="20"
                :disabled="!isPending"
              />
              <span>~</span>
              <MyInput
                v-model="schedule.endPeriod"
                numeric-only
                :max-number="20"
                :disabled="!isPending"
              />
              <MyButton
                v-if="isPending"
                color="white"
                size="small"
                content="삭제"
                :disabled="schedules.length <= 1"
                @click="removeSchedule(index)"
              />
            </div>
          </section>

          <label class="syllabus-field">강의계획서<textarea
            v-model="correction.syllabus"
            rows="6"
            maxlength="65535"
            :disabled="!isPending"
          /></label>

          <template v-if="isPending">
            <label class="reject-field">반려 사유<textarea
              v-model="rejectReason"
              rows="3"
              maxlength="500"
              placeholder="반려할 경우 사유를 입력해 주세요."
            /></label>
            <p
              v-if="formError"
              class="form-error"
              role="alert"
            >
              {{ formError }}
            </p>
            <div class="decision-actions">
              <MyButton
                color="red"
                size="big"
                :content="isProcessing ? '처리 중' : '반려'"
                :disabled="isProcessing"
                @click="reject"
              />
              <MyButton
                color="admin-indigo"
                size="big"
                :content="isProcessing ? '처리 중' : '보정 후 승인'"
                :disabled="isProcessing"
                @click="approve"
              />
            </div>
          </template>

          <p
            v-else-if="selectedRequest.rejectReason"
            class="processed-reason"
          >
            <strong>반려 사유</strong>{{ selectedRequest.rejectReason }}
          </p>
        </template>
      </aside>
    </div>
  </MyPageContainer>
</template>

<style scoped>
.filter-card { display: grid; grid-template-columns: 100px 180px auto; align-items: center; gap: 12px; padding: 18px 20px; border: 1px solid var(--personal-color-border-mist); border-radius: 8px; background: var(--personal-color-white); }
.filter-card > label { font-size: .82rem; font-weight: 700; }
.filter-actions { display: flex; justify-content: flex-end; gap: 8px; }
.reset-button { border: 1px solid var(--personal-color-border-mist); color: var(--personal-color-admin-secondary-indigo); }
.management-grid { display: grid; grid-template-columns: minmax(0, 1.45fr) minmax(390px, .75fr); align-items: start; gap: 18px; margin-top: 20px; }
.list-card, .review-card { padding: 18px; border: 1px solid var(--personal-color-border-mist); border-radius: 8px; background: var(--personal-color-white); }
.review-card { position: sticky; top: 84px; }
.section-heading, .subheading { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.section-heading { margin-bottom: 14px; }
.section-heading h3, .subheading h4 { margin: 0; font-size: 1rem; }
.section-heading > span:first-of-type { color: var(--personal-color-admin-secondary-indigo); font-size: .8rem; font-weight: 700; }
.table-scroll { overflow-x: auto; }
.selected { background: var(--personal-color-indigo-soft-lavender); }
.course-cell strong, .course-cell span { display: block; white-space: nowrap; }
.course-cell span { margin-top: 3px; color: var(--personal-color-text-muted-slate); font-size: .75rem; }
.empty-detail { margin: 60px 0; color: var(--personal-color-text-muted-slate); text-align: center; }
.request-summary { display: grid; grid-template-columns: 1fr 1fr; gap: 0 18px; padding: 12px; margin: 0 0 18px; border-radius: 6px; background: var(--personal-color-bg-surface-frost); }
.request-summary div { display: grid; grid-template-columns: 90px 1fr; gap: 8px; padding: 6px 0; }
.request-summary dt { color: var(--personal-color-text-muted-slate); font-size: .76rem; }
.request-summary dd { margin: 0; font-size: .78rem; font-weight: 600; text-align: right; }
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.wide-field { grid-column: 1 / -1; }
.form-grid label, .ratio-grid label, .syllabus-field, .reject-field { display: flex; flex-direction: column; gap: 5px; color: var(--personal-color-primary-text-navy); font-size: .78rem; font-weight: 700; }
.ratio-grid { display: grid; grid-template-columns: repeat(4, 1fr); align-items: end; gap: 8px; margin-top: 14px; }
.ratio-grid strong { grid-column: 1 / -1; color: var(--personal-color-text-muted-slate); font-size: .78rem; text-align: right; }
.ratio-grid strong.invalid, .form-error { color: var(--personal-color-danger-coral); }
.schedule-section { padding: 14px 0; margin-top: 14px; border-top: 1px solid var(--personal-color-table-border-frost); border-bottom: 1px solid var(--personal-color-table-border-frost); }
.schedule-row { display: grid; grid-template-columns: 90px 1fr auto 1fr auto; align-items: center; gap: 6px; margin-top: 8px; }
.syllabus-field, .reject-field { margin-top: 14px; }
textarea { box-sizing: border-box; width: 100%; padding: 10px 12px; border: 1px solid var(--personal-color-border-mist); border-radius: 4px; font: inherit; font-weight: 400; resize: vertical; }
textarea:disabled { color: var(--personal-color-text-secondary-steel); background: var(--personal-color-bg-subtle-snow); }
.form-error { margin: 8px 0 0; font-size: .78rem; }
.decision-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 14px; }
:deep(button.white) { border: 1px solid var(--personal-color-border-mist); color: var(--personal-color-admin-secondary-indigo); }
.processed-reason { display: flex; flex-direction: column; gap: 6px; padding: 12px; margin: 14px 0 0; border-radius: 5px; color: var(--personal-color-status-fail-text-maroon); background: var(--personal-color-status-fail-bg-blush); font-size: .8rem; }
@media (max-width: 1180px) { .management-grid { grid-template-columns: 1fr; } .review-card { position: static; } }
@media (max-width: 700px) { .filter-card { grid-template-columns: 1fr; } .filter-actions { justify-content: flex-start; } .request-summary, .form-grid { grid-template-columns: 1fr; } .ratio-grid { grid-template-columns: 1fr 1fr; } .schedule-row { grid-template-columns: 1fr 1fr; } .schedule-row > span { display: none; } }
</style>
