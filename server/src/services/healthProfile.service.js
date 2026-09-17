import {
  ACTIVITY_LEVELS,
  ALCOHOL_FREQUENCIES,
  DIETARY_PREFERENCES,
  GOALS,
  HealthProfile,
  SEXES,
  SMOKING_STATUSES,
} from '../models/healthProfile.model.js';
import {
  formatDate,
  parseDate,
  parseEnum,
  parseEnumList,
  parseNumber,
  parseText,
  parseTextList,
  yearsAgo,
} from './validation.js';

const LIST_LIMITS = { maxItems: 30, maxLength: 100 };

// One parser per editable field. A field missing from the request is left unchanged
const FIELD_PARSERS = {
  sex: (value) => parseEnum(value, 'sex', SEXES),
  dateOfBirth: (value) => parseDate(value, 'dateOfBirth', { min: yearsAgo(120), max: yearsAgo(10) }),
  heightCm: (value) => parseNumber(value, 'heightCm', { min: 50, max: 260 }),
  activityLevel: (value) => parseEnum(value, 'activityLevel', ACTIVITY_LEVELS),
  goal: (value) => parseEnum(value, 'goal', GOALS),
  targetWeightKg: (value) => parseNumber(value, 'targetWeightKg', { min: 20, max: 400 }),
  sleepHours: (value) => parseNumber(value, 'sleepHours', { min: 0, max: 24 }),
  smoking: (value) => parseEnum(value, 'smoking', SMOKING_STATUSES),
  alcohol: (value) => parseEnum(value, 'alcohol', ALCOHOL_FREQUENCIES),
  conditions: (value) => parseTextList(value, 'conditions', LIST_LIMITS),
  injuries: (value) => parseTextList(value, 'injuries', LIST_LIMITS),
  medications: (value) => parseTextList(value, 'medications', LIST_LIMITS),
  supplements: (value) => parseTextList(value, 'supplements', LIST_LIMITS),
  allergies: (value) => parseTextList(value, 'allergies', LIST_LIMITS),
  dietaryPreferences: (value) => parseEnumList(value, 'dietaryPreferences', DIETARY_PREFERENCES),
  notes: (value) => parseText(value, 'notes', 1000),
};

const LIST_FIELDS = ['conditions', 'injuries', 'medications', 'supplements', 'allergies', 'dietaryPreferences'];

export const HEALTH_FIELDS = Object.keys(FIELD_PARSERS);

// Every field is present in the response: null / [] when not filled in
function toPublicHealthProfile(profile) {
  return Object.fromEntries(
    HEALTH_FIELDS.map((field) => {
      const value = profile?.[field];
      if (field === 'dateOfBirth') return [field, formatDate(value)];
      if (LIST_FIELDS.includes(field)) return [field, value ?? []];
      return [field, value ?? null];
    }),
  );
}

// Validates every field first, so nothing is saved when one field is invalid
export function parseHealthUpdate(input) {
  const set = {};
  const unset = {};
  for (const [field, parse] of Object.entries(FIELD_PARSERS)) {
    if (!(field in input)) continue;
    const value = parse(input[field]);
    if (value === null) unset[field] = 1;
    else set[field] = value;
  }
  return { set, unset };
}

export async function getHealthProfile(userId) {
  return toPublicHealthProfile(await HealthProfile.findOne({ user: userId }).lean());
}

export async function saveHealthUpdate(userId, { set, unset }) {
  const profile = await HealthProfile.findOneAndUpdate(
    { user: userId },
    {
      $set: set,
      $setOnInsert: { user: userId },
      ...(Object.keys(unset).length && { $unset: unset }),
    },
    { upsert: true, returnDocument: 'after', lean: true },
  );
  return toPublicHealthProfile(profile);
}

export async function updateHealthProfile(userId, input) {
  return saveHealthUpdate(userId, parseHealthUpdate(input));
}
