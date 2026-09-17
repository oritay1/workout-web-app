import { ENTRY_DEFAULTS, ENTRY_FIELDS_BY_TYPE, ENTRY_FIELD_DEFS, PLAN_LIMITS } from '../constants/plans.js'

// Converts between the API plan and the editor's form state (numbers are edited as strings).
// Every workout and entry gets a local `key` for React lists; `id` is the server id (null when new)

let lastKey = 0
const newKey = () => `local-${++lastKey}`
const toInput = (value) => (value === null || value === undefined ? '' : String(value))

export function createWorkout(name) {
  return { key: newKey(), id: null, name, schedule: [], exercises: [] }
}

export function createEntry(exercise) {
  return { key: newKey(), id: null, exercise, notes: '', ...ENTRY_DEFAULTS[exercise.type] }
}

export function createPlanForm(firstWorkoutName) {
  return { name: '', notes: '', workoutsPerWeek: '3', workouts: [createWorkout(firstWorkoutName)] }
}

export function toPlanForm(plan) {
  return {
    name: plan.name,
    notes: plan.notes ?? '',
    workoutsPerWeek: String(plan.workoutsPerWeek),
    workouts: plan.workouts.map((workout) => ({
      key: newKey(),
      id: workout.id,
      name: workout.name,
      schedule: workout.schedule.map(({ day, time }) => ({ day, time: time ?? '' })),
      exercises: workout.exercises.map((entry) => ({
        key: newKey(),
        id: entry.id,
        exercise: entry.exercise,
        notes: entry.notes ?? '',
        sets: toInput(entry.sets),
        repsMin: toInput(entry.repsMin),
        repsMax: toInput(entry.repsMax),
        weightKg: toInput(entry.weightKg),
        restSeconds: toInput(entry.restSeconds),
        durationSeconds: toInput(entry.durationSeconds),
        durationMinutes: entry.durationSeconds ? toInput(Math.round((entry.durationSeconds / 60) * 100) / 100) : '',
        distanceKm: toInput(entry.distanceKm),
      })),
    })),
  }
}

function entryPayload(entry) {
  const payload = { id: entry.id, exerciseId: entry.exercise.id, notes: entry.notes.trim() || null }
  for (const field of ENTRY_FIELDS_BY_TYPE[entry.exercise.type]) {
    const value = (entry[field] ?? '').trim()
    if (value === '') continue
    if (field === 'durationMinutes') payload.durationSeconds = Math.round(Number(value) * 60)
    else payload[field] = Number(value)
  }
  return payload
}

export function toPlanPayload(form) {
  return {
    name: form.name.trim(),
    notes: form.notes.trim() || null,
    workoutsPerWeek: Number(form.workoutsPerWeek),
    workouts: form.workouts.map((workout) => ({
      id: workout.id,
      name: workout.name.trim(),
      schedule: workout.schedule.map(({ day, time }) => ({ day, time: time || null })),
      exercises: workout.exercises.map(entryPayload),
    })),
  }
}

function isInvalidNumber(value, def) {
  const text = (value ?? '').trim()
  if (text === '') return Boolean(def.required)
  const number = Number(text)
  return !Number.isFinite(number) || number < def.min || number > def.max || (def.integer && !Number.isInteger(number))
}

// Returns { 'workouts.0.exercises.1.sets': true, ... } using the same paths as the server errors
export function validatePlanForm(form) {
  const errors = {}
  if (!form.name.trim()) errors.name = true
  if (isInvalidNumber(form.workoutsPerWeek, { ...PLAN_LIMITS.workoutsPerWeek, integer: true, required: true })) {
    errors.workoutsPerWeek = true
  }
  form.workouts.forEach((workout, workoutIndex) => {
    const path = `workouts.${workoutIndex}`
    if (!workout.name.trim()) errors[`${path}.name`] = true
    workout.exercises.forEach((entry, entryIndex) => {
      const entryPath = `${path}.exercises.${entryIndex}`
      for (const field of ENTRY_FIELDS_BY_TYPE[entry.exercise.type]) {
        if (isInvalidNumber(entry[field], ENTRY_FIELD_DEFS[field])) errors[`${entryPath}.${field}`] = true
      }
      const { repsMin, repsMax } = entry
      if (repsMax?.trim() && repsMin?.trim() && Number(repsMax) < Number(repsMin)) errors[`${entryPath}.repsMax`] = true
    })
  })
  return errors
}

// The server reports cardio duration as durationSeconds; the editor field is durationMinutes
export function toFormErrorPath(form, serverPath) {
  const match = serverPath.match(/^workouts\.(\d+)\.exercises\.(\d+)\.durationSeconds$/)
  if (!match) return serverPath
  const entry = form.workouts[Number(match[1])]?.exercises[Number(match[2])]
  return entry?.exercise.type === 'cardio' ? serverPath.replace(/durationSeconds$/, 'durationMinutes') : serverPath
}
