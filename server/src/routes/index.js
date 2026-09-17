import { Router } from 'express';
import authRoutes from './auth.routes.js';
import exerciseRoutes from './exercise.routes.js';
import healthRoutes from './health.routes.js';
import meRoutes from './me.routes.js';
import { notFound } from '../middlewares/errorHandler.js';

const router = Router();

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/me', meRoutes);
router.use('/exercises', exerciseRoutes);

// Unknown API paths return JSON 404 instead of falling through to the SPA
router.use(notFound);

export default router;
