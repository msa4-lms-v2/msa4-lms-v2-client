import dayjs from 'dayjs';

export function formatDate(date, pattern = 'YYYY-MM-DD') {
  const parsed = dayjs(date);
  return parsed.isValid() ? parsed.format(pattern) : '-';
}

export function formatCurrency(amount) {
  if (amount === null || amount === undefined) return '-';
  return `${Number(amount).toLocaleString('ko-KR')}원`;
}
