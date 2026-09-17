import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { User } from '../models/user.model.js';
import { HttpError } from '../middlewares/errorHandler.js';

const BCRYPT_ROUNDS = 12;
const USERNAME_PATTERN = /^[a-zA-Z0-9_.]{3,30}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_EMAIL_LENGTH = 254;
const PHONE_PATTERN = /^\+?[0-9]{7,15}$/;
const MIN_PASSWORD_LENGTH = 8;
// bcrypt ignores everything after 72 bytes
const MAX_PASSWORD_BYTES = 72;
const AVATAR_PATTERN = /^data:image\/(jpeg|png|webp);base64,[a-zA-Z0-9+/]+=*$/;
const MAX_AVATAR_LENGTH = 300_000;

// Compared against when the user doesn't exist, so a wrong username takes as long as a wrong password
const DUMMY_HASH = bcrypt.hashSync('dummy-password', BCRYPT_ROUNDS);

const isString = (value) => typeof value === 'string';

// Keeps digits and a leading "+", drops spaces, dashes and parentheses
function normalizePhone(phone) {
  const trimmed = phone.trim();
  return (trimmed.startsWith('+') ? '+' : '') + trimmed.replace(/[\s\-()+]/g, '');
}

function validateRegistration({ username, email, phone, password, avatar }) {
  if (!isString(username) || !USERNAME_PATTERN.test(username.trim())) {
    throw new HttpError(400, 'INVALID_USERNAME');
  }
  if (!isString(email) || email.trim().length > MAX_EMAIL_LENGTH || !EMAIL_PATTERN.test(email.trim())) {
    throw new HttpError(400, 'INVALID_EMAIL');
  }
  if (!isString(phone) || !PHONE_PATTERN.test(normalizePhone(phone))) {
    throw new HttpError(400, 'INVALID_PHONE');
  }
  if (
    !isString(password) ||
    password.length < MIN_PASSWORD_LENGTH ||
    Buffer.byteLength(password) > MAX_PASSWORD_BYTES
  ) {
    throw new HttpError(400, 'INVALID_PASSWORD');
  }
  const hasAvatar = avatar !== undefined && avatar !== null && avatar !== '';
  if (hasAvatar && (!isString(avatar) || avatar.length > MAX_AVATAR_LENGTH || !AVATAR_PATTERN.test(avatar))) {
    throw new HttpError(400, 'INVALID_AVATAR');
  }
}

// The only user fields ever sent to the client
export function toPublicUser(user) {
  return {
    username: user.username,
    email: user.email,
    phone: user.phone,
    avatar: user.avatar ?? null,
    createdAt: user.createdAt,
  };
}

async function assertAvailable(username, email) {
  const [usernameTaken, emailTaken] = await Promise.all([
    User.exists({ username }).collation({ locale: 'en', strength: 2 }),
    User.exists({ email }),
  ]);
  if (usernameTaken) throw new HttpError(409, 'USERNAME_TAKEN');
  if (emailTaken) throw new HttpError(409, 'EMAIL_TAKEN');
}

export async function register(input) {
  validateRegistration(input);
  const username = input.username.trim();
  const email = input.email.trim().toLowerCase();

  await assertAvailable(username, email);

  try {
    return await User.create({
      username,
      email,
      phone: normalizePhone(input.phone),
      passwordHash: await bcrypt.hash(input.password, BCRYPT_ROUNDS),
      avatar: input.avatar || undefined,
    });
  } catch (err) {
    // Two registrations with the same username/email at the same moment
    if (err.code === 11000) {
      throw new HttpError(409, err.keyPattern?.email ? 'EMAIL_TAKEN' : 'USERNAME_TAKEN');
    }
    throw err;
  }
}

// `identifier` is either the username or the email
export async function login({ identifier, password }) {
  if (!isString(identifier) || !identifier.trim() || !isString(password) || !password) {
    throw new HttpError(400, 'MISSING_CREDENTIALS');
  }
  const value = identifier.trim();
  const query = value.includes('@') ? { email: value.toLowerCase() } : { username: value };
  const user = await User.findOne(query).collation({ locale: 'en', strength: 2 }).select('+passwordHash');

  const passwordOk = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !passwordOk) {
    throw new HttpError(401, 'INVALID_CREDENTIALS');
  }
  return user;
}

export async function findSessionUser({ sub, ver }) {
  if (!mongoose.isValidObjectId(sub)) return null;
  const user = await User.findById(sub).lean();
  return user && user.tokenVersion === ver ? user : null;
}
