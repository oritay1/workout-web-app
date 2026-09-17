import { request } from './httpClient.js'

const json = (method, body) => ({ method, body: body === undefined ? undefined : JSON.stringify(body) })
const day = (date) => `/diet/days/${encodeURIComponent(date)}`

export const listDietPlans = () => request('/diet/plans')
export const getDietPlan = (id) => request(`/diet/plans/${encodeURIComponent(id)}`)
export const createDietPlan = (plan) => request('/diet/plans', json('POST', plan))
export const replaceDietPlan = (id, plan) => request(`/diet/plans/${encodeURIComponent(id)}`, json('PUT', plan))
export const deleteDietPlan = (id) => request(`/diet/plans/${encodeURIComponent(id)}`, json('DELETE'))
export const activateDietPlan = (id) => request(`/diet/plans/${encodeURIComponent(id)}/activate`, json('POST'))

// Every day endpoint returns the full updated day
export const getDay = (date) => request(day(date))
export const addDayEntry = (date, entry) => request(`${day(date)}/entries`, json('POST', entry))
export const updateDayEntry = (date, id, changes) => request(`${day(date)}/entries/${encodeURIComponent(id)}`, json('PATCH', changes))
export const deleteDayEntry = (date, id) => request(`${day(date)}/entries/${encodeURIComponent(id)}`, json('DELETE'))
export const addPlanMeal = (date, mealId) => request(`${day(date)}/plan-meals/${encodeURIComponent(mealId)}`, json('POST'))
export const setWater = (date, waterMl) => request(`${day(date)}/water`, json('PUT', { waterMl }))
export const syncDayTargets = (date) => request(`${day(date)}/sync-targets`, json('POST'))
