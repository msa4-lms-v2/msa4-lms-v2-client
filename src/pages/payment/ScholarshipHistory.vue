<template>
  <MyPageContainer title="장학금 수혜 내역">
    <div v-if="isLoading" class="notice">불러오는 중...</div>
    <div v-else class="scholarship-history-content">
      <section class="summary-card" aria-label="장학금 수혜 요약">
        <div class="summary-item">
          <span>대상 학기</span>
          <strong>{{ semesterLabel }}</strong>
        </div>
        <div class="summary-item">
          <span>총 등록금</span>
          <strong>{{ formatCurrency(selectedBill?.billingAmount) }}</strong>
        </div>
        <div class="summary-item emphasis">
          <span>총 수혜 금액</span>
          <strong>{{ formatCurrency(totalScholarshipAmount) }}</strong>
        </div>
        <div class="summary-item emphasis">
          <span>최종 납부액</span>
          <strong>{{ formatCurrency(finalPaymentAmount) }}</strong>
        </div>
      </section>

      <section class="history-section" aria-labelledby="scholarship-history-title">
        <h3 id="scholarship-history-title">수혜 상세</h3>
        <MyTable
          :columns="tableColumns"
          :empty="filteredScholarships.length === 0"
          empty-message="장학금 수혜 내역이 없습니다."
        >
          <tr
            v-for="item in filteredScholarships"
            :key="item.id"
            :class="{ 'is-selected': selectedScholarshipId === item.id }"
            tabindex="0"
            @click="selectedScholarshipId = item.id"
            @keydown.enter="selectedScholarshipId = item.id"
            @keydown.space.prevent="selectedScholarshipId = item.id"
          >
            <td>{{ scholarshipName(item.type) }}</td>
            <td>등록금 감면</td>
            <td>{{ formatCurrency(item.amount) }}</td>
            <td>{{ formatDate(item.createdAt) }}</td>
            <td class="status-cell">적용 완료</td>
          </tr>
        </MyTable>
      </section>

      <section
        v-if="selectedScholarship"
        class="detail-section"
        aria-labelledby="scholarship-detail-title"
      >
        <h3 id="scholarship-detail-title">{{ scholarshipName(selectedScholarship.type) }}</h3>
        <div class="detail-card">
          <dl class="detail-grid">
            <div>
              <dt>장학금 명칭</dt>
              <dd>{{ scholarshipName(selectedScholarship.type) }}</dd>
            </div>
            <div>
              <dt>수혜 구분</dt>
              <dd>등록금 감면</dd>
            </div>
            <div>
              <dt>수혜 금액</dt>
              <dd>{{ formatCurrency(selectedScholarship.amount) }}</dd>
            </div>
            <div>
              <dt>적용일</dt>
              <dd>{{ formatDate(selectedScholarship.createdAt) }}</dd>
            </div>
          </dl>
          <div class="detail-divider"></div>
        </div>
      </section>
    </div>
  </MyPageContainer>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useScholarshipApplicationStore } from '../../store/payment/useScholarshipApplicationStore';
import { useTuitionStore } from '../../store/payment/useTuitionStore';
import { useSemesterStore } from '../../store/semester/useSemesterStore';
import { formatCurrency, formatDate } from '../../util/format';
import MyPageContainer from '../../components/layout/MyPageContainer.vue';
import MyTable from '../../components/table/MyTable.vue';

const appStore = useScholarshipApplicationStore();
const tuitionStore = useTuitionStore();
const semesterStore = useSemesterStore();

const selectedScholarshipId = ref(null);

const tableColumns = [
  { key: 'name', label: '장학금 명칭' },
  { key: 'benefitType', label: '수혜 구분' },
  { key: 'amount', label: '수혜 금액' },
  { key: 'appliedDate', label: '적용일' },
  { key: 'status', label: '상태' },
];

const scholarshipName = (type) => ({
  MERIT: '성적우수 장학금',
  NEED_BASED: '가계곤란 장학금',
  OTHER: '기타 장학금',
}[type] || type);

// 요약 카드 기준 등록 고지는 장학금 유무와 상관없이, 납부 기한이 가장 최근인 고지 하나로 정한다.
const selectedBill = computed(() => {
  if (tuitionStore.myBills.length === 0) return null;
  return [...tuitionStore.myBills].sort((a, b) => new Date(b.dueDate) - new Date(a.dueDate))[0];
});

const semesterLabel = computed(() => (
  selectedBill.value ? semesterStore.getSemesterLabel(selectedBill.value.semesterId) : '-'
));

const filteredScholarships = computed(() => {
  if (!selectedBill.value) return [];
  return appStore.myScholarships.filter((item) => item.semesterId === selectedBill.value.semesterId);
});

const totalScholarshipAmount = computed(() =>
  filteredScholarships.value.reduce((sum, item) => sum + Number(item.amount || 0), 0),
);

const finalPaymentAmount = computed(() => Math.max(
  0,
  Number(selectedBill.value?.billingAmount || 0) - totalScholarshipAmount.value,
));

const selectedScholarship = computed(() =>
  filteredScholarships.value.find((item) => item.id === selectedScholarshipId.value)
  || filteredScholarships.value[0]
  || null,
);

const isLoading = computed(() =>
  appStore.isLoadingMyScholarships || tuitionStore.isLoadingMyBills || semesterStore.isLoading,
);

watch(filteredScholarships, (items) => {
  if (!items.some((item) => item.id === selectedScholarshipId.value)) {
    selectedScholarshipId.value = items[0]?.id || null;
  }
}, { immediate: true });

onMounted(async () => {
  await Promise.all([
    appStore.fetchMyScholarships(),
    tuitionStore.fetchMyBills(),
    semesterStore.fetchSemesters(),
  ]);
});
</script>

<style scoped>
:deep(.page-container) {
  max-width: 1080px;
}

.summary-card,
.detail-card {
  border: 1px solid var(--personal-color-border-mist);
  border-radius: var(--personal-radius);
  background: var(--personal-color-white);
}

.summary-card {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  min-height: 78px;
  margin-bottom: 22px;
  padding: 16px;
}

.summary-item {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.summary-item span,
.detail-grid dt {
  color: var(--personal-color-text-muted-slate);
  font-size: 0.7rem;
  font-weight: 500;
}

.summary-item strong {
  color: var(--personal-color-primary-text-navy);
  font-size: 1.05rem;
  font-weight: 800;
}

.summary-item.emphasis strong {
  color: var(--personal-color-student-primary-cyan);
}

.history-section,
.detail-section {
  margin-top: 30px;
}

.history-section h3,
.detail-section h3 {
  margin: 0 0 12px;
  color: var(--personal-color-primary-text-navy);
  font-size: 1.05rem;
}

.history-section :deep(.table-container) {
  border-color: var(--personal-color-border-mist);
  border-radius: var(--personal-radius);
}

.history-section :deep(.my-table th) {
  padding: 10px 16px;
  border-bottom-width: 1px;
  font-size: 0.72rem;
  font-weight: 600;
}

.history-section :deep(.my-table td) {
  padding: 11px 16px;
  border-bottom: 1px solid var(--personal-color-table-border-frost);
  font-size: 0.75rem;
}

.history-section :deep(.my-table tbody tr) {
  cursor: pointer;
}

.history-section :deep(.my-table tbody tr:hover),
.history-section :deep(.my-table tbody tr.is-selected) {
  background: var(--personal-color-bg-hover-frost);
}

.history-section :deep(.my-table tbody tr:focus-visible) {
  outline: 2px solid var(--personal-color-student-primary-cyan);
  outline-offset: -2px;
}

.status-cell {
  font-weight: 700;
}

.detail-card {
  min-height: 120px;
  padding: 21px 17px;
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 22px 72px;
  margin: 0;
}

.detail-grid > div {
  display: grid;
  grid-template-columns: 102px 1fr;
  align-items: center;
}

.detail-grid dt,
.detail-grid dd {
  margin: 0;
}

.detail-grid dd {
  color: var(--personal-color-primary-text-navy);
  font-size: 0.78rem;
  font-weight: 700;
}

.detail-divider {
  height: 1px;
  margin-top: 22px;
  background: var(--personal-color-table-border-frost);
}

.notice {
  margin: 0;
  padding: 40px;
  border-radius: 6px;
  background: var(--personal-color-white);
  color: var(--personal-color-text-secondary-steel);
  text-align: center;
  font-weight: 500;
}

@media (max-width: 760px) {
  .summary-card {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 22px 16px;
  }

  .detail-grid {
    grid-template-columns: 1fr;
    gap: 18px;
  }
}
</style>
