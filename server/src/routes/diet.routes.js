import { Router } from 'express';
import * as dietController from '../controllers/diet.controller.js';
import { requireAuth } from '../middlewares/auth.js';

const router = Router();

router.use(requireAuth);

router.get('/plans', dietController.listPlans);
router.post('/plans', dietController.createPlan);
router.get('/plans/:id', dietController.getPlan);
router.put('/plans/:id', dietController.replacePlan);
router.delete('/plans/:id', dietController.deletePlan);
router.post('/plans/:id/activate', dietController.activatePlan);

// :date is the user's local calendar date, "YYYY-MM-DD"
router.get('/days/:date', dietController.getDay);
router.post('/days/:date/entries', dietController.addEntry);
router.patch('/days/:date/entries/:entryId', dietController.updateEntry);
router.delete('/days/:date/entries/:entryId', dietController.deleteEntry);
router.post('/days/:date/plan-meals/:mealId', dietController.addPlanMeal);
router.put('/days/:date/water', dietController.setWater);
router.post('/days/:date/sync-targets', dietController.syncTargets);

export default router;
