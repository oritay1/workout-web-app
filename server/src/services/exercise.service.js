import mongoose from 'mongoose';
import { BUILT_IN_EXERCISES } from '../data/builtInExercises.js';
import { EQUIPMENT, EXERCISE_TYPES, Exercise, MUSCLE_GROUPS, NAME_COLLATION } from '../models/exercise.model.js';
import { HttpError } from '../middlewares/errorHandler.js';
import { invalidField, isBlank, parseEnum, parseEnumList, parseText } from './validation.js';

const MAX_NAME_LENGTH = 60;
const MAX_NOTES_LENGTH = 500;

// Inserts new built-in exercises and updates changed ones. Safe to run on every start.
// Also brings indexes in line with the schema (drops indexes whose definition changed)
export async function syncBuiltInExercises() {
  // Exercises created before archiving existed have no isArchived field; the library query and the
  // unique-name index both rely on it being false
  await Exercise.updateMany({ isArchived: { $exists: false } }, { $set: { isArchived: false } }, { timestamps: false });
  await Exercise.syncIndexes();
  const { upsertedCount, modifiedCount } = await Exercise.bulkWrite(
    BUILT_IN_EXERCISES.map(({ key, ...fields }) => ({
      updateOne: {
        filter: { key },
        update: { $set: { ...fields, owner: null } },
        upsert: true,
        // Otherwise updatedAt changes on every start and every entry counts as modified
        timestamps: false,
      },
    })),
  );
  if (upsertedCount || modifiedCount) {
    console.log(`Built-in exercises synced (${upsertedCount} added, ${modifiedCount} updated)`);
  }
}

export function toPublicExercise(exercise) {
  const isCustom = Boolean(exercise.owner);
  return {
    id: exercise._id.toString(),
    isCustom,
    // Built-in: { en, he } for the client to pick by UI language. Custom: the typed name
    ...(isCustom ? { name: exercise.name } : { names: Object.fromEntries(Object.entries(exercise.names)) }),
    type: exercise.type,
    equipment: exercise.equipment,
    primaryMuscles: exercise.primaryMuscles,
    secondaryMuscles: exercise.secondaryMuscles,
    notes: exercise.notes ?? null,
    isArchived: Boolean(exercise.isArchived),
  };
}

// Every field is required on create; on update only the fields present are validated
function parseExerciseInput(input, { partial }) {
  const fields = {};
  const has = (field) => !partial || field in input;

  if (has('name')) {
    const name = parseText(input.name, 'name', MAX_NAME_LENGTH);
    if (!name) throw invalidField('name');
    fields.name = name;
  }
  if (has('type')) {
    fields.type = parseEnum(input.type, 'type', EXERCISE_TYPES);
    if (!fields.type) throw invalidField('type');
  }
  if (has('equipment')) {
    fields.equipment = parseEnum(input.equipment, 'equipment', EQUIPMENT);
    if (!fields.equipment) throw invalidField('equipment');
  }
  if (has('primaryMuscles')) {
    fields.primaryMuscles = parseEnumList(input.primaryMuscles, 'primaryMuscles', MUSCLE_GROUPS) ?? [];
  }
  if (has('secondaryMuscles')) {
    fields.secondaryMuscles = parseEnumList(input.secondaryMuscles, 'secondaryMuscles', MUSCLE_GROUPS) ?? [];
  }
  if (has('notes')) {
    fields.notes = isBlank(input.notes) ? null : parseText(input.notes, 'notes', MAX_NOTES_LENGTH);
  }
  return fields;
}

async function assertNameAvailable(ownerId, name, exceptId) {
  const taken = await Exercise.exists({
    owner: ownerId,
    name,
    isArchived: false,
    ...(exceptId && { _id: { $ne: exceptId } }),
  }).collation(NAME_COLLATION);
  if (taken) throw new HttpError(409, 'EXERCISE_NAME_TAKEN', { field: 'name' });
}

function toDuplicateNameError(err) {
  return err.code === 11000 ? new HttpError(409, 'EXERCISE_NAME_TAKEN', { field: 'name' }) : err;
}

// A muscle can't be both primary and secondary
function withoutOverlap(primaryMuscles, secondaryMuscles) {
  return secondaryMuscles.filter((muscle) => !primaryMuscles.includes(muscle));
}

// Built-in exercises plus the user's own (archived ones are hidden from the library)
export async function listExercises(userId) {
  const exercises = await Exercise.find({ owner: { $in: [null, userId] }, isArchived: false }).lean();
  return exercises.map(toPublicExercise);
}

export async function getExercise(userId, id) {
  const exercise =
    mongoose.isValidObjectId(id) &&
    (await Exercise.findOne({ _id: id, owner: { $in: [null, userId] }, isArchived: false }).lean());
  if (!exercise) throw new HttpError(404, 'EXERCISE_NOT_FOUND');
  return toPublicExercise(exercise);
}

export async function createExercise(userId, input) {
  const fields = parseExerciseInput(input ?? {}, { partial: false });
  fields.secondaryMuscles = withoutOverlap(fields.primaryMuscles, fields.secondaryMuscles);
  await assertNameAvailable(userId, fields.name);
  try {
    const exercise = await Exercise.create({ ...fields, notes: fields.notes ?? undefined, owner: userId });
    return toPublicExercise(exercise);
  } catch (err) {
    throw toDuplicateNameError(err);
  }
}

// Only the owner can change a custom exercise; built-in ones are read-only
async function findOwnExercise(userId, id) {
  const exercise =
    mongoose.isValidObjectId(id) && (await Exercise.findOne({ _id: id, owner: userId, isArchived: false }));
  if (!exercise) throw new HttpError(404, 'EXERCISE_NOT_FOUND');
  return exercise;
}

export async function updateExercise(userId, id, input) {
  const exercise = await findOwnExercise(userId, id);
  const fields = parseExerciseInput(input ?? {}, { partial: true });
  if (fields.name) await assertNameAvailable(userId, fields.name, exercise._id);

  const { notes, ...rest } = fields;
  exercise.set(rest);
  if ('notes' in fields) exercise.notes = notes ?? undefined;
  exercise.secondaryMuscles = withoutOverlap(exercise.primaryMuscles, exercise.secondaryMuscles);
  try {
    return toPublicExercise(await exercise.save());
  } catch (err) {
    throw toDuplicateNameError(err);
  }
}

export async function deleteExercise(userId, id) {
  const exercise = await findOwnExercise(userId, id);
  exercise.isArchived = true;
  await exercise.save();
}

// Exercises a plan may use: built-in or the user's own. Archived ones are included only when
// `allowArchivedIds` lists them (exercises that were already in the plan before being deleted)
export async function findUsableExercises(userId, ids, allowArchivedIds = []) {
  const exercises = await Exercise.find({ _id: { $in: ids }, owner: { $in: [null, userId] } }).lean();
  const allowed = new Set(allowArchivedIds.map(String));
  return new Map(
    exercises
      .filter((exercise) => !exercise.isArchived || allowed.has(exercise._id.toString()))
      .map((exercise) => [exercise._id.toString(), exercise]),
  );
}
