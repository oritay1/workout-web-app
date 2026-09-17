import { Router } from 'express';
import * as exerciseController from '../controllers/exercise.controller.js';
import { requireAuth } from '../middlewares/auth.js';

const router = Router();

router.use(requireAuth);
router.get('/', exerciseController.list);
router.post('/', exerciseController.create);
router.get('/:id', exerciseController.get);
router.patch('/:id', exerciseController.update);
router.delete('/:id', exerciseController.remove);

export default router;
