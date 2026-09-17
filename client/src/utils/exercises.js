import { DEFAULT_LANGUAGE } from '../i18n/languages.js'

// Built-in exercises carry a name per language; custom ones have the name the user typed
export function getExerciseName(exercise, language) {
  if (exercise.isCustom) return exercise.name
  return exercise.names[language] ?? exercise.names[DEFAULT_LANGUAGE]
}

// Lowercase, and treat the different apostrophes (' ’ ׳) as the same character
export function normalizeSearch(text) {
  return text.toLowerCase().replace(/[’׳`]/g, "'").trim()
}

// Every word of the query must appear in one of the exercise's names (any language)
export function matchesSearch(exercise, query) {
  const words = normalizeSearch(query).split(/\s+/).filter(Boolean)
  if (words.length === 0) return true
  const names = (exercise.isCustom ? [exercise.name] : Object.values(exercise.names)).map(normalizeSearch)
  return names.some((name) => words.every((word) => name.includes(word)))
}

export function matchesFilters(exercise, { muscle, equipment, type, source }) {
  if (muscle && !exercise.primaryMuscles.includes(muscle) && !exercise.secondaryMuscles.includes(muscle)) return false
  if (equipment && exercise.equipment !== equipment) return false
  if (type && exercise.type !== type) return false
  if (source === 'builtIn' && exercise.isCustom) return false
  if (source === 'custom' && !exercise.isCustom) return false
  return true
}
