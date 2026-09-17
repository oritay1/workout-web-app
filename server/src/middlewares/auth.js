import { findSessionUser } from '../services/auth.service.js';
import { verifySessionToken } from '../services/token.service.js';
import { HttpError } from './errorHandler.js';

export const SESSION_COOKIE = 'session';

// Loads the logged-in user into req.user, or rejects with 401
export async function requireAuth(req, res, next) {
  const payload = verifySessionToken(req.cookies[SESSION_COOKIE]);
  const user = payload && (await findSessionUser(payload));
  if (!user) {
    res.clearCookie(SESSION_COOKIE, { path: '/' });
    throw new HttpError(401, 'UNAUTHORIZED');
  }
  req.user = user;
  next();
}
