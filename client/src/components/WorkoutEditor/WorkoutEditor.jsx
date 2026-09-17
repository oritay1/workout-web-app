import { useTranslation } from 'react-i18next'
import { PLAN_LIMITS, WEEK_DAYS } from '../../constants/plans.js'
import { getWeekdayName } from '../../utils/weekdays.js'
import FormField from '../FormField/FormField.jsx'
import PlannedExerciseEditor from '../PlannedExerciseEditor/PlannedExerciseEditor.jsx'
import './WorkoutEditor.css'

const move = (items, index, offset) => {
  const next = [...items]
  const [item] = next.splice(index, 1)
  next.splice(index + offset, 0, item)
  return next
}

// One workout card in the plan editor: name, weekly days (+ optional times) and its exercises
function WorkoutEditor({ workout, index, total, errors, onChange, onMove, onRemove, onAddExercise }) {
  const { t, i18n } = useTranslation()
  const path = `workouts.${index}`
  const language = i18n.resolvedLanguage
  const title = workout.name.trim() || t('plans.editor.workoutNumber', { number: index + 1 })

  const update = (changes) => onChange({ ...workout, ...changes })

  function toggleDay(day) {
    const exists = workout.schedule.some((slot) => slot.day === day)
    const schedule = exists
      ? workout.schedule.filter((slot) => slot.day !== day)
      : [...workout.schedule, { day, time: '' }].sort((a, b) => a.day - b.day)
    update({ schedule })
  }

  const setTime = (day, time) =>
    update({ schedule: workout.schedule.map((slot) => (slot.day === day ? { ...slot, time } : slot)) })

  const updateEntry = (entryIndex, changes) =>
    update({
      exercises: workout.exercises.map((entry, current) => (current === entryIndex ? { ...entry, ...changes } : entry)),
    })

  function handleRemove() {
    if (workout.exercises.length > 0 && !window.confirm(t('plans.editor.confirmRemoveWorkout', { name: title }))) return
    onRemove()
  }

  return (
    <section className="workout-editor" aria-label={title}>
      <div className="workout-editor__header">
        <h3 className="workout-editor__title">{title}</h3>
        <div className="workout-editor__buttons">
          <button type="button" className="icon-button" onClick={() => onMove(-1)} disabled={index === 0} aria-label={t('plans.editor.moveUp', { name: title })}>
            ↑
          </button>
          <button type="button" className="icon-button" onClick={() => onMove(1)} disabled={index === total - 1} aria-label={t('plans.editor.moveDown', { name: title })}>
            ↓
          </button>
          <button type="button" className="icon-button icon-button--danger" onClick={handleRemove} aria-label={t('plans.editor.removeWorkout', { name: title })}>
            ×
          </button>
        </div>
      </div>

      <FormField
        label={t('plans.editor.workoutName')}
        value={workout.name}
        maxLength={PLAN_LIMITS.workoutNameLength}
        placeholder={t('plans.editor.workoutNamePlaceholder')}
        error={errors[`${path}.name`] ? t('plans.editor.required') : ''}
        onChange={(event) => update({ name: event.target.value })}
      />

      <fieldset className="workout-editor__days">
        <legend className="workout-editor__legend">{t('plans.editor.days')}</legend>
        <div className="workout-editor__day-buttons">
          {WEEK_DAYS.map((day) => (
            <button
              key={day}
              type="button"
              className="workout-editor__day"
              aria-pressed={workout.schedule.some((slot) => slot.day === day)}
              aria-label={getWeekdayName(day, language, 'long')}
              onClick={() => toggleDay(day)}
            >
              {getWeekdayName(day, language, 'narrow')}
            </button>
          ))}
        </div>
        {workout.schedule.length > 0 && (
          <div className="workout-editor__times">
            {workout.schedule.map((slot) => (
              <FormField
                key={slot.day}
                label={t('plans.editor.timeFor', { day: getWeekdayName(slot.day, language, 'long') })}
                type="time"
                value={slot.time}
                onChange={(event) => setTime(slot.day, event.target.value)}
              />
            ))}
          </div>
        )}
      </fieldset>

      <div className="workout-editor__exercises">
        <h4 className="workout-editor__subtitle">{t('plans.editor.exercises')}</h4>
        {workout.exercises.length === 0 ? (
          <p className="workout-editor__empty">{t('plans.editor.noExercises')}</p>
        ) : (
          <ol className="workout-editor__list">
            {workout.exercises.map((entry, entryIndex) => (
              <PlannedExerciseEditor
                key={entry.key}
                entry={entry}
                path={`${path}.exercises.${entryIndex}`}
                errors={errors}
                isFirst={entryIndex === 0}
                isLast={entryIndex === workout.exercises.length - 1}
                onChange={(field, value) => updateEntry(entryIndex, { [field]: value })}
                onMove={(offset) => update({ exercises: move(workout.exercises, entryIndex, offset) })}
                onRemove={() => update({ exercises: workout.exercises.filter((_, current) => current !== entryIndex) })}
              />
            ))}
          </ol>
        )}
        <button
          type="button"
          className="button button--secondary workout-editor__add"
          onClick={onAddExercise}
          disabled={workout.exercises.length >= PLAN_LIMITS.exercisesPerWorkout}
        >
          + {t('plans.editor.addExercise')}
        </button>
      </div>
    </section>
  )
}

export default WorkoutEditor
