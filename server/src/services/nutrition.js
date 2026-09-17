import { NUTRIENT_FIELDS } from '../models/food.model.js';
import { invalidField, parseNumber } from './validation.js';

export const QUANTITY_LIMITS = { min: 0.01, max: 10000 };
const MAX_AMOUNT = 20000;

const round = (value, digits = 2) => Math.round(value * 10 ** digits) / 10 ** digits;

// Nutrients for `amount` grams/ml of a food (food values are per 100)
export function nutrientsFor(food, amount) {
  return Object.fromEntries(
    NUTRIENT_FIELDS.filter((field) => typeof food.nutrients?.[field] === 'number').map((field) => [
      field,
      round((food.nutrients[field] * amount) / 100),
    ]),
  );
}

export function sumNutrients(list) {
  const totals = Object.fromEntries(NUTRIENT_FIELDS.map((field) => [field, 0]));
  for (const nutrients of list) {
    for (const field of NUTRIENT_FIELDS) totals[field] += nutrients?.[field] ?? 0;
  }
  return Object.fromEntries(Object.entries(totals).map(([field, value]) => [field, round(value, 1)]));
}

// { quantity, portionLabel } -> { quantity, portionLabel, amount } where amount is in the food's grams/ml.
// portionLabel null means the quantity is already in grams/ml
export function parseServing(input, food, path) {
  const quantity = parseNumber(input.quantity, `${path}.quantity`, QUANTITY_LIMITS);
  if (quantity === null) throw invalidField(`${path}.quantity`);
  const label = input.portionLabel ?? null;
  let amount = quantity;
  if (label !== null) {
    const portion = typeof label === 'string' && food.portions.find((item) => item.label === label);
    if (!portion) throw invalidField(`${path}.portionLabel`);
    amount = quantity * portion.amount;
  }
  if (amount > MAX_AMOUNT) throw invalidField(`${path}.quantity`);
  return { quantity, portionLabel: label, amount: round(amount) };
}
