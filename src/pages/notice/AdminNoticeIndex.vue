<script setup>
import { onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { deactivateNotice, searchNotices } from '../../api/noticeApi';
import MyButton from '../../components/button/MyButton.vue';
import MyInput from '../../components/input/MyInput.vue';
import MySelect from '../../components/input/MySelect.vue';
import MyPageContainer from '../../components/layout/MyPageContainer.vue';
import PrevNextPagination from '../../components/pagination/PrevNextPagination.vue';
import MySearchFilter from '../../components/search/MySearchFilter.vue';
import MyTable from '../../components/table/MyTable.vue';
import { confirmDialog, notify } from '../../composables/useDialog';

defineOptions({ name: 'AdminNoticeIndex' });

const router = useRouter();
const filters = reactive({
  keyword: '',
  authorKeyword: '',
  category: '',
  targetRole: '',
  active: '',
  createdFrom: '',
  createdTo: '',
});
const notices = ref([]);
const page = ref({ page: 1, totalCount: 0, hasNext: false });
const isLoading = ref(false);
const columns = [
  { key: 'id', label: '번호' },
  { key: 'category', label: '분류' },
  { key: 'title', label: '제목' },
  { key: 'targetRole', label: '게시 대상' },
  { key: 'authorName', label: '작성자' },
  { key: 'createdAt', label: '작성일' },
  { key: 'normalTransitionDate', label: '일반 공지 전환일' },
  { key: 'active', label: '게시 상태' },
  { key: 'manage', label: '관리' },
];
const labels = {
  NORMAL: '일반 공지',
  IMPORTANT: '중요 공지',
  ALL: '전체',
  STUDENT: '학생',
  PROFESSOR: '교수',
};

const formatDateTime = (value) => value ? value.replace('T', ' ').slice(0, 16) : '-';
const formatDate = (value) => value || '-';

const load = async (pageNumber = 1) => {
  if (filters.createdFrom && filters.createdTo && filters.createdFrom > filters.createdTo) {
    await notify('작성 기간의 시작일은 종료일보다 늦을 수 없습니다.');
    return;
  }
  isLoading.value = true;
  try {
    const { data } = await searchNotices({
      page: pageNumber,
      size: 20,
      keyword: filters.keyword.trim() || undefined,
      authorKeyword: filters.authorKeyword.trim() || undefined,
      category: filters.category || undefined,
      targetRole: filters.targetRole || undefined,
      active: filters.active === '' ? undefined : filters.active === 'true',
      createdFrom: filters.createdFrom || undefined,
      createdTo: filters.createdTo || undefined,
    });
    notices.value = data.data.items || [];
    page.value = data.data;
  } catch (error) {
    notices.value = [];
    await notify(error.response?.data?.message || '공지사항 목록을 불러오지 못했습니다.');
  } finally {
    isLoading.value = false;
  }
};

const resetFilters = () => {
  Object.assign(filters, {
    keyword: '', authorKeyword: '', category: '', targetRole: '', active: '', createdFrom: '', createdTo: '',
  });
  load(1);
};

const deactivate = async (notice) => {
  if (!notice.isActive) return;
  const confirmed = await confirmDialog(`“${notice.title}” 공지를 게시 중지하시겠습니까?`);
  if (!confirmed) return;
  try {
    await deactivateNotice(notice.id);
    await notify('공지사항을 게시 중지했습니다.');
    await load(page.value.page);
  } catch (error) {
    await notify(error.response?.data?.message || '공지사항 게시 중지에 실패했습니다.');
  }
};

onMounted(() => load());
</script>

<template>
  <MyPageContainer title="공지사항 목록">
    <MySearchFilter class="admin-search" submit-text="조회" @search="load(1)">
      <div class="search-group">
        <label for="notice-keyword">통합 검색</label>
        <MyInput id="notice-keyword" v-model="filters.keyword" placeholder="제목 · 내용 검색" @keyup-enter="load(1)" />
      </div>
      <div class="search-group">
        <label for="notice-author">작성자</label>
        <MyInput id="notice-author" v-model="filters.authorKeyword" placeholder="작성자 이름" @keyup-enter="load(1)" />
      </div>

      <div class="search-group">
        <label for="notice-category">분류</label>
        <MySelect id="notice-category" v-model="filters.category">
          <option value="">전체</option>
          <option value="NORMAL">일반 공지</option>
          <option value="IMPORTANT">중요 공지</option>
        </MySelect>
      </div>

      <div class="search-group">
        <label for="notice-target">게시 대상</label>
        <MySelect id="notice-target" v-model="filters.targetRole">
          <option value="">전체</option>
          <option value="ALL">전체</option>
          <option value="STUDENT">학생</option>
          <option value="PROFESSOR">교수</option>
        </MySelect>
      </div>

      <div class="search-group">
        <label for="notice-active">게시 상태</label>
        <MySelect id="notice-active" v-model="filters.active">
          <option value="">전체</option>
          <option value="true">게시 중</option>
          <option value="false">게시 중지</option>
        </MySelect>
      </div>

      <div class="search-group">
        <label for="notice-created-from">작성 시작일</label>
        <MyInput id="notice-created-from" v-model="filters.createdFrom" type="date" />
      </div>

      <div class="search-group">
        <label for="notice-created-to">작성 종료일</label>
        <MyInput id="notice-created-to" v-model="filters.createdTo" type="date" />
      </div>

      <MyButton btn-type="button" class="secondary-button" color="white" size="middle" content="초기화" @click="resetFilters" />
    </MySearchFilter>

    <div class="list-heading">
      <div>
        <h3>검색 결과</h3>
        <span>총 {{ page.totalCount || 0 }}개 공지</span>
      </div>
      <MyButton
        btn-type="button"
        color="admin-indigo"
        size="big"
        content="공지사항 작성"
        @click="router.push({ name: 'AdminNoticeCreate' })"
      />
    </div>

    <MyTable
      :columns="columns"
      :loading="isLoading"
      :empty="!isLoading && notices.length === 0"
      empty-message="조회된 공지사항이 없습니다."
    >
      <tr v-for="notice in notices" :key="notice.id">
        <td>{{ notice.id }}</td>
        <td>
          <span class="category-badge" :class="`category-badge--${notice.category.toLowerCase()}`">
            {{ labels[notice.category] }}
          </span>
        </td>
        <td class="title-cell">{{ notice.title }}</td>
        <td>{{ labels[notice.targetRole] || notice.targetRole }}</td>
        <td>{{ notice.authorName || '-' }}</td>
        <td>{{ formatDateTime(notice.createdAt) }}</td>
        <td>{{ formatDate(notice.normalTransitionDate) }}</td>
        <td>
          <span :class="notice.isActive ? 'active-status' : 'inactive-status'">
            {{ notice.isActive ? '게시 중' : '게시 중지' }}
          </span>
        </td>
        <td class="management">
          <MyButton
            btn-type="button"
            class="secondary-button"
            color="white"
            size="small"
            content="수정"
            @click="router.push({ name: 'AdminNoticeEdit', params: { noticeId: notice.id } })"
          />
          <MyButton
            v-if="notice.isActive"
            btn-type="button"
            color="red"
            size="small"
            content="삭제"
            @click="deactivate(notice)"
          />
        </td>
      </tr>
    </MyTable>

    <PrevNextPagination
      v-if="page.page > 1 || page.hasNext"
      :page="page.page"
      :has-next="page.hasNext"
      @page-change="load"
    />
  </MyPageContainer>
</template>

<style scoped>
.list-heading { 
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 24px 0 12px;
}

.list-heading h3 { 
  margin: 0 0 4px;
  font-size: 1rem;
}

.list-heading span {
  color: var(--personal-color-admin-secondary-indigo);
  font-size: 0.86rem;
  font-weight: 600;
}

.title-cell { 
  max-width: 260px;
  overflow: hidden;
  text-align: left;
  text-overflow: ellipsis;
  white-space: nowrap;
}
  
.category-badge { 
  display: inline-block;
  font-size: 0.78rem;
  font-weight: 700;
}
    
.category-badge--normal {
  color: var(--personal-color-text-secondary-steel);
}
    
.category-badge--important {
  color: var(--personal-color-red);
}
       
.active-status { 
  color: var(--personal-color-status-success-text-forest);
  font-weight: 700;
}
       
.inactive-status { 
  color: var(--personal-color-text-tertiary-slate);
}
        
.management { 
  display: flex;
  justify-content: center;
  gap: 8px;
  white-space: nowrap;
}

.admin-search :deep(.deep-blue) {
  background: var(--personal-color-admin-secondary-indigo);
}

:deep(.secondary-button) {
  border: 1px solid var(--personal-color-border-mist);
  color: var(--personal-color-admin-secondary-indigo);
}
</style>
