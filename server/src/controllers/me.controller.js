import * as healthProfileService from '../services/healthProfile.service.js';
import * as measurementService from '../services/measurement.service.js';
import { completeOnboarding } from '../services/onboarding.service.js';
import { toPublicUser, updateAccount } from '../services/user.service.js';

export async function updateMe(req, res) {
  const user = await updateAccount(req.user._id, req.body ?? {});
  res.json({ user: toPublicUser(user) });
}

export async function onboarding(req, res) {
  const user = await completeOnboarding(req.user._id, req.body ?? {});
  res.json({ user: toPublicUser(user) });
}

export async function getHealth(req, res) {
  res.json({ health: await healthProfileService.getHealthProfile(req.user._id) });
}

export async function updateHealth(req, res) {
  res.json({ health: await healthProfileService.updateHealthProfile(req.user._id, req.body ?? {}) });
}

export async function listMeasurements(req, res) {
  res.json({ measurements: await measurementService.listMeasurements(req.user._id, req.query.type) });
}

export async function latestMeasurements(req, res) {
  res.json({ latest: await measurementService.getLatestMeasurements(req.user._id) });
}

export async function addMeasurement(req, res) {
  res.status(201).json({ measurement: await measurementService.addMeasurement(req.user._id, req.body) });
}

export async function deleteMeasurement(req, res) {
  await measurementService.deleteMeasurement(req.user._id, req.params.id);
  res.status(204).end();
}
