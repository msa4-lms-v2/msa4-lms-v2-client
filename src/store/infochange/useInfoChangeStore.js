import { createInfoChangeStore } from './createInfoChangeStore';

export const useInfoChangeStore = createInfoChangeStore(
  'infoChangeStore',
  '/api/academic/info-change-requests',
);
