import mongoose from 'mongoose';

// Remembers which version of a bundled dataset was loaded, so big imports run only when the data changes
const dataVersionSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    hash: { type: String, required: true },
  },
  { timestamps: true },
);

export const DataVersion = mongoose.model('DataVersion', dataVersionSchema);
