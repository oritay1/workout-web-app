import rateLimit from 'express-rate-limit';

const tooManyRequests = { code: 'TOO_MANY_REQUESTS' };

// Slows down password guessing - only failed attempts count
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  message: tooManyRequests,
});

export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  message: tooManyRequests,
});

// Guessing the current password from a stolen session
export const passwordChangeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  message: tooManyRequests,
});
