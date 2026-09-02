<script setup>
import { onMounted, onUnmounted } from 'vue';

const props = defineProps({
  isOpen: {
    type: Boolean,
    required: true
  },
  title: {
    type: String,
    default: ""
  },
  maxWidth: {
    type: String,
    default: "500px"
  }
});

const emit = defineEmits(["close"]);

// Close on escape key
const handleKeydown = (e) => {
  if (e.key === 'Escape' && props.isOpen) {
    emit('close');
  }
};

onMounted(() => {
  document.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown);
});
</script>

<template>
  <div v-if="isOpen" class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-card" :style="{ maxWidth: maxWidth }">
      <div class="modal-header" v-if="title || $slots.header">
        <slot name="header">
          <h2>{{ title }}</h2>
        </slot>
      </div>

      <div class="modal-body">
        <slot></slot>
      </div>

      <div v-if="$slots.footer" class="modal-footer">
        <slot name="footer"></slot>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(15, 23, 42, 0.4);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999;
  backdrop-filter: blur(4px);
}

.modal-card {
  background: white;
  border-radius: 12px;
  width: 100%;
  padding: 24px;
  box-shadow: 0 10px 25px var(--personal-shadow-medium);
  display: flex;
  flex-direction: column;
}

.modal-header h2 {
  font-size: 1.3rem;
  margin-bottom: 20px;
  border-bottom: 1px solid var(--personal-color-border-mist);
  padding-bottom: 12px;
  color: var(--personal-color-primary-text-navy);
}

.modal-body {
  flex-grow: 1;
}

.modal-footer {
  margin-top: 24px;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>
