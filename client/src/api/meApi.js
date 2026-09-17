import { request } from './httpClient.js'

const json = (method, body) => ({ method, body: JSON.stringify(body) })

export function updateAccount(changes) {
  return request('/me', json('PATCH', changes))
}

// Called with no data when the user skips the screen
export function completeOnboarding(data = {}) {
  return request('/me/onboarding', json('POST', data))
}

export function getHealth() {
  return request('/me/health')
}

export function updateHealth(changes) {
  return request('/me/health', json('PATCH', changes))
}

export function getLatestMeasurements() {
  return request('/me/measurements/latest')
}

export function listMeasurements(type) {
  return request(`/me/measurements?type=${encodeURIComponent(type)}`)
}

export function addMeasurement(measurement) {
  return request('/me/measurements', json('POST', measurement))
}

export function deleteMeasurement(id) {
  return request(`/me/measurements/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

// All of the user's data as one Markdown document. days: 30 | 90 | 365 | 'all'
export function exportMarkdown(days, timeZone) {
  const query = new URLSearchParams({ days: String(days), tz: timeZone }).toString()
  return request(`/me/export.md?${query}`, { responseType: 'text' })
}

// { language?, theme? } where theme is 'light' | 'dark' | 'system'
export function updateSettings(changes) {
  return request('/me/settings', json('PATCH', changes))
}
