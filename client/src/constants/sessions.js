// Values recorded for each set, by exercise type (cardio duration is edited in minutes)
export const SET_FIELDS_BY_TYPE = {
  strength: ['reps', 'weightKg'],
  bodyweight: ['reps', 'weightKg'],
  duration: ['durationSeconds'],
  cardio: ['durationMinutes', 'distanceKm'],
}

// Mirrors LIMITS in server/src/services/workoutSession.service.js
export const SET_FIELD_DEFS = {
  reps: { min: 0, max: 1000, step: 1, integer: true },
  weightKg: { min: 0, max: 1000, step: 0.5, unit: 'kg' },
  durationSeconds: { min: 0, max: 86400, step: 5, integer: true, unit: 'seconds' },
  durationMinutes: { min: 0, max: 1440, step: 1, unit: 'minutes' },
  distanceKm: { min: 0, max: 1000, step: 0.1, unit: 'km' },
}

export const SESSION_LIMITS = { exercises: 40, setsPerExercise: 30, notesLength: 1000 }

// Rest after completing a set when the plan doesn't say (cardio has no rest timer)
export const DEFAULT_REST_SECONDS = { strength: 90, bodyweight: 60, duration: 60, cardio: null }

export const AUTOSAVE_DELAY_MS = 700
export const AUTOSAVE_RETRY_MS = 3000
