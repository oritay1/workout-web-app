import mongoose from 'mongoose';

export const SESSION_STATUSES = ['inProgress', 'completed'];

// What the plan asked for, copied when the session starts so later plan edits/deletion don't change history
const plannedTargetsSchema = new mongoose.Schema(
  {
    sets: Number,
    repsMin: Number,
    repsMax: Number,
    weightKg: Number,
    durationSeconds: Number,
    distanceKm: Number,
    restSeconds: Number,
    notes: String,
  },
  { _id: false },
);

// One performed (or still to perform) set. Which values are used depends on the exercise type
const sessionSetSchema = new mongoose.Schema(
  {
    reps: Number,
    weightKg: Number,
    durationSeconds: Number,
    distanceKm: Number,
    completed: { type: Boolean, default: false },
  },
  { _id: false },
);

const sessionExerciseSchema = new mongoose.Schema({
  exercise: { type: mongoose.Schema.Types.ObjectId, ref: 'Exercise', required: true },
  // null for exercises added during the session that were not in the plan
  planned: { type: plannedTargetsSchema, default: null },
  sets: { type: [sessionSetSchema], default: [] },
  notes: String,
});

const workoutSessionSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: SESSION_STATUSES, default: 'inProgress' },
    startedAt: { type: Date, required: true },
    endedAt: Date,
    // Snapshot of where the session came from (all null for a free workout)
    plan: { type: mongoose.Schema.Types.ObjectId, ref: 'WorkoutPlan', default: null },
    planName: String,
    workoutId: { type: mongoose.Schema.Types.ObjectId, default: null },
    name: String,
    exercises: { type: [sessionExerciseSchema], default: [] },
    notes: String,
  },
  { timestamps: true },
);

workoutSessionSchema.index({ owner: 1, status: 1, startedAt: -1 });
workoutSessionSchema.index({ owner: 1, 'exercises.exercise': 1, startedAt: -1 });
// Only one workout in progress per user
workoutSessionSchema.index(
  { owner: 1 },
  { unique: true, partialFilterExpression: { status: 'inProgress' }, name: 'one_session_in_progress' },
);

export const WorkoutSession = mongoose.model('WorkoutSession', workoutSessionSchema);
