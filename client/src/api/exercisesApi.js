import { request } from './httpClient.js'

export function listExercises() {
  return request('/exercises')
}

export function getExercise(id) {
  return request(`/exercises/${encodeURIComponent(id)}`)
}

export function createExercise(exercise) {
  return request('/exercises', { method: 'POST', body: JSON.stringify(exercise) })
}

export function updateExercise(id, changes) {
  return request(`/exercises/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(changes) })
}

export function deleteExercise(id) {
  return request(`/exercises/${encodeURIComponent(id)}`, { method: 'DELETE' })
}
