<script setup>
import { onMounted, reactive, ref } from 'vue';
import { searchAttendanceRecords } from '../../api/attendanceApi';
import MyPageContainer from '../../components/layout/MyPageContainer.vue';
import MySearchFilter from '../../components/search/MySearchFilter.vue';
import MySelect from '../../components/input/MySelect.vue';
import MyInput from '../../components/input/MyInput.vue';
import MyTable from '../../components/table/MyTable.vue';
import MyStatusBadge from '../../components/common/MyStatusBadge.vue';
import PrevNextPagination from '../../components/pagination/PrevNextPagination.vue';
import { notify } from '../../composables/useDialog';
import { formatDate } from '../../util/format';

defineOptions({ name: 'StudentAttendanceIndex' });

const columns = [
  { key: 'course', label: '교과목' },
  { key: 'lectureDate', label: '수업일' },
  { key: 'period', label: '교시' },
  { key: 'status', label: '출결 상태' },
  { key: 'checkInTime', label: '체크인 시각' },
  { key: 'remarks', label: '비고' },
];

const statusLabels = { PRESENT: '출석', LATE: '지각', ABSENT: '결석', EXCUSED: '공결' };
const statusVariants = { PRESENT: 'success', LATE: 'warning', ABSENT: 'fail', EXCUSED: 'processing' };

const filters = reactive({ fromDate: '', toDate: '', status: '' });
const records = ref([]);
const page = ref({ page: 1, size: 20, totalCount: 0, hasNext: false });
const isLoading = ref(false);

const load = async (pageNumber = 1) => {
  isLoading.value = true;
  try {
    const response = await searchAttendanceRecords({
      fromDate: filters.fromDate || undefined,
      toDate: filters.toDate || undefined,
      status: filters.status || undefined,
      page: pageNumber,
      size: 20,
    });
    const data = response.data.data;
    records.value = data.items || [];
    page.value = { page: data.page, size: data.size, totalCount: data.totalCount, hasNext: data.hasNext };
  } catch (error) {
    records.value = [];
    await notify(error.response?.data?.message || '출결 기록을 불러오지 못했습니다.');
  } finally {
    isLoading.value = false;
  }
};

const applyFilters = async () => {
  if (filters.fromDate && filters.toDate && filters.fromDate > filters.toDate) {
    await notify('조회 시작일은 종료일보다 늦을 수 없습니다.');
    return;
  }
  await load(1);
};

onMounted(() => load());
</script>

<template>
  <MyPageContainer title="출결 조회" subtitle="본인의 출결 기록을 기간·상태별로 조회합니다.">
    <MySearchFilter submit-text="조회" @search="applyFilters">
      <div class="search-group">
        <label for="from-date">시작일</label>
        <MyInput id="from-date" v-model="filters.fromDate" type="date" />
      </div>
      <div class="search-group">
        <label for="to-date">종료일</label>
        <MyInput id="to-date" v-model="filters.toDate" type="date" />
      </div>
      <div class="search-group">
        <label for="status-filter">출결 상태</label>
        <MySelect id="status-filter" v-model="filters.status">
          <option value="">전체</option>
          <option value="PRESENT">출석</option>
          <option value="LATE">지각</option>
          <option value="ABSENT">결석</option>
          <option value="EXCUSED">공결</option>
        </MySelect>
      </div>
    </MySearchFilter>

    <MyTable
      :columns="columns"
      :loading="isLoading"
      :empty="!isLoading && records.length === 0"
      empty-message="조회된 출결 기록이 없습니다."
    >
      <tr v-for="record in records" :key="record.id">
        <td>
          <div class="course-name">{{ record.courseName }}</div>
          <div class="course-code">{{ record.courseCode }} · {{ record.sectionNo }}분반</div>
        </td>
        <td>{{ formatDate(record.lectureDate) }}</td>
        <td>{{ record.period }}교시</td>
        <td>
          <MyStatusBadge :label="statusLabels[record.status] || record.status" :variant="statusVariants[record.status] || 'processing'" />
        </td>
        <td>{{ record.checkInTime ? formatDate(record.checkInTime, 'YYYY-MM-DD HH:mm') : '-' }}</td>
        <td>{{ record.remarks || '-' }}</td>
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
