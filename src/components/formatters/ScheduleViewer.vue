<script setup>
const props = defineProps({
  schedule: {
    type: String,
    default: '',
  },
});

const formattedSchedule = () => {
  if (!props.schedule) return [];
  return props.schedule.split(',').map((item) => item.trim());
};
</script>

<template>
  <div class="time-text">
    <div v-for="(time, index) in formattedSchedule()" :key="index">
      {{ time }}
    </div>
  </div>
</template>

<style scoped>
.time-text {
  color: var(--personal-color-primary-text-navy, #333);
  font-size: 0.85rem;
  line-height: 1.5;
}
</style>
