import { request } from './httpClient.js'

export function register(details) {
  return request('/auth/register', { method: 'POST', body: JSON.stringify(details) })
}

export function login(identifier, password) {
  return request('/auth/login', { method: 'POST', body: JSON.stringify({ identifier, password }) })
}

export function logout() {
  return request('/auth/logout', { method: 'POST' })
}

export function getCurrentUser() {
  return request('/auth/me')
}

// Logs out every other device; this one gets a fresh session
export function changePassword(currentPassword, newPassword) {
  return request('/auth/change-password', { method: 'POST', body: JSON.stringify({ currentPassword, newPassword }) })
}
