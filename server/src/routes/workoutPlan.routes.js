import { Router } from 'express';
import * as planController from '../controllers/workoutPlan.controller.js';
import { requireAuth } from '../middlewares/auth.js';

const router = Router();

router.use(requireAuth);
router.get('/', planController.list);
router.post('/', planController.create);
router.get('/:id', planController.get);
router.put('/:id', planController.replace);
router.delete('/:id', planController.remove);
router.post('/:id/activate', planController.activate);

export default router;
