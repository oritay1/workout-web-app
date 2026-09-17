import { useTranslation } from 'react-i18next'
import { SET_FIELDS_BY_TYPE, SET_FIELD_DEFS } from '../../constants/sessions.js'
import './SetRow.css'

function SetRow({ set, number, type, onChange, onToggleComplete, onRemove }) {
  const { t } = useTranslation()

  return (
    <li className={`set-row${set.completed ? ' set-row--completed' : ''}`}>
      <span className="set-row__number" aria-hidden="true">
        {number}
      </span>
      <div className="set-row__inputs">
        {SET_FIELDS_BY_TYPE[type].map((field) => {
          const def = SET_FIELD_DEFS[field]
          return (
            <input
              key={field}
              className="set-row__input"
              type="number"
              inputMode={def.integer ? 'numeric' : 'decimal'}
              min={def.min}
              max={def.max}
              step={def.step}
              value={set[field]}
              aria-label={t('workout.setField', { number, field: t(`workout.fields.${field}`) })}
              onChange={(event) => onChange(field, event.target.value)}
            />
          )
        })}
      </div>
      <button
        type="button"
        className="set-row__complete"
        aria-pressed={set.completed}
        aria-label={t('workout.completeSet', { number })}
        onClick={onToggleComplete}
      >
        ✓
      </button>
      <button type="button" className="icon-button set-row__remove" aria-label={t('workout.removeSet', { number })} onClick={onRemove}>
        ×
      </button>
    </li>
  )
}

export default SetRow
