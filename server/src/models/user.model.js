import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    phone: { type: String, required: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    // Small square JPEG as a data URL, resized in the browser
    avatar: { type: String },
    // Incrementing it invalidates every session token issued before
    tokenVersion: { type: Number, default: 0 },
  },
  { timestamps: true },
);

// Case-insensitive uniqueness: "Dana" and "dana" are the same username
userSchema.index({ username: 1 }, { unique: true, collation: { locale: 'en', strength: 2 } });
userSchema.index({ email: 1 }, { unique: true });

export const User = mongoose.model('User', userSchema);
