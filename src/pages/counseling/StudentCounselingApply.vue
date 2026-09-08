<script setup>
import { computed, onMounted, reactive, ref } from "vue";
import MyButton from "../../components/button/MyButton.vue";
import MyPageContainer from "../../components/layout/MyPageContainer.vue";
import { notify } from "../../composables/useDialog";
import { useCounselingStore } from "../../store/counseling/useCounselingStore";

const store = useCounselingStore();
const form = reactive({ professorId: "", title: "", question: "" });
const loading = ref(false);
const submitting = ref(false);
const errorMessage = ref("");
const advisorLoadError = ref("");

const advisor = computed(() => store.professors[0] || null);

onMounted(async () => {
  loading.value = true;
  advisorLoadError.value = "";
  try {
    await store.fetchProfessors();
    form.professorId = store.professors[0]?.professorId || "";
  } catch (error) {
    advisorLoadError.value = "담당 교수 정보를 불러오지 못했습니다.";
    await notify(error.response?.data?.message || advisorLoadError.value);
  } finally {
    loading.value = false;
  }
});

const submit = async () => {
  errorMessage.value = "";
  if (!form.professorId) errorMessage.value = "상담할 교수를 선택해 주세요.";
  else if (!form.title.trim())
    errorMessage.value = "상담 주제를 입력해 주세요.";
  else if (!form.question.trim())
    errorMessage.value = "상담 내용을 입력해 주세요.";
  if (errorMessage.value || submitting.value) return;

  submitting.value = true;
  try {
    await store.submitCounseling({
      professorId: Number(form.professorId),
      title: form.title.trim(),
      question: form.question.trim(),
    });
    form.title = "";
    form.question = "";
    await notify("온라인 상담 신청이 완료되었습니다.");
  } catch (error) {
    errorMessage.value =
      error.response?.data?.message || "상담 신청에 실패했습니다.";
  } finally {
    submitting.value = false;
  }
};
</script>

<template>
  <MyPageContainer title="온라인 상담 신청">
    <section class="counseling-section">
      <h3>상담 정보 입력</h3>
      <form class="counseling-card apply-card" @submit.prevent="submit">
        <div class="form-grid">
          <div class="advisor-field">
            <span>지도교수</span>
            <div class="advisor-value">
              <template v-if="loading"
                >담당 교수 정보를 불러오는 중입니다.</template
              >
              <template v-else-if="advisor">
                <strong>{{ advisor.name }} 교수</strong>
                <span>{{ advisor.departmentName }}</span>
              </template>
              <template v-else>{{
                advisorLoadError || "담당 교수 정보를 확인할 수 없습니다."
              }}</template>
            </div>
          </div>
          <label>
            <span>상담 주제</span>
            <input
              v-model="form.title"
              maxlength="200"
              placeholder="상담 주제를 입력하세요"
            />
          </label>
        </div>
        <label class="question-field">
          <span>상담 내용</span>
          <textarea
            v-model="form.question"
            maxlength="10000"
            placeholder="교수님께 상담할 내용을 입력해주세요."
          />
        </label>
        <p v-if="errorMessage" class="form-error">{{ errorMessage }}</p>
        <div class="submit-actions">
          <MyButton
            btn-type="submit"
            color="deep-blue"
            size="middle"
            :disabled="submitting || loading || !advisor"
            :content="submitting ? '신청 중' : '상담 신청'"
          />
        </div>
      </form>
    </section>
  </MyPageContainer>
</template>

<style scoped>
.counseling-section {
  margin-top: 36px;
}
.counseling-section h3 {
  margin: 0 0 16px 8px;
  font-size: 1.1rem;
}
.counseling-card {
  background: white;
  border: 1px solid var(--personal-color-border-mist);
  border-radius: 12px;
}
.apply-card {
  padding: 46px 28px 30px;
}
.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 42px;
  max-width: 820px;
}
label,
.advisor-field {
  display: flex;
  flex-direction: column;
  gap: 12px;
  color: var(--personal-color-text-secondary-steel);
  font-size: 0.9rem;
  font-weight: 700;
}
.advisor-value {
  display: flex;
  align-items: center;
  gap: 10px;
  height: 48px;
  padding: 0 16px;
  border: 1px solid var(--personal-color-border-mist);
  border-radius: 6px;
  background: var(--personal-color-bg-subtle-snow);
  color: var(--personal-color-text-muted-slate);
  font-weight: 400;
}
.advisor-value strong {
  color: var(--personal-color-primary-text-navy);
  font-weight: 600;
}
.advisor-value span {
  padding-left: 10px;
  border-left: 1px solid var(--personal-color-border-mist);
  font-weight: 400;
}
input,
textarea {
  width: 100%;
  border: 1px solid var(--personal-color-border-mist);
  border-radius: 6px;
  background: white;
  color: var(--personal-color-primary-text-navy);
  padding: 0 16px;
  outline: none;
  font-weight: 400;
}
input {
  height: 48px;
}
textarea {
  min-height: 250px;
  padding-top: 16px;
  resize: vertical;
  line-height: 1.6;
}
input:focus,
textarea:focus {
  border-color: var(--personal-color-primary-navy);
}
input::placeholder,
textarea::placeholder {
  color: var(--personal-color-text-faint-fog);
  font-weight: 400;
  opacity: 0.78;
}
.question-field {
  margin-top: 24px;
}
.form-error {
  color: var(--personal-color-red);
  margin: 12px 0;
  font-size: 0.9rem;
}
.submit-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 28px;
}
@media (max-width: 760px) {
  .form-grid {
    grid-template-columns: 1fr;
    gap: 20px;
  }
  .apply-card {
    padding: 28px 20px;
  }
  textarea {
    min-height: 190px;
  }
}
</style>
