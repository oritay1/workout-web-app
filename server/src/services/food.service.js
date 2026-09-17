import mongoose from 'mongoose';
import { HEBREW_SEARCH_SYNONYMS } from '../data/foodSearchSynonyms.js';
import { FOOD_CATEGORIES, FOOD_NAME_COLLATION, Food, NUTRIENT_FIELDS } from '../models/food.model.js';
import { HttpError } from '../middlewares/errorHandler.js';
import { invalidField, isBlank, parseEnum, parseInteger, parseNumber, parseText } from './validation.js';

const LIMITS = {
  nameLength: 80,
  brandLength: 60,
  queryLength: 60,
  portionLabelLength: 40,
  portions: 10,
  portionAmount: { min: 0.1, max: 5000 },
  pageSize: { min: 1, max: 50 },
  maxOffset: 2000,
  // Matches considered for ranking in one search
  candidates: 600,
};

// Per 100 g / 100 ml. Energy + the three macros are required for custom foods
const NUTRIENT_LIMITS = {
  energyKcal: { min: 0, max: 1000, required: true },
  proteinG: { min: 0, max: 100, required: true },
  carbsG: { min: 0, max: 100, required: true },
  fatG: { min: 0, max: 100, required: true },
  fiberG: { min: 0, max: 100 },
  sugarsG: { min: 0, max: 100 },
  saturatedFatG: { min: 0, max: 100 },
  cholesterolMg: { min: 0, max: 5000 },
  sodiumMg: { min: 0, max: 50000 },
  potassiumMg: { min: 0, max: 20000 },
  calciumMg: { min: 0, max: 10000 },
  ironMg: { min: 0, max: 1000 },
};

// Hebrew one-letter prefixes (ה, ו, ב, ל, מ, ש, כ) are stripped when looking up synonyms: "והעוף" -> "עוף"
const HEBREW_PREFIXES = /^[הובלמשכ]+/;
// Plural/feminine endings, so "עגבניות" and "ביצים" match the dictionary's "עגבנייה" and "ביצה"
const hebrewStem = (word) => (word.length > 3 ? word.replace(/(יות|ות|ים|ייה|יה|ה)$/, '') : word);

const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const isPlainObject = (value) => typeof value === 'object' && value !== null && !Array.isArray(value);

export function toPublicFood(food) {
  const isCustom = food.source === 'custom';
  const names = food.names instanceof Map ? Object.fromEntries(food.names) : food.names;
  return {
    id: food._id.toString(),
    source: food.source,
    isCustom,
    ...(isCustom ? { name: food.name, brand: food.brand ?? null } : { names, fdcId: food.fdcId, usdaDataType: food.usdaDataType }),
    category: food.category,
    basis: food.basis,
    isLiquid: Boolean(food.isLiquid),
    isFeatured: Boolean(food.isFeatured),
    nutrients: Object.fromEntries(NUTRIENT_FIELDS.map((field) => [field, food.nutrients?.[field] ?? null])),
    portions: (food.portions ?? []).map(({ label, amount }) => ({ label, amount })),
    isArchived: Boolean(food.isArchived),
  };
}

// ---------- Search ----------

function wordPattern(text, wholeWord) {
  const ending = wholeWord ? '(s|es)?(?![a-z])' : '';
  return new RegExp(`(^|[\\s,(/-])${escapeRegex(text)}${ending}`, 'i');
}

// English words from the Hebrew synonyms dictionary for one query word
function searchAlternatives(word) {
  const alternatives = new Set();
  const stripped = word.replace(HEBREW_PREFIXES, '');
  for (const [hebrew, english] of Object.entries(HEBREW_SEARCH_SYNONYMS)) {
    const matches =
      word.startsWith(hebrew) ||
      (stripped.length > 1 && stripped.startsWith(hebrew)) ||
      (word.length >= 3 && hebrew.startsWith(word)) ||
      (word.length >= 3 && hebrewStem(word) === hebrewStem(hebrew));
    if (matches) english.forEach((item) => alternatives.add(item));
  }
  return [...alternatives];
}

function displayName(food, language) {
  if (food.source === 'custom') return food.name;
  return food.names?.[language] ?? food.names?.en ?? '';
}

// Higher is better: the user's own foods, curated staples, names that start with the query, short names
function score(food, query, language) {
  const name = displayName(food, language).toLowerCase();
  const english = (food.names?.en ?? food.name ?? '').toLowerCase();
  let value = 0;
  if (food.source === 'custom') value += 100;
  if (food.isFeatured) value += 60;
  if (query && (name.startsWith(query) || english.startsWith(query))) value += 50;
  if (query && (name.split(/[\s,]+/).includes(query) || english.split(/[\s,]+/)[0] === query)) value += 20;
  return value - name.length / 10;
}

function parseSearchQuery(query) {
  const text = typeof query.q === 'string' ? query.q.trim().toLowerCase().slice(0, LIMITS.queryLength) : '';
  const category = parseEnum(query.category, 'category', FOOD_CATEGORIES);
  const source = parseEnum(query.source, 'source', ['usda', 'custom']);
  const limit = isBlank(query.limit) ? 20 : parseInteger(Number(query.limit), 'limit', LIMITS.pageSize);
  const offset = isBlank(query.offset) ? 0 : parseInteger(Number(query.offset), 'offset', { min: 0, max: LIMITS.maxOffset });
  const language = query.language === 'he' ? 'he' : 'en';
  return { text, category, source, limit, offset, language };
}

// Searches USDA foods and the user's custom foods. Without a query (and no filter) it lists the
// user's foods and the curated staples
export async function searchFoods(userId, rawQuery) {
  const { text, category, source, limit, offset, language } = parseSearchQuery(rawQuery);

  const filter = { owner: { $in: [null, userId] }, isArchived: false };
  if (category) filter.category = category;
  if (source) filter.source = source;

  const words = text.split(/\s+/).filter(Boolean);
  if (words.length) {
    filter.$and = words.map((word) => ({
      $or: [
        // What the user typed matches the start of a word, so partial typing works ("chick" -> "Chicken")
        wordPattern(word, false),
        // Dictionary translations must be whole words ("ביצה" -> "egg" must not find "Eggplant")
        ...searchAlternatives(word).map((alternative) => wordPattern(alternative, true)),
      ].flatMap((pattern) => [{ 'names.en': pattern }, { 'names.he': pattern }, { name: pattern }, { brand: pattern }]),
    }));
  } else if (!category && !source) {
    filter.$or = [{ source: 'custom' }, { isFeatured: true }];
  }

  const candidates = await Food.find(filter).limit(LIMITS.candidates).lean();
  const collator = new Intl.Collator(language);
  const byName = (a, b) => collator.compare(displayName(a.food, language), displayName(b.food, language));
  // Browsing (no query): custom foods, then staples, then the rest, each alphabetically
  const ranked = candidates
    .map((food) => ({ food, rank: text ? score(food, text, language) : (food.source === 'custom' ? 2 : 0) + (food.isFeatured ? 1 : 0) }))
    .sort((a, b) => b.rank - a.rank || byName(a, b));

  return {
    foods: ranked.slice(offset, offset + limit).map(({ food }) => toPublicFood(food)),
    hasMore: ranked.length > offset + limit,
  };
}

// ---------- Single food ----------

export async function getFood(userId, id) {
  const food = mongoose.isValidObjectId(id) && (await Food.findOne({ _id: id, owner: { $in: [null, userId] } }).lean());
  if (!food) throw new HttpError(404, 'FOOD_NOT_FOUND');
  return toPublicFood(food);
}

// ---------- Custom foods ----------

function parseNutrients(input, partial) {
  if (!isPlainObject(input)) throw invalidField('nutrients');
  const nutrients = {};
  for (const [field, limits] of Object.entries(NUTRIENT_LIMITS)) {
    const value = parseNumber(input[field], `nutrients.${field}`, limits);
    if (value === null && limits.required && !partial) throw invalidField(`nutrients.${field}`);
    if (value !== null) nutrients[field] = value;
  }
  // Protein, carbs and fat are parts of the same 100 g
  if ((nutrients.proteinG ?? 0) + (nutrients.carbsG ?? 0) + (nutrients.fatG ?? 0) > 100) {
    throw new HttpError(400, 'MACROS_EXCEED_100', { field: 'nutrients.fatG' });
  }
  return nutrients;
}

function parsePortions(input) {
  if (isBlank(input)) return [];
  if (!Array.isArray(input) || input.length > LIMITS.portions) throw invalidField('portions');
  return input.map((portion, index) => {
    const path = `portions.${index}`;
    if (!isPlainObject(portion)) throw invalidField(path);
    const label = parseText(portion.label, `${path}.label`, LIMITS.portionLabelLength);
    const amount = parseNumber(portion.amount, `${path}.amount`, LIMITS.portionAmount);
    if (!label) throw invalidField(`${path}.label`);
    if (amount === null) throw invalidField(`${path}.amount`);
    return { label, amount };
  });
}

function parseCustomFood(input, { partial }) {
  if (!isPlainObject(input)) throw invalidField('food');
  const has = (field) => !partial || field in input;
  const fields = {};
  if (has('name')) {
    fields.name = parseText(input.name, 'name', LIMITS.nameLength);
    if (!fields.name) throw invalidField('name');
  }
  if (has('brand')) fields.brand = parseText(input.brand, 'brand', LIMITS.brandLength);
  if (has('category')) {
    fields.category = parseEnum(input.category, 'category', FOOD_CATEGORIES);
    if (!fields.category) throw invalidField('category');
  }
  if (has('basis')) {
    fields.basis = parseEnum(input.basis, 'basis', ['g', 'ml']);
    if (!fields.basis) throw invalidField('basis');
    fields.isLiquid = fields.basis === 'ml';
  }
  // Nutrients are always replaced as a whole
  if (has('nutrients')) fields.nutrients = parseNutrients(input.nutrients, false);
  if (has('portions')) fields.portions = parsePortions(input.portions);
  return fields;
}

async function assertNameAvailable(userId, name, exceptId) {
  const taken = await Food.exists({
    owner: userId,
    name,
    isArchived: false,
    ...(exceptId && { _id: { $ne: exceptId } }),
  }).collation(FOOD_NAME_COLLATION);
  if (taken) throw new HttpError(409, 'FOOD_NAME_TAKEN', { field: 'name' });
}

const toDuplicateNameError = (err) =>
  err.code === 11000 ? new HttpError(409, 'FOOD_NAME_TAKEN', { field: 'name' }) : err;

export async function createFood(userId, input) {
  const fields = parseCustomFood(input, { partial: false });
  await assertNameAvailable(userId, fields.name);
  try {
    const food = await Food.create({ ...fields, brand: fields.brand ?? undefined, source: 'custom', owner: userId });
    return toPublicFood(food);
  } catch (err) {
    throw toDuplicateNameError(err);
  }
}

async function findOwnFood(userId, id) {
  const food =
    mongoose.isValidObjectId(id) && (await Food.findOne({ _id: id, owner: userId, source: 'custom', isArchived: false }));
  if (!food) throw new HttpError(404, 'FOOD_NOT_FOUND');
  return food;
}

export async function updateFood(userId, id, input) {
  const food = await findOwnFood(userId, id);
  const fields = parseCustomFood(input, { partial: true });
  if (fields.name) await assertNameAvailable(userId, fields.name, food._id);
  const { brand, ...rest } = fields;
  food.set(rest);
  if ('brand' in fields) food.brand = brand ?? undefined;
  try {
    return toPublicFood(await food.save());
  } catch (err) {
    throw toDuplicateNameError(err);
  }
}

// Archived, not deleted: diet plans and logs that use the food keep working
export async function deleteFood(userId, id) {
  const food = await findOwnFood(userId, id);
  food.isArchived = true;
  await food.save();
}
