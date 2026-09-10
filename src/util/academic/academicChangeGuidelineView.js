const STORAGE_PREFIX = 'academic-change-guideline-viewed:';
const GUIDELINE_TYPES = ['department-transfer', 'double-major'];

const getSessionStorage = () => {
  try {
    return globalThis.sessionStorage;
  } catch {
    return null;
  }
};

const storageKey = (type) => `${STORAGE_PREFIX}${type}`;

export const hasViewedAcademicChangeGuideline = (type) => (
  getSessionStorage()?.getItem(storageKey(type)) === 'true'
);

export const markAcademicChangeGuidelineViewed = (type) => {
  getSessionStorage()?.setItem(storageKey(type), 'true');
};

export const clearAcademicChangeGuidelineViews = () => {
  const storage = getSessionStorage();
  GUIDELINE_TYPES.forEach((type) => storage?.removeItem(storageKey(type)));
};
