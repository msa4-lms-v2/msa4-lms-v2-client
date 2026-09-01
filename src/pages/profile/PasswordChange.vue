<script setup>
import { reactive, ref } from "vue";
import MyButton from "../../components/button/MyButton.vue";
import MyModal from "../../components/common/MyModal.vue";
import MyInput from "../../components/input/MyInput.vue";
import { useAuthStore } from "../../store/auth/useAuthStore.js";
import passwordChangeValidator from "../../util/validator/domain/passwordChangeValidator.js";
import { useRouter } from "vue-router";
import { notify } from "../../composables/useDialog";

const isPasswordModalOpen = ref(false);
const authStore = useAuthStore();
const router = useRouter();

const passwordChangeData = reactive({
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
});

const openPasswordModal = () => {
  isPasswordModalOpen.value = true;
};

const closePasswordModal = () => {
  isPasswordModalOpen.value = false;
  passwordChangeData.currentPassword = "";
  passwordChangeData.newPassword = "";
  passwordChangeData.confirmPassword = "";
};

const updatePassword = async () => {
  const validationList = [
    passwordChangeValidator.currentPassword(passwordChangeData.currentPassword),
    passwordChangeValidator.newPassword(passwordChangeData.newPassword),
    passwordChangeValidator.confirmPassword(
      passwordChangeData.newPassword,
      passwordChangeData.confirmPassword
    ),
  ];

  const errorList = validationList.filter((val) => val);

  if (errorList.length > 0) {
    await notify(errorList.join("\n"));

    return;
  }

  try {
    await authStore.passwordChange(passwordChangeData);
    await notify("비밀번호 변경이 완료되었습니다. 다시 로그인해 주세요.");

    await authStore.logout();

    router.push("/");
  } catch (error) {
    console.error(error);
  }
};
</script>

<template>
  <MyButton
    color="deep-blue"
    size="big"
    content="비밀번호 변경"
    @click="openPasswordModal"
  />

  <MyModal
    :is-open="isPasswordModalOpen"
    title="비밀번호 변경"
    max-width="400px"
    @close="closePasswordModal"
  >
    <form
      id="password-change-form"
      class="password-form"
      @submit.prevent="updatePassword"
    >
      <MyInput
        v-model="passwordChangeData.currentPassword"
        class="password-input"
        type="password"
        placeholder="현재 비밀번호"
      />

      <MyInput
        v-model="passwordChangeData.newPassword"
        class="password-input"
        type="password"
        placeholder="새 비밀번호"
      />

      <MyInput
        v-model="passwordChangeData.confirmPassword"
        class="password-input"
        type="password"
        placeholder="새 비밀번호 확인"
      />
    </form>

    <template #footer>
      <div class="modal-buttons">
        <MyButton
          type="button"
          color="gray"
          size="small"
          content="취소"
          @click="closePasswordModal"
        />

        <MyButton
          type="submit"
          form="password-change-form"
          color="deep-blue"
          size="small"
          content="변경"
        />
      </div>
    </template>
  </MyModal>
</template>

<style scoped>
.password-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.password-input {
  width: 100%;
  height: 42px;
  padding: 0 12px;
  border: 1px solid var(--personal-color-border-mist);
  border-radius: 8px;
}

.modal-buttons {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
</style>
