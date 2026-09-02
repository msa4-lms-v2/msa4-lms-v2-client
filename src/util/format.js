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

// 차감액을 음수로 보여줄 때 쓴다. 0을 그대로 음수 표시하면 -0으로 toLocaleString되므로 0은 그대로 둔다.
export function formatDeduction(amount) {
  const num = Number(amount);
  return formatCurrency(Number.isFinite(num) && num !== 0 ? -num : 0);
}
