// Mirrors the server rules in server/src/services/auth.service.js - the server is the source of truth
export const USERNAME_PATTERN = /^[a-zA-Z0-9_.]{3,30}$/
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
export const PHONE_PATTERN = /^\+?[0-9]{7,15}$/
export const MIN_PASSWORD_LENGTH = 8
export const MAX_PASSWORD_BYTES = 72

// Which form field each server error code belongs to
export const ERROR_FIELDS = {
  INVALID_USERNAME: 'username',
  USERNAME_TAKEN: 'username',
  INVALID_EMAIL: 'email',
  EMAIL_TAKEN: 'email',
  INVALID_PHONE: 'phone',
  INVALID_PASSWORD: 'password',
  INVALID_AVATAR: 'avatar',
}

export function normalizePhone(phone) {
  const trimmed = phone.trim()
  return (trimmed.startsWith('+') ? '+' : '') + trimmed.replace(/[\s\-()+]/g, '')
}

// Returns { field: errorCode } for every invalid account field
export function validateAccount({ username, email, phone }) {
  const errors = {}
  if (!USERNAME_PATTERN.test(username.trim())) errors.username = 'INVALID_USERNAME'
  if (!EMAIL_PATTERN.test(email.trim())) errors.email = 'INVALID_EMAIL'
  if (!PHONE_PATTERN.test(normalizePhone(phone))) errors.phone = 'INVALID_PHONE'
  return errors
}

export function validateRegistration(form) {
  const errors = validateAccount(form)
  const { password } = form
  if (password.length < MIN_PASSWORD_LENGTH || new TextEncoder().encode(password).length > MAX_PASSWORD_BYTES) {
    errors.password = 'INVALID_PASSWORD'
  }
  return errors
}
