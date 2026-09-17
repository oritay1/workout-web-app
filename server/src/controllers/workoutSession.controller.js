import * as sessionService from '../services/workoutSession.service.js';

export async function current(req, res) {
  res.json({ session: await sessionService.getCurrentSession(req.user._id) });
}

export async function list(req, res) {
  res.json(await sessionService.listSessions(req.user._id, req.query));
}

export async function start(req, res) {
  res.status(201).json({ session: await sessionService.startSession(req.user._id, req.body ?? {}) });
}

export async function get(req, res) {
  res.json({ session: await sessionService.getSession(req.user._id, req.params.id) });
}

export async function replace(req, res) {
  res.json({ session: await sessionService.replaceSession(req.user._id, req.params.id, req.body) });
}

export async function finish(req, res) {
  res.json({ session: await sessionService.finishSession(req.user._id, req.params.id) });
}

export async function remove(req, res) {
  await sessionService.deleteSession(req.user._id, req.params.id);
  res.status(204).end();
}

export async function exerciseHistory(req, res) {
  res.json({ history: await sessionService.getExerciseHistory(req.user._id, req.params.id, req.query) });
}
