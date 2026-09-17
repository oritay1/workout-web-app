import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { USDA_HEBREW_NAMES } from '../data/usdaHebrewNames.js';
import { DataVersion } from '../models/dataVersion.model.js';
import { Food } from '../models/food.model.js';

const DATA_FILE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../data/usdaFoods.json.gz');
const VERSION_KEY = 'usdaFoods';
const BATCH_SIZE = 1000;

// Loads the bundled USDA food library (built by scripts/build-usda-foods.js) into the database.
// Skipped when neither the data file nor the Hebrew names changed since the last load
export async function syncUsdaFoods() {
  const raw = fs.readFileSync(DATA_FILE);
  const hash = crypto
    .createHash('sha256')
    .update(raw)
    .update(JSON.stringify(USDA_HEBREW_NAMES))
    .digest('hex');
  const current = await DataVersion.findOne({ key: VERSION_KEY }).lean();
  if (current?.hash === hash) return;

  const foods = JSON.parse(zlib.gunzipSync(raw));
  const started = Date.now();
  for (let index = 0; index < foods.length; index += BATCH_SIZE) {
    await Food.bulkWrite(
      foods.slice(index, index + BATCH_SIZE).map((food) => {
        const hebrew = USDA_HEBREW_NAMES[food.fdcId];
        return {
          updateOne: {
            filter: { fdcId: food.fdcId },
            update: {
              $set: {
                source: 'usda',
                owner: null,
                usdaDataType: food.dataType,
                names: hebrew ? { en: food.name, he: hebrew } : { en: food.name },
                category: food.category,
                basis: 'g',
                isLiquid: food.isLiquid,
                isFeatured: Boolean(hebrew),
                nutrients: food.nutrients,
                portions: food.portions.map(({ label, grams }) => ({ label, amount: grams })),
                isArchived: false,
              },
            },
            upsert: true,
            timestamps: false,
          },
        };
      }),
      { ordered: false },
    );
  }

  // Foods removed from a newer dataset are archived, not deleted (diet logs may still point at them)
  const { modifiedCount: archived } = await Food.updateMany(
    { source: 'usda', fdcId: { $nin: foods.map((food) => food.fdcId) }, isArchived: false },
    { $set: { isArchived: true } },
  );

  await DataVersion.updateOne({ key: VERSION_KEY }, { $set: { hash } }, { upsert: true });
  console.log(`USDA foods synced: ${foods.length} foods, ${archived} archived (${Date.now() - started} ms)`);
}
