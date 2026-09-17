import { request } from './httpClient.js'

const query = (params) => {
  const search = new URLSearchParams(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null),
  ).toString()
  return search ? `?${search}` : ''
}

export function getCurrentSession() {
  return request('/sessions/current')
}

// { planId, workoutId } to start a planned workout, {} for a free workout
export function startSession(source = {}) {
  return request('/sessions', { method: 'POST', body: JSON.stringify(source) })
}

export function listSessions(params = {}) {
  return request(`/sessions${query(params)}`)
}

export function getSession(id) {
  return request(`/sessions/${encodeURIComponent(id)}`)
}

// `keepalive` lets the last autosave finish even when the page is being closed
export function replaceSession(id, session, { keepalive = false } = {}) {
  return request(`/sessions/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(session), keepalive })
}

export function finishSession(id) {
  return request(`/sessions/${encodeURIComponent(id)}/finish`, { method: 'POST' })
}

export function deleteSession(id) {
  return request(`/sessions/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

export function getExerciseHistory(exerciseId, params = {}) {
  return request(`/exercises/${encodeURIComponent(exerciseId)}/history${query(params)}`)
}
