<script setup>
import { computed, onMounted, ref } from 'vue';
import { getManagedGrades } from '../../api/gradeApi';
import { getMyLectures } from '../../api/lectureApi';
import MyPageContainer from '../../components/layout/MyPageContainer.vue';
import MySelect from '../../components/input/MySelect.vue';
import MyTable from '../../components/table/MyTable.vue';
import MyStatusBadge from '../../components/common/MyStatusBadge.vue';
import { notify } from '../../composables/useDialog';

defineOptions({ name: 'ProfessorGradeCorrection' });

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
const isLoadingLectures = ref(true);
const isLoadingGrades = ref(false);

const openedCount = computed(() => (classInfo.value?.grades || []).filter((item) => item.gradeStatus === 'OPENED').length);

const loadLectures = async () => {
  isLoadingLectures.value = true;
  try {
    const response = await getMyLectures({ page: 1, size: 100, current: true });
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
  } catch (error) {
    classInfo.value = null;
    await notify(error.response?.data?.message || '성적 현황을 불러오지 못했습니다.');
  } finally {
    isLoadingGrades.value = false;
  }
};

onMounted(async () => {
  await loadLectures();
  await loadGrades();
});
</script>

<template>
  <MyPageContainer title="성적 정정" subtitle="확정(OPENED)된 성적과 정정 가능 여부를 확인합니다.">
    <div class="lecture-select-row">
      <label for="correction-lecture">강의 선택</label>
      <MySelect
        id="correction-lecture"
        v-model="selectedClassId"
        :disabled="isLoadingLectures"
        @change="loadGrades"
      >
        <option v-for="lecture in lectures" :key="lecture.classId" :value="String(lecture.classId)">
          {{ lecture.courseName }} ({{ lecture.sectionNo }}분반)
        </option>
      </MySelect>
      <p v-if="!isLoadingLectures && !lectures.length" class="empty-inline">담당 중인 개설 강의가 없습니다.</p>
    </div>

    <section v-if="openedCount > 0" class="notice-card" role="status">
      <p class="notice-title">확정된 성적은 정정할 수 없습니다.</p>
      <p class="notice-body">
        백엔드 Academic 서비스는 일반 수정(임시저장 API)으로 확정(OPENED)된 성적을 되돌릴 수 있는
        기능을 제공하지 않습니다. 아래 목록에서 상태가 "확정"인 항목은 표시만 가능하며 정정할 수
        없고, "임시저장" 상태인 항목은 성적 입력 화면에서 계속 수정할 수 있습니다. 이미 확정된
        성적을 반드시 정정해야 한다면 관리자에게 문의해 주세요.
      </p>
    </section>

    <MyTable
      :columns="columns"
      :loading="isLoadingGrades"
      :empty="!isLoadingGrades && !(classInfo?.grades?.length)"
      empty-message="조회된 성적이 없습니다."
    >
      <tr v-for="row in classInfo?.grades || []" :key="row.enrollmentId">
        <td>{{ row.studentName }}</td>
        <td>{{ row.midtermScore ?? '-' }}</td>
        <td>{{ row.finalScore ?? '-' }}</td>
        <td>{{ row.assignmentScore ?? '-' }}</td>
        <td>{{ row.attendanceScore ?? '-' }}</td>
        <td>{{ row.totalScore ?? '-' }} / {{ row.letterGrade || '-' }}</td>
        <td>
          <MyStatusBadge :label="row.gradeStatus === 'OPENED' ? '확정' : '임시저장'" :variant="row.gradeStatus === 'OPENED' ? 'success' : 'processing'" />
        </td>
      </tr>
    </MyTable>
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

.notice-card {
  padding: 18px 20px;
  margin-bottom: 16px;
  border: 1px solid var(--personal-color-border-mist);
  border-radius: 8px;
  background: var(--personal-color-white);
}

.notice-title {
  margin: 0 0 8px;
  color: var(--personal-color-primary-text-navy);
  font-weight: 700;
}

.notice-body {
  margin: 0;
  color: var(--personal-color-text-muted-slate);
  line-height: 1.6;
  font-size: 0.85rem;
}
</style>
