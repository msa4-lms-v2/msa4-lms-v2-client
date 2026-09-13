import { defineStore } from 'pinia';
import { reactive } from 'vue';
import myAxios from '../../api/myAxios';
import { validateDashboard } from '../../util/adminDashboard';

export const useAdminDashboardStore = defineStore('adminDashboard', () => {
  const academic = reactive({ data: null, status: 'idle' });
  const payment = reactive({ data: null, status: 'idle' });

  async function load(service) {
    const state = service === 'academic' ? academic : payment;
    if (state.status === 'loading') return;
    state.status = 'loading';
    state.data = null;
    try {
      const response = await myAxios.get(`/api/${service}/admin/dashboard`, {
        validateStatus: (status) => (status >= 200 && status < 300) || status === 404 || status === 501,
      });
      if ([404, 501].includes(response.status)) {
        state.status = 'unavailable';
        return;
      }
      if (response.data?.code !== '00' || !validateDashboard(response.data.data, service)) {
        throw new Error('Invalid dashboard response');
      }
      state.data = response.data.data;
      state.status = 'ready';
    } catch {
      state.status = 'error';
    }
  }

  const loadAll = () => Promise.allSettled([load('academic'), load('payment')]);
  return { academic, payment, load, loadAll };
});
