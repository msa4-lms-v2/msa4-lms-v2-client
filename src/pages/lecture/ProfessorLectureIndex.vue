<script setup>
import { onMounted, reactive, ref } from 'vue';
import { getMyLectures } from '../../api/lectureApi';
import MySearchFilter from '../../components/search/MySearchFilter.vue';
import MyPageContainer from '../../components/layout/MyPageContainer.vue';
import MySelect from '../../components/input/MySelect.vue';
import MyTable from '../../components/table/MyTable.vue';
import NumberedPagination from '../../components/pagination/NumberedPagination.vue';
import { notify } from '../../composables/useDialog';
import { useSemesterStore } from '../../store/semester/useSemesterStore';

defineOptions({ name: 'ProfessorLectureIndex' });

const DAY_LABELS = {
  MON: '월',
  TUE: '화',
  WED: '수',
  THU: '목',
  FRI: '금',
};

const STATUS_LABELS = {
  OPEN: '개설',
  CLOSED: '종료',
};

const columns = [
  { key: 'semester', label: '연도 / 학기' },
  { key: 'courseCode', label: '과목코드' },
  { key: 'department', label: '학과' },
  { key: 'courseName', label: '강의명' },
  { key: 'credits', label: '학점' },
  { key: 'targetGrade', label: '대상학년' },
  { key: 'professor', label: '담당교수' },
  { key: 'classroom', label: '강의실' },
  { key: 'schedule', label: '시간' },
  { key: 'capacity', label: '정원' },
];

const semesterStore = useSemesterStore();
const filters = reactive({
  academicYear: '',
  term: '',
  status: '',
});
const lectures = ref([]);
const page = ref({ page: 1, size: 20, totalCount: 0, hasNext: false });
const isLoading = ref(false);

const formatSchedule = (schedules = []) => schedules
  .map((schedule) => `${DAY_LABELS[schedule.dayOfWeek] || schedule.dayOfWeek} ${schedule.startPeriod}~${schedule.endPeriod}교시`)
  .join(', ') || '-';

const load = async (pageNumber = 1) => {
  isLoading.value = true;
  try {
    const response = await getMyLectures({
      academicYear: filters.academicYear || undefined,
      term: filters.term || undefined,
      status: filters.status || undefined,
      page: pageNumber,
      size: 20,
    });
    const data = response.data.data;
    lectures.value = data.items || [];
    page.value = {
      page: data.page,
      size: data.size,
      totalCount: data.totalCount,
      hasNext: data.hasNext,
    };
  } catch (error) {
    lectures.value = [];
    page.value = { page: 1, size: 20, totalCount: 0, hasNext: false };
    await notify(error.response?.data?.message || '강의 목록을 불러오지 못했습니다.');
  } finally {
    isLoading.value = false;
  }
};

onMounted(async () => {
  try {
    await semesterStore.fetchSemesters();
    const current = semesterStore.semesters.find((semester) => semester.isCurrent ?? semester.current);
    if (current) { filters.academicYear = current.academicYear; filters.term = current.term; }
  } catch {
    // 학년도 선택지는 불러오지 못해도 강의 목록을 조회한다.
  }
  await load();
});
</script>

<template>
  <MyPageContainer class="professor-page" title="강의 조회">
    <MySearchFilter class="lecture-filter" submit-at-end aria-label="강의 조회 조건" @search="load(1)">
      <label class="filter-field" for="lecture-year">
        <span>연도</span>
        <MySelect id="lecture-year" v-model="filters.academicYear">
          <option value="">전체</option>
          <option v-for="year in semesterStore.academicYears" :key="year" :value="year">
            {{ year }}년
          </option>
        </MySelect>
      </label>

      <label class="filter-field" for="lecture-term">
        <span>학기</span>
        <MySelect id="lecture-term" v-model="filters.term">
          <option value="">전체</option>
          <option value="FIRST">1학기</option>
          <option value="SECOND">2학기</option>
        </MySelect>
      </label>

      <label class="filter-field" for="lecture-status">
        <span>상태</span>
        <MySelect id="lecture-status" v-model="filters.status">
          <option value="">전체</option>
          <option value="OPEN">개설</option>
          <option value="CLOSED">종료</option>
        </MySelect>
      </label>

    </MySearchFilter>

    <section class="lecture-section">
      <MyTable
        :columns="columns"
        :loading="isLoading"
        :empty="!isLoading && lectures.length === 0"
        empty-message="조회된 강의가 없습니다."
      >
        <tr v-for="lecture in lectures" :key="lecture.classId">
          <td>{{ lecture.academicYear }}년 {{ lecture.term === 'FIRST' ? '1학기' : lecture.term === 'SECOND' ? '2학기' : '-' }}</td>
          <td>{{ lecture.courseCode }}</td>
          <td>{{ lecture.departmentName }}</td>
          <td>
            <div class="course-name">{{ lecture.courseName }}</div>
            <div class="section-number">{{ lecture.sectionNo }}분반 · {{ STATUS_LABELS[lecture.status] || lecture.status }}</div>
          </td>
          <td>{{ lecture.credits }}</td>
          <td>{{ lecture.targetGrade ? `${lecture.targetGrade}학년` : '-' }}</td>
          <td>{{ lecture.professorName }}</td>
          <td>{{ lecture.classroom || '-' }}</td>
          <td>{{ formatSchedule(lecture.schedules) }}</td>
          <td>{{ lecture.currentEnrollmentCount }} / {{ lecture.capacity }}명</td>
        </tr>
      </MyTable>

      <NumberedPagination
        v-if="page.totalCount > page.size"
        :page="page.page"
        :total-count="page.totalCount"
        :size="page.size"
        color="professor-navy"
        @page-change="load"
      />
    </section>
  </MyPageContainer>
</template>

<style scoped>
.filter-field {
  flex: 0 1 200px;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 7px;
  color: var(--personal-color-primary-text-navy);
  font-size: 0.84rem;
  font-weight: 600;
}

.lecture-section {
  margin-top: 22px;
}

.course-name {
  color: var(--personal-color-primary-text-navy);
  font-weight: 400;
}

.section-number {
  margin-top: 3px;
  color: var(--personal-color-text-muted-slate);
  font-size: 0.76rem;
}

@media (max-width: 560px) {
  .filter-field {
    flex-basis: 100%;
  }
}
</style>
