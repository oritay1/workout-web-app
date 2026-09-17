import { Router } from 'express';
import * as foodController from '../controllers/food.controller.js';
import { requireAuth } from '../middlewares/auth.js';

const router = Router();

router.use(requireAuth);
router.get('/', foodController.search);
router.post('/', foodController.create);
router.get('/:id', foodController.get);
router.patch('/:id', foodController.update);
router.delete('/:id', foodController.remove);

export default router;
