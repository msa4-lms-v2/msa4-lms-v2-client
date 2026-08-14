import { defineStore } from "pinia";
import { ref } from "vue";
import myAxios from "../../api/myAxios";

export const useDashboardStore = defineStore("dashboard", () => {
  const schedules = ref([]);
  const notices = ref([]);

  const isSchedulesLoading = ref(false);
  const isSchedulesError = ref(false);
  const isNoticesLoading = ref(false);
  const isNoticesError = ref(false);

  const loadSchedules = async () => {
    isSchedulesLoading.value = true;
    isSchedulesError.value = false;
    try {
      const res = await myAxios.get("/api/academic/academic-schedules");

      if (res.data.code === "00") {
        schedules.value = res.data.data;
      } else {
        isSchedulesError.value = true;
      }
    } catch (error) {
      console.error("일정 조회 실패", error);
      isSchedulesError.value = true;
    } finally {
      isSchedulesLoading.value = false;
    }
  };

  const loadNotices = async () => {
    isNoticesLoading.value = true;
    isNoticesError.value = false;
    try {
      const res = await myAxios.get("/api/academic/catalog/notices");

      if (res.data.code === "00") {
        notices.value = res.data.data;
      } else {
        isNoticesError.value = true;
      }
    } catch (error) {
      console.error("공지 조회 실패", error);
      isNoticesError.value = true;
    } finally {
      isNoticesLoading.value = false;
    }
  };

  return {
    schedules,
    notices,
    isSchedulesLoading,
    isSchedulesError,
    isNoticesLoading,
    isNoticesError,
    loadSchedules,
    loadNotices,
  };
});
