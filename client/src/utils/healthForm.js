import { HEALTH_FIELD_DEFS } from '../constants/health.js'

// Converts between API values (numbers, null) and form input values (strings)

export function toFormValues(health, fields) {
  return Object.fromEntries(
    fields.map((field) => {
      const { kind } = HEALTH_FIELD_DEFS[field]
      const value = health?.[field]
      if (kind === 'chips') return [field, value ?? []]
      // Tag lists also keep the text typed but not yet added
      if (kind === 'tags') return [field, { items: value ?? [], draft: '' }]
      return [field, value === null || value === undefined ? '' : String(value)]
    }),
  )
}

// Empty values become null so the server clears them
export function toPayload(values, fields) {
  return Object.fromEntries(
    fields.map((field) => {
      const { kind } = HEALTH_FIELD_DEFS[field]
      const value = values[field]
      if (kind === 'chips') return [field, value]
      if (kind === 'tags') {
        const draft = value.draft.trim()
        return [field, draft && !value.items.includes(draft) ? [...value.items, draft] : value.items]
      }
      if (value.trim() === '') return [field, null]
      return [field, kind === 'number' ? Number(value) : value.trim()]
    }),
  )
}

export function isNumberInRange(value, { min, max }) {
  if (value.trim() === '') return true
  const number = Number(value)
  return Number.isFinite(number) && number >= min && number <= max
}

// Returns { field: 'INVALID_FIELD' } for fields that fail the simple client-side checks
export function validateHealthValues(values, fields) {
  const errors = {}
  for (const field of fields) {
    const def = HEALTH_FIELD_DEFS[field]
    if (def.kind === 'number' && !isNumberInRange(values[field], def)) errors[field] = 'INVALID_FIELD'
    if (def.kind === 'text' && values[field].length > def.maxLength) errors[field] = 'INVALID_FIELD'
  }
  return errors
}
