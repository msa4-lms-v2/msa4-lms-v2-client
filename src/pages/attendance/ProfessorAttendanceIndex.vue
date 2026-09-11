<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { searchAttendanceRecords, updateAttendanceRecord } from '../../api/attendanceApi';
import { getMyLectures } from '../../api/lectureApi';
import MyButton from '../../components/button/MyButton.vue';
import MyInput from '../../components/input/MyInput.vue';
import MySelect from '../../components/input/MySelect.vue';
import MyPageContainer from '../../components/layout/MyPageContainer.vue';
import MyTable from '../../components/table/MyTable.vue';
import PrevNextPagination from '../../components/pagination/PrevNextPagination.vue';
import { notify } from '../../composables/useDialog';

defineOptions({ name: 'ProfessorAttendanceIndex' });

const STATUS_LABELS = {
  PRESENT: '출석',
  LATE: '지각',
  ABSENT: '결석',
  EXCUSED: '공결',
};

const columns = [
  { key: 'studentName', label: '학생 이름' },
  { key: 'studentNumber', label: '수강 ID' },
  { key: 'courseName', label: '강의명' },
  { key: 'currentStatus', label: '출결 상태' },
  { key: 'status', label: '출결 수정' },
  { key: 'remarks', label: '사유' },
];

const toLocalDate = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const lectures = ref([]);
const records = ref([]);
const page = ref({ page: 1, size: 100, totalCount: 0, hasNext: false });
const isLoading = ref(false);
const isSaving = ref(false);

const filters = reactive({
  classId: '',
  lectureDate: toLocalDate(),
});

const selectedLecture = computed(() => lectures.value.find(
  (lecture) => String(lecture.classId) === filters.classId,
));

const changedRecords = computed(() => records.value.filter((record) => (
  record.status !== record.initialStatus
  || (record.remarks || '') !== (record.initialRemarks || '')
)));

const attendanceStatusClass = (status) => `attendance-status ${String(status || '').toLowerCase()}`;

const isReasonDisabled = (record) => (
  record.initialStatus === 'PRESENT' && record.status === 'PRESENT'
);

const loadLectures = async () => {
  try {
    const response = await getMyLectures({ page: 1, size: 100, current: true, status: 'OPEN' });
    lectures.value = response.data.data.items || [];
  } catch {
    lectures.value = [];
  }
};

const load = async (pageNumber = 1) => {
  if (!filters.lectureDate) {
    await notify('출결 일자를 선택해 주세요.');
    return;
  }

  isLoading.value = true;
  try {
    const response = await searchAttendanceRecords({
      classId: filters.classId || undefined,
      fromDate: filters.lectureDate,
      toDate: filters.lectureDate,
      page: pageNumber,
      size: 100,
    });
    const data = response.data.data;
    records.value = (data.items || []).map((record) => ({
      ...record,
      initialStatus: record.status,
      initialRemarks: record.remarks || '',
    }));
    page.value = {
      page: data.page,
      size: data.size,
      totalCount: data.totalCount,
      hasNext: data.hasNext,
    };
  } catch (error) {
    records.value = [];
    page.value = { page: 1, size: 100, totalCount: 0, hasNext: false };
    await notify(error.response?.data?.message || '출결 기록을 불러오지 못했습니다.');
  } finally {
    isLoading.value = false;
  }
};

const requestSave = async () => {
  if (isSaving.value) return;
  if (changedRecords.value.length === 0) {
    await notify('변경된 출결 내용이 없습니다.');
    return;
  }

  const missingReason = changedRecords.value.find((record) => !record.remarks?.trim());
  if (missingReason) {
    await notify(`${missingReason.studentName} 학생의 변경 사유를 입력해 주세요.`);
    return;
  }

  isSaving.value = true;
  let savedCount = 0;
  try {
    for (const record of changedRecords.value) {
      const reason = record.remarks.trim();
      await updateAttendanceRecord(record.id, record.status, reason, reason);
      savedCount += 1;
    }
    await notify(`${savedCount}건의 출결 기록을 저장했습니다.`);
    await load(page.value.page);
  } catch (error) {
    await notify(
      error.response?.data?.message
      || `${savedCount}건 저장 후 출결 기록 수정 중 오류가 발생했습니다.`,
    );
    await load(page.value.page);
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
  <MyPageContainer title="출결 확인">
    <section class="filter-card" aria-label="출결 조회 조건">
      <label class="filter-field" for="attendance-class">
        <span>강의 선택</span>
        <MySelect id="attendance-class" v-model="filters.classId" @change="load(1)">
          <option value="">전체 강의</option>
          <option v-for="lecture in lectures" :key="lecture.classId" :value="String(lecture.classId)">
            [{{ lecture.courseCode }}] {{ lecture.courseName }} ({{ lecture.sectionNo }}분반)
          </option>
        </MySelect>
      </label>

      <label class="filter-field date-field" for="attendance-date">
        <span>출결 일자</span>
        <MyInput id="attendance-date" v-model="filters.lectureDate" type="date" @change="load(1)" />
      </label>

      <p class="lecture-summary">
        <template v-if="selectedLecture">
          강의 정원: <strong>{{ selectedLecture.capacity }}명</strong>
          · {{ selectedLecture.academicYear }}학년도 {{ selectedLecture.term === 'FIRST' ? 1 : 2 }}학기
        </template>
        <template v-else>강의와 일자를 선택해 출결을 조회하세요.</template>
      </p>
    </section>

    <section class="attendance-section">
      <div class="section-heading">
        <div>
          <h3>수강생 출결 관리</h3>
          <p>{{ page.totalCount }}건의 출결 기록</p>
        </div>
        <MyButton
          btn-type="button"
          color="deep-blue"
          size="middle"
          :content="isSaving ? '저장 중...' : '출결 일괄 저장'"
          :disabled="isLoading || isSaving || changedRecords.length === 0"
          @click="requestSave"
        />
      </div>

      <MyTable
        :columns="columns"
        :loading="isLoading"
        :empty="!isLoading && records.length === 0"
        empty-message="선택한 조건의 출결 기록이 없습니다."
      >
        <tr v-for="record in records" :key="record.id">
          <td>{{ record.studentName }}</td>
          <td>{{ record.studentNumber || record.enrollmentId }}</td>
          <td>
            <div class="course-name">{{ record.courseName }}</div>
            <div class="course-detail">{{ record.courseCode }} · {{ record.period }}교시</div>
          </td>
          <td :class="attendanceStatusClass(record.initialStatus)">
            {{ STATUS_LABELS[record.initialStatus] || record.initialStatus }}
          </td>
          <td>
            <MySelect v-model="record.status" class="row-select" aria-label="출결 상태 수정">
              <option value="PRESENT">출석</option>
              <option value="LATE">지각</option>
              <option value="ABSENT">결석</option>
              <option value="EXCUSED">공결</option>
            </MySelect>
          </td>
          <td>
            <MyInput
              v-model="record.remarks"
              class="remarks-input"
              maxlength="255"
              placeholder="사유 입력"
              aria-label="출결 변경 사유"
              :disabled="isReasonDisabled(record)"
            />
          </td>
        </tr>
      </MyTable>

      <PrevNextPagination
        v-if="page.page > 1 || page.hasNext"
        :page="page.page"
        :has-next="page.hasNext"
        @page-change="load"
      />
    </section>

  </MyPageContainer>
</template>

<style scoped>
.filter-card {
  display: grid;
  grid-template-columns: minmax(240px, 1.4fr) minmax(150px, 0.7fr) minmax(190px, 0.9fr);
  align-items: end;
  gap: 20px;
  padding: 20px;
  border: 1px solid var(--personal-color-border-mist);
  border-radius: 8px;
  background: var(--personal-color-white);
}

.filter-field {
  display: flex;
  flex-direction: column;
  gap: 7px;
  color: var(--personal-color-primary-text-navy);
  font-size: 0.84rem;
  font-weight: 600;
}

.lecture-summary {
  margin: 0 0 10px;
  color: var(--personal-color-text-secondary-steel);
  font-size: 0.82rem;
  line-height: 1.5;
}

.lecture-summary strong {
  color: var(--personal-color-primary-text-navy);
}

.attendance-section {
  margin-top: 22px;
}

.section-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 14px;
}

.section-heading h3 {
  margin: 0;
  color: var(--personal-color-primary-text-navy);
  font-size: 1rem;
}

.section-heading p {
  margin: 5px 0 0;
  color: var(--personal-color-text-muted-slate);
  font-size: 0.8rem;
}

:deep(.page-container) {
  max-width: 820px;
  padding: 18px 14px 40px;
}

:deep(.page-heading h2) {
  margin: 0 0 16px;
  font-size: 1.35rem;
}

:deep(.my-table th) {
  padding: 11px 8px;
  font-size: 0.74rem;
}

:deep(.my-table td) {
  padding: 10px 8px;
  font-size: 0.76rem;
}

:deep(.my-table td:nth-child(5)),
:deep(.my-table td:nth-child(6)) {
  padding: 7px 6px;
}

:deep(.row-select select),
:deep(.remarks-input input) {
  height: 28px;
  padding: 0 7px;
  font-size: 0.75rem;
}

.course-name {
  color: var(--personal-color-primary-text-navy);
  font-weight: 600;
}

.course-detail {
  margin-top: 3px;
  color: var(--personal-color-text-muted-slate);
  font-size: 0.76rem;
}

.row-select,
.remarks-input {
  min-width: 106px;
}

.attendance-status.present,
.attendance-status.excused {
  color: var(--personal-color-status-success-text-forest);
}

.attendance-status.absent {
  color: var(--personal-color-status-fail-text-maroon);
}

.attendance-status.late {
  color: var(--personal-color-status-warning-text-amber);
}

@media (max-width: 900px) {
  .filter-card {
    grid-template-columns: 1fr 1fr;
  }

  .lecture-summary {
    grid-column: 1 / -1;
    margin-bottom: 0;
  }
}

@media (max-width: 620px) {
  .filter-card {
    grid-template-columns: 1fr;
  }

  .lecture-summary {
    grid-column: auto;
  }

  .section-heading {
    align-items: stretch;
    flex-direction: column;
  }
}
</style>
