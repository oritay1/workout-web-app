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
