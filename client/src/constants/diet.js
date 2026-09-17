// Mirrors server/src/services/dietPlan.service.js and dailyLog.service.js
export const TARGETS = [
  { field: 'energyKcal', unit: 'kcal', min: 500, max: 10000, step: 10 },
  { field: 'proteinG', unit: 'g', min: 0, max: 1000, step: 1 },
  { field: 'carbsG', unit: 'g', min: 0, max: 2000, step: 1 },
  { field: 'fatG', unit: 'g', min: 0, max: 1000, step: 1 },
  { field: 'waterMl', unit: 'ml', min: 0, max: 10000, step: 100 },
]

// Used when the active plan has no meals of its own (translated under nutrition.meals)
export const DEFAULT_MEALS = ['breakfast', 'lunch', 'dinner', 'snacks']

export const DIET_LIMITS = {
  nameLength: 60,
  notesLength: 500,
  mealNameLength: 40,
  meals: 10,
  itemsPerMeal: 40,
  quantity: { min: 0.01, max: 10000 },
}

export const WATER_STEPS_ML = [250, 500]
