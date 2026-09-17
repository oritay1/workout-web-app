// Mirrors server/src/models/healthProfile.model.js, measurement.model.js and healthProfile.service.js.
// Labels live in the locale files under health.fields / health.options / units

export const HEALTH_FIELD_DEFS = {
  sex: { kind: 'select', options: ['male', 'female'] },
  dateOfBirth: { kind: 'date', minAgeYears: 10, maxAgeYears: 120 },
  heightCm: { kind: 'number', min: 50, max: 260, step: 0.5, unit: 'cm' },
  activityLevel: { kind: 'select', options: ['sedentary', 'light', 'moderate', 'active', 'veryActive'] },
  goal: { kind: 'select', options: ['loseFat', 'buildMuscle', 'maintain', 'performance', 'generalHealth'] },
  targetWeightKg: { kind: 'number', min: 20, max: 400, step: 0.1, unit: 'kg' },
  sleepHours: { kind: 'number', min: 0, max: 24, step: 0.5, unit: 'hours' },
  smoking: { kind: 'select', options: ['never', 'former', 'current'] },
  alcohol: { kind: 'select', options: ['none', 'occasional', 'weekly', 'daily'] },
  dietaryPreferences: {
    kind: 'chips',
    options: ['vegetarian', 'vegan', 'pescatarian', 'kosher', 'halal', 'glutenFree', 'lactoseFree', 'lowCarb', 'keto'],
  },
  conditions: { kind: 'tags', maxItems: 30, maxLength: 100 },
  injuries: { kind: 'tags', maxItems: 30, maxLength: 100 },
  medications: { kind: 'tags', maxItems: 30, maxLength: 100 },
  supplements: { kind: 'tags', maxItems: 30, maxLength: 100 },
  allergies: { kind: 'tags', maxItems: 30, maxLength: 100 },
  notes: { kind: 'text', maxLength: 1000 },
}

// Profile page sections, in order
export const HEALTH_SECTIONS = [
  { id: 'body', fields: ['sex', 'dateOfBirth', 'heightCm', 'activityLevel', 'goal', 'targetWeightKg'] },
  { id: 'lifestyle', fields: ['sleepHours', 'smoking', 'alcohol', 'dietaryPreferences'] },
  { id: 'medical', fields: ['conditions', 'injuries', 'medications', 'supplements', 'allergies', 'notes'] },
]

export const MEASUREMENT_TYPES = {
  weight: { unit: 'kg', inputs: { value: { min: 20, max: 400, step: 0.1 } } },
  bodyFat: { unit: 'percent', inputs: { value: { min: 2, max: 70, step: 0.1 } } },
  waist: { unit: 'cm', inputs: { value: { min: 30, max: 250, step: 0.5 } } },
  restingHeartRate: { unit: 'bpm', inputs: { value: { min: 25, max: 220, step: 1 } } },
  bloodPressure: {
    unit: 'mmHg',
    inputs: { systolic: { min: 60, max: 260, step: 1 }, diastolic: { min: 30, max: 160, step: 1 } },
  },
}
