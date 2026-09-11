<script setup>
import { computed, onMounted, ref } from 'vue';
import { createGradeDraft, finalizeGrades, getManagedGrades, updateGradeDraft } from '../../api/gradeApi';
import { getMyLectures } from '../../api/lectureApi';
import MyPageContainer from '../../components/layout/MyPageContainer.vue';
import MyButton from '../../components/button/MyButton.vue';
import MyInput from '../../components/input/MyInput.vue';
import MySelect from '../../components/input/MySelect.vue';
import MySearchFilter from '../../components/search/MySearchFilter.vue';
import MyTable from '../../components/table/MyTable.vue';
import { confirmDialog, notify } from '../../composables/useDialog';

defineOptions({ name: 'ProfessorGradeInput' });

const SCORE_FIELDS = ['midtermScore', 'finalScore', 'assignmentScore', 'attendanceScore'];
const termLabels = { FIRST: '1학기', SECOND: '2학기' };

const lectures = ref([]);
const selectedSemesterKey = ref('');
const selectedClassId = ref('');
const classInfo = ref(null);
const rows = ref([]);
const originalById = ref({});
const isLoadingLectures = ref(true);
const isLoadingGrades = ref(false);
const isSaving = ref(false);
const isFinalizing = ref(false);

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

const createIdempotencyKey = (prefix) => {
  const suffix = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}-${suffix}`;
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

const hasAnyScore = (row) => SCORE_FIELDS.some((field) => normalizeScore(row[field]) !== null);
const hasCompleteScores = (row) => SCORE_FIELDS.every((field) => normalizeScore(row[field]) !== null);

const hasOriginalInput = (enrollmentId) => {
  const original = originalById.value[enrollmentId];
  return original ? SCORE_FIELDS.some((field) => original[field] !== null && original[field] !== undefined) : false;
};

const isRowChanged = (row) => {
  const original = originalById.value[row.enrollmentId] || {};
  return SCORE_FIELDS.some((field) => normalizeScore(row[field]) !== normalizeScore(original[field]));
};

const completedCount = computed(() => rows.value.filter(hasCompleteScores).length);
const incompleteCount = computed(() => rows.value.filter((row) => !hasAnyScore(row)).length);

const hasUnsavedChanges = computed(() => rows.value.some(isRowChanged));
const canFinalize = computed(() => rows.value.length > 0
  && rows.value.every((row) => row.gradeStatus === 'DRAFT' && hasCompleteScores(row))
  && !hasUnsavedChanges.value);

const calculateTotal = (row) => {
  if (!classInfo.value || !hasCompleteScores(row)) return null;
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

const displayedTotal = (row) => {
  const preview = calculateTotal(row);
  return preview === null ? '-' : preview.toFixed(2);
};

const statusInfo = (row) => {
  if (row.gradeStatus === 'OPENED') return { label: '공개됨', variant: 'success' };
  if (!hasAnyScore(row)) return { label: '미입력', variant: 'warning' };
  return { label: '임시저장', variant: 'processing' };
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
    rows.value = (classInfo.value.grades || []).map(toRow);
    originalById.value = Object.fromEntries(
      (classInfo.value.grades || []).map((item) => [item.enrollmentId, item]),
    );
  } catch (error) {
    classInfo.value = null;
    rows.value = [];
    originalById.value = {};
    await notify(error.response?.data?.message || '성적 입력 현황을 불러오지 못했습니다.');
  } finally {
    isLoadingGrades.value = false;
  }
};

const changeSemester = async () => {
  selectedClassId.value = String(semesterLectures.value[0]?.classId || '');
  await loadGrades();
};

const buildScorePayload = (row) => ({
  enrollmentId: row.enrollmentId,
  midtermScore: normalizeScore(row.midtermScore),
  finalScore: normalizeScore(row.finalScore),
  assignmentScore: normalizeScore(row.assignmentScore),
  attendanceScore: normalizeScore(row.attendanceScore),
});

const validateScores = () => {
  for (const row of rows.value) {
    for (const field of SCORE_FIELDS) {
      const value = normalizeScore(row[field]);
      if (value !== null && (Number.isNaN(value) || value < 0 || value > 100)) {
        return `${row.studentName}의 점수는 0~100 사이여야 합니다.`;
      }
    }
  }
  return '';
};

const saveGrades = async () => {
  if (isSaving.value || !classInfo.value) return;
  const editableRows = rows.value.filter((row) => row.gradeStatus !== 'OPENED' && isRowChanged(row));
  if (!editableRows.length) {
    await notify('저장할 변경 내용이 없습니다.');
    return;
  }
  const validationMessage = validateScores();
  if (validationMessage) {
    await notify(validationMessage);
    return;
  }

  const newRows = editableRows.filter((row) => !hasOriginalInput(row.enrollmentId));
  const existingRows = editableRows.filter((row) => hasOriginalInput(row.enrollmentId));
  isSaving.value = true;
  try {
    if (newRows.length) {
      await createGradeDraft(Number(selectedClassId.value), newRows.map(buildScorePayload), createIdempotencyKey('grade-create'));
    }
    if (existingRows.length) {
      await updateGradeDraft(Number(selectedClassId.value), existingRows.map(buildScorePayload), createIdempotencyKey('grade-update'));
    }
    await notify('성적이 임시저장되었습니다.');
    await loadGrades();
  } catch (error) {
    await notify(error.response?.data?.message || '성적 저장 중 오류가 발생했습니다.');
  } finally {
    isSaving.value = false;
  }
};

const finalizeClassGrades = async () => {
  if (!classInfo.value || isFinalizing.value) return;
  if (hasUnsavedChanges.value) {
    await notify('변경된 점수를 먼저 임시저장해 주세요.');
    return;
  }
  if (!rows.value.length || rows.value.some((row) => !hasCompleteScores(row))) {
    await notify('모든 수강생의 네 가지 점수를 입력해야 성적을 공개할 수 있습니다.');
    return;
  }
  const confirmed = await confirmDialog('이 강의의 성적을 공개하시겠습니까? 공개 후에는 성적 정정 화면에서만 변경할 수 있습니다.');
  if (!confirmed) return;

  isFinalizing.value = true;
  try {
    await finalizeGrades(Number(selectedClassId.value), createIdempotencyKey('grade-finalize'));
    await notify('성적이 공개되었습니다.');
    await loadGrades();
  } catch (error) {
    await notify(error.response?.data?.message || '성적 공개 중 오류가 발생했습니다.');
  } finally {
    isFinalizing.value = false;
  }
};

onMounted(async () => {
  await loadLectures();
  await loadGrades();
});
</script>

<template>
  <MyPageContainer title="성적 입력">
    <MySearchFilter :show-submit="false">
      <div class="search-group">
        <label for="grade-semester">학기 선택</label>
        <MySelect id="grade-semester" v-model="selectedSemesterKey" :disabled="isLoadingLectures" @change="changeSemester">
          <option v-for="semester in semesterOptions" :key="semester.value" :value="semester.value">{{ semester.label }}</option>
        </MySelect>
      </div>
      <div class="search-group lecture-group">
        <label for="grade-lecture">강의 선택</label>
        <MySelect id="grade-lecture" v-model="selectedClassId" :disabled="isLoadingLectures" @change="loadGrades">
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

    <div v-if="selectedLecture" class="grade-stats">
      <div class="grade-stat">
        <span>입력 완료</span>
        <strong>{{ completedCount }}/{{ rows.length }}</strong>
      </div>
      <div class="grade-stat">
        <span>미입력</span>
        <strong>{{ incompleteCount }}명</strong>
      </div>
    </div>

    <h3 class="section-title">수강생 성적 입력</h3>
    <MyTable :columns="columns" :loading="isLoadingGrades" :empty="!isLoadingGrades && rows.length === 0" empty-message="활성 수강생이 없습니다.">
      <tr v-for="row in rows" :key="row.enrollmentId">
        <td>{{ row.studentName }}</td>
        <td>{{ row.studentNumber || '-' }}</td>
        <td><MyInput v-model="row.midtermScore" type="number" min="0" max="100" step="0.01" :disabled="row.gradeStatus === 'OPENED'" class="score-input" /></td>
        <td><MyInput v-model="row.finalScore" type="number" min="0" max="100" step="0.01" :disabled="row.gradeStatus === 'OPENED'" class="score-input" /></td>
        <td><MyInput v-model="row.assignmentScore" type="number" min="0" max="100" step="0.01" :disabled="row.gradeStatus === 'OPENED'" class="score-input" /></td>
        <td><MyInput v-model="row.attendanceScore" type="number" min="0" max="100" step="0.01" :disabled="row.gradeStatus === 'OPENED'" class="score-input" /></td>
        <td>{{ displayedTotal(row) }}</td>
        <td>{{ calculateLetterGrade(calculateTotal(row)) }}</td>
        <td>
          <span :class="['status-text', `status-text--${statusInfo(row).variant}`]">
            {{ statusInfo(row).label }}
          </span>
        </td>
      </tr>
    </MyTable>

    <div class="form-actions">
      <MyButton class="secondary-button" color="white" size="middle" :content="isSaving ? '저장 중...' : '임시저장'" :disabled="isSaving || isLoadingGrades || !hasUnsavedChanges" @click="saveGrades" />
      <MyButton class="professor-primary" color="deep-blue" size="big" :content="isFinalizing ? '처리 중...' : '성적 일괄 제출'" :disabled="isFinalizing || isLoadingGrades || !canFinalize" @click="finalizeClassGrades" />
    </div>
  </MyPageContainer>
</template>

<style scoped>
.status-text--success {
  color: var(--personal-color-status-success-text-forest);
}

.status-text--processing {
  color: var(--personal-color-status-processing-text-navy);
}

.status-text--warning {
  color: var(--personal-color-status-warning-text-amber);
}

.lecture-group :deep(select) { min-width: 300px; }
.lecture-summary { display: flex; flex-direction: column; gap: 6px; padding-bottom: 2px; }
.lecture-summary span { color: var(--personal-color-text-secondary-steel); font-size: 0.85rem; font-weight: 600; }
.lecture-summary strong { padding: 8px 0; color: var(--personal-color-professor-primary-navy); font-size: 0.95rem; }
.section-title { margin: 0 0 14px; font-size: 1rem; }
.grade-stats { display: flex; gap: 24px; margin: 20px 0; }
.grade-stat { display: flex; flex-direction: column; gap: 6px; padding: 16px 24px; border: 1px solid var(--personal-color-border-mist); border-radius: 8px; background: var(--personal-color-white); }
.grade-stat span { color: var(--personal-color-text-secondary-steel); font-size: 0.85rem; }
.grade-stat strong { color: var(--personal-color-primary-blue); font-size: 1.4rem; }
.score-input { width: 64px; text-align: center; }
.score-input:disabled { background: var(--personal-color-table-header-smoke); color: var(--personal-color-text-muted-slate); }
.form-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px; }
.professor-primary { background: var(--personal-color-professor-primary-navy); }
:deep(.secondary-button) { border: 1px solid var(--personal-color-border-mist); color: var(--personal-color-professor-primary-navy); }
@media (max-width: 900px) {
  .lecture-group :deep(select) { min-width: 220px; }
}
</style>
