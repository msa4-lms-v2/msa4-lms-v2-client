import dayjs from 'dayjs';

export function formatDate(date, pattern = 'YYYY-MM-DD') {
  const parsed = dayjs(date);
  return parsed.isValid() ? parsed.format(pattern) : '-';
}

export function formatCurrency(amount) {
  if (amount === null || amount === undefined) return '-';
  const num = Number(amount);
  if (!Number.isFinite(num)) return '-';
  return `${num.toLocaleString('ko-KR')}원`;
}
