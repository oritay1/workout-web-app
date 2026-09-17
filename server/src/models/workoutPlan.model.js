import mongoose from 'mongoose';

// Planned targets for one exercise. Which fields are used depends on the exercise type:
// strength / bodyweight: sets, repsMin, repsMax, weightKg, restSeconds
// duration: sets, durationSeconds, restSeconds · cardio: durationSeconds, distanceKm
const plannedExerciseSchema = new mongoose.Schema({
  exercise: { type: mongoose.Schema.Types.ObjectId, ref: 'Exercise', required: true },
  sets: { type: Number },
  repsMin: { type: Number },
  repsMax: { type: Number },
  weightKg: { type: Number },
  durationSeconds: { type: Number },
  distanceKm: { type: Number },
  restSeconds: { type: Number },
  notes: { type: String },
});

// day: 0 = Sunday ... 6 = Saturday · time: "HH:MM", optional
const scheduleSlotSchema = new mongoose.Schema(
  {
    day: { type: Number, min: 0, max: 6, required: true },
    time: { type: String },
  },
  { _id: false },
);

// One workout inside a plan, e.g. "Push day". Its _id stays stable across edits so sessions can refer to it
const workoutSchema = new mongoose.Schema({
  name: { type: String, required: true },
  schedule: { type: [scheduleSlotSchema], default: [] },
  exercises: { type: [plannedExerciseSchema], default: [] },
});

const workoutPlanSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    notes: { type: String },
    workoutsPerWeek: { type: Number, required: true },
    // The plan the user is currently following (at most one per user)
    isActive: { type: Boolean, default: false },
    workouts: { type: [workoutSchema], default: [] },
  },
  { timestamps: true },
);

workoutPlanSchema.index({ owner: 1, updatedAt: -1 });
workoutPlanSchema.index({ owner: 1 }, { unique: true, partialFilterExpression: { isActive: true }, name: 'one_active_plan' });

export const WorkoutPlan = mongoose.model('WorkoutPlan', workoutPlanSchema);
