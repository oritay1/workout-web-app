import { HttpError } from '../middlewares/errorHandler.js';

const USERNAME_PATTERN = /^[a-zA-Z0-9_.]{3,30}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_EMAIL_LENGTH = 254;
const PHONE_PATTERN = /^\+?[0-9]{7,15}$/;
const MIN_PASSWORD_LENGTH = 8;
// bcrypt ignores everything after 72 bytes
const MAX_PASSWORD_BYTES = 72;
const AVATAR_PATTERN = /^data:image\/(jpeg|png|webp);base64,[a-zA-Z0-9+/]+=*$/;
const MAX_AVATAR_LENGTH = 300_000;

const isString = (value) => typeof value === 'string';

// Keeps digits and a leading "+", drops spaces, dashes and parentheses
function normalizePhone(phone) {
  const trimmed = phone.trim();
  return (trimmed.startsWith('+') ? '+' : '') + trimmed.replace(/[\s\-()+]/g, '');
}

export function parseUsername(username) {
  if (!isString(username) || !USERNAME_PATTERN.test(username.trim())) {
    throw new HttpError(400, 'INVALID_USERNAME');
  }
  return username.trim();
}

export function parseEmail(email) {
  if (!isString(email) || email.trim().length > MAX_EMAIL_LENGTH || !EMAIL_PATTERN.test(email.trim())) {
    throw new HttpError(400, 'INVALID_EMAIL');
  }
  return email.trim().toLowerCase();
}

export function parsePhone(phone) {
  const normalized = isString(phone) ? normalizePhone(phone) : '';
  if (!PHONE_PATTERN.test(normalized)) throw new HttpError(400, 'INVALID_PHONE');
  return normalized;
}

export function parsePassword(password) {
  if (
    !isString(password) ||
    password.length < MIN_PASSWORD_LENGTH ||
    Buffer.byteLength(password) > MAX_PASSWORD_BYTES
  ) {
    throw new HttpError(400, 'INVALID_PASSWORD');
  }
  return password;
}

// Optional: returns null when there is no avatar
export function parseAvatar(avatar) {
  if (avatar === undefined || avatar === null || avatar === '') return null;
  if (!isString(avatar) || avatar.length > MAX_AVATAR_LENGTH || !AVATAR_PATTERN.test(avatar)) {
    throw new HttpError(400, 'INVALID_AVATAR');
  }
  return avatar;
}
