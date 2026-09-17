import { Router } from 'express';
import * as meController from '../controllers/me.controller.js';
import { requireAuth } from '../middlewares/auth.js';

// Everything under /api/me belongs to the logged-in user
const router = Router();

router.use(requireAuth);
router.patch('/', meController.updateMe);
router.post('/onboarding', meController.onboarding);
router.get('/health', meController.getHealth);
router.patch('/health', meController.updateHealth);
router.get('/measurements', meController.listMeasurements);
router.get('/measurements/latest', meController.latestMeasurements);
router.post('/measurements', meController.addMeasurement);
router.delete('/measurements/:id', meController.deleteMeasurement);
router.get('/export.md', meController.exportMarkdown);

export default router;
