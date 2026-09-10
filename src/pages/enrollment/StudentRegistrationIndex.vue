<script setup>
import { computed, onMounted, ref } from 'vue';
import {
  addCartItem,
  cancelEnrollment,
  createEnrollment,
  getMyCart,
  getMyEnrollments,
  removeCartItem,
} from '../../api/enrollmentApi';
import MyPageContainer from '../../components/layout/MyPageContainer.vue';
import MyButton from '../../components/button/MyButton.vue';
import MyInput from '../../components/input/MyInput.vue';
import MyTable from '../../components/table/MyTable.vue';
import MyStatusBadge from '../../components/common/MyStatusBadge.vue';
import { confirmDialog, notify } from '../../composables/useDialog';
import { formatDate } from '../../util/format';

defineOptions({ name: 'StudentRegistrationIndex' });

const DAY_LABELS = { MON: '월', TUE: '화', WED: '수', THU: '목', FRI: '금' };

const cartColumns = [
  { key: 'course', label: '교과목' },
  { key: 'schedule', label: '요일·교시' },
  { key: 'credits', label: '학점' },
  { key: 'management', label: '관리' },
];

const enrollmentColumns = [
  { key: 'course', label: '교과목' },
  { key: 'semester', label: '학기' },
  { key: 'status', label: '상태' },
  { key: 'enrolledAt', label: '신청일' },
  { key: 'management', label: '관리' },
];

const statusLabels = { ACTIVE: '수강중', CANCELLED: '취소됨' };
const statusVariants = { ACTIVE: 'success', CANCELLED: 'warning' };

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

const activeEnrollments = computed(() => enrollments.value.filter((item) => item.enrollmentStatus === 'ACTIVE'));

const formatSchedule = (schedules = []) => schedules
  .map((schedule) => `${DAY_LABELS[schedule.dayOfWeek] || schedule.dayOfWeek} ${schedule.startPeriod}~${schedule.endPeriod}교시`)
  .join(', ') || '-';

const createIdempotencyKey = () => {
  const suffix = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `enrollment-create-${suffix}`;
};

const enrollmentErrorMessage = (error) =>
  error.response?.data?.data?.reasons?.[0]?.message
  || error.response?.data?.message
  || '수강신청에 실패했습니다.';

const loadCart = async () => {
  isLoadingCart.value = true;
  try {
    const response = await getMyCart();
    cartItems.value = response.data.data.items || [];
    cartTotalCredits.value = response.data.data.totalCredits || 0;
  } catch (error) {
    cartItems.value = [];
    await notify(error.response?.data?.message || '수강 장바구니를 불러오지 못했습니다.');
  } finally {
    isLoadingCart.value = false;
  }
};

const loadEnrollments = async () => {
  isLoadingEnrollments.value = true;
  try {
    const response = await getMyEnrollments();
    enrollments.value = response.data.data || [];
  } catch (error) {
    enrollments.value = [];
    await notify(error.response?.data?.message || '수강 내역을 불러오지 못했습니다.');
  } finally {
    isLoadingEnrollments.value = false;
  }
};

const addToCart = async () => {
  const lectureId = Number(newLectureId.value);
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
  } catch (error) {
    await notify(error.response?.data?.message || '장바구니 담기에 실패했습니다.');
  } finally {
    isAdding.value = false;
  }
};

const removeFromCart = async (cartItemId) => {
  removingCartItemId.value = cartItemId;
  try {
    await removeCartItem(cartItemId);
    await loadCart();
  } catch (error) {
    await notify(error.response?.data?.message || '장바구니 삭제에 실패했습니다.');
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
    await removeCartItem(item.cartItemId).catch(() => {});
    await notify('수강신청이 완료되었습니다.');
    await Promise.all([loadCart(), loadEnrollments()]);
  } catch (error) {
    await notify(enrollmentErrorMessage(error));
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
    await notify('수강신청이 취소되었습니다.');
    await loadEnrollments();
  } catch (error) {
    await notify(error.response?.data?.message || '수강 취소에 실패했습니다.');
  } finally {
    cancellingEnrollmentId.value = null;
  }
};

onMounted(async () => {
  await Promise.all([loadCart(), loadEnrollments()]);
});
</script>

<template>
  <MyPageContainer title="수강 신청" subtitle="개설 강의 번호로 장바구니에 담은 뒤 수강신청합니다.">
    <section class="add-section">
      <p class="add-guide">
        개설 강의 번호(강의 ID)는 학과사무실 또는 강의계획서 안내를 통해 확인할 수 있습니다.
      </p>
      <div class="add-row">
        <MyInput
          v-model="newLectureId"
          numeric-only
          placeholder="개설 강의 번호"
          @keyup-enter="addToCart"
        />
        <MyButton
          btn-type="button"
          color="deep-blue"
          size="middle"
          :content="isAdding ? '담는 중...' : '장바구니 담기'"
          :disabled="isAdding"
          @click="addToCart"
        />
      </div>
      <p v-if="formError" class="error-text" role="alert">{{ formError }}</p>
    </section>

    <section class="cart-section">
      <div class="section-title-row">
        <h3>수강 장바구니</h3>
        <span class="summary-text">예상 신청학점 {{ cartTotalCredits }}학점</span>
      </div>
      <MyTable
        :columns="cartColumns"
        :loading="isLoadingCart"
        :empty="!isLoadingCart && cartItems.length === 0"
        empty-message="장바구니가 비어 있습니다."
      >
        <tr v-for="item in cartItems" :key="item.cartItemId">
          <td>
            <div class="course-name">{{ item.courseName }}</div>
            <div class="course-code">{{ item.courseCode }} · {{ item.sectionNo }}분반 · {{ item.professorName }}</div>
          </td>
          <td>{{ formatSchedule(item.schedules) }}</td>
          <td>{{ item.credits }}</td>
          <td class="action-cell">
            <MyButton
              btn-type="button"
              color="deep-blue"
              size="small"
              :content="enrollingLectureId === item.lectureId ? '신청 중' : '수강신청'"
              :disabled="enrollingLectureId === item.lectureId"
              @click="enrollFromCart(item)"
            />
            <MyButton
              btn-type="button"
              color="white"
              size="small"
              :content="removingCartItemId === item.cartItemId ? '삭제 중' : '삭제'"
              :disabled="removingCartItemId === item.cartItemId"
              @click="removeFromCart(item.cartItemId)"
            />
          </td>
        </tr>
      </MyTable>
    </section>

    <section class="enrollment-section">
      <h3>나의 수강신청 내역</h3>
      <MyTable
        :columns="enrollmentColumns"
        :loading="isLoadingEnrollments"
        :empty="!isLoadingEnrollments && enrollments.length === 0"
        empty-message="수강신청 내역이 없습니다."
      >
        <tr v-for="item in enrollments" :key="item.enrollmentId">
          <td>
            <div class="course-name">{{ item.courseName }}</div>
            <div class="course-code">{{ item.courseCode }} · {{ item.sectionNo }}분반</div>
          </td>
          <td>{{ item.academicYear }}학년도 {{ item.term === 'FIRST' ? 1 : 2 }}학기</td>
          <td>
            <MyStatusBadge :label="statusLabels[item.enrollmentStatus] || item.enrollmentStatus" :variant="statusVariants[item.enrollmentStatus] || 'processing'" />
          </td>
          <td>{{ formatDate(item.enrolledAt, 'YYYY-MM-DD HH:mm') }}</td>
          <td>
            <MyButton
              v-if="item.enrollmentStatus === 'ACTIVE'"
              btn-type="button"
              color="white"
              size="small"
              class="cancel-action"
              :content="cancellingEnrollmentId === item.enrollmentId ? '취소 중' : '취소'"
              :disabled="cancellingEnrollmentId === item.enrollmentId"
              @click="cancelActiveEnrollment(item)"
            />
            <span v-else>-</span>
          </td>
        </tr>
      </MyTable>
    </section>
  </MyPageContainer>
</template>

<style scoped>
.add-section {
  padding: 18px 20px;
  margin-bottom: 24px;
  border: 1px solid var(--personal-color-border-mist);
  border-radius: 8px;
  background: var(--personal-color-white);
}

.add-guide {
  margin: 0 0 12px;
  color: var(--personal-color-text-muted-slate);
  font-size: 0.82rem;
}

.add-row {
  display: flex;
  gap: 12px;
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
  margin: 0 0 10px;
  color: var(--personal-color-primary-text-navy);
  font-size: 1rem;
  font-weight: 700;
}

.summary-text {
  color: var(--personal-color-text-muted-slate);
  font-size: 0.85rem;
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
</style>
