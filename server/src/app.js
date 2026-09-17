import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import apiRoutes from './routes/index.js';
import { errorHandler } from './middlewares/errorHandler.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientDist = path.resolve(__dirname, '../../client/dist');

const app = express();

// Hosting platforms like Render sit behind a proxy - needed to see the real client IP
if (env.isProduction) app.set('trust proxy', 1);

app.disable('x-powered-by');

// Basic security headers (the app stores health data)
app.use((req, res, next) => {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'same-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  });
  if (env.isProduction) res.set('Strict-Transport-Security', 'max-age=15552000; includeSubDomains');
  next();
});

app.use(compression());
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

app.use('/api', apiRoutes);

// In production the server also serves the built React app (same origin, no CORS)
if (env.isProduction) {
  // Vite puts a content hash in asset file names, so they can be cached for a long time
  app.use('/assets', express.static(path.join(clientDist, 'assets'), { immutable: true, maxAge: '1y' }));
  app.use(express.static(clientDist, { index: false }));
  // index.html is never cached, so a new deploy is picked up on the next visit
  app.get('/{*splat}', (req, res) => {
    res.set('Cache-Control', 'no-cache');
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

app.use(errorHandler);

export default app;
