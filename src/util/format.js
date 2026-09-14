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

export function formatFileSize(size) {
  const num = Number(size);
  if (!Number.isFinite(num) || num < 0) return '-';
  if (num < 1024) return `${num} B`;
  if (num < 1024 * 1024) return `${Math.round(num / 1024)} KB`;
  return `${(num / (1024 * 1024)).toFixed(1)} MB`;
}
