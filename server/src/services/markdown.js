// Small helpers for building Markdown documents from user data safely

// One line of user text: no line breaks, no leading Markdown markers that could break the structure
export function inline(text) {
  return String(text ?? '')
    .replace(/\s+/g, ' ')
    .replace(/^[#>\-*+\d.\s]+(?=\S)/, (prefix) => prefix.replace(/[#>*+-]/g, '\\$&'))
    .trim();
}

// Text inside a table cell
export function cell(text) {
  return inline(text).replace(/\|/g, '\\|') || '—';
}

// Multi-line user text (notes) as a blockquote
export function quote(text) {
  return String(text)
    .split(/\r?\n/)
    .map((line) => `> ${line.replace(/^#+/, (hashes) => hashes.replace(/#/g, '\\#'))}`)
    .join('\n');
}

export function table(headers, rows) {
  if (rows.length === 0) return '_No data._';
  return [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.map((value) => (value === null || value === undefined || value === '' ? '—' : value)).join(' | ')} |`),
  ].join('\n');
}

// 12.5, 80 (no trailing zeros), or null
export function num(value, digits = 1) {
  if (value === null || value === undefined || !Number.isFinite(value)) return null;
  return String(Math.round(value * 10 ** digits) / 10 ** digits);
}

export function withUnit(value, unit, digits = 1) {
  const formatted = num(value, digits);
  return formatted === null ? null : `${formatted} ${unit}`;
}

// 3725 -> "1 h 2 min"
export function minutes(seconds) {
  const total = Math.round((seconds ?? 0) / 60);
  const hours = Math.floor(total / 60);
  return hours ? `${hours} h ${total % 60} min` : `${total} min`;
}

// 45 -> "0:45", 3600 -> "60:00"
export function clock(seconds) {
  const value = Math.round(seconds ?? 0);
  return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, '0')}`;
}

export const humanize = (key) =>
  key ? key.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase() : null;
