import mongoose from 'mongoose';
import { MEASUREMENT_TYPES, Measurement } from '../models/measurement.model.js';
import { HttpError } from '../middlewares/errorHandler.js';
import { formatDate, invalidField, latestAllowedDate, parseDate, parseNumber } from './validation.js';

const HISTORY_LIMIT = 200;
const EARLIEST_DATE = new Date('1900-01-01T00:00:00.000Z');

function toPublicMeasurement(measurement) {
  const base = { id: measurement._id.toString(), type: measurement.type, date: formatDate(measurement.date) };
  return measurement.type === 'bloodPressure'
    ? { ...base, systolic: measurement.systolic, diastolic: measurement.diastolic }
    : { ...base, value: measurement.value };
}

function parseType(type) {
  if (!Object.hasOwn(MEASUREMENT_TYPES, type)) throw invalidField('type');
  return type;
}

// Returns a document ready to insert (without the user)
export function parseMeasurement(input) {
  const type = parseType(input?.type);
  const date = parseDate(input.date, 'date', { min: EARLIEST_DATE, max: latestAllowedDate() });
  if (!date) throw invalidField('date');

  const limits = MEASUREMENT_TYPES[type];
  if (type === 'bloodPressure') {
    const systolic = parseNumber(input.systolic, 'systolic', limits.systolic);
    const diastolic = parseNumber(input.diastolic, 'diastolic', limits.diastolic);
    if (systolic === null) throw invalidField('systolic');
    if (diastolic === null || diastolic >= systolic) throw invalidField('diastolic');
    return { type, date, systolic, diastolic };
  }

  const value = parseNumber(input.value, 'value', limits);
  if (value === null) throw invalidField('value');
  return { type, date, value };
}

export async function listMeasurements(userId, type) {
  const measurements = await Measurement.find({ user: userId, type: parseType(type) })
    .sort({ date: -1, createdAt: -1 })
    .limit(HISTORY_LIMIT)
    .lean();
  return measurements.map(toPublicMeasurement);
}

// The most recent entry of each type: { weight: {...}, bodyFat: null, ... }
export async function getLatestMeasurements(userId) {
  const latest = await Measurement.aggregate([
    { $match: { user: new mongoose.Types.ObjectId(String(userId)) } },
    { $sort: { date: -1, createdAt: -1 } },
    { $group: { _id: '$type', doc: { $first: '$$ROOT' } } },
  ]);
  const byType = Object.fromEntries(latest.map(({ _id, doc }) => [_id, toPublicMeasurement(doc)]));
  return Object.fromEntries(Object.keys(MEASUREMENT_TYPES).map((type) => [type, byType[type] ?? null]));
}

export async function insertMeasurements(userId, measurements) {
  const created = await Measurement.insertMany(measurements.map((measurement) => ({ ...measurement, user: userId })));
  return created.map(toPublicMeasurement);
}

export async function addMeasurement(userId, input) {
  const [created] = await insertMeasurements(userId, [parseMeasurement(input ?? {})]);
  return created;
}

export async function deleteMeasurement(userId, id) {
  const deleted =
    mongoose.isValidObjectId(id) && (await Measurement.findOneAndDelete({ _id: id, user: userId }));
  if (!deleted) throw new HttpError(404, 'MEASUREMENT_NOT_FOUND');
}
