import mongoose from 'mongoose';
import { WorkoutPlan } from '../models/workoutPlan.model.js';
import { HttpError } from '../middlewares/errorHandler.js';
import { findUsableExercises, toPublicExercise } from './exercise.service.js';
import { invalidField, parseInteger, parseNumber, parseText } from './validation.js';

const LIMITS = {
  nameLength: 60,
  notesLength: 500,
  workoutNameLength: 40,
  entryNotesLength: 200,
  workouts: 14,
  exercisesPerWorkout: 30,
  workoutsPerWeek: { min: 1, max: 14 },
  sets: { min: 1, max: 20 },
  reps: { min: 1, max: 100 },
  weightKg: { min: 0, max: 1000 },
  durationSeconds: { min: 1, max: 24 * 60 * 60 },
  distanceKm: { min: 0.01, max: 1000 },
  restSeconds: { min: 0, max: 15 * 60 },
};

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

const isPlainObject = (value) => typeof value === 'object' && value !== null && !Array.isArray(value);

function requireValue(value, field) {
  if (value === null) throw invalidField(field);
  return value;
}

// Keeps only the target fields that make sense for the exercise type
function parseTargets(input, type, path) {
  const field = (name) => `${path}.${name}`;
  const targets = {};

  if (type === 'strength' || type === 'bodyweight') {
    targets.sets = requireValue(parseInteger(input.sets, field('sets'), LIMITS.sets), field('sets'));
    targets.repsMin = requireValue(parseInteger(input.repsMin, field('repsMin'), LIMITS.reps), field('repsMin'));
    targets.repsMax = parseInteger(input.repsMax, field('repsMax'), LIMITS.reps);
    if (targets.repsMax !== null && targets.repsMax < targets.repsMin) throw invalidField(field('repsMax'));
    targets.weightKg = parseNumber(input.weightKg, field('weightKg'), LIMITS.weightKg);
    targets.restSeconds = parseInteger(input.restSeconds, field('restSeconds'), LIMITS.restSeconds);
  } else if (type === 'duration') {
    targets.sets = requireValue(parseInteger(input.sets, field('sets'), LIMITS.sets), field('sets'));
    targets.durationSeconds = requireValue(
      parseInteger(input.durationSeconds, field('durationSeconds'), LIMITS.durationSeconds),
      field('durationSeconds'),
    );
    targets.restSeconds = parseInteger(input.restSeconds, field('restSeconds'), LIMITS.restSeconds);
  } else {
    targets.durationSeconds = parseInteger(input.durationSeconds, field('durationSeconds'), LIMITS.durationSeconds);
    targets.distanceKm = parseNumber(input.distanceKm, field('distanceKm'), LIMITS.distanceKm);
  }

  // Store only filled-in values
  return Object.fromEntries(Object.entries(targets).filter(([, value]) => value !== null));
}

function parseSchedule(input, path) {
  if (input === undefined || input === null) return [];
  if (!Array.isArray(input) || input.length > 7) throw invalidField(path);
  const days = new Set();
  return input
    .map((slot, index) => {
      const slotPath = `${path}.${index}`;
      if (!isPlainObject(slot)) throw invalidField(slotPath);
      const day = requireValue(parseInteger(slot.day, `${slotPath}.day`, { min: 0, max: 6 }), `${slotPath}.day`);
      if (days.has(day)) throw invalidField(`${slotPath}.day`);
      days.add(day);
      const time = slot.time === undefined || slot.time === null || slot.time === '' ? null : slot.time;
      if (time !== null && (typeof time !== 'string' || !TIME_PATTERN.test(time))) {
        throw invalidField(`${slotPath}.time`);
      }
      return time ? { day, time } : { day };
    })
    .sort((a, b) => a.day - b.day);
}

// Reuses the id the client sent (so workouts keep their identity across edits), otherwise creates one
function parseId(id) {
  return mongoose.isValidObjectId(id) ? new mongoose.Types.ObjectId(String(id)) : new mongoose.Types.ObjectId();
}

async function parsePlan(userId, input, existingPlan) {
  if (!isPlainObject(input)) throw invalidField('plan');

  const name = requireValue(parseText(input.name, 'name', LIMITS.nameLength), 'name');
  const notes = parseText(input.notes, 'notes', LIMITS.notesLength);
  const workoutsPerWeek = requireValue(
    parseInteger(input.workoutsPerWeek, 'workoutsPerWeek', LIMITS.workoutsPerWeek),
    'workoutsPerWeek',
  );

  const workoutsInput = input.workouts ?? [];
  if (!Array.isArray(workoutsInput) || workoutsInput.length > LIMITS.workouts) throw invalidField('workouts');

  // Load every referenced exercise in one query
  const exerciseIds = [];
  workoutsInput.forEach((workout, workoutIndex) => {
    const entries = workout?.exercises ?? [];
    if (!Array.isArray(entries) || entries.length > LIMITS.exercisesPerWorkout) {
      throw invalidField(`workouts.${workoutIndex}.exercises`);
    }
    entries.forEach((entry, entryIndex) => {
      if (!isPlainObject(entry) || !mongoose.isValidObjectId(entry.exerciseId)) {
        throw invalidField(`workouts.${workoutIndex}.exercises.${entryIndex}.exerciseId`);
      }
      exerciseIds.push(String(entry.exerciseId));
    });
  });
  const alreadyInPlan = existingPlan?.workouts.flatMap((workout) => workout.exercises.map((entry) => entry.exercise)) ?? [];
  const exercises = await findUsableExercises(userId, exerciseIds, alreadyInPlan);

  const workouts = workoutsInput.map((workout, workoutIndex) => {
    const path = `workouts.${workoutIndex}`;
    if (!isPlainObject(workout)) throw invalidField(path);
    return {
      _id: parseId(workout.id),
      name: requireValue(parseText(workout.name, `${path}.name`, LIMITS.workoutNameLength), `${path}.name`),
      schedule: parseSchedule(workout.schedule, `${path}.schedule`),
      exercises: (workout.exercises ?? []).map((entry, entryIndex) => {
        const entryPath = `${path}.exercises.${entryIndex}`;
        const exercise = exercises.get(String(entry.exerciseId));
        if (!exercise) throw invalidField(`${entryPath}.exerciseId`);
        const entryNotes = parseText(entry.notes, `${entryPath}.notes`, LIMITS.entryNotesLength);
        return {
          _id: parseId(entry.id),
          exercise: exercise._id,
          ...parseTargets(entry, exercise.type, entryPath),
          ...(entryNotes && { notes: entryNotes }),
        };
      }),
    };
  });

  return { name, notes, workoutsPerWeek, workouts };
}

async function toPublicPlan(userId, plan) {
  const ids = plan.workouts.flatMap((workout) => workout.exercises.map((entry) => entry.exercise));
  // Archived exercises are still shown in plans that use them
  const exercises = await findUsableExercises(userId, ids, ids);

  return {
    id: plan._id.toString(),
    name: plan.name,
    notes: plan.notes ?? null,
    workoutsPerWeek: plan.workoutsPerWeek,
    isActive: plan.isActive,
    createdAt: plan.createdAt,
    updatedAt: plan.updatedAt,
    workouts: plan.workouts.map((workout) => ({
      id: workout._id.toString(),
      name: workout.name,
      schedule: workout.schedule.map(({ day, time }) => ({ day, time: time ?? null })),
      exercises: workout.exercises
        .filter((entry) => exercises.has(entry.exercise.toString()))
        .map((entry) => ({
          id: entry._id.toString(),
          exercise: toPublicExercise(exercises.get(entry.exercise.toString())),
          sets: entry.sets ?? null,
          repsMin: entry.repsMin ?? null,
          repsMax: entry.repsMax ?? null,
          weightKg: entry.weightKg ?? null,
          durationSeconds: entry.durationSeconds ?? null,
          distanceKm: entry.distanceKm ?? null,
          restSeconds: entry.restSeconds ?? null,
          notes: entry.notes ?? null,
        })),
    })),
  };
}

// Short version for the plans list
function toPlanSummary(plan) {
  return {
    id: plan._id.toString(),
    name: plan.name,
    workoutsPerWeek: plan.workoutsPerWeek,
    isActive: plan.isActive,
    updatedAt: plan.updatedAt,
    workouts: plan.workouts.map((workout) => ({
      id: workout._id.toString(),
      name: workout.name,
      exerciseCount: workout.exercises.length,
      schedule: workout.schedule.map(({ day, time }) => ({ day, time: time ?? null })),
    })),
  };
}

async function findOwnPlan(userId, id) {
  const plan = mongoose.isValidObjectId(id) && (await WorkoutPlan.findOne({ _id: id, owner: userId }));
  if (!plan) throw new HttpError(404, 'PLAN_NOT_FOUND');
  return plan;
}

export async function listPlans(userId) {
  const plans = await WorkoutPlan.find({ owner: userId }).sort({ isActive: -1, updatedAt: -1 }).lean();
  return plans.map(toPlanSummary);
}

export async function getPlan(userId, id) {
  return toPublicPlan(userId, await findOwnPlan(userId, id));
}

export async function createPlan(userId, input) {
  const fields = await parsePlan(userId, input);
  // The first plan becomes the active one automatically
  const hasActivePlan = await WorkoutPlan.exists({ owner: userId, isActive: true });
  const plan = await WorkoutPlan.create({ ...fields, notes: fields.notes ?? undefined, owner: userId, isActive: !hasActivePlan });
  return toPublicPlan(userId, plan);
}

// The editor always sends the whole plan
export async function replacePlan(userId, id, input) {
  const plan = await findOwnPlan(userId, id);
  const fields = await parsePlan(userId, input, plan);
  plan.set({ ...fields, notes: fields.notes ?? undefined });
  return toPublicPlan(userId, await plan.save());
}

export async function deletePlan(userId, id) {
  const plan = await findOwnPlan(userId, id);
  await plan.deleteOne();
}

export async function activatePlan(userId, id) {
  const plan = await findOwnPlan(userId, id);
  if (!plan.isActive) {
    // Two steps (no transactions on a standalone MongoDB); the unique index guarantees a single active plan
    await WorkoutPlan.updateMany({ owner: userId, isActive: true }, { isActive: false });
    plan.isActive = true;
    await plan.save();
  }
  return toPlanSummary(plan);
}
