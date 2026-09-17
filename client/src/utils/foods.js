import { DEFAULT_LANGUAGE } from '../i18n/languages.js'

// USDA foods have { en, he? } names (Hebrew only for common foods); custom foods have the typed name
export function getFoodName(food, language) {
  if (food.isCustom) return food.name
  return food.names[language] ?? food.names[DEFAULT_LANGUAGE]
}

// Nutrient value for `amount` grams/ml of a food (values are per 100)
export function scaleNutrient(per100, amount) {
  if (per100 === null || per100 === undefined) return null
  return (per100 * amount) / 100
}

export function formatAmount(value, language, maximumFractionDigits = 1) {
  if (value === null || value === undefined) return '—'
  return new Intl.NumberFormat(language, { maximumFractionDigits }).format(value)
}

// Hebrew for USDA household measures: "1 cup, chopped" -> "1 כוס, קצוץ".
// The measure itself ("1 cup") is translated when its words are known; extra details that can't be fully
// translated stay in English in parentheses: "0.5 breast, bone and skin removed" -> "0.5 חזה (bone and skin removed)"
const PORTION_PHRASES = [
  [/\bfl oz\b/g, 'אונקיה נוזלית'],
  [/\bextra large\b/g, 'גדול מאוד'],
]
const PORTION_WORDS = {
  cup: 'כוס',
  cups: 'כוסות',
  tbsp: 'כף',
  tablespoon: 'כף',
  tablespoons: 'כפות',
  tsp: 'כפית',
  teaspoon: 'כפית',
  oz: 'אונקיה',
  lb: 'ליברה',
  slice: 'פרוסה',
  slices: 'פרוסות',
  piece: 'חתיכה',
  pieces: 'חתיכות',
  serving: 'מנה',
  large: 'גדול',
  medium: 'בינוני',
  small: 'קטן',
  jumbo: 'ענק',
  can: 'פחית',
  package: 'אריזה',
  container: 'גביע',
  fillet: 'פילה',
  breast: 'חזה',
  thigh: 'ירך',
  drumstick: 'שוק',
  wing: 'כנף',
  egg: 'ביצה',
  eggs: 'ביצים',
  fruit: 'פרי',
  each: 'יחידה',
  unit: 'יחידה',
  bar: 'חטיף',
  bottle: 'בקבוק',
  milliliter: 'מ״ל',
  chopped: 'קצוץ',
  sliced: 'פרוס',
  diced: 'בקוביות',
  whole: 'שלם',
  raw: 'נא',
  cooked: 'מבושל',
  mashed: 'מעוך',
  shredded: 'מגורר',
  grated: 'מגורר',
  halves: 'חצאים',
  pitted: 'ללא גלעין',
}

function translateWords(text) {
  let result = text.toLowerCase()
  for (const [pattern, hebrew] of PORTION_PHRASES) result = result.replace(pattern, hebrew)
  const words = result.match(/[a-z]+/g) ?? []
  if (words.some((word) => !PORTION_WORDS[word])) return null
  return result.replace(/[a-z]+/g, (word) => PORTION_WORDS[word])
}

export function translatePortionLabel(label, language) {
  if (language !== 'he') return label
  const splitAt = label.search(/[,(]/)
  const head = splitAt === -1 ? label : label.slice(0, splitAt)
  const rest = splitAt === -1 ? '' : label.slice(splitAt).replace(/^[,\s]+/, '').trim()

  const translatedHead = translateWords(head.trim())
  if (!translatedHead) return label
  if (!rest) return translatedHead
  if (rest.startsWith('(')) return `${translatedHead} ${rest}`
  // Only single words after a comma are translated: word-by-word translation of a phrase
  // would reverse Hebrew adjective/noun order
  const translatedRest = /\s/.test(rest) ? null : translateWords(rest)
  return translatedRest ? `${translatedHead}, ${translatedRest}` : `${translatedHead} (${rest})`
}
