import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { User, USERNAME_COLLATION } from '../models/user.model.js';
import { HttpError } from '../middlewares/errorHandler.js';
import { parseAvatar, parseEmail, parsePassword, parsePhone, parseUsername } from './accountValidation.js';
import { assertAvailable, toDuplicateError } from './user.service.js';

const BCRYPT_ROUNDS = 12;

// Compared against when the user doesn't exist, so a wrong username takes as long as a wrong password
const DUMMY_HASH = bcrypt.hashSync('dummy-password', BCRYPT_ROUNDS);

export async function register(input) {
  const username = parseUsername(input.username);
  const email = parseEmail(input.email);
  const phone = parsePhone(input.phone);
  const password = parsePassword(input.password);
  const avatar = parseAvatar(input.avatar);

  await assertAvailable({ username, email });

  try {
    return await User.create({
      username,
      email,
      phone,
      passwordHash: await bcrypt.hash(password, BCRYPT_ROUNDS),
      avatar: avatar ?? undefined,
    });
  } catch (err) {
    throw toDuplicateError(err);
  }
}

// `identifier` is either the username or the email
export async function login({ identifier, password }) {
  if (typeof identifier !== 'string' || !identifier.trim() || typeof password !== 'string' || !password) {
    throw new HttpError(400, 'MISSING_CREDENTIALS');
  }
  const value = identifier.trim();
  const query = value.includes('@') ? { email: value.toLowerCase() } : { username: value };
  const user = await User.findOne(query).collation(USERNAME_COLLATION).select('+passwordHash');

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

// Checks the current password, stores the new one and invalidates every existing session
// (the caller issues a fresh session for the device that made the change)
export async function changePassword(userId, input) {
  const { currentPassword, newPassword } = input ?? {};
  if (typeof currentPassword !== 'string' || !currentPassword) {
    throw new HttpError(400, 'INVALID_CURRENT_PASSWORD', { field: 'currentPassword' });
  }
  const user = await User.findById(userId).select('+passwordHash');
  if (!user) throw new HttpError(401, 'UNAUTHORIZED');
  if (!(await bcrypt.compare(currentPassword, user.passwordHash))) {
    throw new HttpError(400, 'INVALID_CURRENT_PASSWORD', { field: 'currentPassword' });
  }
  try {
    parsePassword(newPassword);
  } catch (err) {
    throw new HttpError(400, err.code, { field: 'newPassword' });
  }
  if (await bcrypt.compare(newPassword, user.passwordHash)) {
    throw new HttpError(400, 'SAME_PASSWORD', { field: 'newPassword' });
  }
  user.passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  user.tokenVersion += 1;
  return user.save();
}
