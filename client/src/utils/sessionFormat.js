import { getExerciseName } from './exercises.js'

// "1:05:09" / "4:05"
export function formatDuration(totalSeconds) {
  const seconds = Math.max(0, Math.round(totalSeconds ?? 0))
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = String(seconds % 60).padStart(2, '0')
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`
}

const kg = (value, t) => `${value} ${t('units.kg')}`
const km = (value, t) => `${value} ${t('units.km')}`

// Plan target, e.g. "3 × 8–10 · 80 kg", "2 × 0:45", "10:00 · 2 km"
export function formatPlanned(planned, type, t) {
  if (!planned) return ''
  if (type === 'cardio') {
    return [planned.durationSeconds && formatDuration(planned.durationSeconds), planned.distanceKm && km(planned.distanceKm, t)]
      .filter(Boolean)
      .join(' · ')
  }
  const sets = planned.sets ?? 1
  if (type === 'duration') return `${sets} × ${formatDuration(planned.durationSeconds)}`
  const reps =
    planned.repsMax && planned.repsMax !== planned.repsMin ? `${planned.repsMin}–${planned.repsMax}` : `${planned.repsMin}`
  return [`${sets} × ${reps}`, planned.weightKg ? kg(planned.weightKg, t) : ''].filter(Boolean).join(' · ')
}

// One performed set, e.g. "10 × 80 kg", "0:45", "11:00 · 2.1 km"
export function formatSet(set, type, t) {
  if (type === 'cardio') {
    return [set.durationSeconds && formatDuration(set.durationSeconds), set.distanceKm && km(set.distanceKm, t)]
      .filter(Boolean)
      .join(' · ')
  }
  if (type === 'duration') return formatDuration(set.durationSeconds)
  if (set.reps === null || set.reps === undefined) return set.weightKg ? kg(set.weightKg, t) : '—'
  return set.weightKg ? `${set.reps} × ${kg(set.weightKg, t)}` : `${set.reps}`
}

// 'done' | 'partial' | 'skipped' for planned exercises, 'extra' for ones added during the workout
export function getEntryStatus(entry) {
  const completed = entry.sets.filter((set) => set.completed).length
  if (!entry.planned) return 'extra'
  const target = entry.planned.sets ?? 1
  if (completed === 0) return 'skipped'
  return completed >= target ? 'done' : 'partial'
}

export function getSessionTitle(session, t) {
  return session.name || t('workout.freeWorkout')
}

export function formatEntryName(entry, language) {
  return getExerciseName(entry.exercise, language)
}

export function formatDateTime(date, language) {
  return new Intl.DateTimeFormat(language, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(
    new Date(date),
  )
}
