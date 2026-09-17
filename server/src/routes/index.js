import { Router } from 'express';
import authRoutes from './auth.routes.js';
import exerciseRoutes from './exercise.routes.js';
import foodRoutes from './food.routes.js';
import healthRoutes from './health.routes.js';
import meRoutes from './me.routes.js';
import workoutPlanRoutes from './workoutPlan.routes.js';
import workoutSessionRoutes from './workoutSession.routes.js';
import { notFound } from '../middlewares/errorHandler.js';

const router = Router();

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/me', meRoutes);
router.use('/exercises', exerciseRoutes);
router.use('/plans', workoutPlanRoutes);
router.use('/sessions', workoutSessionRoutes);
router.use('/foods', foodRoutes);

// Unknown API paths return JSON 404 instead of falling through to the SPA
router.use(notFound);

export default router;
