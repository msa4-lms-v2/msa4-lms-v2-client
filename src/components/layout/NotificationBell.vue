<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useNotificationStore } from '../../store/notification/useNotificationStore';
import { useAuthStore } from '../../store/auth/useAuthStore';

const notifications = useNotificationStore();
const authStore = useAuthStore();
const router = useRouter();
const open = ref(false);

function categoryLabel(category) {
  return category === 'ACADEMIC' ? '학사' : '상담';
}

function toggle() {
  open.value = !open.value;
  if (open.value) void notifications.syncFromServer();
}

async function openNotification(item) {
  if (!item.read) await notifications.markRead(item.notificationId);
  open.value = false;
  if (item.resourceType === 'COUNSELING') {
    const routeName = authStore.userInfo?.role === 'PROFESSOR'
      ? 'ProfessorCounselingAnswer'
      : 'StudentCounselingResult';
    await router.push({ name: routeName, params: { counselingId: item.resourceId } });
  } else if (item.resourceType === 'LEAVE_REQUEST' && authStore.userInfo?.role === 'STUDENT') {
    await router.push({ name: 'StudentReturn' });
  }
}
</script>
<template>
  <div
    class="notification-bell"
    @keydown.esc="open = false"
  >
    <button
      type="button"
      :aria-expanded="open"
      aria-controls="notification-panel"
      class="bell-button"
      aria-label="알림 열기"
      @click="toggle"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />
      </svg>
      <span v-if="notifications.unreadCount" class="unread-count">{{ notifications.unreadCount }}</span>
    </button>
    <section
      v-if="open"
      id="notification-panel"
      class="notification-panel"
      aria-label="알림"
    >
      <div class="panel-heading">
        <strong>알림</strong><button
          type="button"
          @click="open = false"
        >
          닫기
        </button>
      </div>
      <p v-if="notifications.connection !== 'connected'">
        실시간 연결 대기 중 · 새로고침으로 알림을 확인할 수 있습니다.
      </p>
      <p
        v-if="notifications.error"
        role="status"
      >
        {{ notifications.error }}
      </p>
      <button
        type="button"
        @click="notifications.syncFromServer()"
      >
        새로고침
      </button>
      <p v-if="!notifications.items.length">
        아직 알림이 없습니다.
      </p>
      <ul>
        <li
          v-for="item in notifications.items"
          :key="item.notificationId"
          :class="{ unread: !item.read }"
        >
          <button
            type="button"
            class="notification-item"
            @click="openNotification(item)"
          >
            <strong>[{{ categoryLabel(item.category) }}] {{ item.title }}</strong>
            <span>{{ item.message }}</span>
            <small>{{ item.createdAt?.replace('T', ' ') }}</small>
          </button>
        </li>
      </ul>
      <small>최근 알림 최대 100개를 표시합니다.</small>
    </section>
  </div>
</template>
<style scoped>
.notification-bell { position: relative; }
button { cursor: pointer; border: 1px solid #cbd5e1; border-radius: 6px; padding: 6px 10px; background: white; color: #172b4d; }
.bell-button { position: relative; display: grid; place-items: center; width: 38px; height: 38px; padding: 6px; border: 0; background: transparent; color: white; }
.bell-button svg { width: 25px; height: 25px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
.unread-count { position: absolute; top: 0; right: 0; min-width: 18px; height: 18px; padding: 0 5px; border-radius: 9px; background: #ef4444; color: white; font-size: 11px; font-weight: 700; line-height: 18px; }
.notification-panel { position: absolute; top: 42px; right: 0; width: min(360px, 85vw); max-height: 70vh; overflow: auto; background: white; color: #172b4d; border: 1px solid #cbd5e1; border-radius: 10px; padding: 16px; box-shadow: 0 8px 24px #0002; }
.panel-heading { display: flex; justify-content: space-between; align-items: center; }
ul { list-style: none; padding: 0; }
li { border-bottom: 1px solid #e2e8f0; }
.unread { background: #eff6ff; }
.notification-item { display: grid; width: 100%; gap: 6px; padding: 12px; border: 0; border-radius: 0; background: transparent; color: inherit; text-align: left; }
.notification-item:hover { background: #f8fafc; }
.notification-item span { font-size: 13px; }
p, small { font-size: 12px; }
</style>
