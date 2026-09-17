import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { getExerciseHistory } from '../../api/sessionsApi.js'
import { SESSION_LIMITS, SET_FIELDS_BY_TYPE, SET_FIELD_DEFS } from '../../constants/sessions.js'
import { createSet } from '../../utils/sessionForm.js'
import { formatEntryName, formatPlanned, formatSet } from '../../utils/sessionFormat.js'
import SetRow from '../SetRow/SetRow.jsx'
import './SessionExerciseCard.css'

// One exercise in the live workout: plan target, last time's sets and the set rows
function SessionExerciseCard({ entry, sessionId, onChange, onRemove, onSetCompleted }) {
  const { t, i18n } = useTranslation()
  const { exercise } = entry
  const name = formatEntryName(entry, i18n.resolvedLanguage)
  const [lastTime, setLastTime] = useState(null)

  useEffect(() => {
    let cancelled = false
    getExerciseHistory(exercise.id, { exclude: sessionId })
      .then(({ history }) => !cancelled && setLastTime(history[0] ?? null))
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [exercise.id, sessionId])

  const updateSets = (sets) => onChange({ ...entry, sets })

  function updateSet(index, changes) {
    updateSets(entry.sets.map((set, current) => (current === index ? { ...set, ...changes } : set)))
  }

  function toggleComplete(index) {
    const completed = !entry.sets[index].completed
    updateSet(index, { completed })
    if (completed) onSetCompleted(entry)
  }

  const columnLabels = SET_FIELDS_BY_TYPE[exercise.type].map((field) => {
    const { unit } = SET_FIELD_DEFS[field]
    const label = t(`workout.fields.${field}`)
    return unit ? `${label} (${t(`units.${unit}`)})` : label
  })
  const completedCount = entry.sets.filter((set) => set.completed).length

  return (
    <li className="session-exercise">
      <div className="session-exercise__header">
        <div className="session-exercise__title">
          <h2 className="session-exercise__name">{name}</h2>
          <p className="session-exercise__meta">
            {entry.planned ? (
              <>
                {t('workout.plan')}: <span className="session-exercise__value">{formatPlanned(entry.planned, exercise.type, t)}</span>
              </>
            ) : (
              <span className="badge badge--muted">{t('workout.addedDuringWorkout')}</span>
            )}
          </p>
          {entry.planned?.notes && <p className="session-exercise__meta">{entry.planned.notes}</p>}
          {lastTime && (
            <p className="session-exercise__meta">
              {t('workout.lastTime')}:{' '}
              <span className="session-exercise__value">
                {lastTime.sets.map((set) => formatSet(set, exercise.type, t)).join(', ')}
              </span>
            </p>
          )}
        </div>
        <span className="session-exercise__progress" aria-label={t('workout.setsDone', { done: completedCount, total: entry.sets.length })}>
          {completedCount}/{entry.sets.length}
        </span>
      </div>

      <div className="session-exercise__columns" aria-hidden="true">
        <span className="session-exercise__column-spacer" />
        {columnLabels.map((label) => (
          <span key={label} className="session-exercise__column">
            {label}
          </span>
        ))}
        <span className="session-exercise__column-actions" />
      </div>
      <ol className="session-exercise__sets">
        {entry.sets.map((set, index) => (
          <SetRow
            key={set.key}
            set={set}
            number={index + 1}
            type={exercise.type}
            onChange={(field, value) => updateSet(index, { [field]: value })}
            onToggleComplete={() => toggleComplete(index)}
            onRemove={() => updateSets(entry.sets.filter((_, current) => current !== index))}
          />
        ))}
      </ol>

      <div className="session-exercise__footer">
        <button
          type="button"
          className="button button--secondary"
          onClick={() => updateSets([...entry.sets, createSet(entry.sets.at(-1))])}
          disabled={entry.sets.length >= SESSION_LIMITS.setsPerExercise}
        >
          + {t('workout.addSet')}
        </button>
        {/* Planned exercises stay (unfinished sets show as skipped); only added ones can be removed */}
        {!entry.planned && (
          <button type="button" className="button button--danger" onClick={onRemove} aria-label={t('workout.removeExercise', { name })}>
            {t('common.delete')}
          </button>
        )}
      </div>
    </li>
  )
}

export default SessionExerciseCard
