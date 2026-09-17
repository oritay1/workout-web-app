import mongoose from 'mongoose';

// strength: sets x reps x weight · bodyweight: sets x reps · cardio: distance / duration · duration: time only
export const EXERCISE_TYPES = ['strength', 'bodyweight', 'cardio', 'duration'];
export const EQUIPMENT = [
  'none',
  'barbell',
  'dumbbell',
  'kettlebell',
  'machine',
  'cable',
  'band',
  'pullUpBar',
  'dipBars',
  'cardioMachine',
  'other',
];
export const MUSCLE_GROUPS = [
  'chest',
  'back',
  'shoulders',
  'biceps',
  'triceps',
  'forearms',
  'core',
  'glutes',
  'quads',
  'hamstrings',
  'calves',
  'fullBody',
];

export const NAME_COLLATION = { locale: 'en', strength: 2 };

const exerciseSchema = new mongoose.Schema(
  {
    // null for built-in exercises, the user's id for custom ones
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    // Built-in only: stable identifier and a name per UI language ({ en, he })
    key: { type: String },
    names: { type: Map, of: String, default: undefined },
    // Custom only: the name as the user typed it
    name: { type: String, trim: true },
    type: { type: String, enum: EXERCISE_TYPES, required: true },
    equipment: { type: String, enum: EQUIPMENT, required: true },
    primaryMuscles: { type: [String], enum: MUSCLE_GROUPS, default: [] },
    secondaryMuscles: { type: [String], enum: MUSCLE_GROUPS, default: [] },
    notes: { type: String },
  },
  { timestamps: true },
);

exerciseSchema.index({ key: 1 }, { unique: true, partialFilterExpression: { key: { $type: 'string' } } });
// A user can't have two custom exercises with the same name (case-insensitive)
exerciseSchema.index(
  { owner: 1, name: 1 },
  { unique: true, collation: NAME_COLLATION, partialFilterExpression: { owner: { $type: 'objectId' } } },
);

export const Exercise = mongoose.model('Exercise', exerciseSchema);
