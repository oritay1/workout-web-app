import mongoose from 'mongoose';

// Daily goals. All optional: a plan can be only calorie/macro goals, only a food list, or both
export const TARGET_FIELDS = ['energyKcal', 'proteinG', 'carbsG', 'fatG', 'waterMl'];

const targetsSchema = new mongoose.Schema(
  Object.fromEntries(TARGET_FIELDS.map((field) => [field, { type: Number }])),
  { _id: false },
);

// A food in a planned meal. amount = quantity x portion size (grams/ml), stored for quick totals
const planItemSchema = new mongoose.Schema({
  food: { type: mongoose.Schema.Types.ObjectId, ref: 'Food', required: true },
  quantity: { type: Number, required: true },
  portionLabel: { type: String, default: null },
  amount: { type: Number, required: true },
});

const planMealSchema = new mongoose.Schema({
  name: { type: String, required: true },
  time: { type: String },
  items: { type: [planItemSchema], default: [] },
});

const dietPlanSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    notes: { type: String },
    targets: { type: targetsSchema, default: () => ({}) },
    meals: { type: [planMealSchema], default: [] },
    isActive: { type: Boolean, default: false },
  },
  { timestamps: true },
);

dietPlanSchema.index({ owner: 1, updatedAt: -1 });
dietPlanSchema.index({ owner: 1 }, { unique: true, partialFilterExpression: { isActive: true }, name: 'one_active_diet_plan' });

export const DietPlan = mongoose.model('DietPlan', dietPlanSchema);
