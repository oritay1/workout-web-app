import { HttpError } from '../middlewares/errorHandler.js';

// Shared input parsers. Each returns the clean value, `null` for "clear this field", or throws 400

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 24 * 60 * 60 * 1000;

export const isBlank = (value) => value === undefined || value === null || value === '';

export function invalidField(field) {
  return new HttpError(400, 'INVALID_FIELD', { field });
}

export function parseEnum(value, field, allowed) {
  if (isBlank(value)) return null;
  if (!allowed.includes(value)) throw invalidField(field);
  return value;
}

export function parseNumber(value, field, { min, max }) {
  if (isBlank(value)) return null;
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) {
    throw invalidField(field);
  }
  return value;
}

export function parseText(value, field, maxLength) {
  if (isBlank(value)) return null;
  if (typeof value !== 'string' || value.trim().length > maxLength) throw invalidField(field);
  return value.trim() || null;
}

// A calendar date sent as "YYYY-MM-DD", stored as UTC midnight
export function parseDate(value, field, { min, max }) {
  if (isBlank(value)) return null;
  if (typeof value !== 'string' || !DATE_PATTERN.test(value)) throw invalidField(field);
  const date = new Date(`${value}T00:00:00.000Z`);
  // Rejects dates like 2026-02-31 that JS would silently roll over
  if (Number.isNaN(date.getTime()) || formatDate(date) !== value || date < min || date > max) {
    throw invalidField(field);
  }
  return date;
}

// Free-text list (e.g. medications): trimmed, empty items and duplicates removed
export function parseTextList(value, field, { maxItems, maxLength }) {
  if (isBlank(value)) return null;
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) throw invalidField(field);
  const items = [...new Set(value.map((item) => item.trim()).filter(Boolean))];
  if (items.length > maxItems || items.some((item) => item.length > maxLength)) throw invalidField(field);
  return items.length ? items : null;
}

export function parseEnumList(value, field, allowed) {
  if (isBlank(value)) return null;
  if (!Array.isArray(value) || value.some((item) => !allowed.includes(item))) throw invalidField(field);
  const items = [...new Set(value)];
  return items.length ? items : null;
}

export function formatDate(date) {
  return date ? date.toISOString().slice(0, 10) : null;
}

// Clients send their local date, which can be one day ahead of UTC
export function latestAllowedDate() {
  return new Date(Date.now() + DAY_MS);
}

export function yearsAgo(years) {
  const date = new Date();
  date.setUTCFullYear(date.getUTCFullYear() - years);
  return date;
}
