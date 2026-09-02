import { reactive, readonly } from 'vue';

// 네이티브 alert/confirm을 대체하는 전역 다이얼로그 싱글톤.
// 컴포넌트 밖(스토어, axios 인터셉터, 라우터 가드)에서도 import 해서 호출 가능.
//
// 큐(queue) 방식: 다이얼로그가 떠 있는 동안 새 요청이 오면 이전 것을 강제로 닫지 않고
// 큐에 쌓아 차례대로 보여준다. (이전엔 새 알림이 직전 알림을 즉시 닫아, 먼저 뜬 알림이
// 보기도 전에 사라지는 문제가 있었음 — 예: 오류 시 인터셉터+페이지 catch가 연달아 호출)
const state = reactive({
    open: false,
    type: 'alert', // "alert" | "confirm"
    title: '',
    message: '',
    confirmText: '확인',
    cancelText: '취소',
});

const queue = [];
let current = null;

const apply = (item) => {
    current = item;
    state.type = item.type;
    state.title = item.title;
    state.message = item.message;
    state.confirmText = item.confirmText;
    state.cancelText = item.cancelText;
    state.open = true;
};

const settle = (result) => {
    if (!current) return;
    const { resolve } = current;
    current = null;
    // 대기 중인 다이얼로그가 있으면 닫지 않고 곧바로 다음 것으로 교체(깜빡임 방지)
    if (queue.length) {
        apply(queue.shift());
    } else {
        state.open = false;
    }
    resolve(result);
};

const present = (config) =>
    new Promise((resolve) => {
        const item = {
            type: config.type,
            title: config.title || '',
            message: config.message != null ? String(config.message) : '',
            confirmText: config.confirmText || '확인',
            cancelText: config.cancelText || '취소',
            resolve,
        };

        // 알림(alert) 중복 제거: 현재 떠 있는 것 또는 큐 마지막과 동일 메시지면 다시 띄우지 않음
        if (item.type === 'alert') {
            const last = queue.length ? queue[queue.length - 1] : current;
            if (last && last.type === 'alert' && last.message === item.message) {
                resolve(true);
                return;
            }
        }

        if (current) {
            queue.push(item);
        } else {
            apply(item);
        }
    });

// alert 대체: 확인 버튼 1개. (await 가능하나 보통 그냥 호출)
export const notify = (message, options = {}) => present({ type: 'alert', message, ...options });

// confirm 대체: 확인/취소. Promise<boolean> 반환 (확인=true, 취소/닫기=false)
export const confirmDialog = (message, options = {}) => present({ type: 'confirm', message, ...options });

export function useDialog() {
    return {
        state: readonly(state),
        confirm: () => settle(true),
        // 오버레이 클릭/ESC/취소 버튼: confirm은 false, alert는 단순 닫기(true)
        cancel: () => settle(state.type === 'confirm' ? false : true),
    };
}
