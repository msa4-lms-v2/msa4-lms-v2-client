<script setup>
import MyModal from "./MyModal.vue";
import MyButton from "../button/MyButton.vue";
import { useDialog } from "../../composables/useDialog";

const { state, confirm, cancel } = useDialog();
</script>

<template>
  <MyModal
    :isOpen="state.open"
    :title="state.title"
    maxWidth="420px"
    @close="cancel"
  >
    <p class="dialog-message">{{ state.message }}</p>
    <template #footer>
      <MyButton
        v-if="state.type === 'confirm'"
        color="gray"
        size="middle"
        :content="state.cancelText"
        @click="cancel"
      />
      <MyButton
        color="deep-blue"
        size="middle"
        :content="state.confirmText"
        @click="confirm"
      />
    </template>
  </MyModal>
</template>

<style scoped>
.dialog-message {
  white-space: pre-wrap;
  line-height: 1.6;
  color: #334155;
  font-size: 0.98rem;
  margin: 4px 0;
}
</style>
