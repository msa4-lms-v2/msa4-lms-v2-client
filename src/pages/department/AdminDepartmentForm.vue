<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  createDepartment,
  getCollegeOptions,
  getDepartment,
  updateDepartment,
} from '../../api/departmentApi';
import MyButton from '../../components/button/MyButton.vue';
import MyInput from '../../components/input/MyInput.vue';
import MySelect from '../../components/input/MySelect.vue';
import MyPageContainer from '../../components/layout/MyPageContainer.vue';
import { notify } from '../../composables/useDialog';

defineOptions({ name: 'AdminDepartmentForm' });

const route = useRoute();
const router = useRouter();
const departmentId = computed(() => route.params.departmentId);
const isEdit = computed(() => Boolean(departmentId.value));
const colleges = ref([]);
const isLoading = ref(false);
const isSaving = ref(false);
const form = reactive({
  code: '',
  name: '',
  collegeId: '',
  active: true,
});

const statusLabel = computed(() => (form.active ? '운영 중' : '운영 중지'));
const selectedCollegeName = computed(() => (
  colleges.value.find((college) => String(college.id) === String(form.collegeId))?.name || '-'
));

const loadColleges = async () => {
  try {
    colleges.value = await getCollegeOptions();
  } catch {
    colleges.value = [];
  }
};

const loadDepartment = async () => {
  if (!isEdit.value) return;

  isLoading.value = true;

  try {
    const { data } = await getDepartment(departmentId.value);
    const department = data.data;

    Object.assign(form, {
      code: department.code,
      name: department.name,
      collegeId: department.college?.id || '',
      active: department.active,
    });
  } catch (error) {
    await notify(error.response?.data?.message || '학과 정보를 불러오지 못했습니다.');
    router.replace({ name: 'AdminDepartmentIndex' });
  } finally {
    isLoading.value = false;
  }
};

const validate = () => {
  if (!/^\d{3}$/.test(form.code)) return '학과 코드는 숫자 3자리로 입력해 주세요.';
  if (!form.name.trim()) return '학과명을 입력해 주세요.';
  return '';
};

const save = async () => {
  const message = validate();
  if (message) {
    await notify(message);
    return;
  }

  isSaving.value = true;

  try {
    const payload = isEdit.value
      ? { name: form.name.trim(), active: form.active }
      : {
        code: form.code,
        name: form.name.trim(),
        collegeId: form.collegeId || null,
        active: form.active,
      };
    const { data } = isEdit.value
      ? await updateDepartment(departmentId.value, payload)
      : await createDepartment(payload);

    await notify(isEdit.value ? '학과 정보를 수정했습니다.' : '학과를 등록했습니다.');
    router.replace({ name: 'AdminDepartmentDetail', params: { departmentId: data.data.id } });
  } catch (error) {
    await notify(error.response?.data?.message || '학과 정보 저장에 실패했습니다.');
  } finally {
    isSaving.value = false;
  }
};

onMounted(async () => {
  await loadColleges();
  await loadDepartment();
});
</script>

<template>
  <MyPageContainer :title="isEdit ? '학과 상세 및 수정' : '학과 등록'">
    <div
      v-if="isLoading"
      class="loading"
    >
      학과 정보를 불러오는 중입니다...
    </div>

    <form
      v-else
      class="department-form"
      @submit.prevent="save"
    >
      <section
        v-if="isEdit"
        class="overview-card"
      >
        <div>
          <span>학과 코드</span>
          <strong>{{ form.code }}</strong>
        </div>
        <div>
          <span>운영 상태</span>
          <strong :class="form.active ? 'status-active' : 'status-inactive'">{{ statusLabel }}</strong>
        </div>
      </section>

      <section class="form-card">
        <h3>{{ isEdit ? '학과 정보' : '학과 기본정보' }}</h3>
        <div class="field">
          <label for="department-code">학과 코드 <em>*</em></label>
          <MyInput
            id="department-code"
            v-model="form.code"
            numeric-only
            :maxlength="3"
            :disabled="isEdit"
            placeholder="예: 001"
          />
          <small v-if="isEdit">학과 코드는 등록 후 변경할 수 없습니다.</small>
        </div>
        <div class="field">
          <label for="department-name">학과명 <em>*</em></label>
          <MyInput
            id="department-name"
            v-model="form.name"
            maxlength="100"
            placeholder="학과명을 입력해 주세요"
          />
        </div>
        <div class="field">
          <label for="department-college">단과대학</label>
          <MySelect
            id="department-college"
            v-model="form.collegeId"
            :disabled="isEdit"
          >
            <option value="">
              미지정
            </option>
            <option
              v-for="college in colleges"
              :key="college.id"
              :value="college.id"
            >
              {{ college.name }}
            </option>
          </MySelect>
          <small v-if="isEdit">소속 단과대학은 등록 후 변경할 수 없습니다.</small>
        </div>
        <div class="field">
          <label for="department-status">운영 상태</label>
          <MySelect
            id="department-status"
            v-model="form.active"
          >
            <option :value="true">
              운영 중
            </option>
            <option :value="false">
              운영 중지
            </option>
          </MySelect>
        </div>
      </section>

      <aside class="summary-card">
        <h3>등록 정보 확인</h3>
        <dl>
          <dt>학과 코드</dt>
          <dd>{{ form.code || '-' }}</dd>
          <dt>학과명</dt>
          <dd>{{ form.name || '-' }}</dd>
          <dt>단과대학</dt>
          <dd>{{ selectedCollegeName }}</dd>
          <dt>운영 상태</dt>
          <dd :class="form.active ? 'status-active' : 'status-inactive'">
            {{ statusLabel }}
          </dd>
        </dl>
      </aside>

      <div class="actions">
        <MyButton
          btn-type="button"
          color="white"
          size="big"
          :content="isEdit ? '목록' : '취소'"
          :disabled="isSaving"
          @click="router.push({ name: 'AdminDepartmentIndex' })"
        />
        <MyButton
          type="submit"
          color="admin-indigo"
          size="big"
          :disabled="isSaving"
          :content="isSaving ? '저장 중...' : isEdit ? '수정 저장' : '등록'"
        />
      </div>
    </form>
  </MyPageContainer>
</template>

<style scoped>
.department-form {
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(320px, 0.9fr);
  gap: 16px;
}

.overview-card,
.form-card,
.summary-card {
  padding: 22px;
  background: var(--personal-color-white);
  border: 1px solid var(--personal-color-border-mist);
  border-radius: 8px;
}

.overview-card {
  display: grid;
  grid-column: 1 / -1;
  grid-template-columns: repeat(2, 1fr);
  gap: 24px;
}

.overview-card div {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.overview-card span,
.summary-card dt {
  color: var(--personal-color-text-secondary-steel);
  font-size: 0.82rem;
}

.overview-card strong {
  font-size: 1rem;
}

.form-card h3,
.summary-card h3 {
  margin: 0 0 20px;
  padding-bottom: 12px;
  font-size: 1rem;
  border-bottom: 1px solid var(--personal-color-border-mist);
}

.field {
  display: flex;
  flex-direction: column;
  gap: 7px;
  margin-bottom: 16px;
}

.field:last-child {
  margin-bottom: 0;
}

.field label {
  font-size: 0.86rem;
  font-weight: 700;
}

.field em {
  color: #d33;
  font-style: normal;
}

.field small {
  color: var(--personal-color-text-secondary-steel);
  font-size: 0.76rem;
}

.summary-card dl {
  display: grid;
  grid-template-columns: 100px minmax(0, 1fr);
  gap: 18px 12px;
  margin: 0;
}

.summary-card dd {
  margin: 0;
  overflow-wrap: anywhere;
  font-weight: 600;
  text-align: right;
}

.status-active {
  color: var(--personal-color-status-success-text-forest);
}

.status-inactive {
  color: var(--personal-color-text-tertiary-slate);
}

.actions {
  display: flex;
  grid-column: 1 / -1;
  justify-content: flex-end;
  gap: 10px;
}

.loading {
  padding: 48px;
  text-align: center;
}

@media (max-width: 850px) {
  .department-form {
    grid-template-columns: 1fr;
  }

  .overview-card {
    grid-template-columns: 1fr;
  }
}
</style>
