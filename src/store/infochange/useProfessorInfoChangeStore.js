import { createInfoChangeStore } from './createInfoChangeStore';

export const useProfessorInfoChangeStore = createInfoChangeStore(
  'professorInfoChangeStore',
  '/api/academic/professor-info-change-requests',
);
