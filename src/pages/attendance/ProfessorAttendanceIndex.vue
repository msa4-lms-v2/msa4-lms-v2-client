<script setup>
import { onMounted, reactive, ref } from 'vue';
import { searchAttendanceRecords, updateAttendanceRecord } from '../../api/attendanceApi';
import { getMyLectures } from '../../api/lectureApi';
import MyPageContainer from '../../components/layout/MyPageContainer.vue';
import MySearchFilter from '../../components/search/MySearchFilter.vue';
import MySelect from '../../components/input/MySelect.vue';
import MyInput from '../../components/input/MyInput.vue';
import MyButton from '../../components/button/MyButton.vue';
import MyModal from '../../components/common/MyModal.vue';
import MyTable from '../../components/table/MyTable.vue';
import MyStatusBadge from '../../components/common/MyStatusBadge.vue';
import PrevNextPagination from '../../components/pagination/PrevNextPagination.vue';
import { notify } from '../../composables/useDialog';
import { formatDate } from '../../util/format';

defineOptions({ name: 'ProfessorAttendanceIndex' });

const columns = [
  { key: 'student', label: '학생' },
  { key: 'course', label: '교과목' },
  { key: 'lectureDate', label: '수업일' },
  { key: 'period', label: '교시' },
  { key: 'status', label: '출결 상태' },
  { key: 'remarks', label: '비고' },
  { key: 'management', label: '관리' },
];

const statusLabels = { PRESENT: '출석', LATE: '지각', ABSENT: '결석', EXCUSED: '공결' };
const statusVariants = { PRESENT: 'success', LATE: 'warning', ABSENT: 'fail', EXCUSED: 'processing' };

const lectures = ref([]);
const filters = reactive({ classId: '', fromDate: '', toDate: '', status: '' });
const records = ref([]);
const page = ref({ page: 1, size: 20, totalCount: 0, hasNext: false });
const isLoading = ref(false);
const editTarget = ref(null);
const editForm = reactive({ status: 'PRESENT', remarks: '', reason: '' });
const isSaving = ref(false);

const loadLectures = async () => {
  try {
    const response = await getMyLectures({ page: 1, size: 100, current: true });
    lectures.value = response.data.data.items || [];
  } catch {
    lectures.value = [];
  }
};

const load = async (pageNumber = 1) => {
  isLoading.value = true;
  try {
    const response = await searchAttendanceRecords({
      classId: filters.classId || undefined,
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

const applyFilters = () => load(1);

const openEdit = (record) => {
  editTarget.value = record;
  editForm.status = record.status;
  editForm.remarks = record.remarks || '';
  editForm.reason = '';
};

const closeEdit = () => {
  if (isSaving.value) return;
  editTarget.value = null;
};

const saveEdit = async () => {
  if (!editForm.reason.trim()) {
    await notify('수정 사유를 입력해 주세요.');
    return;
  }
  isSaving.value = true;
  try {
    await updateAttendanceRecord(editTarget.value.id, editForm.status, editForm.remarks.trim(), editForm.reason.trim());
    await notify('출결 기록이 수정되었습니다.');
    closeEdit();
    await load(page.value.page);
  } catch (error) {
    await notify(error.response?.data?.message || '출결 기록 수정 중 오류가 발생했습니다.');
  } finally {
    isSaving.value = false;
  }
};

onMounted(async () => {
  await loadLectures();
  await load();
});
</script>

<template>
  <MyPageContainer title="출결 확인" subtitle="담당 강의 학생들의 출결 기록을 조회하고 수정합니다.">
    <MySearchFilter submit-text="조회" @search="applyFilters">
      <div class="search-group">
        <label for="attendance-class">강의</label>
        <MySelect id="attendance-class" v-model="filters.classId">
          <option value="">전체</option>
          <option v-for="lecture in lectures" :key="lecture.classId" :value="String(lecture.classId)">
            {{ lecture.courseName }} ({{ lecture.sectionNo }}분반)
          </option>
        </MySelect>
      </div>
      <div class="search-group">
        <label for="attendance-from">시작일</label>
        <MyInput id="attendance-from" v-model="filters.fromDate" type="date" />
      </div>
      <div class="search-group">
        <label for="attendance-to">종료일</label>
        <MyInput id="attendance-to" v-model="filters.toDate" type="date" />
      </div>
      <div class="search-group">
        <label for="attendance-status">출결 상태</label>
        <MySelect id="attendance-status" v-model="filters.status">
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
        <td>{{ record.studentName }}</td>
        <td>
          <div class="course-name">{{ record.courseName }}</div>
          <div class="course-code">{{ record.courseCode }} · {{ record.sectionNo }}분반</div>
        </td>
        <td>{{ formatDate(record.lectureDate) }}</td>
        <td>{{ record.period }}교시</td>
        <td>
          <MyStatusBadge :label="statusLabels[record.status] || record.status" :variant="statusVariants[record.status] || 'processing'" />
        </td>
        <td>{{ record.remarks || '-' }}</td>
        <td>
          <MyButton btn-type="button" color="white" size="small" content="수정" @click="openEdit(record)" />
        </td>
      </tr>
    </MyTable>

    <PrevNextPagination
      v-if="page.page > 1 || page.hasNext"
      :page="page.page"
      :has-next="page.hasNext"
      @page-change="load"
    />

    <MyModal :is-open="Boolean(editTarget)" title="출결 기록 수정" max-width="480px" @close="closeEdit">
      <template v-if="editTarget">
        <p class="edit-target-info">{{ editTarget.studentName }} · {{ editTarget.courseName }} · {{ formatDate(editTarget.lectureDate) }} {{ editTarget.period }}교시</p>

        <label class="edit-field" for="edit-status">
          <span>출결 상태</span>
          <MySelect id="edit-status" v-model="editForm.status">
            <option value="PRESENT">출석</option>
            <option value="LATE">지각</option>
            <option value="ABSENT">결석</option>
            <option value="EXCUSED">공결</option>
          </MySelect>
        </label>

        <label class="edit-field" for="edit-remarks">
          <span>비고</span>
          <MyInput id="edit-remarks" v-model="editForm.remarks" maxlength="255" />
        </label>

        <label class="edit-field" for="edit-reason">
          <span>수정 사유</span>
          <MyInput id="edit-reason" v-model="editForm.reason" maxlength="255" placeholder="수정 사유를 입력해 주세요." />
        </label>
      </template>

      <template #footer>
        <MyButton color="white" size="middle" content="취소" :disabled="isSaving" @click="closeEdit" />
        <MyButton color="deep-blue" size="middle" :content="isSaving ? '저장 중...' : '저장'" :disabled="isSaving" @click="saveEdit" />
      </template>
    </MyModal>
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

.edit-target-info {
  margin: 0 0 16px;
  color: var(--personal-color-text-muted-slate);
  font-size: 0.85rem;
}

.edit-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 14px;
  color: var(--personal-color-primary-text-navy);
  font-size: 0.85rem;
  font-weight: 600;
}
</style>
