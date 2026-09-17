import { request } from './httpClient.js'

export function searchFoods(params) {
  const query = new URLSearchParams(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== ''),
  ).toString()
  return request(`/foods${query ? `?${query}` : ''}`)
}

export function getFood(id) {
  return request(`/foods/${encodeURIComponent(id)}`)
}

export function createFood(food) {
  return request('/foods', { method: 'POST', body: JSON.stringify(food) })
}

export function updateFood(id, changes) {
  return request(`/foods/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(changes) })
}

export function deleteFood(id) {
  return request(`/foods/${encodeURIComponent(id)}`, { method: 'DELETE' })
}
