<script setup>
import { ref } from 'vue';
import { reflectRetakeGrade } from '../../api/gradeApi';
import MyButton from '../../components/button/MyButton.vue';
import MyStatusBadge from '../../components/common/MyStatusBadge.vue';
import MyInput from '../../components/input/MyInput.vue';
import MyPageContainer from '../../components/layout/MyPageContainer.vue';
import MyTable from '../../components/table/MyTable.vue';
import { confirmDialog, notify } from '../../composables/useDialog';
import { formatDate } from '../../util/format';

defineOptions({ name: 'AdminRetakeGradeReflection' });

const summaryColumns = [
  { key: 'semester', label: '학기' },
  { key: 'credits', label: '최종 반영 학점' },
  { key: 'gpa', label: '최종 평점' },
];

const enrollmentId = ref('');
const reason = ref('');
const formError = ref('');
const isSubmitting = ref(false);
const result = ref(null);

const validate = () => {
  const id = Number(enrollmentId.value);
  if (!Number.isInteger(id) || id <= 0) return '재수강 성적을 반영할 수강 ID를 입력해 주세요.';
  if (!reason.value.trim()) return '반영 사유를 입력해 주세요.';
  if (reason.value.trim().length > 500) return '반영 사유는 500자 이하여야 합니다.';
  return '';
};

const semesterLabel = (summary) => `${summary.academicYear}학년도 ${summary.term === 'FIRST' ? 1 : 2}학기`;
const gradeLabel = (grade) => grade || '-';

const submit = async () => {
  if (isSubmitting.value) return;
  formError.value = validate();
  if (formError.value) return;

  const id = Number(enrollmentId.value);
  const confirmed = await confirmDialog(
    `수강 ID ${id}의 재수강 성적을 반영하시겠습니까? 반영 이력과 처리 사유가 저장됩니다.`,
  );
  if (!confirmed) return;

  isSubmitting.value = true;
  try {
    const response = await reflectRetakeGrade(id, reason.value.trim());
    result.value = response.data.data;
    reason.value = '';
    await notify('재수강 성적 반영과 학기별 성적 재계산이 완료되었습니다.');
  } catch (error) {
    result.value = null;
    await notify(error.response?.data?.message || '재수강 성적 반영 중 오류가 발생했습니다.');
  } finally {
    isSubmitting.value = false;
  }
};
</script>

<template>
  <MyPageContainer
    title="재수강 성적 반영"
    subtitle="가장 최근에 공개된 재수강 성적을 최종 성적과 학기별 GPA에 반영합니다."
  >
    <section class="policy-card">
      <div>
        <span class="policy-number">01</span>
        <p><strong>최신 수강 확인</strong>같은 학생·교과목의 가장 최근 활성 수강만 처리됩니다.</p>
      </div>
      <div>
        <span class="policy-number">02</span>
        <p><strong>성적 상태 확인</strong>현재와 이전 수강 성적이 모두 공개된 경우에만 반영됩니다.</p>
      </div>
      <div>
        <span class="policy-number">03</span>
        <p><strong>이력과 GPA 갱신</strong>이전 성적은 보존하고 최신 성적으로 학기별 성적을 재계산합니다.</p>
      </div>
    </section>

    <div class="content-grid">
      <section class="form-card">
        <div class="section-heading">
          <div>
            <h3>반영 대상 입력</h3>
            <p>성적 처리 대상의 수강 ID를 확인한 뒤 사유와 함께 입력해 주세요.</p>
          </div>
          <MyStatusBadge
            label="관리자 전용"
            variant="processing"
          />
        </div>

        <form @submit.prevent="submit">
          <label for="retake-enrollment-id">
            <span>수강 ID <em>필수</em></span>
            <MyInput
              id="retake-enrollment-id"
              v-model="enrollmentId"
              numeric-only
              placeholder="예: 302"
              :disabled="isSubmitting"
            />
            <small>학생 번호가 아닌 수강(enrollment) ID를 입력합니다.</small>
          </label>

          <label for="retake-reason">
            <span>반영 사유 <em>필수</em></span>
            <textarea
              id="retake-reason"
              v-model="reason"
              rows="5"
              maxlength="500"
              placeholder="예: 2026학년도 1학기 재수강 확정 성적 반영"
              :disabled="isSubmitting"
            />
            <small class="character-count">{{ reason.length }} / 500</small>
          </label>

          <p
            v-if="formError"
            class="form-error"
            role="alert"
          >
            {{ formError }}
          </p>

          <div class="form-actions">
            <MyButton
              btn-type="submit"
              color="admin-indigo"
              size="big"
              :content="isSubmitting ? '반영 중...' : '재수강 성적 반영'"
              :disabled="isSubmitting"
            />
          </div>
        </form>
      </section>

      <section
        class="result-card"
        aria-live="polite"
      >
        <div class="section-heading">
          <div>
            <h3>최근 처리 결과</h3>
            <p>성공한 반영 결과와 재계산된 학기별 성적입니다.</p>
          </div>
          <MyStatusBadge
            v-if="result"
            label="반영 완료"
            variant="success"
          />
        </div>

        <div
          v-if="!result"
          class="empty-result"
        >
          <strong>처리 결과가 없습니다.</strong>
          <span>재수강 성적 반영을 완료하면 결과가 여기에 표시됩니다.</span>
        </div>

        <template v-else>
          <div class="grade-change">
            <div>
              <span>이전 수강 #{{ result.previousEnrollmentId }}</span>
              <strong>{{ gradeLabel(result.previousGrade) }}</strong>
            </div>
            <span
              class="arrow"
              aria-hidden="true"
            >→</span>
            <div class="reflected-grade">
              <span>최종 수강 #{{ result.enrollmentId }}</span>
              <strong>{{ gradeLabel(result.reflectedGrade) }}</strong>
            </div>
          </div>

          <dl class="result-details">
            <div><dt>학생 ID</dt><dd>{{ result.studentId }}</dd></div>
            <div><dt>교과목 ID</dt><dd>{{ result.courseId }}</dd></div>
            <div><dt>처리자 ID</dt><dd>{{ result.processedBy }}</dd></div>
            <div><dt>처리시각</dt><dd>{{ formatDate(result.processedAt, 'YYYY-MM-DD HH:mm:ss') }}</dd></div>
          </dl>

          <h4>학기별 재계산 결과</h4>
          <MyTable
            :columns="summaryColumns"
            :empty="!result.summaries?.length"
            empty-message="재계산된 학기별 성적이 없습니다."
          >
            <tr
              v-for="summary in result.summaries"
              :key="summary.semesterId"
            >
              <td>{{ semesterLabel(summary) }}</td>
              <td>{{ summary.totalCredits }}학점</td>
              <td><strong>{{ Number(summary.gpa).toFixed(2) }}</strong></td>
            </tr>
          </MyTable>
        </template>
      </section>
    </div>
  </MyPageContainer>
</template>

<style scoped>
.policy-card { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1px; overflow: hidden; margin-bottom: 20px; border: 1px solid var(--personal-color-border-mist); border-radius: 8px; background: var(--personal-color-border-mist); }
.policy-card > div { display: flex; align-items: flex-start; gap: 12px; padding: 18px; background: var(--personal-color-white); }
.policy-number { flex: 0 0 auto; color: var(--personal-color-admin-secondary-indigo); font-size: .75rem; font-weight: 800; }
.policy-card p { display: flex; flex-direction: column; gap: 5px; margin: 0; color: var(--personal-color-text-muted-slate); font-size: .78rem; line-height: 1.5; }
.policy-card strong { color: var(--personal-color-primary-text-navy); font-size: .85rem; }
.content-grid { display: grid; grid-template-columns: minmax(340px, .8fr) minmax(0, 1.2fr); gap: 20px; }
.form-card, .result-card { padding: 22px; border: 1px solid var(--personal-color-border-mist); border-radius: 8px; background: var(--personal-color-white); }
.section-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 20px; }
.section-heading h3 { margin: 0; color: var(--personal-color-primary-text-navy); font-size: 1.05rem; }
.section-heading p { margin: 6px 0 0; color: var(--personal-color-text-muted-slate); font-size: .8rem; line-height: 1.5; }
form { display: flex; flex-direction: column; gap: 18px; }
form label { display: flex; flex-direction: column; gap: 7px; color: var(--personal-color-primary-text-navy); font-size: .82rem; font-weight: 700; }
form label em { color: var(--personal-color-danger-coral); font-size: .72rem; font-style: normal; }
form label small { color: var(--personal-color-text-muted-slate); font-size: .72rem; font-weight: 400; }
textarea { box-sizing: border-box; width: 100%; padding: 11px 12px; border: 1px solid var(--personal-color-border-mist); border-radius: 4px; font: inherit; font-weight: 400; resize: vertical; }
textarea:focus { border-color: var(--personal-color-admin-secondary-indigo); outline: none; }
textarea:disabled { background: var(--personal-color-bg-subtle-snow); }
.character-count { align-self: flex-end; }
.form-error { margin: -6px 0 0; color: var(--personal-color-danger-coral); font-size: .78rem; }
.form-actions { display: flex; justify-content: flex-end; }
.empty-result { display: flex; min-height: 270px; flex-direction: column; align-items: center; justify-content: center; gap: 8px; color: var(--personal-color-text-muted-slate); text-align: center; }
.empty-result strong { color: var(--personal-color-primary-text-navy); font-size: .9rem; }
.empty-result span { font-size: .78rem; }
.grade-change { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 16px; padding: 20px; border-radius: 8px; background: var(--personal-color-bg-surface-frost); }
.grade-change > div { display: flex; flex-direction: column; align-items: center; gap: 8px; }
.grade-change span { color: var(--personal-color-text-muted-slate); font-size: .76rem; }
.grade-change strong { color: var(--personal-color-primary-text-navy); font-size: 1.8rem; }
.grade-change .reflected-grade strong, .arrow { color: var(--personal-color-admin-secondary-indigo); }
.arrow { font-size: 1.4rem; font-weight: 800; }
.result-details { display: grid; grid-template-columns: 1fr 1fr; gap: 0 18px; margin: 18px 0; }
.result-details div { display: flex; justify-content: space-between; gap: 8px; padding: 9px 0; border-bottom: 1px solid var(--personal-color-table-border-frost); }
.result-details dt { color: var(--personal-color-text-muted-slate); font-size: .78rem; }
.result-details dd { margin: 0; font-size: .8rem; font-weight: 700; }
.result-card h4 { margin: 0 0 10px; font-size: .9rem; }
@media (max-width: 980px) { .content-grid { grid-template-columns: 1fr; } }
@media (max-width: 700px) { .policy-card { grid-template-columns: 1fr; } .result-details { grid-template-columns: 1fr; } }
</style>
