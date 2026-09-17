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
