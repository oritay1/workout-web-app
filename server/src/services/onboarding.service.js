import { HttpError } from '../middlewares/errorHandler.js';
import { parseHealthUpdate, saveHealthUpdate } from './healthProfile.service.js';
import { insertMeasurements, parseMeasurement } from './measurement.service.js';
import { markOnboardingCompleted } from './user.service.js';

const MAX_ONBOARDING_MEASUREMENTS = 10;

// Saves the health screen shown after registration. Called with no data when the user skips it
export async function completeOnboarding(userId, { health = {}, measurements = [] } = {}) {
  if (typeof health !== 'object' || health === null || Array.isArray(health)) {
    throw new HttpError(400, 'INVALID_JSON');
  }
  if (!Array.isArray(measurements) || measurements.length > MAX_ONBOARDING_MEASUREMENTS) {
    throw new HttpError(400, 'INVALID_JSON');
  }

  // Validate everything before writing anything
  const healthUpdate = parseHealthUpdate(health);
  const parsedMeasurements = measurements.map(parseMeasurement);

  if (Object.keys(healthUpdate.set).length) await saveHealthUpdate(userId, healthUpdate);
  if (parsedMeasurements.length) await insertMeasurements(userId, parsedMeasurements);
  return markOnboardingCompleted(userId);
}
