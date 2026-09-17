import { request } from './httpClient.js'

export function listPlans() {
  return request('/plans')
}

export function getPlan(id) {
  return request(`/plans/${encodeURIComponent(id)}`)
}

export function createPlan(plan) {
  return request('/plans', { method: 'POST', body: JSON.stringify(plan) })
}

export function replacePlan(id, plan) {
  return request(`/plans/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(plan) })
}

export function deletePlan(id) {
  return request(`/plans/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

export function activatePlan(id) {
  return request(`/plans/${encodeURIComponent(id)}/activate`, { method: 'POST' })
}
