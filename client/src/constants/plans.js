// Mirrors LIMITS in server/src/services/workoutPlan.service.js
export const PLAN_LIMITS = {
  nameLength: 60,
  notesLength: 500,
  workoutNameLength: 40,
  entryNotesLength: 200,
  workouts: 14,
  exercisesPerWorkout: 30,
  workoutsPerWeek: { min: 1, max: 14 },
}

// Target inputs shown for each exercise type (cardio duration is edited in minutes, stored in seconds)
export const ENTRY_FIELDS_BY_TYPE = {
  strength: ['sets', 'repsMin', 'repsMax', 'weightKg', 'restSeconds'],
  bodyweight: ['sets', 'repsMin', 'repsMax', 'weightKg', 'restSeconds'],
  duration: ['sets', 'durationSeconds', 'restSeconds'],
  cardio: ['durationMinutes', 'distanceKm'],
}

export const ENTRY_FIELD_DEFS = {
  sets: { min: 1, max: 20, step: 1, integer: true, required: true },
  repsMin: { min: 1, max: 100, step: 1, integer: true, required: true },
  repsMax: { min: 1, max: 100, step: 1, integer: true },
  weightKg: { min: 0, max: 1000, step: 0.5, unit: 'kg' },
  restSeconds: { min: 0, max: 900, step: 15, integer: true, unit: 'seconds' },
  durationSeconds: { min: 1, max: 3600, step: 5, integer: true, required: true, unit: 'seconds' },
  durationMinutes: { min: 1, max: 1440, step: 1, unit: 'minutes' },
  distanceKm: { min: 0.01, max: 1000, step: 0.1, unit: 'km' },
}

// Pre-filled when an exercise is added to a workout
export const ENTRY_DEFAULTS = {
  strength: { sets: '3', repsMin: '8', repsMax: '12', restSeconds: '90' },
  bodyweight: { sets: '3', repsMin: '10', repsMax: '15', restSeconds: '60' },
  duration: { sets: '3', durationSeconds: '30', restSeconds: '60' },
  cardio: { durationMinutes: '30' },
}

// 0 = Sunday ... 6 = Saturday (same as Date.getDay())
export const WEEK_DAYS = [0, 1, 2, 3, 4, 5, 6]
