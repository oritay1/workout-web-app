// Mirrors server/src/models/food.model.js and food.service.js. Labels live in the locale files under foods.*
export const FOOD_CATEGORIES = [
  'dairyEggs',
  'poultry',
  'beef',
  'pork',
  'lambVealGame',
  'sausagesDeli',
  'fishSeafood',
  'legumes',
  'nutsSeeds',
  'grainsPasta',
  'bakedGoods',
  'breakfastCereals',
  'vegetables',
  'fruits',
  'fatsOils',
  'soupsSauces',
  'spicesHerbs',
  'sweets',
  'snacks',
  'beverages',
  'meals',
  'fastFood',
  'restaurant',
  'supplements',
  'other',
]

// Per 100 g / 100 ml. `main` nutrients are required for custom foods and shown first
export const NUTRIENTS = [
  { field: 'energyKcal', unit: 'kcal', min: 0, max: 1000, main: true },
  { field: 'proteinG', unit: 'g', min: 0, max: 100, main: true },
  { field: 'carbsG', unit: 'g', min: 0, max: 100, main: true },
  { field: 'fatG', unit: 'g', min: 0, max: 100, main: true },
  { field: 'fiberG', unit: 'g', min: 0, max: 100 },
  { field: 'sugarsG', unit: 'g', min: 0, max: 100 },
  { field: 'saturatedFatG', unit: 'g', min: 0, max: 100 },
  { field: 'cholesterolMg', unit: 'mg', min: 0, max: 5000 },
  { field: 'sodiumMg', unit: 'mg', min: 0, max: 50000 },
  { field: 'potassiumMg', unit: 'mg', min: 0, max: 20000 },
  { field: 'calciumMg', unit: 'mg', min: 0, max: 10000 },
  { field: 'ironMg', unit: 'mg', min: 0, max: 1000 },
]

export const FOOD_LIMITS = {
  nameLength: 80,
  brandLength: 60,
  portions: 10,
  portionLabelLength: 40,
  portionAmount: { min: 0.1, max: 5000 },
  pageSize: 20,
}

export const SEARCH_DEBOUNCE_MS = 300
