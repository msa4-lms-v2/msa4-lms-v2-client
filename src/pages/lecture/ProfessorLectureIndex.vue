<script setup>
import { onMounted, reactive, ref } from 'vue';
import { getMyLectures } from '../../api/lectureApi';
import MyPageContainer from '../../components/layout/MyPageContainer.vue';
import MySearchFilter from '../../components/search/MySearchFilter.vue';
import MySelect from '../../components/input/MySelect.vue';
import MyTable from '../../components/table/MyTable.vue';
import MyStatusBadge from '../../components/common/MyStatusBadge.vue';
import PrevNextPagination from '../../components/pagination/PrevNextPagination.vue';
import { useSemesterStore } from '../../store/semester/useSemesterStore';
import { notify } from '../../composables/useDialog';

defineOptions({ name: 'ProfessorLectureIndex' });

const DAY_LABELS = { MON: '월', TUE: '화', WED: '수', THU: '목', FRI: '금' };

const columns = [
  { key: 'course', label: '교과목' },
  { key: 'semester', label: '학기' },
  { key: 'schedule', label: '요일·교시' },
  { key: 'classroom', label: '강의실' },
  { key: 'enrollment', label: '수강 인원' },
  { key: 'status', label: '상태' },
];

const statusLabels = { OPEN: '개설', CLOSED: '종료' };
const statusVariants = { OPEN: 'success', CLOSED: 'warning' };

const semesterStore = useSemesterStore();
const filters = reactive({ academicYear: '', term: '', status: '' });
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
    page.value = { page: data.page, size: data.size, totalCount: data.totalCount, hasNext: data.hasNext };
  } catch (error) {
    lectures.value = [];
    await notify(error.response?.data?.message || '강의 목록을 불러오지 못했습니다.');
  } finally {
    isLoading.value = false;
  }
};

const applyFilters = () => load(1);

onMounted(async () => {
  try {
    await semesterStore.fetchSemesters();
  } catch {
    // 학년도 필터 목록 조회 실패는 무시하고 강의 목록 조회로 진행한다.
  }
  await load();
});
</script>

<template>
  <MyPageContainer title="강의 조회" subtitle="담당 강의의 시간표와 수강 현황을 조회합니다.">
    <MySearchFilter submit-text="조회" @search="applyFilters">
      <div class="search-group">
        <label for="lecture-year">학년도</label>
        <MySelect id="lecture-year" v-model="filters.academicYear">
          <option value="">전체</option>
          <option v-for="year in semesterStore.academicYears" :key="year" :value="year">{{ year }}학년도</option>
        </MySelect>
      </div>
      <div class="search-group">
        <label for="lecture-term">학기</label>
        <MySelect id="lecture-term" v-model="filters.term">
          <option value="">전체</option>
          <option value="FIRST">1학기</option>
          <option value="SECOND">2학기</option>
        </MySelect>
      </div>
      <div class="search-group">
        <label for="lecture-status">상태</label>
        <MySelect id="lecture-status" v-model="filters.status">
          <option value="">전체</option>
          <option value="OPEN">개설</option>
          <option value="CLOSED">종료</option>
        </MySelect>
      </div>
    </MySearchFilter>

    <MyTable
      :columns="columns"
      :loading="isLoading"
      :empty="!isLoading && lectures.length === 0"
      empty-message="조회된 강의가 없습니다."
    >
      <tr v-for="lecture in lectures" :key="lecture.classId">
        <td>
          <div class="course-name">{{ lecture.courseName }}</div>
          <div class="course-code">{{ lecture.courseCode }} · {{ lecture.sectionNo }}분반</div>
        </td>
        <td>{{ lecture.academicYear }}학년도 {{ lecture.term === 'FIRST' ? 1 : 2 }}학기</td>
        <td>{{ formatSchedule(lecture.schedules) }}</td>
        <td>{{ lecture.classroom || '-' }}</td>
        <td>{{ lecture.currentEnrollmentCount }} / {{ lecture.capacity }}명</td>
        <td>
          <MyStatusBadge :label="statusLabels[lecture.status] || lecture.status" :variant="statusVariants[lecture.status] || 'processing'" />
        </td>
      </tr>
    </MyTable>

    <PrevNextPagination
      v-if="page.page > 1 || page.hasNext"
      :page="page.page"
      :has-next="page.hasNext"
      @page-change="load"
    />
  </MyPageContainer>
</template>

<style scoped>
.course-name {
  font-weight: 600;
}

.course-code {
  margin-top: 2px;
  color: var(--personal-color-text-muted-slate);
  font-size: 0.78rem;
}
</style>
