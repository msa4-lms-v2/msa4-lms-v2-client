<script setup>
defineProps({ status: { type: String, required: true } });
defineEmits(['retry']);
</script>

<template>
  <div
    v-if="status !== 'ready'"
    class="dashboard-state"
    role="status"
  >
    <span v-if="status === 'loading' || status === 'idle'">불러오는 중입니다…</span>
    <template v-else>
      <span>{{ status === 'unavailable' ? '집계 정보를 준비 중입니다.' : '정보를 불러오지 못했습니다.' }}</span>
      <button
        type="button"
        @click="$emit('retry')"
      >
        다시 조회
      </button>
    </template>
  </div>
</template>

<style scoped>
.dashboard-state { display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 12px; padding: 28px 12px; color: #718096; font-size: 13px; }
button { border: 1px solid #dce2ee; border-radius: 6px; background: white; padding: 6px 10px; color: #5945df; font: inherit; cursor: pointer; }
button:focus-visible { outline: 2px solid #5945df; outline-offset: 3px; }
</style>
