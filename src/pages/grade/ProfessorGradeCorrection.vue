<script setup>
import { computed, onMounted, ref } from 'vue';
import { correctOpenedGrades, getGradeCorrectionHistories, getManagedGrades } from '../../api/gradeApi';
import { getMyLectures } from '../../api/lectureApi';
import MyPageContainer from '../../components/layout/MyPageContainer.vue';
import MyButton from '../../components/button/MyButton.vue';
import MyInput from '../../components/input/MyInput.vue';
import MySelect from '../../components/input/MySelect.vue';
import MySearchFilter from '../../components/search/MySearchFilter.vue';
import MyTable from '../../components/table/MyTable.vue';
import MyStatusBadge from '../../components/common/MyStatusBadge.vue';
import PrevNextPagination from '../../components/pagination/PrevNextPagination.vue';
import { confirmDialog, notify } from '../../composables/useDialog';

defineOptions({ name: 'ProfessorGradeCorrection' });

const SCORE_FIELDS = ['midtermScore', 'finalScore', 'assignmentScore', 'attendanceScore'];
const termLabels = { FIRST: '1학기', SECOND: '2학기' };
const historyFieldLabels = {
  MIDTERM_SCORE: '중간고사',
  FINAL_SCORE: '기말고사',
  ASSIGNMENT_SCORE: '과제',
  ATTENDANCE_SCORE: '출석',
  TOTAL_SCORE: '총점',
  LETTER_GRADE: '등급',
};

const lectures = ref([]);
const selectedSemesterKey = ref('');
const selectedClassId = ref('');
const classInfo = ref(null);
const rows = ref([]);
const originalById = ref({});
const correctionReason = ref('');
const histories = ref([]);
const historyPage = ref({ page: 1, hasNext: false });
const isLoadingLectures = ref(true);
const isLoadingGrades = ref(false);
const isLoadingHistories = ref(false);
const isSaving = ref(false);

const semesterKey = (lecture) => `${lecture.academicYear}-${lecture.term}`;
const semesterLabel = (lecture) => `${lecture.academicYear}학년도 ${termLabels[lecture.term] || lecture.term}`;

const semesterOptions = computed(() => {
  const seen = new Set();
  return lectures.value.reduce((options, lecture) => {
    const value = semesterKey(lecture);
    if (!seen.has(value)) {
      seen.add(value);
      options.push({ value, label: semesterLabel(lecture) });
    }
    return options;
  }, []);
});

const semesterLectures = computed(() => lectures.value.filter(
  (lecture) => semesterKey(lecture) === selectedSemesterKey.value,
));

const selectedLecture = computed(() => lectures.value.find(
  (lecture) => String(lecture.classId) === String(selectedClassId.value),
));

const columns = computed(() => [
  { key: 'studentName', label: '이름' },
  { key: 'studentNumber', label: '학번' },
  { key: 'midterm', label: `중간고사 (${classInfo.value?.midtermRatio ?? 0}%)` },
  { key: 'final', label: `기말고사 (${classInfo.value?.finalRatio ?? 0}%)` },
  { key: 'assignment', label: `과제 (${classInfo.value?.assignmentRatio ?? 0}%)` },
  { key: 'attendance', label: `출석 (${classInfo.value?.attendanceRatio ?? 0}%)` },
  { key: 'total', label: '총점' },
  { key: 'grade', label: '등급' },
  { key: 'status', label: '진행 상태' },
]);

const historyColumns = [
  { key: 'createdAt', label: '정정 일시' },
  { key: 'student', label: '학생' },
  { key: 'field', label: '변경 항목' },
  { key: 'before', label: '변경 전' },
  { key: 'after', label: '변경 후' },
  { key: 'changedBy', label: '처리자' },
  { key: 'reason', label: '정정 사유' },
];

const createIdempotencyKey = () => {
  const suffix = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `grade-correction-${suffix}`;
};

const normalizeScore = (value) => (value === '' || value === null || value === undefined ? null : Number(value));

const toRow = (item) => ({
  enrollmentId: item.enrollmentId,
  studentId: item.studentId,
  studentNumber: item.studentNumber,
  studentName: item.studentName,
  midtermScore: item.midtermScore ?? '',
  finalScore: item.finalScore ?? '',
  assignmentScore: item.assignmentScore ?? '',
  attendanceScore: item.attendanceScore ?? '',
  gradeStatus: item.gradeStatus,
});

const isRowChanged = (row) => {
  const original = originalById.value[row.enrollmentId] || {};
  return SCORE_FIELDS.some((field) => normalizeScore(row[field]) !== normalizeScore(original[field]));
};

const changedRows = computed(() => rows.value.filter(isRowChanged));

const calculateTotal = (row) => {
  if (!classInfo.value || SCORE_FIELDS.some((field) => normalizeScore(row[field]) === null)) return null;
  const ratios = [
    classInfo.value.midtermRatio,
    classInfo.value.finalRatio,
    classInfo.value.assignmentRatio,
    classInfo.value.attendanceRatio,
  ];
  return SCORE_FIELDS.reduce(
    (total, field, index) => total + (normalizeScore(row[field]) * Number(ratios[index] || 0)) / 100,
    0,
  );
};

const calculateLetterGrade = (total) => {
  if (total === null) return '-';
  if (total >= 95) return 'A+';
  if (total >= 90) return 'A';
  if (total >= 85) return 'B+';
  if (total >= 80) return 'B';
  if (total >= 75) return 'C+';
  if (total >= 70) return 'C';
  if (total >= 65) return 'D+';
  if (total >= 60) return 'D';
  return 'F';
};

const loadLectures = async () => {
  isLoadingLectures.value = true;
  try {
    const response = await getMyLectures({ page: 1, size: 100 });
    lectures.value = response.data.data.items || [];
    selectedSemesterKey.value = semesterOptions.value[0]?.value || '';
    selectedClassId.value = String(semesterLectures.value[0]?.classId || '');
  } catch (error) {
    lectures.value = [];
    await notify(error.response?.data?.message || '담당 강의 목록을 불러오지 못했습니다.');
  } finally {
    isLoadingLectures.value = false;
  }
};

const loadGrades = async () => {
  if (!selectedClassId.value) {
    classInfo.value = null;
    rows.value = [];
    return;
  }
  isLoadingGrades.value = true;
  try {
    const response = await getManagedGrades(Number(selectedClassId.value));
    classInfo.value = response.data.data;
    const openedGrades = (classInfo.value.grades || []).filter((item) => item.gradeStatus === 'OPENED');
    rows.value = openedGrades.map(toRow);
    originalById.value = Object.fromEntries(openedGrades.map((item) => [item.enrollmentId, item]));
  } catch (error) {
    classInfo.value = null;
    rows.value = [];
    originalById.value = {};
    await notify(error.response?.data?.message || '성적 현황을 불러오지 못했습니다.');
  } finally {
    isLoadingGrades.value = false;
  }
};

const loadHistories = async (pageNumber = 1) => {
  if (!selectedClassId.value) {
    histories.value = [];
    return;
  }
  isLoadingHistories.value = true;
  try {
    const response = await getGradeCorrectionHistories(Number(selectedClassId.value), { page: pageNumber, size: 20 });
    const data = response.data.data;
    histories.value = data.items || [];
    historyPage.value = { page: data.page, hasNext: data.hasNext };
  } catch (error) {
    histories.value = [];
    await notify(error.response?.data?.message || '성적 정정 이력을 불러오지 못했습니다.');
  } finally {
    isLoadingHistories.value = false;
  }
};

const loadSelectedClass = async () => {
  correctionReason.value = '';
  await Promise.all([loadGrades(), loadHistories(1)]);
};

const changeSemester = async () => {
  selectedClassId.value = String(semesterLectures.value[0]?.classId || '');
  await loadSelectedClass();
};

const validateCorrection = () => {
  for (const row of changedRows.value) {
    for (const field of SCORE_FIELDS) {
      const value = normalizeScore(row[field]);
      if (value === null || Number.isNaN(value) || value < 0 || value > 100) {
        return `${row.studentName}의 네 가지 점수를 모두 0~100 사이로 입력해 주세요.`;
      }
    }
  }
  const reason = correctionReason.value.trim();
  if (!reason) return '정정 사유를 입력해 주세요.';
  if (reason.length > 500) return '정정 사유는 500자 이내로 입력해 주세요.';
  return '';
};

const saveCorrections = async () => {
  if (isSaving.value || !selectedClassId.value) return;
  if (!changedRows.value.length) {
    await notify('저장할 변경 내용이 없습니다.');
    return;
  }
  const validationMessage = validateCorrection();
  if (validationMessage) {
    await notify(validationMessage);
    return;
  }
  const confirmed = await confirmDialog(`${changedRows.value.length}명의 공개 성적을 정정하시겠습니까? 변경 내용과 사유가 이력에 남습니다.`);
  if (!confirmed) return;

  const reason = correctionReason.value.trim();
  const corrections = changedRows.value.map((row) => ({
    enrollmentId: row.enrollmentId,
    midtermScore: normalizeScore(row.midtermScore),
    finalScore: normalizeScore(row.finalScore),
    assignmentScore: normalizeScore(row.assignmentScore),
    attendanceScore: normalizeScore(row.attendanceScore),
    reason,
  }));

  isSaving.value = true;
  try {
    await correctOpenedGrades(Number(selectedClassId.value), corrections, createIdempotencyKey());
    await notify('성적 정정이 완료되었습니다.');
    correctionReason.value = '';
    await Promise.all([loadGrades(), loadHistories(1)]);
  } catch (error) {
    await notify(error.response?.data?.message || '성적 정정 중 오류가 발생했습니다.');
  } finally {
    isSaving.value = false;
  }
};

const formatDateTime = (value) => {
  if (!value) return '-';
  return String(value).replace('T', ' ').slice(0, 16);
};

onMounted(async () => {
  await loadLectures();
  await loadSelectedClass();
});
</script>

<template>
  <MyPageContainer title="성적 정정">
    <MySearchFilter :show-submit="false">
      <div class="search-group">
        <label for="correction-semester">학기 선택</label>
        <MySelect id="correction-semester" v-model="selectedSemesterKey" :disabled="isLoadingLectures" @change="changeSemester">
          <option v-for="semester in semesterOptions" :key="semester.value" :value="semester.value">{{ semester.label }}</option>
        </MySelect>
      </div>
      <div class="search-group lecture-group">
        <label for="correction-lecture">강의 선택</label>
        <MySelect id="correction-lecture" v-model="selectedClassId" :disabled="isLoadingLectures" @change="loadSelectedClass">
          <option v-for="lecture in semesterLectures" :key="lecture.classId" :value="String(lecture.classId)">
            [{{ lecture.courseCode }}] {{ lecture.courseName }} ({{ lecture.sectionNo }}분반)
          </option>
        </MySelect>
      </div>
      <div v-if="selectedLecture" class="lecture-summary">
        <span>강의 정보</span>
        <strong>수강: {{ selectedLecture.currentEnrollmentCount }}명 | {{ semesterLabel(selectedLecture) }}</strong>
      </div>
    </MySearchFilter>

    <h3 class="section-title">성적 정정</h3>
    <MyTable :columns="columns" :loading="isLoadingGrades" :empty="!isLoadingGrades && rows.length === 0" empty-message="정정 가능한 공개 성적이 없습니다.">
      <tr v-for="row in rows" :key="row.enrollmentId" :class="{ 'changed-row': isRowChanged(row) }">
        <td>{{ row.studentName }}</td>
        <td>{{ row.studentNumber || '-' }}</td>
        <td><MyInput v-model="row.midtermScore" type="number" min="0" max="100" step="0.01" class="score-input" /></td>
        <td><MyInput v-model="row.finalScore" type="number" min="0" max="100" step="0.01" class="score-input" /></td>
        <td><MyInput v-model="row.assignmentScore" type="number" min="0" max="100" step="0.01" class="score-input" /></td>
        <td><MyInput v-model="row.attendanceScore" type="number" min="0" max="100" step="0.01" class="score-input" /></td>
        <td>{{ calculateTotal(row) === null ? '-' : calculateTotal(row).toFixed(2) }}</td>
        <td>{{ calculateLetterGrade(calculateTotal(row)) }}</td>
        <td><MyStatusBadge label="공개됨" variant="success" /></td>
      </tr>
    </MyTable>

    <div class="correction-controls">
      <div class="reason-field">
        <label for="correction-reason">정정 사유 <span>{{ correctionReason.length }}/500</span></label>
        <textarea id="correction-reason" v-model="correctionReason" maxlength="500" rows="2" placeholder="변경 사유를 입력해 주세요. 변경된 모든 학생의 정정 이력에 기록됩니다."></textarea>
      </div>
      <div class="save-area">
        <span v-if="changedRows.length">{{ changedRows.length }}명 변경</span>
        <MyButton class="action-button" color="deep-blue" size="middle" :content="isSaving ? '저장 중...' : '변경 사항 저장'" :disabled="isSaving || isLoadingGrades || !changedRows.length" @click="saveCorrections" />
      </div>
    </div>

    <section class="history-section">
      <h3 class="section-title">성적 정정 이력</h3>
      <MyTable :columns="historyColumns" :loading="isLoadingHistories" :empty="!isLoadingHistories && histories.length === 0" empty-message="성적 정정 이력이 없습니다.">
        <tr v-for="history in histories" :key="history.historyId">
          <td>{{ formatDateTime(history.createdAt) }}</td>
          <td>{{ history.studentName }}</td>
          <td>{{ historyFieldLabels[history.fieldChanged] || history.fieldChanged }}</td>
          <td>{{ history.previousValue ?? '-' }}</td>
          <td>{{ history.newValue ?? '-' }}</td>
          <td>{{ history.changedByName }}</td>
          <td class="history-reason">{{ history.reason }}</td>
        </tr>
      </MyTable>
      <PrevNextPagination v-if="historyPage.page > 1 || historyPage.hasNext" :page="historyPage.page" :has-next="historyPage.hasNext" @page-change="loadHistories" />
    </section>
  </MyPageContainer>
</template>

<style scoped>
.lecture-group :deep(select) { min-width: 300px; }
.lecture-summary { display: flex; flex-direction: column; gap: 6px; padding-bottom: 2px; }
.lecture-summary span { color: var(--personal-color-text-secondary-steel); font-size: 0.85rem; font-weight: 600; }
.lecture-summary strong { padding: 8px 0; color: var(--personal-color-primary-blue); font-size: 0.95rem; }
.section-title { margin: 0 0 14px; font-size: 1rem; }
.score-input { width: 64px; text-align: center; }
.changed-row { background: #f3f8ff; }
.correction-controls { display: flex; align-items: flex-end; gap: 16px; margin-top: 16px; }
.reason-field { display: flex; flex: 1; flex-direction: column; gap: 6px; }
.reason-field label { display: flex; justify-content: space-between; color: var(--personal-color-text-secondary-steel); font-size: 0.85rem; font-weight: 600; }
.reason-field textarea { min-height: 58px; padding: 10px 12px; border: 1px solid var(--personal-color-border-mist); border-radius: 4px; box-sizing: border-box; font: inherit; resize: vertical; }
.save-area { display: flex; align-items: center; gap: 10px; color: var(--personal-color-primary-blue); font-size: 0.85rem; font-weight: 700; }
.action-button { width: auto; min-width: 112px; padding: 0 14px; }
.history-section { margin-top: 36px; }
.history-reason { max-width: 260px; white-space: pre-wrap; text-align: left; }
@media (max-width: 900px) {
  .correction-controls { align-items: stretch; flex-direction: column; }
  .save-area { justify-content: flex-end; }
  .lecture-group :deep(select) { min-width: 220px; }
}
</style>
