<script setup>
import dayjs from 'dayjs';
import { computed, onMounted, ref } from 'vue';
import {
  addCartItem,
  cancelEnrollment,
  createEnrollment,
  getMyCart,
  getMyEnrollments,
  removeCartItem,
} from '../../api/enrollmentApi';
import MyButton from '../../components/button/MyButton.vue';
import MyInput from '../../components/input/MyInput.vue';
import MySelect from '../../components/input/MySelect.vue';
import MyPageContainer from '../../components/layout/MyPageContainer.vue';
import MyTable from '../../components/table/MyTable.vue';
import { confirmDialog, notify } from '../../composables/useDialog';
import { useSemesterStore } from '../../store/semester/useSemesterStore';
import { formatDate } from '../../util/format';

defineOptions({ name: 'StudentRegistrationIndex' });

const DAY_LABELS = { MON: '월', TUE: '화', WED: '수', THU: '목', FRI: '금' };
const TERM_ORDER = { FIRST: 1, SECOND: 2 };

const cartColumns = [
  { key: 'course', label: '교과목' },
  { key: 'schedule', label: '요일·교시' },
  { key: 'classroom', label: '강의실' },
  { key: 'credits', label: '학점' },
  { key: 'management', label: '관리' },
];

const enrollmentColumns = [
  { key: 'course', label: '교과목' },
  { key: 'professor', label: '담당교수' },
  { key: 'classroom', label: '강의실' },
  { key: 'credits', label: '학점' },
  { key: 'enrolledAt', label: '신청일' },
  { key: 'management', label: '관리' },
];

const semesterStore = useSemesterStore();
const selectedSemesterKey = ref('');
const newLectureId = ref('');
const cartItems = ref([]);
const cartTotalCredits = ref(0);
const enrollments = ref([]);
const isLoadingCart = ref(false);
const isLoadingEnrollments = ref(false);
const isAdding = ref(false);
const enrollingLectureId = ref(null);
const removingCartItemId = ref(null);
const cancellingEnrollmentId = ref(null);
const formError = ref('');

const semesterKey = (semester) => `${semester.academicYear}:${semester.term}`;
const semesterLabel = (semester) => (
  `${semester.academicYear}학년도 ${semester.term === 'FIRST' ? 1 : 2}학기`
);

const semesterOptions = computed(() => [...semesterStore.semesters]
  .sort((left, right) => (
    right.academicYear - left.academicYear
    || TERM_ORDER[right.term] - TERM_ORDER[left.term]
  ))
  .map((semester) => ({
    value: semesterKey(semester),
    label: `${semesterLabel(semester)}${(semester.isCurrent ?? semester.current) ? ' (현재)' : ''}`,
  })));

const selectedSemester = computed(() => semesterStore.semesters.find(
  (semester) => semesterKey(semester) === selectedSemesterKey.value,
));

const selectedParams = computed(() => {
  if (!selectedSemester.value) return null;
  return {
    academicYear: selectedSemester.value.academicYear,
    term: selectedSemester.value.term,
  };
});

const registrationPeriod = computed(() => {
  const semester = selectedSemester.value;
  if (!semester?.enrollmentStartAt || !semester?.enrollmentEndAt) {
    return {
      state: 'unavailable',
      label: '기간 정보 없음',
      description: '선택한 학기의 수강신청 기간이 등록되지 않았습니다.',
    };
  }

  const now = dayjs();
  const startsAt = dayjs(semester.enrollmentStartAt);
  const endsAt = dayjs(semester.enrollmentEndAt);
  const periodText = `${startsAt.format('YYYY.MM.DD HH:mm')} ~ ${endsAt.format('YYYY.MM.DD HH:mm')}`;

  if (now.isBefore(startsAt)) {
    return { state: 'upcoming', label: '신청 예정', description: periodText };
  }
  if (now.isAfter(endsAt)) {
    return { state: 'closed', label: '신청 마감', description: periodText };
  }
  return { state: 'open', label: '신청 가능', description: periodText };
});

const isEnrollmentOpen = computed(() => registrationPeriod.value.state === 'open');
const isMutating = computed(() => (
  isAdding.value
  || enrollingLectureId.value !== null
  || removingCartItemId.value !== null
  || cancellingEnrollmentId.value !== null
));
const activeEnrollmentCredits = computed(() => enrollments.value.reduce(
  (total, item) => total + Number(item.credits || 0),
  0,
));

const formatSchedule = (schedules = []) => schedules
  .map((schedule) => `${DAY_LABELS[schedule.dayOfWeek] || schedule.dayOfWeek} ${schedule.startPeriod}~${schedule.endPeriod}교시`)
  .join(', ') || '-';

const createIdempotencyKey = () => {
  const suffix = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `enrollment-create-${suffix}`;
};

const errorMessage = (error, fallback) => (
  error.response?.data?.data?.reasons?.[0]?.message
  || error.response?.data?.message
  || fallback
);

const loadCart = async ({ showError = true } = {}) => {
  if (!selectedParams.value) return false;
  isLoadingCart.value = true;
  try {
    const response = await getMyCart(selectedParams.value);
    cartItems.value = response.data.data?.items || [];
    cartTotalCredits.value = response.data.data?.totalCredits || 0;
    return true;
  } catch (error) {
    cartItems.value = [];
    cartTotalCredits.value = 0;
    if (showError) await notify(errorMessage(error, '수강 장바구니를 불러오지 못했습니다.'));
    return false;
  } finally {
    isLoadingCart.value = false;
  }
};

const loadEnrollments = async ({ showError = true } = {}) => {
  if (!selectedParams.value) return false;
  isLoadingEnrollments.value = true;
  try {
    const response = await getMyEnrollments(selectedParams.value);
    enrollments.value = response.data.data || [];
    return true;
  } catch (error) {
    enrollments.value = [];
    if (showError) await notify(errorMessage(error, '수강신청 내역을 불러오지 못했습니다.'));
    return false;
  } finally {
    isLoadingEnrollments.value = false;
  }
};

const loadRegistrationData = async () => {
  formError.value = '';
  if (!selectedParams.value) {
    formError.value = '조회할 학기를 선택해 주세요.';
    return;
  }
  const [cartLoaded, enrollmentsLoaded] = await Promise.all([
    loadCart({ showError: false }),
    loadEnrollments({ showError: false }),
  ]);
  if (!cartLoaded || !enrollmentsLoaded) {
    await notify('선택한 학기의 수강 정보를 모두 불러오지 못했습니다. 다시 조회해 주세요.');
  }
};

const addToCart = async () => {
  const lectureId = Number(newLectureId.value);
  if (!isEnrollmentOpen.value) {
    formError.value = '현재 선택한 학기는 수강신청 기간이 아닙니다.';
    return;
  }
  if (!Number.isInteger(lectureId) || lectureId <= 0) {
    formError.value = '개설 강의 번호를 정확히 입력해 주세요.';
    return;
  }

  formError.value = '';
  isAdding.value = true;
  try {
    await addCartItem(lectureId);
    newLectureId.value = '';
    await loadCart();
    await notify('장바구니에 강의를 담았습니다.');
  } catch (error) {
    await notify(errorMessage(error, '장바구니 담기에 실패했습니다.'));
  } finally {
    isAdding.value = false;
  }
};

const removeFromCart = async (item) => {
  const confirmed = await confirmDialog(`${item.courseName} 강의를 장바구니에서 삭제하시겠습니까?`);
  if (!confirmed) return;

  removingCartItemId.value = item.cartItemId;
  try {
    await removeCartItem(item.cartItemId);
    await loadCart();
    await notify('장바구니에서 삭제했습니다.');
  } catch (error) {
    await notify(errorMessage(error, '장바구니 삭제에 실패했습니다.'));
  } finally {
    removingCartItemId.value = null;
  }
};

const enrollFromCart = async (item) => {
  const confirmed = await confirmDialog(`${item.courseName} 강의를 수강신청하시겠습니까?`);
  if (!confirmed) return;

  enrollingLectureId.value = item.lectureId;
  try {
    await createEnrollment(item.lectureId, createIdempotencyKey());
    let cartRemovalFailed = false;
    try {
      await removeCartItem(item.cartItemId);
    } catch {
      cartRemovalFailed = true;
    }
    await Promise.all([loadCart({ showError: false }), loadEnrollments({ showError: false })]);
    await notify(cartRemovalFailed
      ? '수강신청은 완료됐지만 장바구니 항목은 삭제하지 못했습니다. 새로고침 후 다시 확인해 주세요.'
      : '수강신청이 완료되었습니다.');
  } catch (error) {
    await notify(errorMessage(error, '수강신청에 실패했습니다.'));
  } finally {
    enrollingLectureId.value = null;
  }
};

const cancelActiveEnrollment = async (enrollment) => {
  const confirmed = await confirmDialog(`${enrollment.courseName} 수강을 취소하시겠습니까?`);
  if (!confirmed) return;

  cancellingEnrollmentId.value = enrollment.enrollmentId;
  try {
    await cancelEnrollment(enrollment.enrollmentId);
    await loadEnrollments();
    await notify('수강신청이 취소되었습니다.');
  } catch (error) {
    await notify(errorMessage(error, '수강 취소에 실패했습니다.'));
  } finally {
    cancellingEnrollmentId.value = null;
  }
};

const applyDefaultSemester = () => {
  const current = semesterStore.semesters.find((semester) => semester.isCurrent ?? semester.current);
  const fallback = [...semesterStore.semesters].sort((left, right) => (
    right.academicYear - left.academicYear
    || TERM_ORDER[right.term] - TERM_ORDER[left.term]
  ))[0];
  if (current || fallback) selectedSemesterKey.value = semesterKey(current || fallback);
};

onMounted(async () => {
  try {
    await semesterStore.fetchSemesters();
    applyDefaultSemester();
    await loadRegistrationData();
  } catch (error) {
    await notify(errorMessage(error, '학기 정보를 불러오지 못했습니다.'));
  }
});
</script>

<template>
  <MyPageContainer
    title="수강 신청"
    subtitle="선택한 학기의 장바구니와 수강신청 내역을 관리합니다."
  >
    <section class="semester-section">
      <div class="semester-filter">
        <div class="filter-field">
          <label for="registration-semester">대상 학기</label>
          <MySelect
            id="registration-semester"
            v-model="selectedSemesterKey"
            :options="semesterOptions"
            placeholder="학기 선택"
          />
        </div>
        <MyButton
          btn-type="button"
          color="deep-blue"
          size="middle"
          content="조회"
          :disabled="isLoadingCart || isLoadingEnrollments"
          @click="loadRegistrationData"
        />
      </div>
      <div
        class="period-card"
        :class="`period-${registrationPeriod.state}`"
      >
        <div>
          <span class="period-title">수강신청 기간</span>
          <strong>{{ registrationPeriod.description }}</strong>
        </div>
        <span class="period-badge">{{ registrationPeriod.label }}</span>
      </div>
    </section>

    <section class="add-section">
      <div>
        <h3>강의 장바구니 담기</h3>
        <p class="add-guide">
          학과사무실이나 강의계획서에서 안내받은 개설 강의 번호를 입력해 주세요.
        </p>
      </div>
      <div class="add-row">
        <MyInput
          v-model="newLectureId"
          numeric-only
          placeholder="개설 강의 번호"
          :disabled="!isEnrollmentOpen || isMutating"
          @keyup-enter="addToCart"
        />
        <MyButton
          btn-type="button"
          color="deep-blue"
          size="middle"
          :content="isAdding ? '담는 중' : '담기'"
          :disabled="!isEnrollmentOpen || isMutating"
          @click="addToCart"
        />
      </div>
      <p
        v-if="formError"
        class="error-text"
        role="alert"
      >
        {{ formError }}
      </p>
    </section>

    <section class="cart-section">
      <div class="section-title-row">
        <h3>수강 장바구니</h3>
        <span class="summary-text">예상 신청학점 <strong>{{ cartTotalCredits }}</strong>학점</span>
      </div>
      <MyTable
        :columns="cartColumns"
        :loading="isLoadingCart"
        :empty="!isLoadingCart && cartItems.length === 0"
        empty-message="선택한 학기의 장바구니가 비어 있습니다."
      >
        <tr
          v-for="item in cartItems"
          :key="item.cartItemId"
        >
          <td>
            <div class="course-name">
              {{ item.courseName }}
            </div>
            <div class="course-code">
              {{ item.courseCode }} · {{ item.sectionNo }}분반 · {{ item.professorName }}
            </div>
          </td>
          <td>{{ formatSchedule(item.schedules) }}</td>
          <td>{{ item.classroom || '-' }}</td>
          <td>{{ item.credits }}</td>
          <td class="action-cell">
            <MyButton
              btn-type="button"
              color="deep-blue"
              size="small"
              :content="enrollingLectureId === item.lectureId ? '신청 중' : '신청'"
              :disabled="!isEnrollmentOpen || isMutating || item.lectureStatus !== 'OPEN'"
              @click="enrollFromCart(item)"
            />
            <MyButton
              btn-type="button"
              color="white"
              size="small"
              :content="removingCartItemId === item.cartItemId ? '삭제 중' : '삭제'"
              :disabled="!isEnrollmentOpen || isMutating"
              @click="removeFromCart(item)"
            />
          </td>
        </tr>
      </MyTable>
    </section>

    <section class="enrollment-section">
      <div class="section-title-row">
        <h3>수강신청 목록</h3>
        <span class="summary-text">총 신청학점 <strong>{{ activeEnrollmentCredits }}</strong>학점</span>
      </div>
      <MyTable
        :columns="enrollmentColumns"
        :loading="isLoadingEnrollments"
        :empty="!isLoadingEnrollments && enrollments.length === 0"
        empty-message="선택한 학기의 수강신청 내역이 없습니다."
      >
        <tr
          v-for="item in enrollments"
          :key="item.enrollmentId"
        >
          <td>
            <div class="course-name">
              {{ item.courseName }}
            </div>
            <div class="course-code">
              {{ item.courseCode }} · {{ item.sectionNo }}분반
            </div>
          </td>
          <td>{{ item.professorName || '-' }}</td>
          <td>{{ item.classroom || '-' }}</td>
          <td>{{ item.credits }}</td>
          <td>{{ formatDate(item.enrolledAt, 'YYYY-MM-DD HH:mm') }}</td>
          <td>
            <MyButton
              btn-type="button"
              color="white"
              size="small"
              class="cancel-action"
              :content="cancellingEnrollmentId === item.enrollmentId ? '취소 중' : '취소'"
              :disabled="!isEnrollmentOpen || isMutating"
              @click="cancelActiveEnrollment(item)"
            />
          </td>
        </tr>
      </MyTable>
    </section>
  </MyPageContainer>
</template>

<style scoped>
.semester-section,
.add-section {
  padding: 18px 20px;
  margin-bottom: 24px;
  border: 1px solid var(--personal-color-border-mist);
  border-radius: 8px;
  background: var(--personal-color-white);
}

.semester-filter,
.add-row {
  display: flex;
  align-items: flex-end;
  gap: 12px;
}

.filter-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 260px;
}

.filter-field label {
  color: var(--personal-color-text-secondary-steel);
  font-size: 0.85rem;
  font-weight: 600;
}

.period-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 16px;
  margin-top: 16px;
  border-radius: 6px;
  color: var(--personal-color-primary-text-navy);
  background: var(--personal-color-bg-subtle-snow);
}

.period-card > div {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.period-title {
  color: var(--personal-color-text-muted-slate);
  font-size: 0.78rem;
}

.period-badge {
  flex-shrink: 0;
  padding: 5px 10px;
  border-radius: var(--personal-radius-badge);
  font-size: 0.78rem;
  font-weight: 700;
}

.period-open {
  background: var(--personal-color-bg-success-soft-honeydew);
}

.period-open .period-badge {
  color: var(--personal-color-status-success-text-forest);
  background: var(--personal-color-status-success-bg-mint);
}

.period-upcoming {
  background: var(--personal-color-info-soft-ice);
}

.period-upcoming .period-badge {
  color: var(--personal-color-status-processing-text-navy);
  background: var(--personal-color-status-processing-bg-sky);
}

.period-closed .period-badge,
.period-unavailable .period-badge {
  color: var(--personal-color-status-warning-text-amber);
  background: var(--personal-color-status-warning-bg-butter);
}

.add-section {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
}

.add-guide {
  margin: 6px 0 0;
  color: var(--personal-color-text-muted-slate);
  font-size: 0.82rem;
}

.add-row :deep(input) {
  width: 220px;
}

.error-text {
  margin: 10px 0 0;
  color: var(--personal-color-red);
  font-size: 0.82rem;
}

.cart-section,
.enrollment-section {
  margin-bottom: 28px;
}

.section-title-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 10px;
}

h3 {
  margin: 0;
  color: var(--personal-color-primary-text-navy);
  font-size: 1rem;
  font-weight: 700;
}

.summary-text {
  color: var(--personal-color-text-muted-slate);
  font-size: 0.85rem;
}

.summary-text strong {
  color: var(--personal-color-student-primary-cyan);
  font-size: 1rem;
}

.course-name {
  font-weight: 600;
}

.course-code {
  margin-top: 2px;
  color: var(--personal-color-text-muted-slate);
  font-size: 0.78rem;
}

.action-cell {
  display: flex;
  justify-content: center;
  gap: 8px;
}

.cancel-action {
  color: var(--personal-color-red);
}

@media (max-width: 760px) {
  .semester-filter,
  .add-section,
  .add-row {
    align-items: stretch;
    flex-direction: column;
  }

  .filter-field,
  .add-row :deep(input) {
    width: 100%;
  }

  .period-card {
    align-items: flex-start;
  }
}
</style>
