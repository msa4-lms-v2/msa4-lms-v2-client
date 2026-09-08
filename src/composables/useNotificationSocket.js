import { watch } from "vue";
import { Client } from "@stomp/stompjs";
import { useAuthStore } from "../store/auth/useAuthStore";
import { useNotificationStore } from '../store/notification/useNotificationStore';
import { isJwtExpiringSoon } from '../util/jwt';
import myAxios from '../api/myAxios';

export function useNotificationSocket() {
  const authStore = useAuthStore();
  const notifications = useNotificationStore();
  watch(() => authStore.userInfo?.userId ?? authStore.userInfo?.id, () => notifications.clear(), { flush: 'sync' });

  watch(
    () => [authStore.accessToken, authStore.userInfo?.role],
    ([token, role], previousToken, onCleanup) => {
      if (!token || !['STUDENT', 'PROFESSOR'].includes(role)) {
        notifications.clear();
        return;
      }

      let disposed = false;

      const client = new Client({
        // Gateway의 ws:// 또는 wss:// 주소
        brokerURL: import.meta.env.VITE_NOTIFICATION_WS_URL
          || `${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}/ws/notifications`,
        reconnectDelay: 5000,
        connectionTimeout: 10000,
        heartbeatIncoming: 10000,
        heartbeatOutgoing: 10000,

        beforeConnect: async () => {
          if (disposed) return;
          notifications.connection = 'connecting';
          try {
            if (isJwtExpiringSoon(authStore.accessToken)) await authStore.reissue();
            if (disposed) return;
            const response = await myAxios.post('/api/notifications/ws-ticket');
            if (disposed) return;
            const url = new URL(import.meta.env.VITE_NOTIFICATION_WS_URL
              || `${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}/ws/notifications`);
            url.searchParams.set('ticket', response.data.data.ticket);
            client.brokerURL = url.toString();
          } catch {
            if (!disposed) {
              notifications.connection = 'error';
              notifications.error = '알림 연결을 준비하지 못했습니다. 다시 로그인해 주세요.';
            }
            void client.deactivate();
          }
        },
        onStompError: () => {
          if (disposed) return;
          notifications.connection = 'error';
          notifications.error = '실시간 알림 인증에 실패했습니다. 다시 로그인해 주세요.';
          void client.deactivate();
        },
        onWebSocketClose: () => {
          if (!disposed && notifications.connection !== 'error') notifications.connection = 'disconnected';
        },

        onConnect: () => {
          if (disposed) return;
          notifications.connection = 'connected';

          client.subscribe("/user/queue/notifications", (frame) => {
            if (disposed) return;
            try {
              notifications.upsert(JSON.parse(frame.body));
              void notifications.syncFromServer();
            } catch { notifications.error = '알림 메시지를 처리하지 못했습니다.'; }
          });

          // 재접속 시 DB의 알림 목록도 다시 조회
          void notifications.syncFromServer();
        },
      });

      const refreshTimer = setInterval(async () => {
        if (disposed) return;
        try {
          if (isJwtExpiringSoon(authStore.accessToken)) await authStore.reissue();
        } catch { void client.deactivate(); }
      }, 30000);
      onCleanup(() => {
        disposed = true;
        clearInterval(refreshTimer);
        void client.deactivate();
      });

      client.activate();
    },
    { immediate: true }
  );
}
