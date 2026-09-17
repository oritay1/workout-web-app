import { Router } from 'express';
import * as sessionController from '../controllers/workoutSession.controller.js';
import { requireAuth } from '../middlewares/auth.js';

const router = Router();

router.use(requireAuth);
router.get('/', sessionController.list);
router.post('/', sessionController.start);
router.get('/current', sessionController.current);
router.get('/:id', sessionController.get);
router.put('/:id', sessionController.replace);
router.post('/:id/finish', sessionController.finish);
router.delete('/:id', sessionController.remove);

export default router;
