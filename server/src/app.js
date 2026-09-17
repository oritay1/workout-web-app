import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { env } from './config/env.js';
import apiRoutes from './routes/index.js';
import { errorHandler } from './middlewares/errorHandler.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientDist = path.resolve(__dirname, '../../client/dist');

const app = express();

// Hosting platforms like Render sit behind a proxy - needed to see the real client IP
if (env.isProduction) app.set('trust proxy', 1);

app.disable('x-powered-by');
app.use(express.json({ limit: '1mb' }));

app.use('/api', apiRoutes);

// In production the server also serves the built React app (same origin, no CORS)
if (env.isProduction) {
  app.use(express.static(clientDist));
  app.get('/{*splat}', (req, res) => res.sendFile(path.join(clientDist, 'index.html')));
}

app.use(errorHandler);

export default app;
