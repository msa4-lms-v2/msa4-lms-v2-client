<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { confirmDialog, notify } from '../../composables/useDialog';
import { createNotice, deactivateNotice, getNotice, searchNotices, updateNotice } from '../../api/noticeApi';
import MyButton from '../../components/button/MyButton.vue';
import MyInput from '../../components/input/MyInput.vue';
import MySelect from '../../components/input/MySelect.vue';
import MyPageContainer from '../../components/layout/MyPageContainer.vue';
import PrevNextPagination from '../../components/pagination/PrevNextPagination.vue';
import MySearchFilter from '../../components/search/MySearchFilter.vue';
import MyTable from '../../components/table/MyTable.vue';

const targetRoleLabel = { ALL: '전체', STUDENT: '학생', PROFESSOR: '교수' };
const activeLabel = { true: '활성', false: '비활성' };

const columns = [
  { key: 'title', label: '제목' },
  { key: 'targetRole', label: '대상' },
  { key: 'active', label: '상태' },
  { key: 'createdAt', label: '등록일' },
  { key: 'actions', label: '관리' },
];

const filters = reactive({ keyword: '', targetRole: '', active: '' });
const notices = ref([]);
const page = ref({ page: 1, totalCount: 0, hasNext: false });
const loading = ref(false);
const saving = ref(false);
const selectedId = ref(null);
const form = reactive({ title: '', content: '', targetRole: 'ALL', isActive: true });

const isEditing = computed(() => selectedId.value !== null);
const titleLength = computed(() => form.title.trim().length);
const contentLength = computed(() => form.content.length);

const formatDateTime = (value) => (value ? value.replace('T', ' ').slice(0, 16) : '-');

const buildParams = (pageNumber) => ({
  page: pageNumber,
  size: 20,
  keyword: filters.keyword.trim() || undefined,
  targetRole: filters.targetRole || undefined,
  active: filters.active === '' ? undefined : filters.active === 'true',
});

const load = async (pageNumber = 1) => {
  loading.value = true;
  try {
    const { data } = await searchNotices(buildParams(pageNumber));
    notices.value = data.data?.items || [];
    page.value = data.data || { page: pageNumber, totalCount: 0, hasNext: false };
  } catch (error) {
    notices.value = [];
    await notify(error.response?.data?.message || '공지사항 목록을 불러오지 못했습니다.');
  } finally {
    loading.value = false;
  }
};

const resetFilters = () => {
  Object.assign(filters, { keyword: '', targetRole: '', active: '' });
  load(1);
};

const resetForm = () => {
  selectedId.value = null;
  Object.assign(form, { title: '', content: '', targetRole: 'ALL', isActive: true });
};

const selectNotice = async (notice) => {
  try {
    const { data } = await getNotice(notice.id);
    const detail = data.data;
    selectedId.value = detail.id;
    Object.assign(form, {
      title: detail.title || '',
      content: detail.content || '',
      targetRole: detail.targetRole || 'ALL',
      isActive: Boolean(detail.isActive),
    });
  } catch (error) {
    await notify(error.response?.data?.message || '공지사항 상세를 불러오지 못했습니다.');
  }
};

const validate = async () => {
  if (!form.title.trim()) {
    await notify('공지 제목을 입력해 주세요.');
    return false;
  }
  if (form.title.trim().length > 100) {
    await notify('공지 제목은 100자 이하여야 합니다.');
    return false;
  }
  if (form.content.length > 5000) {
    await notify('공지 본문은 5000자 이하여야 합니다.');
    return false;
  }
  return true;
};

const save = async () => {
  if (!(await validate())) return;
  saving.value = true;
  const payload = {
    title: form.title.trim(),
    content: form.content.trim() || null,
    targetRole: form.targetRole,
  };
  try {
    if (isEditing.value) {
      await updateNotice(selectedId.value, { ...payload, isActive: form.isActive });
      await notify('공지사항을 수정했습니다.');
    } else {
      await createNotice(payload);
      await notify('공지사항을 등록했습니다.');
    }
    resetForm();
    await load(page.value.page || 1);
  } catch (error) {
    await notify(error.response?.data?.message || '공지사항 저장에 실패했습니다.');
  } finally {
    saving.value = false;
  }
};

const deactivate = async (notice) => {
  if (!notice.isActive) {
    await notify('이미 비활성 상태인 공지사항입니다.');
    return;
  }
  const ok = await confirmDialog('이 공지사항을 비활성화할까요? 목록에는 남지만 학생/교수에게는 노출되지 않습니다.');
  if (!ok) return;
  try {
    await deactivateNotice(notice.id);
    if (selectedId.value === notice.id) form.isActive = false;
    await notify('공지사항을 비활성화했습니다.');
    await load(page.value.page || 1);
  } catch (error) {
    await notify(error.response?.data?.message || '공지사항 비활성화에 실패했습니다.');
  }
};

onMounted(() => load());
</script>

<template>
  <MyPageContainer title="공지사항 관리" subtitle="학생·교수에게 노출할 공지사항을 등록하고 상태를 관리합니다.">
    <MySearchFilter submit-text="조회" @search="load(1)">
      <div class="search-group">
        <label for="notice-keyword">통합 검색</label>
        <MyInput id="notice-keyword" v-model="filters.keyword" placeholder="제목 또는 본문 검색" @keyup-enter="load(1)" />
      </div>
      <div class="search-group">
        <label for="notice-target">대상</label>
        <MySelect id="notice-target" v-model="filters.targetRole">
          <option value="">전체</option>
          <option value="ALL">전체 공지</option>
          <option value="STUDENT">학생</option>
          <option value="PROFESSOR">교수</option>
        </MySelect>
      </div>
      <div class="search-group">
        <label for="notice-active">상태</label>
        <MySelect id="notice-active" v-model="filters.active">
          <option value="">전체</option>
          <option value="true">활성</option>
          <option value="false">비활성</option>
        </MySelect>
      </div>
      <MyButton btn-type="button" color="white" size="middle" content="초기화" @click="resetFilters" />
    </MySearchFilter>

    <section class="notice-layout">
      <div>
        <div class="list-heading">
          <div>
            <h3>검색 결과</h3>
            <span>총 {{ page.totalCount || 0 }}개 공지</span>
          </div>
          <MyButton btn-type="button" color="white" size="middle" content="새 공지" @click="resetForm" />
        </div>
        <MyTable :columns="columns" :loading="loading" :empty="!loading && notices.length === 0" empty-message="조회된 공지사항이 없습니다.">
          <tr v-for="notice in notices" :key="notice.id">
            <td class="title-cell">{{ notice.title }}</td>
            <td>{{ targetRoleLabel[notice.targetRole] || notice.targetRole }}</td>
            <td>
              <span class="status-chip" :class="notice.isActive ? 'active' : 'inactive'">
                {{ activeLabel[String(notice.isActive)] }}
              </span>
            </td>
            <td>{{ formatDateTime(notice.createdAt) }}</td>
            <td class="action-cell">
              <MyButton btn-type="button" color="deep-blue" size="small" content="수정" @click="selectNotice(notice)" />
              <MyButton btn-type="button" color="white" size="small" content="비활성" @click="deactivate(notice)" />
            </td>
          </tr>
        </MyTable>
        <PrevNextPagination v-if="page.page > 1 || page.hasNext" :page="page.page" :has-next="page.hasNext" @page-change="load" />
      </div>

      <form class="notice-form" @submit.prevent="save">
        <div class="form-header">
          <div>
            <h3>{{ isEditing ? '공지 수정' : '공지 등록' }}</h3>
            <p>{{ isEditing ? '선택한 공지의 내용과 노출 상태를 수정합니다.' : '새 공지는 활성 상태로 등록됩니다.' }}</p>
          </div>
          <MyButton v-if="isEditing" btn-type="button" color="white" size="small" content="등록 모드" @click="resetForm" />
        </div>

        <div class="form-group">
          <label for="notice-title">제목 <span>{{ titleLength }}/100</span></label>
          <MyInput id="notice-title" v-model="form.title" placeholder="공지 제목" />
        </div>
        <div class="form-row">
          <div class="form-group">
            <label for="notice-form-target">대상</label>
            <MySelect id="notice-form-target" v-model="form.targetRole">
              <option value="ALL">전체 공지</option>
              <option value="STUDENT">학생</option>
              <option value="PROFESSOR">교수</option>
            </MySelect>
          </div>
          <div v-if="isEditing" class="form-group">
            <label for="notice-form-active">상태</label>
            <MySelect id="notice-form-active" v-model="form.isActive">
              <option :value="true">활성</option>
              <option :value="false">비활성</option>
            </MySelect>
          </div>
        </div>
        <div class="form-group">
          <label for="notice-content">본문 <span>{{ contentLength }}/5000</span></label>
          <textarea id="notice-content" v-model="form.content" rows="12" placeholder="공지 본문을 입력해 주세요."></textarea>
        </div>
        <div class="button-row">
          <MyButton btn-type="submit" color="deep-blue" size="middle" :content="saving ? '저장 중...' : '저장'" :disabled="saving" />
        </div>
      </form>
    </section>
  </MyPageContainer>
</template>

<style scoped>
.notice-layout { display:grid; grid-template-columns:minmax(0, 1fr) 360px; gap:24px; align-items:start; }
.list-heading { display:flex; justify-content:space-between; align-items:center; margin:24px 0 12px; }
.list-heading h3, .form-header h3 { margin:0 0 4px; font-size:1rem; }
.list-heading span, .form-header p { color:var(--personal-color-link-blue); font-size:.86rem; font-weight:600; margin:0; }
.title-cell { font-weight:700; color:var(--personal-color-text-primary-deep); }
.action-cell { display:flex; gap:6px; flex-wrap:wrap; }
.status-chip { display:inline-flex; padding:4px 9px; border-radius:999px; font-size:.78rem; font-weight:700; }
.status-chip.active { background:var(--personal-color-bg-success-soft-honeydew); color:var(--personal-color-success-text-forest); }
.status-chip.inactive { background:var(--personal-color-bg-muted-pearl); color:var(--personal-color-text-secondary-steel); }
.notice-form { margin-top:24px; padding:20px; border:1px solid var(--personal-color-border-soft); border-radius:14px; background:var(--personal-color-white); box-shadow:0 8px 20px rgba(8, 20, 49, .06); }
.form-header { display:flex; justify-content:space-between; align-items:flex-start; gap:12px; margin-bottom:18px; }
.form-row { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
.form-group { display:flex; flex-direction:column; gap:7px; margin-bottom:14px; }
.form-group label { display:flex; justify-content:space-between; color:var(--personal-color-text-primary-deep); font-weight:700; font-size:.88rem; }
.form-group label span { color:var(--personal-color-text-secondary-steel); font-weight:600; }
textarea { width:100%; resize:vertical; min-height:220px; border:1px solid var(--personal-color-border-soft); border-radius:8px; padding:12px; font:inherit; box-sizing:border-box; }
textarea:focus { outline:none; border-color:var(--personal-color-link-blue); box-shadow:0 0 0 3px rgba(0, 39, 139, .1); }
.button-row { display:flex; justify-content:flex-end; }
@media (max-width: 1180px) { .notice-layout { grid-template-columns:1fr; } }
</style>
