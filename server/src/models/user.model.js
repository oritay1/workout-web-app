import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    phone: { type: String, required: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    // Small square JPEG as a data URL, resized in the browser
    avatar: { type: String },
    // Set once the user saved or skipped the health screen shown after registration
    onboardingCompleted: { type: Boolean, default: false },
    // Incrementing it invalidates every session token issued before
    tokenVersion: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export const USERNAME_COLLATION = { locale: 'en', strength: 2 };

// Case-insensitive uniqueness: "Dana" and "dana" are the same username
userSchema.index({ username: 1 }, { unique: true, collation: USERNAME_COLLATION });
userSchema.index({ email: 1 }, { unique: true });

export const User = mongoose.model('User', userSchema);
