import { createApp } from 'vue';
import { createPinia } from 'pinia';
import './style.css';
import App from './App.vue';
import router from './routes/router';

const app = createApp(App);
app.use(createPinia());
app.use(router);

// 최초 navigation guard의 세션 복구가 끝나기 전에 앱을 그리면 현재 경로가 아직
// 확정되지 않아 인증 화면 앞에 앱 shell이 잠깐 노출된다.
await router.isReady();
app.mount('#app');
