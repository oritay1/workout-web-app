import mongoose from 'mongoose';

export const SEXES = ['male', 'female'];
export const ACTIVITY_LEVELS = ['sedentary', 'light', 'moderate', 'active', 'veryActive'];
export const GOALS = ['loseFat', 'buildMuscle', 'maintain', 'performance', 'generalHealth'];
export const SMOKING_STATUSES = ['never', 'former', 'current'];
export const ALCOHOL_FREQUENCIES = ['none', 'occasional', 'weekly', 'daily'];
export const DIETARY_PREFERENCES = [
  'vegetarian',
  'vegan',
  'pescatarian',
  'kosher',
  'halal',
  'glutenFree',
  'lactoseFree',
  'lowCarb',
  'keto',
];

// Health details that rarely change. Values that change over time (weight, body fat...) are Measurements
const healthProfileSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    sex: { type: String, enum: SEXES },
    dateOfBirth: { type: Date },
    heightCm: { type: Number },
    activityLevel: { type: String, enum: ACTIVITY_LEVELS },
    goal: { type: String, enum: GOALS },
    targetWeightKg: { type: Number },
    sleepHours: { type: Number },
    smoking: { type: String, enum: SMOKING_STATUSES },
    alcohol: { type: String, enum: ALCOHOL_FREQUENCIES },
    conditions: { type: [String], default: undefined },
    injuries: { type: [String], default: undefined },
    medications: { type: [String], default: undefined },
    supplements: { type: [String], default: undefined },
    allergies: { type: [String], default: undefined },
    dietaryPreferences: { type: [String], enum: DIETARY_PREFERENCES, default: undefined },
    notes: { type: String },
  },
  { timestamps: true },
);

export const HealthProfile = mongoose.model('HealthProfile', healthProfileSchema);
