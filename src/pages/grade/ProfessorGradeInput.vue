<script setup>
import { computed, onMounted, ref } from 'vue';
import { createGradeDraft, finalizeGrades, getManagedGrades, updateGradeDraft } from '../../api/gradeApi';
import { getMyLectures } from '../../api/lectureApi';
import MyPageContainer from '../../components/layout/MyPageContainer.vue';
import MyButton from '../../components/button/MyButton.vue';
import MyInput from '../../components/input/MyInput.vue';
import MySelect from '../../components/input/MySelect.vue';
import MyTable from '../../components/table/MyTable.vue';
import MyStatusBadge from '../../components/common/MyStatusBadge.vue';
import { confirmDialog, notify } from '../../composables/useDialog';

defineOptions({ name: 'ProfessorGradeInput' });

const SCORE_FIELDS = ['midtermScore', 'finalScore', 'assignmentScore', 'attendanceScore'];

const columns = [
  { key: 'student', label: '학생' },
  { key: 'midterm', label: '중간고사' },
  { key: 'final', label: '기말고사' },
  { key: 'assignment', label: '과제' },
  { key: 'attendance', label: '출석' },
  { key: 'total', label: '총점/등급' },
  { key: 'status', label: '상태' },
];

const lectures = ref([]);
const selectedClassId = ref('');
const classInfo = ref(null);
const rows = ref([]);
const originalById = ref({});
const isLoadingLectures = ref(true);
const isLoadingGrades = ref(false);
const isSaving = ref(false);
const isFinalizing = ref(false);

const selectedLecture = computed(() => lectures.value.find((lecture) => String(lecture.classId) === String(selectedClassId.value)));

const createIdempotencyKey = (prefix) => {
  const suffix = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}-${suffix}`;
};

const toRow = (item) => ({
  enrollmentId: item.enrollmentId,
  studentId: item.studentId,
  studentName: item.studentName,
  midtermScore: item.midtermScore ?? '',
  finalScore: item.finalScore ?? '',
  assignmentScore: item.assignmentScore ?? '',
  attendanceScore: item.attendanceScore ?? '',
  totalScore: item.totalScore,
  letterGrade: item.letterGrade,
  gradeStatus: item.gradeStatus,
});

const loadLectures = async () => {
  isLoadingLectures.value = true;
  try {
    const response = await getMyLectures({ page: 1, size: 100, current: true, status: 'OPEN' });
    lectures.value = response.data.data.items || [];
    if (lectures.value.length) selectedClassId.value = String(lectures.value[0].classId);
  } catch (error) {
    lectures.value = [];
    await notify(error.response?.data?.message || '담당 강의 목록을 불러오지 못했습니다.');
  } finally {
    isLoadingLectures.value = false;
  }
};

const loadGrades = async () => {
  if (!selectedClassId.value) return;
  isLoadingGrades.value = true;
  try {
    const response = await getManagedGrades(Number(selectedClassId.value));
    classInfo.value = response.data.data;
    rows.value = classInfo.value.grades.map(toRow);
    originalById.value = Object.fromEntries(classInfo.value.grades.map((item) => [item.enrollmentId, item]));
  } catch (error) {
    classInfo.value = null;
    rows.value = [];
    await notify(error.response?.data?.message || '성적 입력 현황을 불러오지 못했습니다.');
  } finally {
    isLoadingGrades.value = false;
  }
};

const hasOriginalInput = (enrollmentId) => {
  const original = originalById.value[enrollmentId];
  if (!original) return false;
  return SCORE_FIELDS.some((field) => original[field] !== null && original[field] !== undefined);
};

const isRowChanged = (row) => {
  const original = originalById.value[row.enrollmentId] || {};
  return SCORE_FIELDS.some((field) => {
    const currentValue = row[field] === '' ? null : row[field];
    const originalValue = original[field] ?? null;
    return String(currentValue ?? '') !== String(originalValue ?? '');
  });
};

const buildScorePayload = (row) => ({
  enrollmentId: row.enrollmentId,
  midtermScore: row.midtermScore === '' ? null : Number(row.midtermScore),
  finalScore: row.finalScore === '' ? null : Number(row.finalScore),
  assignmentScore: row.assignmentScore === '' ? null : Number(row.assignmentScore),
  attendanceScore: row.attendanceScore === '' ? null : Number(row.attendanceScore),
});

const validateScores = () => {
  for (const row of rows.value) {
    for (const field of SCORE_FIELDS) {
      if (row[field] === '') continue;
      const value = Number(row[field]);
      if (Number.isNaN(value) || value < 0 || value > 100) {
        return `${row.studentName}의 점수는 0~100 사이여야 합니다.`;
      }
    }
  }
  return '';
};

const saveGrades = async () => {
  if (isSaving.value || !classInfo.value) return;
  const editableRows = rows.value.filter((row) => row.gradeStatus !== 'OPENED' && isRowChanged(row));
  if (editableRows.length === 0) {
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
      await createGradeDraft(
        Number(selectedClassId.value),
        newRows.map(buildScorePayload),
        createIdempotencyKey('grade-create'),
      );
    }
    if (existingRows.length) {
      await updateGradeDraft(
        Number(selectedClassId.value),
        existingRows.map(buildScorePayload),
        createIdempotencyKey('grade-update'),
      );
    }
    await notify('성적이 저장되었습니다.');
    await loadGrades();
  } catch (error) {
    await notify(error.response?.data?.message || '성적 저장 중 오류가 발생했습니다.');
  } finally {
    isSaving.value = false;
  }
};

const finalizeClassGrades = async () => {
  if (!classInfo.value) return;
  const confirmed = await confirmDialog('이 강의의 성적을 확정하시겠습니까? 확정 후에는 일반 수정이 불가능합니다.');
  if (!confirmed) return;

  isFinalizing.value = true;
  try {
    await finalizeGrades(Number(selectedClassId.value), createIdempotencyKey('grade-finalize'));
    await notify('성적이 확정되었습니다.');
    await loadGrades();
  } catch (error) {
    await notify(error.response?.data?.message || '성적 확정 중 오류가 발생했습니다.');
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
  <MyPageContainer title="성적 입력" subtitle="담당 강의 활성 수강생의 중간·기말·과제·출석 점수를 입력합니다.">
    <div class="lecture-select-row">
      <label for="grade-lecture">강의 선택</label>
      <MySelect
        id="grade-lecture"
        v-model="selectedClassId"
        :disabled="isLoadingLectures"
        @change="loadGrades"
      >
        <option v-for="lecture in lectures" :key="lecture.classId" :value="String(lecture.classId)">
          {{ lecture.courseName }} ({{ lecture.sectionNo }}분반)
        </option>
      </MySelect>
      <p v-if="!isLoadingLectures && !lectures.length" class="empty-inline">현재 학기에 담당 중인 개설 강의가 없습니다.</p>
    </div>

    <template v-if="classInfo">
      <MyTable
        :columns="columns"
        :loading="isLoadingGrades"
        :empty="!isLoadingGrades && rows.length === 0"
        empty-message="활성 수강생이 없습니다."
      >
        <tr v-for="row in rows" :key="row.enrollmentId">
          <td>{{ row.studentName }}</td>
          <td>
            <MyInput v-model="row.midtermScore" numeric-only :disabled="row.gradeStatus === 'OPENED'" class="score-input" />
          </td>
          <td>
            <MyInput v-model="row.finalScore" numeric-only :disabled="row.gradeStatus === 'OPENED'" class="score-input" />
          </td>
          <td>
            <MyInput v-model="row.assignmentScore" numeric-only :disabled="row.gradeStatus === 'OPENED'" class="score-input" />
          </td>
          <td>
            <MyInput v-model="row.attendanceScore" numeric-only :disabled="row.gradeStatus === 'OPENED'" class="score-input" />
          </td>
          <td>{{ row.totalScore ?? '-' }} / {{ row.letterGrade || '-' }}</td>
          <td>
            <MyStatusBadge :label="row.gradeStatus === 'OPENED' ? '확정' : '임시저장'" :variant="row.gradeStatus === 'OPENED' ? 'success' : 'processing'" />
          </td>
        </tr>
      </MyTable>

      <div class="form-actions">
        <MyButton
          btn-type="button"
          color="deep-blue"
          size="middle"
          :content="isSaving ? '저장 중...' : '성적 저장'"
          :disabled="isSaving || isLoadingGrades"
          @click="saveGrades"
        />
        <MyButton
          btn-type="button"
          color="red"
          size="middle"
          :content="isFinalizing ? '확정 중...' : '성적 확정'"
          :disabled="isFinalizing || isLoadingGrades"
          @click="finalizeClassGrades"
        />
      </div>
    </template>
  </MyPageContainer>
</template>

<style scoped>
.lecture-select-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
}

.lecture-select-row label {
  color: var(--personal-color-text-secondary-steel);
  font-size: 0.85rem;
  font-weight: 600;
  white-space: nowrap;
}

.lecture-select-row :deep(select) {
  min-width: 260px;
}

.empty-inline {
  margin: 0;
  color: var(--personal-color-text-muted-slate);
  font-size: 0.84rem;
}

.score-input {
  width: 72px;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 16px;
}
</style>
