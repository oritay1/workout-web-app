import app from './app.js';
import { env } from './config/env.js';
import { connectDB } from './config/db.js';
import { syncBuiltInExercises } from './services/exercise.service.js';
import { syncUsdaFoods } from './services/usdaFoods.service.js';

try {
  if (!env.jwtSecret) throw new Error('JWT_SECRET is not defined');
  await connectDB();
  await syncBuiltInExercises();
  await syncUsdaFoods();
  app.listen(env.port, () => console.log(`Server listening on port ${env.port}`));
} catch (err) {
  console.error('Failed to start server:', err.message);
  process.exit(1);
}
