<script setup>
import { computed, onMounted, ref } from 'vue';
import { getMyTimetable } from '../../api/enrollmentApi';
import MyPageContainer from '../../components/layout/MyPageContainer.vue';
import MySelect from '../../components/input/MySelect.vue';
import MyButton from '../../components/button/MyButton.vue';
import MyTable from '../../components/table/MyTable.vue';
import { useSemesterStore } from '../../store/semester/useSemesterStore';
import { notify } from '../../composables/useDialog';

defineOptions({ name: 'StudentTimetableIndex' });

const DAY_LABELS = { MON: '월', TUE: '화', WED: '수', THU: '목', FRI: '금' };

const columns = [
  { key: 'course', label: '교과목' },
  { key: 'schedule', label: '요일·교시' },
  { key: 'classroom', label: '강의실' },
  { key: 'professor', label: '담당교수' },
  { key: 'credits', label: '학점' },
];

const semesterStore = useSemesterStore();
const selectedAcademicYear = ref('');
const selectedTerm = ref('');
const items = ref([]);
const totalCredits = ref(0);
const isLoading = ref(false);
const loadError = ref('');

const academicYearOptions = computed(() => semesterStore.academicYears);

const formatSchedule = (schedules = []) => schedules
  .map((schedule) => `${DAY_LABELS[schedule.dayOfWeek] || schedule.dayOfWeek} ${schedule.startPeriod}~${schedule.endPeriod}교시`)
  .join(', ') || '-';

const applyDefaultSemester = () => {
  if (selectedAcademicYear.value && selectedTerm.value) return;
  const current = semesterStore.semesters.find((semester) => semester.isCurrent ?? semester.current);
  const fallback = [...semesterStore.semesters].sort((left, right) => (
    right.academicYear - left.academicYear || (right.term === 'SECOND' ? 1 : 0) - (left.term === 'SECOND' ? 1 : 0)
  ))[0];
  const target = current || fallback;
  if (target) {
    selectedAcademicYear.value = target.academicYear;
    selectedTerm.value = target.term;
  }
};

const loadTimetable = async () => {
  if (!selectedAcademicYear.value || !selectedTerm.value) {
    loadError.value = '조회할 학년도와 학기를 선택해 주세요.';
    return;
  }
  isLoading.value = true;
  loadError.value = '';
  try {
    const response = await getMyTimetable(Number(selectedAcademicYear.value), selectedTerm.value);
    items.value = response.data.data.items || [];
    totalCredits.value = response.data.data.totalCredits || 0;
  } catch (error) {
    items.value = [];
    totalCredits.value = 0;
    loadError.value = error.response?.data?.message || '시간표를 불러오지 못했습니다.';
    await notify(loadError.value);
  } finally {
    isLoading.value = false;
  }
};

onMounted(async () => {
  try {
    await semesterStore.fetchSemesters();
  } catch {
    // 학기 목록 조회 실패는 무시하고 학년도·학기 수동 선택으로 진행한다.
  }
  applyDefaultSemester();
  await loadTimetable();
});
</script>

<template>
  <MyPageContainer title="시간표 조회" subtitle="학년도·학기별 본인의 활성 수강 시간표를 확인합니다.">
    <div class="filter-row">
      <div class="filter-field">
        <label for="timetable-year">학년도</label>
        <MySelect id="timetable-year" v-model="selectedAcademicYear">
          <option v-for="year in academicYearOptions" :key="year" :value="year">{{ year }}학년도</option>
        </MySelect>
      </div>
      <div class="filter-field">
        <label for="timetable-term">학기</label>
        <MySelect id="timetable-term" v-model="selectedTerm">
          <option value="FIRST">1학기</option>
          <option value="SECOND">2학기</option>
        </MySelect>
      </div>
      <MyButton btn-type="button" color="deep-blue" size="middle" content="조회" @click="loadTimetable" />
    </div>

    <p v-if="loadError" class="error-text" role="alert">{{ loadError }}</p>

    <p class="summary-text">총 신청학점 <strong>{{ totalCredits }}</strong>학점</p>

    <MyTable
      :columns="columns"
      :loading="isLoading"
      :empty="!isLoading && items.length === 0"
      empty-message="조회된 시간표가 없습니다."
    >
      <tr v-for="item in items" :key="item.enrollmentId">
        <td>
          <div class="course-name">{{ item.courseName }}</div>
          <div class="course-code">{{ item.courseCode }} · {{ item.sectionNo }}분반</div>
        </td>
        <td>{{ formatSchedule(item.schedules) }}</td>
        <td>{{ item.classroom || '-' }}</td>
        <td>{{ item.professorName }}</td>
        <td>{{ item.credits }}</td>
      </tr>
    </MyTable>
  </MyPageContainer>
</template>

<style scoped>
.filter-row {
  display: flex;
  align-items: flex-end;
  gap: 16px;
  margin-bottom: 16px;
}

.filter-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 140px;
}

.filter-field label {
  color: var(--personal-color-text-secondary-steel);
  font-size: 0.85rem;
  font-weight: 600;
}

.error-text {
  margin: 0 0 12px;
  color: var(--personal-color-red);
  font-size: 0.85rem;
}

.summary-text {
  margin: 0 0 12px;
  color: var(--personal-color-primary-text-navy);
}

.course-name {
  font-weight: 600;
}

.course-code {
  margin-top: 2px;
  color: var(--personal-color-text-muted-slate);
  font-size: 0.78rem;
}
</style>
