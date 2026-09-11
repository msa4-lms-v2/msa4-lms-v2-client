<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { addCartItem, getAvailableLectures, getMyCart, removeCartItem } from '../../api/enrollmentApi';
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

defineOptions({ name: 'StudentCartIndex' });

const TERM_NUMBER = { FIRST: 1, SECOND: 2 };
const DAY_LABEL = { MON: '월', TUE: '화', WED: '수', THU: '목', FRI: '금' };
const DAYS = Object.entries(DAY_LABEL).map(([value, label]) => ({ value, label }));
const cartColumns = [
  { key: 'courseCode', label: '과목코드' }, { key: 'courseName', label: '과목명' },
  { key: 'credits', label: '학점' }, { key: 'professorName', label: '담당교수' },
  { key: 'schedule', label: '강의시간' }, { key: 'cancel', label: '취소' },
];
const lectureColumns = [
  { key: 'courseCode', label: '과목코드' }, { key: 'departmentName', label: '학과' },
  { key: 'courseName', label: '강의명' }, { key: 'credits', label: '학점' },
  { key: 'professorName', label: '담당교수' }, { key: 'classroom', label: '강의실' },
  { key: 'schedule', label: '시간' }, { key: 'capacity', label: '정원' },
  { key: 'apply', label: '신청' },
];

const semesterStore = useSemesterStore();
const profileStore = useProfileStore();
const filters = reactive({ collegeId: '', departmentId: '', targetGrade: '', courseName: '', professorName: '' });
const selectedSemesterKey = ref('');
const departments = ref([]);
const lectures = ref([]);
const cartItems = ref([]);
const isLoadingLectures = ref(false);
const isLoadingCart = ref(false);
const addingLectureId = ref(null);
const removingCartItemId = ref(null);
const lectureLoadError = ref('');
const showTimetable = ref(false);

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
const isMutating = computed(() => addingLectureId.value !== null || removingCartItemId.value !== null);
const isInCart = lecture => cartItems.value.some(item => Number(item.lectureId) === Number(lecture.classId));
const normalizeItems = data => (Array.isArray(data) ? data : data?.items || []);
const errorMessage = (error, fallback) => error.response?.data?.data?.reasons?.[0]?.message || error.response?.data?.message || fallback;
const periodTime = (period, isEnd = false) => `${String(Number(period) + 8).padStart(2, '0')}:${isEnd ? '50' : '00'}`;
const formatSchedule = item => item.schedule || (item.schedules || []).map(schedule => (
  `${DAY_LABEL[schedule.dayOfWeek] || schedule.dayOfWeek} ${periodTime(schedule.startPeriod)}-${periodTime(schedule.endPeriod, true)}`
)).join(', ') || '-';
const timetableEntries = computed(() => cartItems.value.flatMap((item, itemIndex) => (
  (item.schedules || []).map((schedule, scheduleIndex) => ({
    key: `${item.cartItemId}-${scheduleIndex}`,
    item,
    day: schedule.dayOfWeek,
    start: Number(schedule.startPeriod),
    end: Number(schedule.endPeriod),
    colorIndex: itemIndex % 5,
  }))
)));
const timetableEntry = (day, period) => timetableEntries.value.find(entry => entry.day === day && entry.start === period);
const occupied = (day, period) => timetableEntries.value.some(entry => entry.day === day && period > entry.start && period <= entry.end);

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
const semesterParams = () => ({ academicYear: selectedSemester.value?.academicYear, term: selectedSemester.value?.term });

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
const loadCart = async ({ showError = true } = {}) => {
  if (!selectedSemester.value) return;
  isLoadingCart.value = true;
  try {
    const response = await getMyCart(semesterParams());
    cartItems.value = response.data.data?.items || [];
  } catch (error) {
    cartItems.value = [];
    if (showError) await notify(errorMessage(error, '장바구니를 불러오지 못했습니다.'));
  } finally { isLoadingCart.value = false; }
};
const search = async () => Promise.all([loadLectures(), loadCart({ showError: false })]);
const add = async (lecture) => {
  if (isInCart(lecture) || !await confirmDialog(`${lecture.courseName} 강의를 장바구니에 담으시겠습니까?`)) return;
  addingLectureId.value = lecture.classId;
  try {
    await addCartItem(lecture.classId);
    await loadCart({ showError: false });
    await notify('장바구니에 강의를 담았습니다.');
  } catch (error) { await notify(errorMessage(error, '장바구니에 담지 못했습니다.')); }
  finally { addingLectureId.value = null; }
};
const remove = async (item) => {
  if (!await confirmDialog(`${item.courseName} 강의를 장바구니에서 취소하시겠습니까?`)) return;
  removingCartItemId.value = item.cartItemId;
  try {
    await removeCartItem(item.cartItemId);
    await loadCart({ showError: false });
    await notify('장바구니에서 취소했습니다.');
  } catch (error) { await notify(errorMessage(error, '장바구니 취소에 실패했습니다.')); }
  finally { removingCartItemId.value = null; }
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
  } catch (error) { await notify(errorMessage(error, '수강신청 장바구니 화면을 준비하지 못했습니다.')); }
});
</script>

<template>
  <MyPageContainer title="수강신청 장바구니" class="cart-page">
    <MySearchFilter submit-text="조회" submit-at-end @search="search">
      <div class="search-group"><label for="cart-college">단과대</label><MySelect id="cart-college" v-model="filters.collegeId" @change="onCollegeChange"><option value="">전체</option><option v-for="college in colleges" :key="college.id" :value="college.id">{{ college.name }}</option></MySelect></div>
      <div class="search-group"><label for="cart-department">학과</label><MySelect id="cart-department" v-model="filters.departmentId"><option value="">전체</option><option v-for="department in filteredDepartments" :key="department.id" :value="department.id">{{ department.name }}</option></MySelect></div>
      <div class="search-group"><label for="cart-grade">대상 학년</label><MySelect id="cart-grade" v-model="filters.targetGrade"><option value="">전체</option><option v-for="grade in 4" :key="grade" :value="grade">{{ grade }}학년</option></MySelect></div>
      <div class="search-group"><label for="cart-course">강의명</label><MyInput id="cart-course" v-model="filters.courseName" placeholder="강의명 입력" @keyup-enter="search" /></div>
      <div class="search-group"><label for="cart-professor">교수명</label><MyInput id="cart-professor" v-model="filters.professorName" placeholder="교수명 입력" @keyup-enter="search" /></div>
      <div class="semester-display"><span>대상 학기</span><strong>{{ selectedSemesterLabel }}</strong></div>
    </MySearchFilter>

    <section class="section-block">
      <h3>담은 강의</h3>
      <MyTable :columns="cartColumns" :loading="isLoadingCart" :empty="!isLoadingCart && cartItems.length === 0" empty-message="장바구니에 담은 강의가 없습니다.">
        <tr v-for="item in cartItems" :key="item.cartItemId">
          <td>{{ item.courseCode }}</td><td>{{ item.courseName }}</td><td>{{ item.credits }}</td><td>{{ item.professorName || '-' }}</td><td>{{ formatSchedule(item) }}</td>
          <td><MyButton btn-type="button" color="red" size="small" :content="removingCartItemId === item.cartItemId ? '처리 중' : '취소'" :disabled="isMutating" @click="remove(item)" /></td>
        </tr>
      </MyTable>
      <div class="timetable-button-row"><MyButton btn-type="button" color="deep-blue" size="big" content="예상 시간표" @click="showTimetable = true" /></div>
    </section>

    <section class="section-block lecture-section">
      <h3>강의 조회</h3>
      <p v-if="lectureLoadError" class="inline-error">{{ lectureLoadError }}</p>
      <MyTable :columns="lectureColumns" :loading="isLoadingLectures" :empty="!isLoadingLectures && lectures.length === 0" empty-message="조회된 강의가 없습니다.">
        <tr v-for="lecture in lectures" :key="lecture.classId">
          <td>{{ lecture.courseCode }}</td><td>{{ lecture.departmentName }}</td><td>{{ lecture.courseName }}</td><td>{{ lecture.credits }}</td><td>{{ lecture.professorName || '-' }}</td><td>{{ lecture.classroom || '-' }}</td><td>{{ formatSchedule(lecture) }}</td><td>{{ lecture.currentEnrollmentCount ?? 0 }} / {{ lecture.capacity }}명</td>
          <td><MyButton btn-type="button" color="deep-blue" size="small" :content="isInCart(lecture) ? '완료' : '신청'" :disabled="isInCart(lecture) || isMutating" @click="add(lecture)" /></td>
        </tr>
      </MyTable>
    </section>

    <div v-if="showTimetable" class="modal-backdrop" role="presentation" @click.self="showTimetable = false">
      <section class="timetable-modal" role="dialog" aria-modal="true" aria-labelledby="cart-timetable-title">
        <div class="modal-heading"><h3 id="cart-timetable-title">예상 시간표</h3><button type="button" aria-label="닫기" @click="showTimetable = false">×</button></div>
        <div class="timetable-grid">
          <div class="timetable-head">교시</div><div v-for="day in DAYS" :key="day.value" class="timetable-head">{{ day.label }}</div>
          <template v-for="period in 9" :key="period">
            <div class="period-cell">{{ period }}</div>
            <template v-for="day in DAYS" :key="`${day.value}-${period}`">
              <div v-if="timetableEntry(day.value, period)" class="lecture-cell" :class="`color-${timetableEntry(day.value, period).colorIndex}`" :style="{ gridRow: `span ${timetableEntry(day.value, period).end - timetableEntry(day.value, period).start + 1}` }"><strong>{{ timetableEntry(day.value, period).item.courseName }}</strong><span>{{ timetableEntry(day.value, period).item.classroom || '-' }}</span></div>
              <div v-else-if="!occupied(day.value, period)" class="empty-cell" />
            </template>
          </template>
        </div>
      </section>
    </div>
  </MyPageContainer>
</template>

<style scoped>
.cart-page :deep(.search-section) { padding: 18px 20px; }
.cart-page :deep(.search-row) { display: grid; grid-template-columns: 150px 180px 120px minmax(150px, 1fr) minmax(150px, 1fr) 135px 77px; gap: 14px; }
.cart-page :deep(.search-group select), .cart-page :deep(.search-group input) { width: 100%; min-width: 0; height: 38px; }
.cart-page :deep(.submit-at-end) { margin-left: 0; }
.semester-display { display: flex; flex-direction: column; justify-content: flex-end; gap: 7px; height: 62px; padding-bottom: 8px; }
.semester-display span { color: var(--personal-color-text-secondary-steel); font-size: .78rem; font-weight: 600; }
.semester-display strong { color: var(--personal-color-primary-navy); font-size: .82rem; white-space: nowrap; }
.section-block { margin-top: 28px; }
.section-block h3 { margin: 0 0 12px; color: var(--personal-color-primary-text-navy); font-size: 1rem; font-weight: 700; }
.lecture-section { margin-bottom: 36px; }
.timetable-button-row { display: flex; justify-content: flex-end; margin-top: 16px; }
.cart-page :deep(th) { padding: 12px 10px; font-size: .76rem; }
.cart-page :deep(td) { padding: 11px 10px; font-size: .76rem; }
.inline-error { margin: -4px 0 10px; color: var(--personal-color-red); font-size: .78rem; }
.modal-backdrop { position: fixed; z-index: 1000; inset: 0; display: grid; place-items: center; padding: 30px; background: rgb(15 23 42 / 45%); }
.timetable-modal { width: min(920px, 100%); max-height: 90vh; padding: 24px; overflow: auto; border-radius: 8px; background: var(--personal-color-white); }
.modal-heading { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
.modal-heading h3 { margin: 0; }
.modal-heading button { width: 32px; height: 32px; border: 0; background: transparent; color: var(--personal-color-text-secondary-steel); font-size: 24px; cursor: pointer; }
.timetable-grid { display: grid; grid-template-columns: 70px repeat(5, 1fr); grid-auto-rows: 58px; border-top: 1px solid var(--personal-color-table-border-frost); border-left: 1px solid var(--personal-color-table-border-frost); }
.timetable-head, .period-cell, .empty-cell, .lecture-cell { display: flex; align-items: center; justify-content: center; border-right: 1px solid var(--personal-color-table-border-frost); border-bottom: 1px solid var(--personal-color-table-border-frost); }
.timetable-head { height: 40px; color: var(--personal-color-white); background: var(--personal-color-student-primary-cyan); font-size: .78rem; font-weight: 700; }
.period-cell { background: var(--personal-color-table-header-smoke); font-size: .76rem; }
.lecture-cell { z-index: 1; flex-direction: column; gap: 3px; margin: 2px; color: var(--personal-color-primary-text-navy); font-size: .72rem; text-align: center; }
.lecture-cell span { font-size: .66rem; }
.color-0 { background: var(--personal-color-timetable-lilac); }.color-1 { background: var(--personal-color-timetable-sage); }.color-2 { background: var(--personal-color-timetable-sky); }.color-3 { background: var(--personal-color-timetable-apricot); }.color-4 { background: var(--personal-color-timetable-aqua); }
@media (max-width: 1100px) { .cart-page :deep(.search-row) { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
@media (max-width: 700px) { .cart-page :deep(.search-row) { grid-template-columns: 1fr; } .semester-display { height: auto; } .cart-page :deep(.submit-at-end) { width: 100%; } }
</style>
