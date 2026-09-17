import { env } from '../config/env.js';
import { SESSION_COOKIE } from '../middlewares/auth.js';
import * as authService from '../services/auth.service.js';
import { SESSION_TTL_MS, createSessionToken } from '../services/token.service.js';
import { toPublicUser } from '../services/user.service.js';

const cookieOptions = {
  httpOnly: true,
  secure: env.isProduction,
  sameSite: 'lax',
  path: '/',
};

function startSession(res, user) {
  res.cookie(SESSION_COOKIE, createSessionToken(user), { ...cookieOptions, maxAge: SESSION_TTL_MS });
}

export async function register(req, res) {
  const user = await authService.register(req.body ?? {});
  startSession(res, user);
  res.status(201).json({ user: toPublicUser(user) });
}

export async function login(req, res) {
  const user = await authService.login(req.body ?? {});
  startSession(res, user);
  res.json({ user: toPublicUser(user) });
}

export function logout(req, res) {
  res.clearCookie(SESSION_COOKIE, cookieOptions);
  res.status(204).end();
}

export function me(req, res) {
  res.json({ user: toPublicUser(req.user) });
}
