export function normalizeBirthDate(value, today = new Date()) {
  const input = String(value ?? '').trim();
  if (!/^(?:\d{8}|\d{4}-\d{2}-\d{2})$/.test(input)) return null;

  const digits = input.replaceAll('-', '');
  const year = Number(digits.slice(0, 4));
  const month = Number(digits.slice(4, 6));
  const day = Number(digits.slice(6, 8));
  const formatted = `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
  const date = new Date(`${formatted}T00:00:00`);
  if (year === 0 || date.getFullYear() !== year || date.getMonth() + 1 !== month || date.getDate() !== day) return null;

  const todayValue = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  return formatted < todayValue ? formatted : null;
}
