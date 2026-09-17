import * as planService from '../services/workoutPlan.service.js';

export async function list(req, res) {
  res.json({ plans: await planService.listPlans(req.user._id) });
}

export async function get(req, res) {
  res.json({ plan: await planService.getPlan(req.user._id, req.params.id) });
}

export async function create(req, res) {
  res.status(201).json({ plan: await planService.createPlan(req.user._id, req.body) });
}

export async function replace(req, res) {
  res.json({ plan: await planService.replacePlan(req.user._id, req.params.id, req.body) });
}

export async function remove(req, res) {
  await planService.deletePlan(req.user._id, req.params.id);
  res.status(204).end();
}

export async function activate(req, res) {
  res.json({ plan: await planService.activatePlan(req.user._id, req.params.id) });
}
