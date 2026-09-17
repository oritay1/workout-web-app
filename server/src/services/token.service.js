import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export const SESSION_TTL_MS = 60 * 24 * 60 * 60 * 1000; // 60 days

export function createSessionToken(user) {
  return jwt.sign({ sub: user._id.toString(), ver: user.tokenVersion }, env.jwtSecret, {
    expiresIn: Math.floor(SESSION_TTL_MS / 1000),
  });
}

// Returns the token payload, or null when the token is missing, expired or forged
export function verifySessionToken(token) {
  if (!token) return null;
  try {
    return jwt.verify(token, env.jwtSecret, { algorithms: ['HS256'] });
  } catch {
    return null;
  }
}
