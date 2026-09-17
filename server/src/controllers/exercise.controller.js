import * as exerciseService from '../services/exercise.service.js';

export async function list(req, res) {
  res.json({ exercises: await exerciseService.listExercises(req.user._id) });
}

export async function get(req, res) {
  res.json({ exercise: await exerciseService.getExercise(req.user._id, req.params.id) });
}

export async function create(req, res) {
  res.status(201).json({ exercise: await exerciseService.createExercise(req.user._id, req.body) });
}

export async function update(req, res) {
  res.json({ exercise: await exerciseService.updateExercise(req.user._id, req.params.id, req.body) });
}

export async function remove(req, res) {
  await exerciseService.deleteExercise(req.user._id, req.params.id);
  res.status(204).end();
}
