import { defineStore } from "pinia";
import { ref } from "vue";
import myAxios from "../../api/myAxios";

export const useDashboardStore = defineStore("dashboard", () => {
  const schedules = ref([]);
  const notices = ref([]);

  const loadSchedules = async () => {
    try {
      const res = await myAxios.get("/api/dashboard/schedules");

      if (res.data.code === "00") {
        schedules.value = res.data.data;
      }
    } catch (error) {
      console.error("일정 조회 실패", error);
    }
  };

  const loadNotices = async () => {
    try {
      const res = await myAxios.get("/api/dashboard/notices");

      if (res.data.code === "00") {
        notices.value = res.data.data;
      }
    } catch (error) {
      console.error("공지 조회 실패", error);
    }
  };

  return {
    schedules,
    notices,
    loadSchedules,
    loadNotices,
  };
});
