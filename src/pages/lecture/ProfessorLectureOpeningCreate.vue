<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { createLectureOpeningRequest, getLectureOpeningRequests } from '../../api/lectureApi';
import MyPageContainer from '../../components/layout/MyPageContainer.vue';
import MyButton from '../../components/button/MyButton.vue';
import MyInput from '../../components/input/MyInput.vue';
import MySelect from '../../components/input/MySelect.vue';
import MyTable from '../../components/table/MyTable.vue';
import MyStatusBadge from '../../components/common/MyStatusBadge.vue';
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
const statusVariants = { PENDING: 'processing', APPROVED: 'success', REJECTED: 'fail' };

const historyColumns = [
  { key: 'course', label: '교과목' },
  { key: 'semester', label: '학기' },
  { key: 'sectionNo', label: '분반' },
  { key: 'status', label: '처리 상태' },
  { key: 'createdAt', label: '신청일' },
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
const formError = ref('');
const isSubmitting = ref(false);
const history = ref([]);
const isLoadingHistory = ref(false);

const ratioTotal = computed(() => (
  [form.midtermRatio, form.finalRatio, form.assignmentRatio, form.attendanceRatio]
    .reduce((sum, value) => sum + (Number(value) || 0), 0)
));

const addScheduleRow = () => {
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
  formError.value = '';
};

const validate = () => {
  if (!form.courseId || Number(form.courseId) <= 0) return '교과목 번호를 입력해 주세요.';
  if (!form.semesterId) return '개설 학기를 선택해 주세요.';
  if (!form.sectionNo.trim()) return '분반을 입력해 주세요.';
  const capacity = Number(form.requestedCapacity);
  if (!Number.isInteger(capacity) || capacity < 1 || capacity > 1000) return '신청 정원은 1~1000 사이로 입력해 주세요.';
  if (!form.classroom.trim()) return '강의실을 입력해 주세요.';
  if (ratioTotal.value !== 100) return '성적 반영 비율(중간·기말·과제·출석)의 합은 100이어야 합니다.';
  if (!form.syllabus.trim()) return '강의계획서 내용을 입력해 주세요.';
  if (schedules.value.length === 0) return '강의 시간표를 하나 이상 입력해 주세요.';
  for (const schedule of schedules.value) {
    const start = Number(schedule.startPeriod);
    const end = Number(schedule.endPeriod);
    if (!schedule.dayOfWeek || !start || !end || start > end) {
      return '강의 시간표의 요일과 교시를 올바르게 입력해 주세요.';
    }
  }
  return '';
};

const loadHistory = async () => {
  isLoadingHistory.value = true;
  try {
    const response = await getLectureOpeningRequests({ page: 1, size: 20 });
    history.value = response.data.data.items || [];
  } catch (error) {
    history.value = [];
    await notify(error.response?.data?.message || '강의 개설 신청 내역을 불러오지 못했습니다.');
  } finally {
    isLoadingHistory.value = false;
  }
};

const submitRequest = async () => {
  if (isSubmitting.value) return;
  formError.value = validate();
  if (formError.value) return;

  const confirmed = await confirmDialog('입력한 내용으로 강의 개설을 신청하시겠습니까?');
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
    syllabus: form.syllabus.trim(),
    schedules: schedules.value.map((schedule) => ({
      dayOfWeek: schedule.dayOfWeek,
      startPeriod: Number(schedule.startPeriod),
      endPeriod: Number(schedule.endPeriod),
    })),
  };

  isSubmitting.value = true;
  try {
    const response = await createLectureOpeningRequest(payload);
    const created = response.data.data;
    resetForm();
    await notify(`강의 개설 신청이 접수되었습니다. (${created.courseName} · ${created.sectionNo}분반)`);
    await loadHistory();
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
  <MyPageContainer title="강의 개설" subtitle="담당 예정 교과목의 개설을 신청합니다. 관리자 승인 후 강의가 생성됩니다.">
    <form class="request-card" @submit.prevent="submitRequest">
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
          <MyInput id="opening-section" v-model="form.sectionNo" placeholder="예: 01" />
        </label>

        <label class="form-field" for="opening-capacity">
          <span>신청 정원</span>
          <MyInput id="opening-capacity" v-model="form.requestedCapacity" numeric-only :max-number="1000" placeholder="예: 40" />
        </label>

        <label class="form-field" for="opening-classroom">
          <span>강의실</span>
          <MyInput id="opening-classroom" v-model="form.classroom" placeholder="예: 공학관 301호" />
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
          <MyButton btn-type="button" color="white" size="small" content="시간 추가" @click="addScheduleRow" />
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

      <label class="form-field" for="opening-syllabus">
        <span>강의계획서</span>
        <textarea id="opening-syllabus" v-model="form.syllabus" rows="4" maxlength="65535" placeholder="강의 목표와 진행 방식을 입력해 주세요."></textarea>
      </label>

      <p v-if="formError" class="form-error" role="alert">{{ formError }}</p>

      <div class="form-actions">
        <MyButton
          type="submit"
          color="deep-blue"
          size="middle"
          :content="isSubmitting ? '신청 중...' : '개설 신청'"
          :disabled="isSubmitting"
        />
      </div>
    </form>

    <section class="history-section">
      <h3 class="section-title">나의 강의 개설 신청 내역</h3>
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
          <td>
            <MyStatusBadge :label="statusLabels[item.status] || item.status" :variant="statusVariants[item.status] || 'processing'" />
            <div v-if="item.status === 'REJECTED' && item.rejectReason" class="reject-reason">{{ item.rejectReason }}</div>
          </td>
          <td>{{ formatDate(item.createdAt, 'YYYY-MM-DD HH:mm') }}</td>
        </tr>
      </MyTable>
    </section>
  </MyPageContainer>
</template>

<style scoped>
.request-card {
  padding: 20px;
  margin-bottom: 28px;
  border: 1px solid var(--personal-color-border-mist);
  border-radius: 8px;
  background: var(--personal-color-white);
}

.course-guide {
  margin: 0 0 14px;
  color: var(--personal-color-text-muted-slate);
  font-size: 0.82rem;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
  margin-bottom: 16px;
}

.ratio-grid {
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

.form-error {
  margin: 8px 0 0;
  color: var(--personal-color-red);
  font-size: 0.82rem;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 14px;
}

.section-title {
  margin: 0 0 12px;
  color: var(--personal-color-primary-text-navy);
  font-size: 1rem;
  font-weight: 700;
}

.reject-reason {
  margin-top: 4px;
  color: var(--personal-color-red);
  font-size: 0.74rem;
}

@media (max-width: 860px) {
  .form-grid {
    grid-template-columns: 1fr 1fr;
  }

  .ratio-grid {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 560px) {
  .form-grid,
  .ratio-grid {
    grid-template-columns: 1fr;
  }

  .schedule-row {
    grid-template-columns: 1fr 1fr;
  }
}
</style>
