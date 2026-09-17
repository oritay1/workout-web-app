import mongoose from 'mongoose';
import { DietPlan, TARGET_FIELDS } from '../models/dietPlan.model.js';
import { HttpError } from '../middlewares/errorHandler.js';
import { findUsableFoods, toPublicFood } from './food.service.js';
import { nutrientsFor, parseServing, sumNutrients } from './nutrition.js';
import { invalidField, parseNumber, parseText } from './validation.js';

const LIMITS = {
  nameLength: 60,
  notesLength: 500,
  mealNameLength: 40,
  meals: 10,
  itemsPerMeal: 40,
};

export const TARGET_LIMITS = {
  energyKcal: { min: 500, max: 10000 },
  proteinG: { min: 0, max: 1000 },
  carbsG: { min: 0, max: 2000 },
  fatG: { min: 0, max: 1000 },
  waterMl: { min: 0, max: 10000 },
};

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
const isPlainObject = (value) => typeof value === 'object' && value !== null && !Array.isArray(value);

export function publicTargets(targets) {
  return Object.fromEntries(TARGET_FIELDS.map((field) => [field, targets?.[field] ?? null]));
}

function parseTargets(input) {
  if (input === undefined || input === null) return {};
  if (!isPlainObject(input)) throw invalidField('targets');
  const targets = {};
  for (const field of TARGET_FIELDS) {
    const value = parseNumber(input[field], `targets.${field}`, TARGET_LIMITS[field]);
    if (value !== null) targets[field] = value;
  }
  return targets;
}

const parseId = (id) =>
  mongoose.isValidObjectId(id) ? new mongoose.Types.ObjectId(String(id)) : new mongoose.Types.ObjectId();

async function parsePlan(userId, input, existingPlan) {
  if (!isPlainObject(input)) throw invalidField('plan');
  const name = parseText(input.name, 'name', LIMITS.nameLength);
  if (!name) throw invalidField('name');
  const notes = parseText(input.notes, 'notes', LIMITS.notesLength);
  const targets = parseTargets(input.targets);

  const mealsInput = input.meals ?? [];
  if (!Array.isArray(mealsInput) || mealsInput.length > LIMITS.meals) throw invalidField('meals');
  const foodIds = [];
  mealsInput.forEach((meal, mealIndex) => {
    const items = meal?.items ?? [];
    if (!isPlainObject(meal) || !Array.isArray(items) || items.length > LIMITS.itemsPerMeal) {
      throw invalidField(`meals.${mealIndex}.items`);
    }
    items.forEach((item, itemIndex) => {
      if (!isPlainObject(item) || !mongoose.isValidObjectId(item.foodId)) {
        throw invalidField(`meals.${mealIndex}.items.${itemIndex}.foodId`);
      }
      foodIds.push(String(item.foodId));
    });
  });
  const alreadyInPlan = existingPlan?.meals.flatMap((meal) => meal.items.map((item) => item.food)) ?? [];
  const foods = await findUsableFoods(userId, foodIds, alreadyInPlan);

  const meals = mealsInput.map((meal, mealIndex) => {
    const path = `meals.${mealIndex}`;
    const mealName = parseText(meal.name, `${path}.name`, LIMITS.mealNameLength);
    if (!mealName) throw invalidField(`${path}.name`);
    const time = meal.time === undefined || meal.time === null || meal.time === '' ? null : meal.time;
    if (time !== null && (typeof time !== 'string' || !TIME_PATTERN.test(time))) throw invalidField(`${path}.time`);
    return {
      _id: parseId(meal.id),
      name: mealName,
      ...(time && { time }),
      items: (meal.items ?? []).map((item, itemIndex) => {
        const itemPath = `${path}.items.${itemIndex}`;
        const food = foods.get(String(item.foodId));
        if (!food) throw invalidField(`${itemPath}.foodId`);
        return { _id: parseId(item.id), food: food._id, ...parseServing(item, food, itemPath) };
      }),
    };
  });

  return { name, notes, targets, meals };
}

async function loadPlanFoods(userId, plans) {
  const ids = plans.flatMap((plan) => plan.meals.flatMap((meal) => meal.items.map((item) => item.food)));
  return findUsableFoods(userId, ids, ids);
}

function toPublicPlan(plan, foods, { withItems }) {
  const meals = plan.meals.map((meal) => {
    const items = meal.items
      .filter((item) => foods.has(item.food.toString()))
      .map((item) => {
        const food = foods.get(item.food.toString());
        return {
          id: item._id.toString(),
          food: toPublicFood(food),
          quantity: item.quantity,
          portionLabel: item.portionLabel ?? null,
          amount: item.amount,
          nutrients: nutrientsFor(food, item.amount),
        };
      });
    return {
      id: meal._id.toString(),
      name: meal.name,
      time: meal.time ?? null,
      itemCount: items.length,
      totals: sumNutrients(items.map((item) => item.nutrients)),
      ...(withItems && { items }),
    };
  });
  return {
    id: plan._id.toString(),
    name: plan.name,
    notes: plan.notes ?? null,
    isActive: plan.isActive,
    targets: publicTargets(plan.targets),
    updatedAt: plan.updatedAt,
    totals: sumNutrients(meals.map((meal) => meal.totals)),
    meals,
  };
}

async function findOwnPlan(userId, id) {
  const plan = mongoose.isValidObjectId(id) && (await DietPlan.findOne({ _id: id, owner: userId }));
  if (!plan) throw new HttpError(404, 'DIET_PLAN_NOT_FOUND');
  return plan;
}

export async function listPlans(userId) {
  const plans = await DietPlan.find({ owner: userId }).sort({ isActive: -1, updatedAt: -1 }).lean();
  const foods = await loadPlanFoods(userId, plans);
  return plans.map((plan) => toPublicPlan(plan, foods, { withItems: false }));
}

export async function getPlan(userId, id) {
  const plan = await findOwnPlan(userId, id);
  return toPublicPlan(plan, await loadPlanFoods(userId, [plan]), { withItems: true });
}

// The active plan with its items, or null
export async function getActivePlan(userId) {
  const plan = await DietPlan.findOne({ owner: userId, isActive: true }).lean();
  return plan ? toPublicPlan(plan, await loadPlanFoods(userId, [plan]), { withItems: true }) : null;
}

export async function createPlan(userId, input) {
  const fields = await parsePlan(userId, input);
  const hasActive = await DietPlan.exists({ owner: userId, isActive: true });
  const plan = await DietPlan.create({ ...fields, notes: fields.notes ?? undefined, owner: userId, isActive: !hasActive });
  return toPublicPlan(plan, await loadPlanFoods(userId, [plan]), { withItems: true });
}

export async function replacePlan(userId, id, input) {
  const plan = await findOwnPlan(userId, id);
  const fields = await parsePlan(userId, input, plan);
  plan.set({ ...fields, notes: fields.notes ?? undefined });
  // targets is a nested object; replace it entirely so cleared goals are removed
  plan.targets = fields.targets;
  await plan.save();
  return toPublicPlan(plan, await loadPlanFoods(userId, [plan]), { withItems: true });
}

export async function deletePlan(userId, id) {
  const plan = await findOwnPlan(userId, id);
  await plan.deleteOne();
}

export async function activatePlan(userId, id) {
  const plan = await findOwnPlan(userId, id);
  if (!plan.isActive) {
    await DietPlan.updateMany({ owner: userId, isActive: true }, { isActive: false });
    plan.isActive = true;
    await plan.save();
  }
  return { id: plan._id.toString(), isActive: true };
}
