import { Router } from 'express';
import healthRoutes from './health.routes.js';
import { notFound } from '../middlewares/errorHandler.js';

const router = Router();

router.use('/health', healthRoutes);

// Unknown API paths return JSON 404 instead of falling through to the SPA
router.use(notFound);

export default router;
