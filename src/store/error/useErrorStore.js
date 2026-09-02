import { defineStore } from 'pinia';
import { ref } from 'vue';

// API 실패 응답의 {code, message}를 담아두는 공용 에러 스토어(F5).
// myAxios 응답 인터셉터가 모든 실패 요청에서 채워 넣는다.
export const useErrorStore = defineStore('errorStore', () => {
  const code = ref('');
  const message = ref('');

  const setError = (error) => {
    const data = error?.response?.data;
    code.value = data?.code || '';
    message.value = data?.message || '알 수 없는 오류가 발생했습니다.';
  };

  const clearError = () => {
    code.value = '';
    message.value = '';
  };

  return { code, message, setError, clearError };
});
