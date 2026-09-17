// Builds server/src/data/usdaFoods.json.gz from USDA FoodData Central bulk downloads (public domain, CC0).
//
// 1. Download the JSON zips from https://fdc.nal.usda.gov/download-datasets:
//    "Foundation Foods" (latest) and "SR Legacy" (2018-04), and unzip them.
// 2. node --max-old-space-size=4096 scripts/build-usda-foods.js <foundation.json> <sr_legacy.json>
//
// Keeps only what the app uses: name, category, macros and a few key micronutrients per 100 g,
// and household portions ("1 cup = 244 g").
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const [foundationPath, srLegacyPath] = process.argv.slice(2);
if (!foundationPath || !srLegacyPath) {
  console.error('Usage: node scripts/build-usda-foods.js <foundation.json> <sr_legacy.json>');
  process.exit(1);
}

const OUTPUT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../src/data/usdaFoods.json.gz');

// USDA category name -> our category key (null = not imported)
const CATEGORIES = {
  'Dairy and Egg Products': 'dairyEggs',
  'Spices and Herbs': 'spicesHerbs',
  'Baby Foods': null,
  'Fats and Oils': 'fatsOils',
  'Poultry Products': 'poultry',
  'Soups, Sauces, and Gravies': 'soupsSauces',
  'Sausages and Luncheon Meats': 'sausagesDeli',
  'Breakfast Cereals': 'breakfastCereals',
  'Fruits and Fruit Juices': 'fruits',
  'Pork Products': 'pork',
  'Vegetables and Vegetable Products': 'vegetables',
  'Nut and Seed Products': 'nutsSeeds',
  'Beef Products': 'beef',
  Beverages: 'beverages',
  'Finfish and Shellfish Products': 'fishSeafood',
  'Legumes and Legume Products': 'legumes',
  'Lamb, Veal, and Game Products': 'lambVealGame',
  'Baked Products': 'bakedGoods',
  Sweets: 'sweets',
  'Cereal Grains and Pasta': 'grainsPasta',
  'Fast Foods': 'fastFood',
  'Meals, Entrees, and Side Dishes': 'meals',
  Snacks: 'snacks',
  'American Indian/Alaska Native Foods': null,
  'Restaurant Foods': 'restaurant',
};

// USDA nutrient id(s) -> our field. The first id with a value wins (Foundation foods store energy under 2047/2048)
const NUTRIENTS = {
  energyKcal: [1008, 2048, 2047],
  proteinG: [1003],
  carbsG: [1005],
  fatG: [1004],
  fiberG: [1079],
  sugarsG: [2000, 1063],
  saturatedFatG: [1258],
  cholesterolMg: [1253],
  sodiumMg: [1093],
  potassiumMg: [1092],
  calciumMg: [1087],
  ironMg: [1089],
};
const REQUIRED = ['energyKcal', 'proteinG', 'carbsG', 'fatG'];
const MAX_PORTIONS = 6;

const round = (value) => Math.round(value * 100) / 100;

function readFoods(file, key) {
  return JSON.parse(fs.readFileSync(file, 'utf8'))[key].filter((food) => food && typeof food === 'object');
}

function toNutrients(food) {
  const amounts = new Map(
    food.foodNutrients.filter((item) => typeof item.amount === 'number').map((item) => [item.nutrient.id, item.amount]),
  );
  const nutrients = {};
  for (const [field, ids] of Object.entries(NUTRIENTS)) {
    const id = ids.find((candidate) => amounts.has(candidate));
    if (id !== undefined) nutrients[field] = round(amounts.get(id));
  }
  return nutrients;
}

function portionLabel(portion) {
  const amount = portion.amount ?? portion.value ?? 1;
  const unit = portion.measureUnit?.name;
  const modifier = (portion.modifier ?? '').trim();
  // SR Legacy puts the unit in `modifier` ("cup, chopped"); Foundation uses measureUnit (+ optional modifier)
  const parts = unit && unit !== 'undetermined' ? [unit, modifier].filter(Boolean).join(', ') : modifier;
  return parts ? `${round(amount)} ${parts}` : null;
}

function toPortions(food) {
  const seen = new Set();
  const portions = [];
  for (const portion of food.foodPortions ?? []) {
    // RACC is a regulatory reference amount, not a household measure
    if (portion.measureUnit?.name === 'RACC' || !(portion.gramWeight > 0)) continue;
    const label = portionLabel(portion);
    if (!label || seen.has(label)) continue;
    seen.add(label);
    portions.push({ label, grams: round(portion.gramWeight) });
    if (portions.length === MAX_PORTIONS) break;
  }
  return portions;
}

function convert(food, dataType) {
  const category = CATEGORIES[food.foodCategory?.description];
  if (!category) return null;
  const nutrients = toNutrients(food);
  if (REQUIRED.some((field) => nutrients[field] === undefined)) return null;
  return {
    fdcId: food.fdcId,
    dataType,
    name: food.description.trim(),
    category,
    isLiquid: category === 'beverages',
    nutrients,
    portions: toPortions(food),
  };
}

const foods = [
  ...readFoods(foundationPath, 'FoundationFoods').map((food) => convert(food, 'foundation')),
  ...readFoods(srLegacyPath, 'SRLegacyFoods').map((food) => convert(food, 'srLegacy')),
]
  .filter(Boolean)
  .sort((a, b) => a.fdcId - b.fdcId);

const json = JSON.stringify(foods);
fs.writeFileSync(OUTPUT, zlib.gzipSync(json, { level: 9 }));
const byType = foods.reduce((counts, food) => ({ ...counts, [food.dataType]: (counts[food.dataType] ?? 0) + 1 }), {});
console.log(`Wrote ${foods.length} foods (${JSON.stringify(byType)}) to ${OUTPUT}`);
console.log(`JSON ${(json.length / 1e6).toFixed(1)} MB, gzipped ${(fs.statSync(OUTPUT).size / 1e6).toFixed(2)} MB`);
