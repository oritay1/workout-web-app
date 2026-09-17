import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { MUSCLE_GROUPS } from '../../constants/exercises.js'
import { getExerciseName, matchesFilters, matchesSearch } from '../../utils/exercises.js'
import FormField from '../FormField/FormField.jsx'
import './ExercisePicker.css'

const NO_FILTERS = { muscle: '', equipment: '', type: '', source: '' }

// Modal list of the exercise library. Calls onSelect(exercise) and closes
function ExercisePicker({ open, exercises, onSelect, onClose }) {
  const { t, i18n } = useTranslation()
  const dialogRef = useRef(null)
  const [search, setSearch] = useState('')
  const [muscle, setMuscle] = useState('')

  useEffect(() => {
    const dialog = dialogRef.current
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  const language = i18n.resolvedLanguage
  const results = useMemo(() => {
    const collator = new Intl.Collator(language)
    return exercises
      .filter((exercise) => matchesFilters(exercise, { ...NO_FILTERS, muscle }) && matchesSearch(exercise, search))
      .map((exercise) => ({ exercise, name: getExerciseName(exercise, language) }))
      .sort((a, b) => collator.compare(a.name, b.name))
  }, [exercises, muscle, search, language])

  function close() {
    setSearch('')
    setMuscle('')
    onClose()
  }

  return (
    // The native dialog handles focus trapping and Escape (which fires "cancel", then "close")
    <dialog ref={dialogRef} className="exercise-picker" aria-labelledby="exercise-picker-title" onClose={close}>
      <div className="exercise-picker__header">
        <h2 id="exercise-picker-title" className="exercise-picker__title">
          {t('plans.editor.pickExercise')}
        </h2>
        <button type="button" className="icon-button" onClick={close} aria-label={t('common.close')}>
          ×
        </button>
      </div>
      <div className="exercise-picker__filters">
        <FormField
          label={t('exercises.search')}
          type="search"
          value={search}
          placeholder={t('exercises.searchPlaceholder')}
          onChange={(event) => setSearch(event.target.value)}
        />
        <FormField as="select" label={t('exercises.filters.muscle')} value={muscle} onChange={(event) => setMuscle(event.target.value)}>
          <option value="">{t('exercises.filters.all')}</option>
          {MUSCLE_GROUPS.map((value) => (
            <option key={value} value={value}>
              {t(`exercises.muscles.${value}`)}
            </option>
          ))}
        </FormField>
      </div>
      <ul className="exercise-picker__list">
        {results.length === 0 && <li className="exercise-picker__empty">{t('exercises.empty')}</li>}
        {results.map(({ exercise, name }) => (
          <li key={exercise.id}>
            <button
              type="button"
              className="exercise-picker__option"
              onClick={() => {
                onSelect(exercise)
                close()
              }}
            >
              <span className="exercise-picker__option-name">
                {name}
                {exercise.isCustom && <span className="badge">{t('exercises.customBadge')}</span>}
              </span>
              <span className="exercise-picker__option-meta">
                {t(`exercises.types.${exercise.type}`)} · {t(`exercises.equipment.${exercise.equipment}`)}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </dialog>
  )
}

export default ExercisePicker
