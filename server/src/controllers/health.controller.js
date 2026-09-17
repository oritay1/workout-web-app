import { getHealth } from '../services/health.service.js';

export function health(req, res) {
  res.json(getHealth());
}
