import * as healthProfileService from '../services/healthProfile.service.js';
import * as measurementService from '../services/measurement.service.js';
import { completeOnboarding } from '../services/onboarding.service.js';
import { buildUserContext, parseExportOptions } from '../services/userContext.service.js';
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

// Markdown with all of the user's data (for the user's own AI tools, and later for built-in AI features)
export async function exportMarkdown(req, res) {
  const options = parseExportOptions(req.query);
  const markdown = await buildUserContext(req.user._id, options);
  const safeName = req.user.username.replace(/[^a-zA-Z0-9_.-]/g, '_');
  res
    .type('text/markdown; charset=utf-8')
    .set('Content-Disposition', `attachment; filename="workout-app-${safeName}-${new Date().toISOString().slice(0, 10)}.md"`)
    .set('Cache-Control', 'no-store')
    .send(markdown);
}
