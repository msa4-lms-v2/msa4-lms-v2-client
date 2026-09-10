<script setup>
import MyModal from './MyModal.vue';

defineProps({
  isOpen: {
    type: Boolean,
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  sections: {
    type: Array,
    required: true,
  },
});

defineEmits(['close']);
</script>

<template>
  <MyModal
    :is-open="isOpen"
    :title="title"
    max-width="960px"
    @close="$emit('close')"
  >
    <template #header>
      <div class="guideline-modal-header">
        <h2>{{ title }}</h2>
        <button
          type="button"
          class="close-button"
          aria-label="모집 요강 닫기"
          @click="$emit('close')"
        >
          ×
        </button>
      </div>
    </template>

    <div class="guideline-content">
      <section
        v-for="section in sections"
        :key="section.heading"
        class="guideline-section"
      >
        <h3>{{ section.heading }}</h3>
        <p
          v-for="paragraph in section.paragraphs"
          :key="paragraph"
        >
          {{ paragraph }}
        </p>
      </section>
    </div>
  </MyModal>
</template>

<style scoped>
:deep(.modal-card) {
  max-height: min(76vh, 720px);
  padding: 18px 20px;
}

:deep(.modal-body) {
  min-height: 0;
  overflow-y: auto;
}

.guideline-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--personal-color-border-mist);
}

.guideline-modal-header h2 {
  margin: 0;
  color: var(--personal-color-primary-text-navy);
  font-size: 1rem;
  font-weight: 700;
}

.close-button {
  width: 28px;
  height: 28px;
  padding: 0;
  border: 0;
  border-radius: 4px;
  color: var(--personal-color-text-tertiary-slate);
  background: transparent;
  font-size: 1.25rem;
  line-height: 1;
}

.close-button:hover,
.close-button:focus-visible {
  color: var(--personal-color-primary-text-navy);
  background: var(--personal-color-bg-surface-frost);
}

.guideline-content {
  min-height: 480px;
  padding: 18px 20px;
  border: 1px solid var(--personal-color-border-mist);
  border-radius: 3px;
  background: var(--personal-color-bg-surface-frost);
}

.guideline-section + .guideline-section {
  margin-top: 22px;
}

.guideline-section h3 {
  margin: 0 0 5px;
  color: var(--personal-color-login-primary-navy);
  font-size: 0.82rem;
  font-weight: 700;
  text-decoration: underline;
  text-underline-offset: 3px;
}

.guideline-section:first-child h3 {
  color: var(--personal-color-primary-text-navy);
  text-decoration: none;
}

.guideline-section p {
  margin: 0;
  color: var(--personal-color-primary-text-navy);
  font-size: 0.78rem;
  line-height: 1.55;
  white-space: pre-line;
}

@media (max-width: 640px) {
  .guideline-content {
    min-height: 0;
    padding: 15px;
  }
}
</style>
