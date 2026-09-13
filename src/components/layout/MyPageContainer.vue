<script setup>
defineProps({
  title: {
    type: String,
    required: false,
  },
  subtitle: {
    type: String,
    required: false,
  },
});
</script>

<template>
  <div class="page-container">
    <div v-if="title" class="page-heading">
      <h2>{{ title }}</h2>
      <p v-if="subtitle">{{ subtitle }}</p>
    </div>
    <slot></slot>
  </div>
</template>

<style scoped>
.page-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 20px;
  padding-bottom: 50px;
  color: var(--personal-color-primary-text-navy);
}

.page-heading {
  padding-bottom: 10px;
}

.page-heading h2 {
  margin-bottom: 8px;
  color: var(--personal-color-primary-text-navy);
  letter-spacing: 0;
  font-size: 1.5rem;
  font-weight: 800;
}

.page-heading p {
  color: var(--personal-color-primary-text-navy);
  font-size: 1rem;
}

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
