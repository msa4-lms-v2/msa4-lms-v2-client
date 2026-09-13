<script setup>
import MyPageContainer from './MyPageContainer.vue';
defineProps({ title: String, subtitle: String });
</script>

<template>
  <MyPageContainer class="professor-page" :title="title" :subtitle="subtitle"><slot /></MyPageContainer>
</template>

<style scoped>
/* 교수 시안의 목록 밀도. 공통 표 및 다른 역할의 화면에는 적용하지 않는다. */
.professor-page :deep(.my-table th) {
  padding: 12px 16px;
  font-size: 0.75rem;
  border-bottom-width: 1px;
}
.professor-page :deep(.my-table td) {
  padding: 12px 16px;
  font-size: 0.75rem;
}
.professor-page :deep(.my-table td button) { min-height: 30px; }
</style>
