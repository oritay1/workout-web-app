import mongoose from 'mongoose';
import { NUTRIENT_FIELDS } from './food.model.js';
import { TARGET_FIELDS } from './dietPlan.model.js';

const nutrientsSchema = new mongoose.Schema(
  Object.fromEntries(NUTRIENT_FIELDS.map((field) => [field, { type: Number }])),
  { _id: false },
);

// Something eaten or drunk. Nutrients are copied at logging time so history doesn't change when a food is edited
const logEntrySchema = new mongoose.Schema({
  food: { type: mongoose.Schema.Types.ObjectId, ref: 'Food', required: true },
  quantity: { type: Number, required: true },
  portionLabel: { type: String, default: null },
  amount: { type: Number, required: true },
  // A default meal key (breakfast/lunch/dinner/snacks) or a meal name from the diet plan
  meal: { type: String, required: true },
  // Set when added from the active plan, so the day view can show which planned items were eaten
  planItem: { type: mongoose.Schema.Types.ObjectId, default: null },
  nutrients: { type: nutrientsSchema, required: true },
  loggedAt: { type: Date, default: Date.now },
});

// One document per user per calendar day (the user's local date, "YYYY-MM-DD")
const dailyLogSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: String, required: true },
    // Snapshot of the active plan's goals for this day
    plan: { type: mongoose.Schema.Types.ObjectId, ref: 'DietPlan', default: null },
    planName: { type: String },
    targets: {
      type: new mongoose.Schema(Object.fromEntries(TARGET_FIELDS.map((field) => [field, { type: Number }])), { _id: false }),
      default: () => ({}),
    },
    targetsSyncedAt: { type: Date },
    entries: { type: [logEntrySchema], default: [] },
    waterMl: { type: Number, default: 0 },
  },
  { timestamps: true },
);

dailyLogSchema.index({ owner: 1, date: 1 }, { unique: true });

export const DailyLog = mongoose.model('DailyLog', dailyLogSchema);
