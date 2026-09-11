<script setup>
import { onMounted, ref } from 'vue';
import {
  createEnrollment,
  getMyCart,
  removeCartItem,
} from '../../api/enrollmentApi';
import MyPageContainer from '../../components/layout/MyPageContainer.vue';
import MyButton from '../../components/button/MyButton.vue';
import MyTable from '../../components/table/MyTable.vue';
import { confirmDialog, notify } from '../../composables/useDialog';

defineOptions({ name: 'StudentCartIndex' });

const DAY_LABELS = { MON: '월', TUE: '화', WED: '수', THU: '목', FRI: '금' };

const cartColumns = [
  { key: 'course', label: '교과목' },
  { key: 'schedule', label: '요일·교시' },
  { key: 'credits', label: '학점' },
  { key: 'management', label: '관리' },
];

const cartItems = ref([]);
const cartTotalCredits = ref(0);
const isLoadingCart = ref(false);
const enrollingLectureId = ref(null);
const removingCartItemId = ref(null);

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
    await loadCart();
  } catch (error) {
    await notify(enrollmentErrorMessage(error));
  } finally {
    enrollingLectureId.value = null;
  }
};

onMounted(async () => {
  await loadCart();
});
</script>

<template>
  <MyPageContainer title="수강 장바구니">
    <section class="cart-section">
      <div class="section-title-row">
        <h3>담은 강의</h3>
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
  </MyPageContainer>
</template>

<style scoped>
.cart-section {
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
</style>
