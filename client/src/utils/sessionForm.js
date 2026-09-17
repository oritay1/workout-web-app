import { SET_FIELDS_BY_TYPE } from '../constants/sessions.js'

// Converts between the API session and the live screen's form state (numbers edited as strings)

let lastKey = 0
const newKey = () => `set-${++lastKey}`
const toInput = (value) => (value === null || value === undefined ? '' : String(value))

function toFormSet(set) {
  return {
    key: newKey(),
    reps: toInput(set.reps),
    weightKg: toInput(set.weightKg),
    durationSeconds: toInput(set.durationSeconds),
    durationMinutes: set.durationSeconds ? toInput(Math.round((set.durationSeconds / 60) * 100) / 100) : '',
    distanceKm: toInput(set.distanceKm),
    completed: set.completed,
  }
}

export function toSessionForm(session) {
  return {
    notes: session.notes ?? '',
    exercises: session.exercises.map((entry) => ({
      key: newKey(),
      id: entry.id,
      exercise: entry.exercise,
      planned: entry.planned,
      notes: entry.notes ?? '',
      sets: entry.sets.map(toFormSet),
    })),
  }
}

// A new set copies the values of the previous one (usually the same weight), not yet completed
export function createSet(previous) {
  return previous
    ? { ...previous, key: newKey(), completed: false }
    : { key: newKey(), reps: '', weightKg: '', durationSeconds: '', durationMinutes: '', distanceKm: '', completed: false }
}

export function createSessionEntry(exercise) {
  return { key: newKey(), id: null, exercise, planned: null, notes: '', sets: [createSet()] }
}

function toNumber(value, integer) {
  const text = String(value ?? '').trim()
  if (text === '') return null
  const number = Number(text)
  if (!Number.isFinite(number) || number < 0) return null
  return integer ? Math.round(number) : number
}

export function toSessionPayload(form) {
  return {
    notes: form.notes.trim() || null,
    exercises: form.exercises.map((entry) => ({
      id: entry.id,
      exerciseId: entry.exercise.id,
      notes: entry.notes.trim() || null,
      sets: entry.sets.map((set) => {
        const payload = { completed: set.completed }
        for (const field of SET_FIELDS_BY_TYPE[entry.exercise.type]) {
          if (field === 'durationMinutes') {
            const minutes = toNumber(set.durationMinutes)
            payload.durationSeconds = minutes === null ? null : Math.round(minutes * 60)
          } else {
            payload[field] = toNumber(set[field], field === 'reps' || field === 'durationSeconds')
          }
        }
        return payload
      }),
    })),
  }
}
