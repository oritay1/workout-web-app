import mongoose from 'mongoose';
import { WorkoutPlan } from '../models/workoutPlan.model.js';
import { WorkoutSession } from '../models/workoutSession.model.js';
import { HttpError } from '../middlewares/errorHandler.js';
import { findUsableExercises, toPublicExercise } from './exercise.service.js';
import { invalidField, parseInteger, parseNumber, parseText } from './validation.js';

const LIMITS = {
  notesLength: 1000,
  entryNotesLength: 200,
  exercises: 40,
  setsPerExercise: 30,
  reps: { min: 0, max: 1000 },
  weightKg: { min: 0, max: 1000 },
  durationSeconds: { min: 0, max: 24 * 60 * 60 },
  distanceKm: { min: 0, max: 1000 },
  historyPageSize: 30,
  exerciseHistory: 10,
};

const PLANNED_FIELDS = ['sets', 'repsMin', 'repsMax', 'weightKg', 'durationSeconds', 'distanceKm', 'restSeconds', 'notes'];
const SET_FIELDS_BY_TYPE = {
  strength: ['reps', 'weightKg'],
  bodyweight: ['reps', 'weightKg'],
  duration: ['durationSeconds'],
  cardio: ['durationSeconds', 'distanceKm'],
};

const isPlainObject = (value) => typeof value === 'object' && value !== null && !Array.isArray(value);
const toId = (value) => (value ? value.toString() : null);

// ---------- Output ----------

function toPublicSet(set) {
  return {
    reps: set.reps ?? null,
    weightKg: set.weightKg ?? null,
    durationSeconds: set.durationSeconds ?? null,
    distanceKm: set.distanceKm ?? null,
    completed: Boolean(set.completed),
  };
}

function toPublicPlanned(planned) {
  if (!planned) return null;
  return Object.fromEntries(PLANNED_FIELDS.map((field) => [field, planned[field] ?? null]));
}

// Totals used by the history list and the home screen
function summarize(session) {
  let completedSets = 0;
  let plannedSets = 0;
  let volumeKg = 0;
  for (const entry of session.exercises) {
    plannedSets += entry.planned?.sets ?? (entry.planned ? 1 : 0);
    for (const set of entry.sets) {
      if (!set.completed) continue;
      completedSets += 1;
      if (set.reps && set.weightKg) volumeKg += set.reps * set.weightKg;
    }
  }
  const end = session.endedAt ?? new Date();
  return {
    id: session._id.toString(),
    status: session.status,
    name: session.name ?? null,
    planId: toId(session.plan),
    planName: session.planName ?? null,
    workoutId: toId(session.workoutId),
    startedAt: session.startedAt,
    endedAt: session.endedAt ?? null,
    durationSeconds: Math.max(0, Math.round((end - session.startedAt) / 1000)),
    exerciseCount: session.exercises.length,
    completedSets,
    plannedSets,
    volumeKg: Math.round(volumeKg * 10) / 10,
  };
}

async function toPublicSession(userId, session) {
  const ids = session.exercises.map((entry) => entry.exercise);
  // Archived exercises still show up in sessions that used them
  const exercises = await findUsableExercises(userId, ids, ids);
  return {
    ...summarize(session),
    notes: session.notes ?? null,
    exercises: session.exercises
      .filter((entry) => exercises.has(entry.exercise.toString()))
      .map((entry) => ({
        id: entry._id.toString(),
        exercise: toPublicExercise(exercises.get(entry.exercise.toString())),
        planned: toPublicPlanned(entry.planned),
        sets: entry.sets.map(toPublicSet),
        notes: entry.notes ?? null,
      })),
  };
}

// ---------- Helpers ----------

async function findOwnSession(userId, id) {
  const session = mongoose.isValidObjectId(id) && (await WorkoutSession.findOne({ _id: id, owner: userId }));
  if (!session) throw new HttpError(404, 'SESSION_NOT_FOUND');
  return session;
}

// Set rows pre-filled with the plan's targets, so the user mostly just ticks them off
function setsFromPlan(planned, type) {
  if (type === 'cardio') {
    return [{ durationSeconds: planned.durationSeconds, distanceKm: planned.distanceKm, completed: false }];
  }
  const row =
    type === 'duration'
      ? { durationSeconds: planned.durationSeconds }
      : { reps: planned.repsMax ?? planned.repsMin, weightKg: planned.weightKg };
  return Array.from({ length: planned.sets ?? 1 }, () => ({ ...row, completed: false }));
}

function parseSet(input, type, path) {
  if (!isPlainObject(input)) throw invalidField(path);
  const set = { completed: input.completed === true };
  for (const field of SET_FIELDS_BY_TYPE[type]) {
    const parse = field === 'reps' || field === 'durationSeconds' ? parseInteger : parseNumber;
    const value = parse(input[field], `${path}.${field}`, LIMITS[field]);
    if (value !== null) set[field] = value;
  }
  return set;
}

// ---------- Public API ----------

export async function getCurrentSession(userId) {
  const session = await WorkoutSession.findOne({ owner: userId, status: 'inProgress' });
  return session ? toPublicSession(userId, session) : null;
}

// Starts a workout from a plan's workout ({ planId, workoutId }) or an empty free workout ({})
export async function startSession(userId, input = {}) {
  if (await WorkoutSession.exists({ owner: userId, status: 'inProgress' })) {
    throw new HttpError(409, 'SESSION_IN_PROGRESS');
  }

  const fields = { owner: userId, startedAt: new Date(), exercises: [] };
  if (input.planId !== undefined || input.workoutId !== undefined) {
    const plan =
      mongoose.isValidObjectId(input.planId) && (await WorkoutPlan.findOne({ _id: input.planId, owner: userId }).lean());
    if (!plan) throw new HttpError(404, 'PLAN_NOT_FOUND');
    const workout = plan.workouts.find((item) => item._id.toString() === String(input.workoutId));
    if (!workout) throw new HttpError(404, 'WORKOUT_NOT_FOUND');

    const exercises = await findUsableExercises(
      userId,
      workout.exercises.map((entry) => entry.exercise),
      workout.exercises.map((entry) => entry.exercise),
    );
    Object.assign(fields, {
      plan: plan._id,
      planName: plan.name,
      workoutId: workout._id,
      name: workout.name,
      exercises: workout.exercises
        .filter((entry) => exercises.has(entry.exercise.toString()))
        .map((entry) => {
          const planned = Object.fromEntries(
            PLANNED_FIELDS.filter((field) => entry[field] !== undefined && entry[field] !== null).map((field) => [
              field,
              entry[field],
            ]),
          );
          return {
            exercise: entry.exercise,
            planned,
            sets: setsFromPlan(planned, exercises.get(entry.exercise.toString()).type),
          };
        }),
    });
  }

  try {
    return toPublicSession(userId, await WorkoutSession.create(fields));
  } catch (err) {
    // Two starts at the same moment
    if (err.code === 11000) throw new HttpError(409, 'SESSION_IN_PROGRESS');
    throw err;
  }
}

// The live screen sends the whole session (exercises, sets, notes) and autosaves as the user goes.
// Planned targets can't be changed by the client: entries keep them by id. Planned exercises can't be
// removed either (a skipped exercise must still show up as planned-but-not-done); omitted ones are kept
export async function replaceSession(userId, id, input) {
  const session = await findOwnSession(userId, id);
  if (!isPlainObject(input)) throw invalidField('session');

  const entriesInput = input.exercises ?? [];
  if (!Array.isArray(entriesInput) || entriesInput.length > LIMITS.exercises) throw invalidField('exercises');
  entriesInput.forEach((entry, index) => {
    if (!isPlainObject(entry) || !mongoose.isValidObjectId(entry.exerciseId)) {
      throw invalidField(`exercises.${index}.exerciseId`);
    }
  });

  const existingById = new Map(session.exercises.map((entry) => [entry._id.toString(), entry]));
  const exercises = await findUsableExercises(
    userId,
    entriesInput.map((entry) => String(entry.exerciseId)),
    session.exercises.map((entry) => entry.exercise),
  );

  const parsedEntries = entriesInput.map((entry, index) => {
    const path = `exercises.${index}`;
    const exercise = exercises.get(String(entry.exerciseId));
    if (!exercise) throw invalidField(`${path}.exerciseId`);
    const setsInput = entry.sets ?? [];
    if (!Array.isArray(setsInput) || setsInput.length > LIMITS.setsPerExercise) throw invalidField(`${path}.sets`);

    const existing = typeof entry.id === 'string' ? existingById.get(entry.id) : undefined;
    const keepsPlan = existing && existing.exercise.toString() === exercise._id.toString();
    const notes = parseText(entry.notes, `${path}.notes`, LIMITS.entryNotesLength);
    return {
      ...(keepsPlan && { _id: existing._id }),
      exercise: exercise._id,
      planned: keepsPlan ? existing.planned : null,
      sets: setsInput.map((set, setIndex) => parseSet(set, exercise.type, `${path}.sets.${setIndex}`)),
      ...(notes && { notes }),
    };
  });

  const sentIds = new Set(parsedEntries.filter((entry) => entry._id).map((entry) => entry._id.toString()));
  const omittedPlanned = session.exercises.filter((entry) => entry.planned && !sentIds.has(entry._id.toString()));

  session.exercises = [...parsedEntries, ...omittedPlanned];
  session.notes = parseText(input.notes, 'notes', LIMITS.notesLength) ?? undefined;
  return toPublicSession(userId, await session.save());
}

export async function finishSession(userId, id) {
  const session = await findOwnSession(userId, id);
  if (session.status !== 'inProgress') throw new HttpError(409, 'SESSION_ALREADY_FINISHED');
  session.status = 'completed';
  session.endedAt = new Date();
  return toPublicSession(userId, await session.save());
}

export async function getSession(userId, id) {
  return toPublicSession(userId, await findOwnSession(userId, id));
}

export async function deleteSession(userId, id) {
  const session = await findOwnSession(userId, id);
  await session.deleteOne();
}

function parseDateQuery(value, field) {
  if (value === undefined) return null;
  const date = typeof value === 'string' ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) throw invalidField(field);
  return date;
}

// Completed sessions, newest first. `from`/`to` limit by start time; `before` pages through older ones
export async function listSessions(userId, query) {
  const from = parseDateQuery(query.from, 'from');
  const to = parseDateQuery(query.to, 'to');
  const before = parseDateQuery(query.before, 'before');
  const startedAt = {
    ...(from && { $gte: from }),
    ...(to && { $lt: to }),
    ...(before && { $lt: before }),
  };
  if (to && before) startedAt.$lt = new Date(Math.min(to, before));

  const sessions = await WorkoutSession.find({
    owner: userId,
    status: 'completed',
    ...(Object.keys(startedAt).length && { startedAt }),
  })
    .sort({ startedAt: -1 })
    .limit(LIMITS.historyPageSize + 1)
    .lean();

  return {
    sessions: sessions.slice(0, LIMITS.historyPageSize).map(summarize),
    hasMore: sessions.length > LIMITS.historyPageSize,
  };
}

// Recent completed sets of one exercise, for "last time" hints and progress
export async function getExerciseHistory(userId, exerciseId, query = {}) {
  if (!mongoose.isValidObjectId(exerciseId)) throw new HttpError(404, 'EXERCISE_NOT_FOUND');
  const excludeId = mongoose.isValidObjectId(query.exclude) ? query.exclude : null;
  const sessions = await WorkoutSession.find({
    owner: userId,
    status: 'completed',
    'exercises.exercise': exerciseId,
    ...(excludeId && { _id: { $ne: excludeId } }),
  })
    .sort({ startedAt: -1 })
    .limit(LIMITS.exerciseHistory)
    .lean();

  return sessions
    .map((session) => ({
      sessionId: session._id.toString(),
      startedAt: session.startedAt,
      sets: session.exercises
        .filter((entry) => entry.exercise.toString() === exerciseId)
        .flatMap((entry) => entry.sets.filter((set) => set.completed).map(toPublicSet)),
    }))
    .filter((item) => item.sets.length > 0);
}
