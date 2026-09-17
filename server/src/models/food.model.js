import mongoose from 'mongoose';

export const FOOD_SOURCES = ['usda', 'custom'];
export const FOOD_CATEGORIES = [
  'dairyEggs',
  'poultry',
  'beef',
  'pork',
  'lambVealGame',
  'sausagesDeli',
  'fishSeafood',
  'legumes',
  'nutsSeeds',
  'grainsPasta',
  'bakedGoods',
  'breakfastCereals',
  'vegetables',
  'fruits',
  'fatsOils',
  'soupsSauces',
  'spicesHerbs',
  'sweets',
  'snacks',
  'beverages',
  'meals',
  'fastFood',
  'restaurant',
  'supplements',
  'other',
];
// Nutrient amounts per 100 g (or 100 ml when basis is "ml")
export const NUTRIENT_FIELDS = [
  'energyKcal',
  'proteinG',
  'carbsG',
  'fatG',
  'fiberG',
  'sugarsG',
  'saturatedFatG',
  'cholesterolMg',
  'sodiumMg',
  'potassiumMg',
  'calciumMg',
  'ironMg',
];

export const FOOD_NAME_COLLATION = { locale: 'en', strength: 2 };

const nutrientsSchema = new mongoose.Schema(
  Object.fromEntries(NUTRIENT_FIELDS.map((field) => [field, { type: Number }])),
  { _id: false },
);

// A household measure, e.g. { label: "1 cup, chopped", amount: 128 } (amount in grams/ml)
const portionSchema = new mongoose.Schema(
  {
    label: { type: String, required: true },
    amount: { type: Number, required: true },
  },
  { _id: false },
);

const foodSchema = new mongoose.Schema(
  {
    source: { type: String, enum: FOOD_SOURCES, required: true },
    // null for USDA foods, the user's id for custom ones
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    // USDA only
    fdcId: { type: Number },
    usdaDataType: { type: String, enum: ['foundation', 'srLegacy'] },
    names: { type: Map, of: String, default: undefined },
    // Custom only
    name: { type: String, trim: true },
    brand: { type: String, trim: true },
    category: { type: String, enum: FOOD_CATEGORIES, required: true },
    basis: { type: String, enum: ['g', 'ml'], default: 'g' },
    isLiquid: { type: Boolean, default: false },
    // Has a hand-written Hebrew name; shown first when browsing
    isFeatured: { type: Boolean, default: false },
    nutrients: { type: nutrientsSchema, required: true },
    portions: { type: [portionSchema], default: [] },
    isArchived: { type: Boolean, default: false },
  },
  { timestamps: true },
);

foodSchema.index({ fdcId: 1 }, { unique: true, partialFilterExpression: { fdcId: { $type: 'number' } } });
foodSchema.index({ owner: 1, isArchived: 1, category: 1 });
foodSchema.index(
  { owner: 1, name: 1 },
  {
    name: 'owner_active_food_name_unique',
    unique: true,
    collation: FOOD_NAME_COLLATION,
    partialFilterExpression: { owner: { $type: 'objectId' }, isArchived: false },
  },
);

export const Food = mongoose.model('Food', foodSchema);
