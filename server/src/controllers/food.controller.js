import * as foodService from '../services/food.service.js';

export async function search(req, res) {
  res.json(await foodService.searchFoods(req.user._id, req.query));
}

export async function get(req, res) {
  res.json({ food: await foodService.getFood(req.user._id, req.params.id) });
}

export async function create(req, res) {
  res.status(201).json({ food: await foodService.createFood(req.user._id, req.body) });
}

export async function update(req, res) {
  res.json({ food: await foodService.updateFood(req.user._id, req.params.id, req.body) });
}

export async function remove(req, res) {
  await foodService.deleteFood(req.user._id, req.params.id);
  res.status(204).end();
}
