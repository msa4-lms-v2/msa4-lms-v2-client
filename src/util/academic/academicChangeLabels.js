export const ACADEMIC_CHANGE_STATUS_LABEL = {
  PENDING: '교수 검토 대기',
  ADVISOR_APPROVED: '교수 승인',
  ADVISOR_REJECTED: '교수 반려',
  APPROVED: '승인(기존)',
  APPLIED: '학적 반영 완료',
  REJECTED: '관리자 반려',
  CANCELLED: '학생 취소',
};

export const ACADEMIC_CHANGE_STATUS_VARIANT = {
  PENDING: 'processing',
  ADVISOR_APPROVED: 'processing',
  ADVISOR_REJECTED: 'fail',
  APPROVED: 'success',
  APPLIED: 'success',
  REJECTED: 'fail',
  CANCELLED: 'warning',
};

export const ACADEMIC_CHANGE_STATUS_OPTIONS = [
  { value: '', label: '전체' },
  ...Object.entries(ACADEMIC_CHANGE_STATUS_LABEL).map(([value, label]) => ({ value, label })),
];

export const formatAcademicChangeSemester = (request, type) => {
  const year = type === 'department-transfer'
    ? request.targetAcademicYear
    : request.recruitmentAcademicYear;
  const term = type === 'department-transfer' ? request.targetTerm : request.recruitmentTerm;
  if (!year || !term) return '-';
  return `${year}학년도 ${term === 'FIRST' ? 1 : 2}학기`;
};

export const formatAcademicChangeStatus = (status) =>
  ACADEMIC_CHANGE_STATUS_LABEL[status] || status || '-';

export const academicChangeStatusVariant = (status) =>
  ACADEMIC_CHANGE_STATUS_VARIANT[status] || 'processing';

export const formatFileSize = (size) => {
  const bytes = Number(size);
  if (!Number.isFinite(bytes) || bytes < 0) return '-';
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
};

export const createAcademicChangeKey = (prefix) => {
  const suffix = globalThis.crypto?.randomUUID?.()
    || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}-${suffix}`;
};
