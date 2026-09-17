import * as dailyLogService from '../services/dailyLog.service.js';
import * as dietPlanService from '../services/dietPlan.service.js';

export async function listPlans(req, res) {
  res.json({ plans: await dietPlanService.listPlans(req.user._id) });
}

export async function getPlan(req, res) {
  res.json({ plan: await dietPlanService.getPlan(req.user._id, req.params.id) });
}

export async function createPlan(req, res) {
  res.status(201).json({ plan: await dietPlanService.createPlan(req.user._id, req.body) });
}

export async function replacePlan(req, res) {
  res.json({ plan: await dietPlanService.replacePlan(req.user._id, req.params.id, req.body) });
}

export async function deletePlan(req, res) {
  await dietPlanService.deletePlan(req.user._id, req.params.id);
  res.status(204).end();
}

export async function activatePlan(req, res) {
  res.json({ plan: await dietPlanService.activatePlan(req.user._id, req.params.id) });
}

export async function getDay(req, res) {
  res.json({ day: await dailyLogService.getDay(req.user._id, req.params.date) });
}

export async function addEntry(req, res) {
  res.status(201).json({ day: await dailyLogService.addEntry(req.user._id, req.params.date, req.body) });
}

export async function addPlanMeal(req, res) {
  res.status(201).json({ day: await dailyLogService.addPlanMeal(req.user._id, req.params.date, req.params.mealId) });
}

export async function updateEntry(req, res) {
  res.json({ day: await dailyLogService.updateEntry(req.user._id, req.params.date, req.params.entryId, req.body) });
}

export async function deleteEntry(req, res) {
  res.json({ day: await dailyLogService.deleteEntry(req.user._id, req.params.date, req.params.entryId) });
}

export async function setWater(req, res) {
  res.json({ day: await dailyLogService.setWater(req.user._id, req.params.date, req.body) });
}

export async function syncTargets(req, res) {
  res.json({ day: await dailyLogService.syncTargets(req.user._id, req.params.date) });
}
