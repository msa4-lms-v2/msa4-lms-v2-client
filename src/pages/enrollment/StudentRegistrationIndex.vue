<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { cancelEnrollment, createEnrollment, getAvailableLectures, getMyEnrollments } from '../../api/enrollmentApi';
import { getDepartments } from '../../api/peopleManagementApi';
import MyButton from '../../components/button/MyButton.vue';
import MyInput from '../../components/input/MyInput.vue';
import MyPageContainer from '../../components/layout/MyPageContainer.vue';
import MySearchFilter from '../../components/search/MySearchFilter.vue';
import MySelect from '../../components/input/MySelect.vue';
import MyTable from '../../components/table/MyTable.vue';
import { confirmDialog, notify } from '../../composables/useDialog';
import { useProfileStore } from '../../store/profile/useProfileStore';
import { useSemesterStore } from '../../store/semester/useSemesterStore';

defineOptions({ name: 'StudentRegistrationIndex' });

const TERM_NUMBER = { FIRST: 1, SECOND: 2 };
const DAY_LABEL = { MON: '월', TUE: '화', WED: '수', THU: '목', FRI: '금' };
const COMPLETION_TYPE_LABEL = {
  MAJOR_REQUIRED: '전공필수', MAJOR_ELECTIVE: '전공선택',
  GENERAL_REQUIRED: '교양필수', GENERAL_ELECTIVE: '교양선택',
};
const lectureColumns = [
  { key: 'courseCode', label: '과목코드' }, { key: 'departmentName', label: '학과' },
  { key: 'courseName', label: '강의명' }, { key: 'credits', label: '학점' },
  { key: 'professorName', label: '담당교수' }, { key: 'classroom', label: '강의실' },
  { key: 'schedule', label: '시간' }, { key: 'capacity', label: '정원' },
  { key: 'apply', label: '신청' },
];
const enrollmentColumns = [
  { key: 'courseCode', label: '과목코드' }, { key: 'courseName', label: '과목명' },
  { key: 'completionType', label: '과목구분' }, { key: 'credits', label: '학점' },
  { key: 'professorName', label: '담당교수' }, { key: 'schedule', label: '시간' },
  { key: 'cancel', label: '취소' },
];

const semesterStore = useSemesterStore();
const profileStore = useProfileStore();
const filters = reactive({ collegeId: '', departmentId: '', targetGrade: '', courseName: '', professorName: '' });
const selectedSemesterKey = ref('');
const departments = ref([]);
const lectures = ref([]);
const enrollments = ref([]);
const isLoadingLectures = ref(false);
const isLoadingEnrollments = ref(false);
const mutatingLectureId = ref(null);
const cancellingEnrollmentId = ref(null);
const lectureLoadError = ref('');

const semesterKey = semester => `${semester.academicYear}:${semester.term}`;
const selectedSemester = computed(() => semesterStore.semesters.find(item => semesterKey(item) === selectedSemesterKey.value));
const selectedSemesterLabel = computed(() => {
  const semester = selectedSemester.value;
  return semester ? `${semester.academicYear}년 ${TERM_NUMBER[semester.term] || semester.term}학기` : '-';
});
const colleges = computed(() => {
  const map = new Map();
  departments.value.forEach((department) => {
    const college = department.college;
    if (college?.id && !map.has(String(college.id))) map.set(String(college.id), college);
  });
  return [...map.values()];
});
const filteredDepartments = computed(() => departments.value.filter(
  department => !filters.collegeId || String(department.college?.id) === String(filters.collegeId),
));
const activeEnrollmentCredits = computed(() => enrollments.value.reduce((sum, item) => sum + Number(item.credits || 0), 0));
const isMutating = computed(() => mutatingLectureId.value !== null || cancellingEnrollmentId.value !== null);

const createIdempotencyKey = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const normalizeItems = data => (Array.isArray(data) ? data : data?.items || []);
const errorMessage = (error, fallback) => error.response?.data?.data?.reasons?.[0]?.message || error.response?.data?.message || fallback;
const periodTime = (period, isEnd = false) => `${String(Number(period) + 8).padStart(2, '0')}:${isEnd ? '50' : '00'}`;
const formatSchedule = item => item.schedule || (item.schedules || []).map(schedule => (
  `${DAY_LABEL[schedule.dayOfWeek] || schedule.dayOfWeek} ${periodTime(schedule.startPeriod)}-${periodTime(schedule.endPeriod, true)}`
)).join(', ') || '-';
const completionTypeLabel = type => COMPLETION_TYPE_LABEL[type] || type || '-';
const isApplied = lecture => enrollments.value.some(item => Number(item.classId) === Number(lecture.classId));

const onCollegeChange = () => {
  if (!filteredDepartments.value.some(item => String(item.id) === String(filters.departmentId))) filters.departmentId = '';
};
const queryParams = () => ({
  page: 1, size: 100, academicYear: selectedSemester.value?.academicYear,
  term: selectedSemester.value?.term, collegeId: filters.collegeId || undefined,
  departmentId: filters.departmentId || undefined, targetGrade: filters.targetGrade || undefined,
  courseName: filters.courseName.trim() || undefined, professorName: filters.professorName.trim() || undefined,
  status: 'OPEN',
});

const loadLectures = async ({ showError = true } = {}) => {
  if (!selectedSemester.value) return;
  isLoadingLectures.value = true;
  lectureLoadError.value = '';
  try {
    const response = await getAvailableLectures(queryParams());
    lectures.value = normalizeItems(response.data.data);
  } catch (error) {
    lectures.value = [];
    lectureLoadError.value = errorMessage(error, '개설 강의를 불러오지 못했습니다.');
    if (showError) await notify(lectureLoadError.value);
  } finally { isLoadingLectures.value = false; }
};
const loadEnrollments = async ({ showError = true } = {}) => {
  if (!selectedSemester.value) return;
  isLoadingEnrollments.value = true;
  try {
    const response = await getMyEnrollments({ academicYear: selectedSemester.value.academicYear, term: selectedSemester.value.term });
    enrollments.value = normalizeItems(response.data.data);
  } catch (error) {
    enrollments.value = [];
    if (showError) await notify(errorMessage(error, '수강 신청 목록을 불러오지 못했습니다.'));
  } finally { isLoadingEnrollments.value = false; }
};
const search = async () => Promise.all([loadLectures(), loadEnrollments({ showError: false })]);
const apply = async (lecture) => {
  if (isApplied(lecture) || !await confirmDialog(`${lecture.courseName} 강의를 수강 신청하시겠습니까?`)) return;
  mutatingLectureId.value = lecture.classId;
  try {
    await createEnrollment(lecture.classId, createIdempotencyKey());
    await Promise.all([loadEnrollments({ showError: false }), loadLectures({ showError: false })]);
    await notify('수강 신청이 완료되었습니다.');
  } catch (error) { await notify(errorMessage(error, '수강 신청에 실패했습니다.')); }
  finally { mutatingLectureId.value = null; }
};
const cancel = async (enrollment) => {
  if (!await confirmDialog(`${enrollment.courseName} 수강을 취소하시겠습니까?`)) return;
  cancellingEnrollmentId.value = enrollment.enrollmentId;
  try {
    await cancelEnrollment(enrollment.enrollmentId);
    await Promise.all([loadEnrollments({ showError: false }), loadLectures({ showError: false })]);
    await notify('수강 신청이 취소되었습니다.');
  } catch (error) { await notify(errorMessage(error, '수강 취소에 실패했습니다.')); }
  finally { cancellingEnrollmentId.value = null; }
};

onMounted(async () => {
  try {
    const [, departmentItems] = await Promise.all([
      semesterStore.fetchSemesters(),
      getDepartments(),
      profileStore.profile ? Promise.resolve() : profileStore.fetchStudentProfile(),
    ]);
    departments.value = departmentItems;
    const studentDepartment = departments.value.find(item => item.name === profileStore.profile?.departmentName);
    if (studentDepartment) {
      filters.collegeId = studentDepartment.college?.id || '';
      filters.departmentId = studentDepartment.id;
    }
    filters.targetGrade = profileStore.profile?.gradeLevel || '';
    const semester = semesterStore.semesters.find(item => item.isCurrent ?? item.current)
      || [...semesterStore.semesters].sort((a, b) => Number(b.academicYear) - Number(a.academicYear) || (TERM_NUMBER[b.term] || 0) - (TERM_NUMBER[a.term] || 0))[0];
    selectedSemesterKey.value = semester ? semesterKey(semester) : '';
    await search();
  } catch (error) { await notify(errorMessage(error, '수강 신청 화면을 준비하지 못했습니다.')); }
});
</script>

<template>
  <MyPageContainer title="수강 신청" class="enrollment-page">
    <MySearchFilter submit-text="조회" submit-at-end @search="search">
      <div class="search-group"><label for="registration-college">단과대</label><MySelect id="registration-college" v-model="filters.collegeId" @change="onCollegeChange"><option value="">전체</option><option v-for="college in colleges" :key="college.id" :value="college.id">{{ college.name }}</option></MySelect></div>
      <div class="search-group"><label for="registration-department">학과</label><MySelect id="registration-department" v-model="filters.departmentId"><option value="">전체</option><option v-for="department in filteredDepartments" :key="department.id" :value="department.id">{{ department.name }}</option></MySelect></div>
      <div class="search-group"><label for="registration-grade">대상 학년</label><MySelect id="registration-grade" v-model="filters.targetGrade"><option value="">전체</option><option v-for="grade in 4" :key="grade" :value="grade">{{ grade }}학년</option></MySelect></div>
      <div class="search-group"><label for="registration-course">강의명</label><MyInput id="registration-course" v-model="filters.courseName" placeholder="강의명 입력" @keyup-enter="search" /></div>
      <div class="search-group"><label for="registration-professor">교수명</label><MyInput id="registration-professor" v-model="filters.professorName" placeholder="교수명 입력" @keyup-enter="search" /></div>
      <div class="semester-display"><span>대상 학기</span><strong>{{ selectedSemesterLabel }}</strong></div>
    </MySearchFilter>

    <section class="section-block">
      <h3>강의 조회</h3>
      <p v-if="lectureLoadError" class="inline-error">{{ lectureLoadError }}</p>
      <MyTable :columns="lectureColumns" :loading="isLoadingLectures" :empty="!isLoadingLectures && lectures.length === 0" empty-message="조회된 강의가 없습니다.">
        <tr v-for="lecture in lectures" :key="lecture.classId">
          <td>{{ lecture.courseCode }}</td><td>{{ lecture.departmentName }}</td><td>{{ lecture.courseName }}</td><td>{{ lecture.credits }}</td><td>{{ lecture.professorName || '-' }}</td><td>{{ lecture.classroom || '-' }}</td><td>{{ formatSchedule(lecture) }}</td><td>{{ lecture.currentEnrollmentCount ?? 0 }} / {{ lecture.capacity }}명</td>
          <td><MyButton btn-type="button" color="deep-blue" size="small" :content="isApplied(lecture) ? '완료' : '신청'" :disabled="isApplied(lecture) || isMutating" @click="apply(lecture)" /></td>
        </tr>
      </MyTable>
    </section>

    <section class="section-block enrollment-list">
      <h3>수강 신청 목록</h3>
      <div class="credit-summary">신청 과목 학점 합계 <strong>{{ activeEnrollmentCredits }}학점</strong></div>
      <MyTable :columns="enrollmentColumns" :loading="isLoadingEnrollments" :empty="!isLoadingEnrollments && enrollments.length === 0" empty-message="수강 신청 내역이 없습니다.">
        <tr v-for="item in enrollments" :key="item.enrollmentId">
          <td>{{ item.courseCode }}</td><td>{{ item.courseName }}</td><td>{{ completionTypeLabel(item.completionType) }}</td><td>{{ item.credits }}</td><td>{{ item.professorName || '-' }}</td><td>{{ formatSchedule(item) }}</td>
          <td><MyButton btn-type="button" color="red" size="small" :content="cancellingEnrollmentId === item.enrollmentId ? '처리 중' : '취소'" :disabled="isMutating" @click="cancel(item)" /></td>
        </tr>
      </MyTable>
    </section>
  </MyPageContainer>
</template>

<style scoped>
.enrollment-page :deep(.search-section) { padding: 18px 20px; }
.enrollment-page :deep(.search-row) { display: grid; grid-template-columns: 150px 180px 120px minmax(150px, 1fr) minmax(150px, 1fr) 135px 77px; gap: 14px; }
.enrollment-page :deep(.search-group select), .enrollment-page :deep(.search-group input) { width: 100%; min-width: 0; height: 38px; }
.enrollment-page :deep(.submit-at-end) { margin-left: 0; }
.semester-display { display: flex; flex-direction: column; justify-content: flex-end; gap: 7px; height: 62px; padding-bottom: 8px; }
.semester-display span { color: var(--personal-color-text-secondary-steel); font-size: .78rem; font-weight: 600; }
.semester-display strong { color: var(--personal-color-primary-navy); font-size: .82rem; white-space: nowrap; }
.section-block { margin-top: 28px; }
.section-block h3 { margin: 0 0 12px; color: var(--personal-color-primary-text-navy); font-size: 1rem; font-weight: 700; }
.enrollment-list { margin-bottom: 36px; }
.credit-summary { height: 38px; padding: 10px 14px; border: 1px solid var(--personal-color-border-mist); border-bottom: 0; background: var(--personal-color-white); color: var(--personal-color-text-secondary-steel); font-size: .78rem; }
.credit-summary strong { margin-left: 8px; color: var(--personal-color-primary-navy); }
.enrollment-list :deep(.table-container) { border-top-left-radius: 0; border-top-right-radius: 0; }
.enrollment-page :deep(th) { padding: 12px 10px; font-size: .76rem; }
.enrollment-page :deep(td) { padding: 11px 10px; font-size: .76rem; }
.inline-error { margin: -4px 0 10px; color: var(--personal-color-red); font-size: .78rem; }
@media (max-width: 1100px) { .enrollment-page :deep(.search-row) { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
@media (max-width: 700px) { .enrollment-page :deep(.search-row) { grid-template-columns: 1fr; } .semester-display { height: auto; } .enrollment-page :deep(.submit-at-end) { width: 100%; } }
</style>
