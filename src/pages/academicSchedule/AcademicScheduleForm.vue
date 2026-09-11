<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { createAcademicSchedule, getAcademicSchedule, getAcademicScheduleTemplates, updateAcademicSchedule } from '../../api/academicScheduleApi';
import MyButton from '../../components/button/MyButton.vue';
import MyInput from '../../components/input/MyInput.vue';
import MySelect from '../../components/input/MySelect.vue';
import MyPageContainer from '../../components/layout/MyPageContainer.vue';
import { notify } from '../../composables/useDialog';

defineOptions({ name: 'AcademicScheduleForm' });
const route = useRoute();
const router = useRouter();
const scheduleId = computed(() => route.params.scheduleId);
const isEdit = computed(() => Boolean(scheduleId.value));
const templates = ref([]);
const saving = ref(false);
const loading = ref(false);
const assignment = ref(null);
const form = reactive({ category: '', title: '', content: '', targetRole: 'ALL', startDate: '', endDate: '', reason: '' });
const termLabel = { FIRST: '1학기', SECOND: '2학기' };

const toInputDate = (value) => value || '';
const selectedTemplate = computed(() => templates.value.find((item) => item.category === form.category));

const applyTemplate = () => {
  if (!selectedTemplate.value || isEdit.value) return;
  form.title = selectedTemplate.value.defaultTitle;
  form.content = selectedTemplate.value.defaultContent;
};

const payload = () => ({
  category: form.category,
  title: form.title.trim(),
  content: form.content.trim() || null,
  targetRole: form.targetRole,
  startDate: form.startDate || null,
  endDate: form.endDate || null,
  ...(isEdit.value ? { reason: form.reason.trim() } : {}),
});

const loadTemplates = async () => { templates.value = (await getAcademicScheduleTemplates({ pageLoad: true })).data.data || []; };
const loadSchedule = async () => {
  if (!isEdit.value) return;
  loading.value = true;
  try {
    const schedule = (await getAcademicSchedule(scheduleId.value, { pageLoad: true })).data.data;
    Object.assign(form, { category: schedule.category, title: schedule.title, content: schedule.content || '', targetRole: schedule.targetRole, startDate: toInputDate(schedule.startDate), endDate: toInputDate(schedule.endDate) });
    assignment.value = schedule;
  } finally { loading.value = false; }
};

const save = async () => {
  if (!form.category || !form.title.trim() || !form.startDate || !form.targetRole) { await notify('일정 분류, 일정명, 시작일, 공지 대상은 필수입니다.'); return; }
  if (form.endDate && form.endDate < form.startDate) { await notify('종료일은 시작일보다 빠를 수 없습니다.'); return; }
  if (isEdit.value && !form.reason.trim()) { await notify('수정 사유를 입력해 주세요.'); return; }
  saving.value = true;
  try {
    const response = isEdit.value ? await updateAcademicSchedule(scheduleId.value, payload()) : await createAcademicSchedule(payload());
    assignment.value = response.data.data;
    await notify(isEdit.value ? '학사일정을 수정했습니다.' : '학사일정을 등록했습니다.');
    router.replace({ name: 'AcademicScheduleDetail', params: { scheduleId: response.data.data.id } });
  } catch (error) { await notify(error.response?.data?.message || '학사일정 저장에 실패했습니다.'); }
  finally { saving.value = false; }
};

onMounted(async () => { await loadTemplates(); await loadSchedule(); });
</script>

<template>
  <MyPageContainer :title="isEdit ? '학사일정 상세 · 수정' : '학사일정 작성'" subtitle="시작·종료일을 기준으로 서버가 학년도와 학기를 자동 지정합니다.">
    <div v-if="loading" class="loading">학사일정을 불러오는 중입니다...</div>
    <form v-else class="schedule-form" @submit.prevent="save">
      <section class="form-card"><h3>학사일정 정보</h3>
        <div class="field full"><label for="category">일정 분류 <em>*</em></label><MySelect id="category" v-model="form.category" :disabled="isEdit" @change="applyTemplate"><option value="">선택해 주세요</option><option v-for="template in templates" :key="template.category" :value="template.category">{{ template.label }}</option></MySelect><small v-if="isEdit">기간 제어 대상이 달라질 수 있어 일정 분류는 등록 후 변경할 수 없습니다.</small></div>
        <div class="field full"><label for="title">일정명 <em>*</em></label><MyInput id="title" v-model="form.title" placeholder="일정명을 입력해 주세요" /></div>
        <div class="field full"><label for="content">일정 내용</label><textarea id="content" v-model="form.content" maxlength="5000" placeholder="일정 내용을 입력해 주세요" /></div>
        <div class="field"><label for="target">공지 대상 <em>*</em></label><MySelect id="target" v-model="form.targetRole"><option value="ALL">전체</option><option value="STUDENT">학생</option><option value="PROFESSOR">교수</option></MySelect></div>
        <div class="field"><label for="start-date">시작일 <em>*</em></label><MyInput id="start-date" v-model="form.startDate" type="date" /></div>
        <div class="field"><label for="end-date">종료일</label><MyInput id="end-date" v-model="form.endDate" type="date" /></div>
        <div v-if="isEdit" class="field full"><label for="reason">수정 사유 <em>*</em></label><MyInput id="reason" v-model="form.reason" placeholder="예: 신청 기간 연장" /></div>
      </section>
      <aside class="summary-card"><h3>일정 정보 확인</h3><dl><dt>일정 분류</dt><dd>{{ selectedTemplate?.label || '-' }}</dd><dt>일정명</dt><dd>{{ form.title || '-' }}</dd><dt>공지 대상</dt><dd>{{ { ALL: '전체', STUDENT: '학생', PROFESSOR: '교수' }[form.targetRole] }}</dd><dt>연도</dt><dd>{{ assignment ? `${assignment.academicYear}학년도` : '저장 후 자동 지정' }}</dd><dt>학기</dt><dd>{{ assignment ? termLabel[assignment.term] : '저장 후 자동 지정' }}</dd><dt>시작일</dt><dd>{{ form.startDate || '-' }}</dd><dt>종료일</dt><dd>{{ form.endDate || '-' }}</dd></dl></aside>
      <div class="actions"><MyButton btn-type="button" color="white" size="middle" content="목록" @click="router.push({ name: 'AcademicScheduleIndex' })" /><MyButton type="submit" color="deep-blue" size="middle" :disabled="saving" :content="saving ? '저장 중' : isEdit ? '수정 저장' : '등록'" /></div>
    </form>
  </MyPageContainer>
</template>

<style scoped>
.schedule-form { display:grid; grid-template-columns:minmax(0, 1.7fr) minmax(280px, .8fr); gap:16px; }.form-card,.summary-card { background:#fff; border:1px solid var(--personal-color-border-mist); border-radius:8px; padding:22px; }.form-card h3,.summary-card h3 { margin:0 0 20px; font-size:1rem; border-bottom:1px solid var(--personal-color-border-mist); padding-bottom:12px; }.field { display:flex; flex-direction:column; gap:7px; margin-bottom:16px; }.full { grid-column:1 / -1; }.form-card { display:grid; grid-template-columns:1fr 1fr; gap:0 16px; align-content:start; }.form-card h3 { grid-column:1 / -1; }.field label { font-size:.86rem; font-weight:700; }.field em { color:#d33; font-style:normal; }.field small { color:var(--personal-color-text-secondary-steel); font-size:.76rem; } textarea { min-height:120px; resize:vertical; padding:10px 12px; border:1px solid var(--personal-color-border-mist); border-radius:4px; font:inherit; }.summary-card dl { display:grid; grid-template-columns:90px 1fr; gap:15px 10px; font-size:.88rem; }.summary-card dt { color:var(--personal-color-text-secondary-steel); }.summary-card dd { margin:0; font-weight:600; overflow-wrap:anywhere; }.actions { grid-column:1 / -1; display:flex; justify-content:flex-end; gap:10px; }.loading { padding:48px; text-align:center; } @media (max-width:850px) { .schedule-form { grid-template-columns:1fr; }.form-card { grid-template-columns:1fr; } }
</style>
