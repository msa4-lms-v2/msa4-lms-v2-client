<script setup>
import { ref, watch } from 'vue';
import MyCard from '../common/MyCard.vue';
import MyStatusBadge from '../common/MyStatusBadge.vue';
const props = defineProps({
  profile: { type: Object, required: true },
  statusVariant: { type: String, default: 'processing' },
  summary: { type: Array, required: true },
  summaryLabel: { type: String, required: true },
  sections: { type: Array, required: true },
});
const imageFailed = ref(false);
watch(() => props.profile.profileImageUrl, () => { imageFailed.value = false; });
</script>

<template>
  <MyCard class="profile-hero">
    <div class="profile-intro">
      <div class="profile-image">
        <img
          v-if="profile.profileImageUrl && !imageFailed"
          :src="profile.profileImageUrl"
          :alt="`${profile.name} 프로필 사진`"
          @error="imageFailed = true"
        >
        <span
          v-else
          role="img"
          aria-label="등록된 프로필 사진 없음"
        />
      </div>
      <div class="profile-main">
        <div class="name-row">
          <h2>{{ profile.name }}</h2>
          <MyStatusBadge
            :label="profile.status"
            :variant="statusVariant"
          />
        </div>
        <ul
          class="quick-list"
          :aria-label="summaryLabel"
        >
          <li
            v-for="(item, index) in summary"
            :key="index"
          >
            {{ item }}
          </li>
        </ul>
      </div>
    </div>
    <div class="profile-actions">
      <slot name="actions" />
    </div>
  </MyCard>
  <div class="info-grid">
    <MyCard
      v-for="section in sections"
      :key="section.title"
      class="info-card"
    >
      <div class="common-section-header">
        <h3>{{ section.title }}</h3>
      </div>
      <dl class="info-list">
        <div
          v-for="row in section.rows"
          :key="row.label"
          class="info-row"
        >
          <dt>{{ row.label }}</dt><dd>{{ row.value }}</dd>
        </div>
      </dl>
    </MyCard>
  </div>
</template>

<style scoped>
.profile-hero,
.info-card {
  background: var(--personal-color-white);
  border: 1px solid var(--personal-color-border-mist);
  border-radius: 8px;
}

.profile-hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 28px;
  padding: 28px 50px;
}

.profile-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 0 0 auto;
}

.profile-intro {
  display: flex;
  align-items: center;
  gap: 32px;
  min-width: 0;
}

.profile-image {
  width: 96px;
  height: 96px;
  border-radius: 50%;
  background: var(--personal-color-bg-surface-frost);
  flex: 0 0 96px;
}

.profile-main {
  min-width: 0;
}

.name-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px 12px;
  margin-bottom: 18px;
}

.name-row h2 {
  color: var(--personal-color-primary-text-navy);
  font-size: 1.5rem;
}

.quick-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  list-style: none;
  padding: 0;
}

.quick-list li {
  color: var(--personal-color-primary-text-navy);
  font-size: 0.95rem;
}

.info-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 26px;
  margin-bottom: 30px;
}

.info-card {
  padding: 26px 30px;
}

.info-card h3 {
  color: var(--personal-color-primary-text-navy);
  font-size: 1.1rem;
  margin: 0 0 16px;
}

.info-list {
  display: flex;
  flex-direction: column;
}

.info-row {
  display: grid;
  grid-template-columns: minmax(92px, 0.36fr) minmax(0, 1fr);
  min-height: 44px;
  padding: 13px 0;
  border-bottom: 1px solid var(--personal-color-border-mist);
}

.info-row:last-child {
  border-bottom: 0;
}

.info-row dt {
  color: var(--personal-color-text-muted-slate);
}

.info-row dd {
  min-width: 0;
  margin: 0;
  color: var(--personal-color-primary-text-navy);
  overflow-wrap: anywhere;
}

@media (max-width: 720px) {
  .info-grid {
    grid-template-columns: 1fr;
  }

  .profile-hero {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }

  .profile-actions {
    flex-wrap: wrap;
  }
}
.profile-image { overflow: hidden; }
.profile-image img { width: 100%; height: 100%; object-fit: cover; }
.quick-list li { overflow-wrap: anywhere; }
@media (max-width: 960px) {
  .profile-hero { flex-wrap: wrap; }
  .profile-actions { flex-wrap: wrap; }
}
@media (max-width: 720px) {
  .profile-hero, .info-card { padding: 24px; }
  .profile-intro { flex-wrap: wrap; gap: 20px; }
}
</style>
