<script setup>
import { computed, onMounted, ref } from 'vue';
import {
  createEnrollment,
  getMyCart,
  removeCartItem,
} from '../../api/enrollmentApi';
import MyButton from '../../components/button/MyButton.vue';
import MySelect from '../../components/input/MySelect.vue';
import MyPageContainer from '../../components/layout/MyPageContainer.vue';
import MySearchFilter from '../../components/search/MySearchFilter.vue';
import MyTable from '../../components/table/MyTable.vue';
import { confirmDialog, notify } from '../../composables/useDialog';
import { useSemesterStore } from '../../store/semester/useSemesterStore';

defineOptions({ name: 'StudentCartIndex' });

const DAY_LABELS = { MON: '월', TUE: '화', WED: '수', THU: '목', FRI: '금' };
const TERM_ORDER = { FIRST: 1, SECOND: 2 };

const cartColumns = [
  { key: 'course', label: '교과목' },
  { key: 'schedule', label: '요일·교시' },
  { key: 'classroom', label: '강의실' },
  { key: 'credits', label: '학점' },
  { key: 'management', label: '관리' },
];

const semesterStore = useSemesterStore();
const selectedSemesterKey = ref('');
const cartItems = ref([]);
const cartTotalCredits = ref(0);
const isLoadingCart = ref(false);
const enrollingLectureId = ref(null);
const removingCartItemId = ref(null);

const semesterOptions = computed(() => [...semesterStore.semesters]
  .sort((a, b) => (
    Number(b.academicYear) - Number(a.academicYear)
    || (TERM_ORDER[b.term] || 0) - (TERM_ORDER[a.term] || 0)
  ))
  .map((semester) => ({
    value: `${semester.academicYear}-${semester.term}`,
    label: `${semester.academicYear}학년도 ${TERM_ORDER[semester.term] || semester.term}학기${(semester.isCurrent ?? semester.current) ? ' (현재)' : ''}`,
  })));

const selectedParams = computed(() => {
  const [academicYear, term] = selectedSemesterKey.value.split('-');
  if (!academicYear || !term) return {};
  return { academicYear: Number(academicYear), term };
});

const isMutating = computed(() => (
  enrollingLectureId.value !== null || removingCartItemId.value !== null
));

const formatSchedule = (schedules = []) => schedules
  .map((schedule) => `${DAY_LABELS[schedule.dayOfWeek] || schedule.dayOfWeek} ${schedule.startPeriod}~${schedule.endPeriod}교시`)
  .join(', ') || '-';

const createIdempotencyKey = () => {
  const suffix = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `enrollment-create-${suffix}`;
};

const enrollmentErrorMessage = (error) => (
  error.response?.data?.data?.reasons?.[0]?.message
  || error.response?.data?.message
  || '수강신청에 실패했습니다.'
);

const loadCart = async () => {
  isLoadingCart.value = true;
  try {
    const response = await getMyCart(selectedParams.value);
    cartItems.value = response.data.data.items || [];
    cartTotalCredits.value = response.data.data.totalCredits || 0;
  } catch (error) {
    cartItems.value = [];
    cartTotalCredits.value = 0;
    await notify(error.response?.data?.message || '수강 장바구니를 불러오지 못했습니다.');
  } finally {
    isLoadingCart.value = false;
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
    await loadCart();
    await notify('수강신청이 완료되었습니다.');
  } catch (error) {
    await notify(enrollmentErrorMessage(error));
  } finally {
    enrollingLectureId.value = null;
  }
};

onMounted(async () => {
  try {
    await semesterStore.fetchSemesters();
    const current = semesterStore.semesters.find((semester) => semester.isCurrent ?? semester.current);
    selectedSemesterKey.value = current
      ? `${current.academicYear}-${current.term}`
      : semesterOptions.value[0]?.value || '';
  } catch {
    selectedSemesterKey.value = '';
  }
  await loadCart();
});
</script>

<template>
  <MyPageContainer title="수강 장바구니">
    <MySearchFilter submit-text="조회" @search="loadCart">
      <div class="search-group semester-filter">
        <label for="cart-semester">대상 학기</label>
        <MySelect
          id="cart-semester"
          v-model="selectedSemesterKey"
          :options="semesterOptions"
          placeholder="학기 선택"
          :disabled="isLoadingCart || isMutating"
        />
      </div>
    </MySearchFilter>

    <section class="cart-section">
      <div class="section-title-row">
        <h3>담은 강의</h3>
        <span class="summary-text">예상 신청학점 <strong>{{ cartTotalCredits }}</strong>학점</span>
      </div>

      <MyTable
        :columns="cartColumns"
        :loading="isLoadingCart"
        :empty="!isLoadingCart && cartItems.length === 0"
        empty-message="선택한 학기의 장바구니가 비어 있습니다."
      >
        <tr v-for="item in cartItems" :key="item.cartItemId">
          <td>
            <div class="course-name">{{ item.courseName }}</div>
            <div class="course-code">{{ item.courseCode }} · {{ item.sectionNo }}분반 · {{ item.professorName }}</div>
          </td>
          <td>{{ formatSchedule(item.schedules) }}</td>
          <td>{{ item.classroom || '-' }}</td>
          <td>{{ item.credits }}</td>
          <td class="action-cell">
            <MyButton
              btn-type="button"
              color="red"
              size="small"
              :content="removingCartItemId === item.cartItemId ? '삭제 중' : '삭제'"
              :disabled="isMutating"
              @click="removeFromCart(item)"
            />
            <MyButton
              btn-type="button"
              color="deep-blue"
              size="small"
              :content="enrollingLectureId === item.lectureId ? '신청 중' : '수강신청'"
              :disabled="isMutating || item.lectureStatus !== 'OPEN'"
              @click="enrollFromCart(item)"
            />
          </td>
        </tr>
      </MyTable>
    </section>
  </MyPageContainer>
</template>

<style scoped>
.semester-filter {
  width: 260px;
}

.cart-section {
  margin-bottom: 28px;
}

.section-title-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 16px;
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
  color: var(--personal-color-primary-navy);
}

.course-name {
  color: var(--personal-color-primary-text-navy);
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

@media (max-width: 640px) {
  .semester-filter {
    width: 100%;
  }

  .section-title-row {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
