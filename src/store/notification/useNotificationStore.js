import { defineStore } from 'pinia';
import { ref } from 'vue';
import myAxios from '../../api/myAxios';

const endpoint = '/api/academic/counseling/notifications';
export const useNotificationStore = defineStore('notification', () => {
  const items = ref([]);
  const unreadCount = ref(0);
  const error = ref('');
  const connection = ref('disconnected');
  let generation = 0;
  let revision = 0;
  let pending = null;
  function clear() {
    generation++; revision++; pending = null;
    items.value = []; unreadCount.value = 0; error.value = ''; connection.value = 'disconnected';
  }
  function upsert(item) {
    revision++;
    const old = items.value.find((entry) => entry.notificationId === item.notificationId);
    if (!old && !item.read) unreadCount.value++;
    if (old && !old.read && item.read) unreadCount.value = Math.max(0, unreadCount.value - 1);
    items.value = [item, ...items.value.filter((entry) => entry.notificationId !== item.notificationId)]
      .sort((a, b) => b.notificationId - a.notificationId).slice(0, 100);
  }
  function syncFromServer() {
    if (pending) return pending;
    const epoch = generation;
    const work = (async () => {
      try {
        for (let attempt = 0; attempt < 3; attempt++) {
          const version = revision;
          const [list, count] = await Promise.all([
            myAxios.get(endpoint, { params: { page: 1, size: 100 } }),
            myAxios.get(endpoint, { params: { page: 1, size: 1, unreadOnly: true } }),
          ]);
          if (epoch !== generation) return;
          if (version !== revision) continue;
          items.value = list.data.data.items;
          unreadCount.value = count.data.data.totalCount;
          error.value = '';
          return;
        }
      } catch {
        if (epoch === generation) error.value = '알림을 불러오지 못했습니다. 다시 시도해 주세요.';
      }
    })();
    pending = work;
    void work.finally(() => { if (pending === work) pending = null; });
    return work;
  }
  async function markRead(id) {
    const epoch = generation;
    try {
      const response = await myAxios.patch(`${endpoint}/${id}/read`);
      if (epoch !== generation) return;
      upsert(response.data.data);
      await syncFromServer();
    } catch {
      if (epoch === generation) error.value = '읽음 처리에 실패했습니다.';
    }
  }
  return { items, unreadCount, error, connection, clear, upsert, syncFromServer, markRead };
});
