import { User, USERNAME_COLLATION } from '../models/user.model.js';
import { HttpError } from '../middlewares/errorHandler.js';
import { parseAvatar, parseEmail, parsePhone, parseUsername } from './accountValidation.js';

// The only user fields ever sent to the client
export function toPublicUser(user) {
  return {
    username: user.username,
    email: user.email,
    phone: user.phone,
    avatar: user.avatar ?? null,
    onboardingCompleted: Boolean(user.onboardingCompleted),
    createdAt: user.createdAt,
  };
}

// Throws 409 when the username or email belongs to another user
export async function assertAvailable({ username, email }, exceptUserId) {
  const notMe = exceptUserId ? { _id: { $ne: exceptUserId } } : {};
  const [usernameTaken, emailTaken] = await Promise.all([
    username && User.exists({ username, ...notMe }).collation(USERNAME_COLLATION),
    email && User.exists({ email, ...notMe }),
  ]);
  if (usernameTaken) throw new HttpError(409, 'USERNAME_TAKEN');
  if (emailTaken) throw new HttpError(409, 'EMAIL_TAKEN');
}

// Unique index violation from two requests racing each other
export function toDuplicateError(err) {
  if (err.code !== 11000) return err;
  return new HttpError(409, err.keyPattern?.email ? 'EMAIL_TAKEN' : 'USERNAME_TAKEN');
}

// Partial update: only the fields present in the request change
export async function updateAccount(userId, input) {
  const set = {};
  const unset = {};
  if ('username' in input) set.username = parseUsername(input.username);
  if ('email' in input) set.email = parseEmail(input.email);
  if ('phone' in input) set.phone = parsePhone(input.phone);
  if ('avatar' in input) {
    const avatar = parseAvatar(input.avatar);
    if (avatar) set.avatar = avatar;
    else unset.avatar = 1;
  }

  await assertAvailable(set, userId);

  try {
    const user = await User.findByIdAndUpdate(
      userId,
      { $set: set, ...(Object.keys(unset).length && { $unset: unset }) },
      { returnDocument: 'after', runValidators: true },
    );
    if (!user) throw new HttpError(401, 'UNAUTHORIZED');
    return user;
  } catch (err) {
    throw toDuplicateError(err);
  }
}

export async function markOnboardingCompleted(userId) {
  return User.findByIdAndUpdate(userId, { onboardingCompleted: true }, { returnDocument: 'after' });
}
