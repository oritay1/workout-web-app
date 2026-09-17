import mongoose from 'mongoose';

// Allowed ranges per type. Blood pressure uses systolic/diastolic, every other type uses `value`
export const MEASUREMENT_TYPES = {
  weight: { unit: 'kg', min: 20, max: 400 },
  bodyFat: { unit: '%', min: 2, max: 70 },
  waist: { unit: 'cm', min: 30, max: 250 },
  restingHeartRate: { unit: 'bpm', min: 25, max: 220 },
  bloodPressure: { unit: 'mmHg', systolic: { min: 60, max: 260 }, diastolic: { min: 30, max: 160 } },
};

const measurementSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: Object.keys(MEASUREMENT_TYPES), required: true },
    // Calendar date (UTC midnight)
    date: { type: Date, required: true },
    value: { type: Number },
    systolic: { type: Number },
    diastolic: { type: Number },
  },
  { timestamps: true },
);

measurementSchema.index({ user: 1, type: 1, date: -1 });

export const Measurement = mongoose.model('Measurement', measurementSchema);
