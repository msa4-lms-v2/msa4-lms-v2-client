<script setup>
import { formatFileSize } from '../../util/format';

// files: [{ key: string|number, name: string, size: number, href?: string }]
defineProps({
  files: { type: Array, default: () => [] },
});
</script>

<template>
  <ul class="attachment-list">
    <li v-for="file in files" :key="file.key">
      <svg class="attachment-icon" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
      </svg>
      <a
        v-if="file.href"
        class="attachment-name"
        :href="file.href"
        :title="file.name"
        target="_blank"
        rel="noopener noreferrer"
      >{{ file.name }}</a>
      <span v-else class="attachment-name" :title="file.name">{{ file.name }}</span>
      <span class="attachment-size">{{ formatFileSize(file.size) }}</span>
    </li>
  </ul>
</template>

<style scoped>
.attachment-list {
  display: grid;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.attachment-list li {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--personal-color-text-secondary-steel);
  font-size: 0.82rem;
}

.attachment-icon {
  flex: none;
  width: 13px;
  height: 13px;
  fill: none;
  stroke: var(--personal-color-primary-navy);
  stroke-width: 2.2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.attachment-name {
  min-width: 0;
  overflow: hidden;
  color: inherit;
  text-overflow: ellipsis;
  white-space: nowrap;
}

a.attachment-name:hover {
  text-decoration: underline;
}

.attachment-size {
  flex: none;
  margin-left: auto;
  color: var(--personal-color-text-secondary-steel);
  font-size: 0.78rem;
  white-space: nowrap;
}
</style>
