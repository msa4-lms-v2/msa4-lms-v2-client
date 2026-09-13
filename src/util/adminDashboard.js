export const academicTypes = [
  { type: 'LEAVE', label: '휴학' },
  { type: 'RETURN', label: '복학' },
  { type: 'WITHDRAWAL', label: '자퇴' },
  { type: 'DISMISSAL', label: '퇴학' },
  { type: 'TRANSFER', label: '전과' },
  { type: 'DOUBLE_MAJOR', label: '복수전공' },
];

const isCount = (value) => Number.isSafeInteger(value) && value >= 0;
const countsValid = (value, keys) => value && keys.every((key) => isCount(value[key]));

// Reject incomplete responses instead of turning unavailable counts into zeroes.
export function validateDashboard(data, service) {
  if (!data || !Array.isArray(data.tasks) || !data.tasks.every((task) =>
    task.id != null && typeof task.type === 'string' &&
    typeof task.requesterName === 'string' && Number.isFinite(Date.parse(task.requestedAt)))) return false;
  if (data.currentSemester !== null && !(data.currentSemester &&
    Number.isInteger(data.currentSemester.year) && typeof data.currentSemester.label === 'string')) return false;
  if (service === 'academic') {
    return countsValid(data.summary, ['lecturePending', 'academicChangePending']) &&
      (data.currentSemester === null ? data.academicStats === null :
        Array.isArray(data.academicStats) && data.academicStats.length === academicTypes.length &&
        academicTypes.every(({ type }) => data.academicStats.filter((item) =>
          item.type === type && countsValid(item, ['completed', 'pending'])).length === 1));
  }
  return countsValid(data.summary, ['installmentPending', 'certificatePending']) &&
    (data.currentSemester === null ? data.tuitionStats === null :
      countsValid(data.tuitionStats, ['paid', 'inProgress', 'unpaid']));
}

export function tuitionSegments(stats) {
  if (!stats) return { total: 0, rate: 0, paidEnd: 0, progressEnd: 0 };
  const total = stats.paid + stats.inProgress + stats.unpaid;
  const paidEnd = total ? stats.paid / total * 100 : 0;
  return {
    total, rate: Math.round(paidEnd), paidEnd,
    progressEnd: total ? (stats.paid + stats.inProgress) / total * 100 : 0,
  };
}

export function mergePendingTasks(academic = [], payment = []) {
  return [
    ...academic.map((task) => ({ ...task, service: 'academic' })),
    ...payment.map((task) => ({ ...task, service: 'payment' })),
  ].sort((a, b) => Date.parse(a.requestedAt) - Date.parse(b.requestedAt)
    || a.service.localeCompare(b.service) || a.type.localeCompare(b.type)
    || Number(a.id) - Number(b.id)).slice(0, 30);
}

export function pendingTaskRoute(task) {
  if (task.type === 'INSTALLMENT' && Number.isSafeInteger(task.tuitionBillId) && task.tuitionBillId > 0) {
    return `/admin/tuition/${task.tuitionBillId}`;
  }
  return {
    TRANSFER: '/admin/academic-change-requests/department-transfer',
    DOUBLE_MAJOR: '/admin/academic-change-requests/double-major',
    DISMISSAL: '/admin/dismissals',
  }[task.type] || null;
}
