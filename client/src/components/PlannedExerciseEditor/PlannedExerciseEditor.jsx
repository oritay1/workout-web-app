import { useTranslation } from 'react-i18next'
import { ENTRY_FIELDS_BY_TYPE, ENTRY_FIELD_DEFS, PLAN_LIMITS } from '../../constants/plans.js'
import { getExerciseName } from '../../utils/exercises.js'
import FormField from '../FormField/FormField.jsx'
import './PlannedExerciseEditor.css'

// One exercise inside a workout: its targets (depend on the exercise type), notes, move and remove
function PlannedExerciseEditor({ entry, path, errors, onChange, onMove, onRemove, isFirst, isLast }) {
  const { t, i18n } = useTranslation()
  const { exercise } = entry
  const name = getExerciseName(exercise, i18n.resolvedLanguage)

  const fieldLabel = (field) => {
    const { unit } = ENTRY_FIELD_DEFS[field]
    const label = t(`plans.editor.fields.${field}`)
    return unit ? t('health.labelWithUnit', { label, unit: t(`units.${unit}`) }) : label
  }

  const fieldError = (field) => {
    if (!errors[`${path}.${field}`]) return ''
    const def = ENTRY_FIELD_DEFS[field]
    if (field === 'repsMax' && entry.repsMax.trim() && Number(entry.repsMax) >= def.min && Number(entry.repsMax) <= def.max) {
      return t('plans.editor.repsMaxError')
    }
    if (def.required && !(entry[field] ?? '').trim()) return t('plans.editor.required')
    return t('health.rangeError', def)
  }

  return (
    <li className="planned-exercise">
      <div className="planned-exercise__header">
        <div className="planned-exercise__title">
          <span className="planned-exercise__name">{name}</span>
          <span className="planned-exercise__type">
            {t(`exercises.types.${exercise.type}`)}
            {exercise.isArchived && <span className="badge badge--muted">{t('plans.editor.archived')}</span>}
          </span>
        </div>
        <div className="planned-exercise__buttons">
          <button type="button" className="icon-button" onClick={() => onMove(-1)} disabled={isFirst} aria-label={t('plans.editor.moveUp', { name })}>
            ↑
          </button>
          <button type="button" className="icon-button" onClick={() => onMove(1)} disabled={isLast} aria-label={t('plans.editor.moveDown', { name })}>
            ↓
          </button>
          <button type="button" className="icon-button icon-button--danger" onClick={onRemove} aria-label={t('plans.editor.removeExercise', { name })}>
            ×
          </button>
        </div>
      </div>
      <div className="planned-exercise__fields">
        {ENTRY_FIELDS_BY_TYPE[exercise.type].map((field) => {
          const def = ENTRY_FIELD_DEFS[field]
          return (
            <FormField
              key={field}
              label={fieldLabel(field)}
              type="number"
              inputMode={def.integer ? 'numeric' : 'decimal'}
              min={def.min}
              max={def.max}
              step={def.step}
              value={entry[field] ?? ''}
              error={fieldError(field)}
              onChange={(event) => onChange(field, event.target.value)}
            />
          )
        })}
      </div>
      <FormField
        label={t('plans.editor.fields.notes')}
        value={entry.notes}
        maxLength={PLAN_LIMITS.entryNotesLength}
        placeholder={t('plans.editor.entryNotesPlaceholder')}
        onChange={(event) => onChange('notes', event.target.value)}
      />
    </li>
  )
}

export default PlannedExerciseEditor
