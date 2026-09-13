// Keep the API's plain-text format readable by existing student/admin screens.
export const serializeWeeks = (weeks) => weeks
  .map((content, index) => content.trim() ? `[${index + 1}주차]\n${content}` : '')
  .filter(Boolean).join('\n\n');

export const parseWeeks = (value) => {
  if (!value) return ['', '', ''];
  const sections = [...value.matchAll(/^\[(\d+)주차\]\n/gm)];
  if (!sections.length || sections[0].index !== 0) return null;
  const weeks = [];
  for (let i = 0; i < sections.length; i += 1) {
    const week = Number(sections[i][1]);
    // Ambiguous/legacy text remains editable unchanged in the original editor.
    if (!Number.isSafeInteger(week) || week < 1 || week > 100 || weeks[week - 1] !== undefined) return null;
    const start = sections[i].index + sections[i][0].length;
    const end = i + 1 < sections.length ? sections[i + 1].index - 2 : value.length;
    weeks[week - 1] = value.slice(start, end);
  }
  const result = Array.from({length: Math.max(3, weeks.length)}, (_, i) => weeks[i] ?? '');
  return serializeWeeks(result) === value ? result : null;
};
