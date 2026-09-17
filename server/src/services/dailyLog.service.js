import mongoose from 'mongoose';
import { DailyLog } from '../models/dailyLog.model.js';
import { DietPlan } from '../models/dietPlan.model.js';
import { HttpError } from '../middlewares/errorHandler.js';
import { getActivePlan, publicTargets } from './dietPlan.service.js';
import { findUsableFoods, toPublicFood } from './food.service.js';
import { nutrientsFor, parseServing, sumNutrients } from './nutrition.js';
import { invalidField, latestAllowedDate, parseDate, parseNumber, parseText } from './validation.js';

const LIMITS = {
  entriesPerDay: 200,
  mealLength: 40,
  waterMl: { min: 0, max: 20000 },
};
const EARLIEST_DATE = new Date('2000-01-01T00:00:00.000Z');

function parseDay(date) {
  // Validates "YYYY-MM-DD"; the string itself is the key
  if (!parseDate(date, 'date', { min: EARLIEST_DATE, max: latestAllowedDate() })) throw invalidField('date');
  return date;
}

function parseMeal(meal) {
  const value = parseText(meal, 'meal', LIMITS.mealLength);
  if (!value) throw invalidField('meal');
  return value;
}

// Full day view: the log (or an empty day using the active plan's goals) + the active plan
async function buildDay(userId, date, log) {
  const activePlan = await getActivePlan(userId);
  const ids = log?.entries.map((entry) => entry.food) ?? [];
  const foods = await findUsableFoods(userId, ids, ids);

  const entries = (log?.entries ?? [])
    .filter((entry) => foods.has(entry.food.toString()))
    .map((entry) => ({
      id: entry._id.toString(),
      food: toPublicFood(foods.get(entry.food.toString())),
      quantity: entry.quantity,
      portionLabel: entry.portionLabel ?? null,
      amount: entry.amount,
      meal: entry.meal,
      planItemId: entry.planItem ? entry.planItem.toString() : null,
      nutrients: entry.nutrients,
      loggedAt: entry.loggedAt,
    }));

  // A day logged while no plan was active simply follows the active plan (nothing to preserve)
  const usesSnapshot = Boolean(log?.targetsSyncedAt && log.plan);
  const planChanged =
    usesSnapshot &&
    Boolean(activePlan) &&
    (String(log.plan) !== activePlan.id || new Date(activePlan.updatedAt) > log.targetsSyncedAt);

  return {
    date,
    planId: usesSnapshot ? (log.plan ? log.plan.toString() : null) : (activePlan?.id ?? null),
    planName: usesSnapshot ? (log.planName ?? null) : (activePlan?.name ?? null),
    targets: usesSnapshot ? publicTargets(log.targets) : (activePlan?.targets ?? publicTargets({})),
    planChanged,
    waterMl: log?.waterMl ?? 0,
    entries,
    totals: sumNutrients(entries.map((entry) => entry.nutrients)),
    activePlan,
  };
}

// Creates the day's log on first write, copying the active plan's goals
async function findOrCreateLog(userId, date) {
  const existing = await DailyLog.findOne({ owner: userId, date });
  const plan = await DietPlan.findOne({ owner: userId, isActive: true }).lean();
  if (existing) {
    // First write since a plan was activated on a day that had none: take its goals now
    if (!existing.plan && plan) {
      Object.assign(existing, { plan: plan._id, planName: plan.name, targets: plan.targets ?? {}, targetsSyncedAt: new Date() });
    }
    return existing;
  }
  try {
    return await DailyLog.create({
      owner: userId,
      date,
      plan: plan?._id ?? null,
      planName: plan?.name,
      targets: plan?.targets ?? {},
      targetsSyncedAt: new Date(),
    });
  } catch (err) {
    // Created by a parallel request
    if (err.code === 11000) return DailyLog.findOne({ owner: userId, date });
    throw err;
  }
}

export async function getDay(userId, rawDate) {
  const date = parseDay(rawDate);
  return buildDay(userId, date, await DailyLog.findOne({ owner: userId, date }).lean());
}

async function createEntry(userId, input, foods, path = 'entry') {
  const food = foods.get(String(input.foodId));
  if (!food) throw invalidField(`${path}.foodId`);
  const serving = parseServing(input, food, path);
  return {
    food: food._id,
    ...serving,
    meal: parseMeal(input.meal),
    planItem: mongoose.isValidObjectId(input.planItemId) ? new mongoose.Types.ObjectId(String(input.planItemId)) : null,
    nutrients: nutrientsFor(food, serving.amount),
  };
}

export async function addEntry(userId, rawDate, input) {
  const date = parseDay(rawDate);
  if (typeof input !== 'object' || input === null || !mongoose.isValidObjectId(input.foodId)) throw invalidField('foodId');
  const foods = await findUsableFoods(userId, [String(input.foodId)]);
  const entry = await createEntry(userId, input, foods);

  const log = await findOrCreateLog(userId, date);
  if (log.entries.length >= LIMITS.entriesPerDay) throw new HttpError(400, 'DAY_FULL');
  log.entries.push(entry);
  await log.save();
  return buildDay(userId, date, log);
}

// Adds every item of a meal from the active plan that isn't logged yet today
export async function addPlanMeal(userId, rawDate, mealId) {
  const date = parseDay(rawDate);
  const plan = await DietPlan.findOne({ owner: userId, isActive: true }).lean();
  const meal = plan?.meals.find((item) => item._id.toString() === String(mealId));
  if (!meal) throw new HttpError(404, 'MEAL_NOT_FOUND');

  const log = await findOrCreateLog(userId, date);
  const logged = new Set(log.entries.filter((entry) => entry.planItem).map((entry) => entry.planItem.toString()));
  const missing = meal.items.filter((item) => !logged.has(item._id.toString()));
  if (log.entries.length + missing.length > LIMITS.entriesPerDay) throw new HttpError(400, 'DAY_FULL');

  const ids = missing.map((item) => item.food);
  const foods = await findUsableFoods(userId, ids, ids);
  for (const item of missing) {
    if (!foods.has(item.food.toString())) continue;
    log.entries.push(
      await createEntry(
        userId,
        { foodId: item.food, quantity: item.quantity, portionLabel: item.portionLabel, meal: meal.name, planItemId: item._id },
        foods,
      ),
    );
  }
  await log.save();
  return buildDay(userId, date, log);
}

async function findLogWithEntry(userId, date, entryId) {
  const log = await DailyLog.findOne({ owner: userId, date });
  const entry = mongoose.isValidObjectId(entryId) && log?.entries.id(entryId);
  if (!entry) throw new HttpError(404, 'ENTRY_NOT_FOUND');
  return { log, entry };
}

// Change quantity/portion/meal of a logged entry (nutrients are recalculated from the food)
export async function updateEntry(userId, rawDate, entryId, input) {
  const date = parseDay(rawDate);
  const { log, entry } = await findLogWithEntry(userId, date, entryId);
  if (typeof input !== 'object' || input === null) throw invalidField('entry');

  const foods = await findUsableFoods(userId, [entry.food], [entry.food]);
  const food = foods.get(entry.food.toString());
  const serving = parseServing(
    { quantity: input.quantity ?? entry.quantity, portionLabel: 'portionLabel' in input ? input.portionLabel : entry.portionLabel },
    food,
    'entry',
  );
  Object.assign(entry, serving, { nutrients: nutrientsFor(food, serving.amount) });
  if ('meal' in input) entry.meal = parseMeal(input.meal);
  await log.save();
  return buildDay(userId, date, log);
}

export async function deleteEntry(userId, rawDate, entryId) {
  const date = parseDay(rawDate);
  const { log, entry } = await findLogWithEntry(userId, date, entryId);
  entry.deleteOne();
  await log.save();
  return buildDay(userId, date, log);
}

export async function setWater(userId, rawDate, input) {
  const date = parseDay(rawDate);
  const waterMl = parseNumber(input?.waterMl, 'waterMl', LIMITS.waterMl);
  if (waterMl === null) throw invalidField('waterMl');
  const log = await findOrCreateLog(userId, date);
  log.waterMl = Math.round(waterMl);
  await log.save();
  return buildDay(userId, date, log);
}

// Replaces the day's goals with the active plan's current goals
export async function syncTargets(userId, rawDate) {
  const date = parseDay(rawDate);
  const log = await findOrCreateLog(userId, date);
  const plan = await DietPlan.findOne({ owner: userId, isActive: true }).lean();
  log.plan = plan?._id ?? null;
  log.planName = plan?.name;
  log.targets = plan?.targets ?? {};
  log.targetsSyncedAt = new Date();
  await log.save();
  return buildDay(userId, date, log);
}
