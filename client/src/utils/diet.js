import { DEFAULT_MEALS } from '../constants/diet.js'
import { scaleNutrient } from './foods.js'

// grams/ml for a quantity of a food: portionLabel null = quantity is already grams/ml
export function servingAmount(food, quantity, portionLabel) {
  const count = Number(quantity)
  if (!Number.isFinite(count) || count <= 0) return 0
  if (!portionLabel) return count
  const portion = food.portions.find((item) => item.label === portionLabel)
  return portion ? count * portion.amount : 0
}

const MACROS = ['energyKcal', 'proteinG', 'carbsG', 'fatG']

export function servingNutrients(food, amount) {
  return Object.fromEntries(MACROS.map((field) => [field, scaleNutrient(food.nutrients[field], amount) ?? 0]))
}

export function sumMacros(list) {
  return Object.fromEntries(MACROS.map((field) => [field, list.reduce((sum, item) => sum + (item?.[field] ?? 0), 0)]))
}

export function mealLabel(meal, t) {
  return DEFAULT_MEALS.includes(meal) ? t(`nutrition.meals.${meal}`) : meal
}

// [{ value, label }] for a meal <select>
export function toMealSelectOptions(meals, t) {
  return meals.map((meal) => ({ value: meal, label: mealLabel(meal, t) }))
}

// Meals to log into: the active plan's meals, or breakfast/lunch/dinner/snacks
export function mealOptions(activePlan) {
  return activePlan?.meals.length ? activePlan.meals.map((meal) => meal.name) : DEFAULT_MEALS
}

// Best guess for "which meal am I logging now"
export function defaultMealFor(activePlan, now = new Date()) {
  const minutes = now.getHours() * 60 + now.getMinutes()
  if (activePlan?.meals.length) {
    const timed = activePlan.meals
      .filter((meal) => meal.time)
      .map((meal) => ({ name: meal.name, minutes: Number(meal.time.slice(0, 2)) * 60 + Number(meal.time.slice(3)) }))
      .filter((meal) => meal.minutes <= minutes + 30)
    return timed.length ? timed.at(-1).name : activePlan.meals[0].name
  }
  const hour = now.getHours()
  return hour < 11 ? 'breakfast' : hour < 16 ? 'lunch' : hour < 21 ? 'dinner' : 'snacks'
}

// ---------- Suggested daily targets from the health profile ----------

const ACTIVITY_FACTORS = { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, veryActive: 1.9 }
const GOAL_CALORIE_FACTORS = { loseFat: 0.8, buildMuscle: 1.1, maintain: 1, performance: 1.05, generalHealth: 1 }
const PROTEIN_PER_KG = { loseFat: 2, buildMuscle: 1.8, maintain: 1.4, performance: 1.6, generalHealth: 1.2 }
const FAT_SHARE = 0.25

function ageFrom(dateOfBirth, now = new Date()) {
  const birth = new Date(`${dateOfBirth}T00:00:00`)
  let age = now.getFullYear() - birth.getFullYear()
  if (now < new Date(now.getFullYear(), birth.getMonth(), birth.getDate())) age -= 1
  return age
}

// Mifflin-St Jeor BMR x activity factor, adjusted for the goal. Returns { targets } or { missing: [fields] }
export function suggestTargets(health, weightKg) {
  const missing = ['sex', 'dateOfBirth', 'heightCm'].filter((field) => !health?.[field])
  if (!weightKg) missing.push('weight')
  if (missing.length) return { missing }

  const age = ageFrom(health.dateOfBirth)
  const bmr = 10 * weightKg + 6.25 * health.heightCm - 5 * age + (health.sex === 'male' ? 5 : -161)
  const goal = health.goal ?? 'maintain'
  const energyKcal = Math.round((bmr * ACTIVITY_FACTORS[health.activityLevel ?? 'light'] * GOAL_CALORIE_FACTORS[goal]) / 10) * 10
  const proteinG = Math.round(weightKg * PROTEIN_PER_KG[goal])
  const fatG = Math.round((energyKcal * FAT_SHARE) / 9)
  const carbsG = Math.max(0, Math.round((energyKcal - proteinG * 4 - fatG * 9) / 4))
  const waterMl = Math.round((weightKg * 35) / 100) * 100
  return { targets: { energyKcal, proteinG, carbsG, fatG, waterMl } }
}
