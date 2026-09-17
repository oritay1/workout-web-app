import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useParams } from 'react-router'
import { listExercises } from '../../api/exercisesApi.js'
import { createPlan, getPlan, replacePlan } from '../../api/plansApi.js'
import { PLAN_LIMITS } from '../../constants/plans.js'
import { ROUTES } from '../../constants/routes.js'
import { useErrorMessage } from '../../hooks/useErrorMessage.js'
import { useUnsavedChangesWarning } from '../../hooks/useUnsavedChangesWarning.js'
import {
  createEntry,
  createPlanForm,
  createWorkout,
  toFormErrorPath,
  toPlanForm,
  toPlanPayload,
  validatePlanForm,
} from '../../utils/planForm.js'
import ExercisePicker from '../ExercisePicker/ExercisePicker.jsx'
import FormField from '../FormField/FormField.jsx'
import Loader from '../Loader/Loader.jsx'
import SectionCard from '../SectionCard/SectionCard.jsx'
import WeekSchedule from '../WeekSchedule/WeekSchedule.jsx'
import WorkoutEditor from '../WorkoutEditor/WorkoutEditor.jsx'
import './PlanEditorPage.css'


function PlanEditorPage() {
  const { t } = useTranslation()
  const errorMessage = useErrorMessage()
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = Boolean(id)

  // null while loading
  // Default workout names use the UI language's alphabet: Workout A, B... / אימון א, ב...
  const defaultWorkoutName = (index) =>
    t('plans.editor.defaultWorkoutName', { letter: [...t('plans.editor.workoutLetters')][index] ?? index + 1 })

  const [form, setForm] = useState(() => (isEdit ? null : createPlanForm(defaultWorkoutName(0))))
  const [exercises, setExercises] = useState(null)
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [loadError, setLoadError] = useState('')
  const [saving, setSaving] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  // Key of the workout the exercise picker adds to (null = picker closed)
  const [pickerWorkoutKey, setPickerWorkoutKey] = useState(null)

  const allowLeave = useUnsavedChangesWarning(isDirty, t('plans.editor.unsavedConfirm'))

  useEffect(() => {
    listExercises()
      .then((data) => setExercises(data.exercises))
      .catch((err) => setLoadError(err.code))
  }, [])

  useEffect(() => {
    if (!id) return
    getPlan(id)
      .then((data) => setForm(toPlanForm(data.plan)))
      .catch((err) => setLoadError(err.code))
  }, [id])

  function updateForm(changes) {
    setForm((current) => ({ ...current, ...changes }))
    setIsDirty(true)
    setFormError('')
  }

  function updateWorkouts(updater) {
    setForm((current) => ({ ...current, workouts: updater(current.workouts) }))
    setIsDirty(true)
    setFormError('')
    // Paths are index-based, so errors are recomputed on the next save
    setErrors({})
  }

  function addWorkout() {
    updateWorkouts((workouts) => [
      ...workouts,
      createWorkout(defaultWorkoutName(workouts.length)),
    ])
  }

  function moveWorkout(index, offset) {
    updateWorkouts((workouts) => {
      const next = [...workouts]
      const [workout] = next.splice(index, 1)
      next.splice(index + offset, 0, workout)
      return next
    })
  }

  function addExercise(exercise) {
    updateWorkouts((workouts) =>
      workouts.map((workout) =>
        workout.key === pickerWorkoutKey
          ? { ...workout, exercises: [...workout.exercises, createEntry(exercise)] }
          : workout,
      ),
    )
  }

  function focusFirstError() {
    requestAnimationFrame(() => document.querySelector('.plan-editor [aria-invalid="true"]')?.focus())
  }

  async function handleSubmit(event) {
    event.preventDefault()
    const validationErrors = validatePlanForm(form)
    setErrors(validationErrors)
    if (Object.keys(validationErrors).length > 0) {
      setFormError('PLAN_HAS_ERRORS')
      focusFirstError()
      return
    }

    setSaving(true)
    setFormError('')
    try {
      const payload = toPlanPayload(form)
      if (isEdit) await replacePlan(id, payload)
      else await createPlan(payload)
      allowLeave()
      navigate(ROUTES.plans)
    } catch (err) {
      if (err.field) {
        setErrors({ [toFormErrorPath(form, err.field)]: true })
        setFormError('PLAN_HAS_ERRORS')
        focusFirstError()
      } else {
        setFormError(err.code)
      }
      setSaving(false)
    }
  }

  if (loadError) {
    return (
      <section className="plan-editor">
        <p className="section-form__error" role="alert">
          {errorMessage(loadError)}
        </p>
        <Link to={ROUTES.plans}>{t('plans.backToPlans')}</Link>
      </section>
    )
  }

  if (form === null || exercises === null) return <Loader />

  const scheduledCount = form.workouts.reduce((sum, workout) => sum + workout.schedule.length, 0)

  return (
    <form className="plan-editor" onSubmit={handleSubmit} noValidate>
      <Link className="plan-editor__back" to={ROUTES.plans}>
        {t('plans.backToPlans')}
      </Link>
      <h1 className="plan-editor__title">{isEdit ? t('plans.editor.editTitle') : t('plans.editor.newTitle')}</h1>

      <SectionCard title={t('plans.editor.details')}>
        <div className="section-form">
          <FormField
            label={t('plans.editor.name')}
            value={form.name}
            maxLength={PLAN_LIMITS.nameLength}
            placeholder={t('plans.editor.namePlaceholder')}
            error={errors.name ? t('plans.editor.required') : ''}
            onChange={(event) => updateForm({ name: event.target.value })}
          />
          <FormField
            label={t('plans.editor.workoutsPerWeek')}
            type="number"
            inputMode="numeric"
            min={PLAN_LIMITS.workoutsPerWeek.min}
            max={PLAN_LIMITS.workoutsPerWeek.max}
            value={form.workoutsPerWeek}
            error={errors.workoutsPerWeek ? t('health.rangeError', PLAN_LIMITS.workoutsPerWeek) : ''}
            onChange={(event) => updateForm({ workoutsPerWeek: event.target.value })}
          />
          <FormField
            as="textarea"
            label={t('plans.editor.notes')}
            value={form.notes}
            maxLength={PLAN_LIMITS.notesLength}
            placeholder={t('plans.editor.notesPlaceholder')}
            onChange={(event) => updateForm({ notes: event.target.value })}
          />
        </div>
      </SectionCard>

      <h2 className="plan-editor__section-title">{t('plans.editor.workouts')}</h2>
      {form.workouts.map((workout, index) => (
        <WorkoutEditor
          key={workout.key}
          workout={workout}
          index={index}
          total={form.workouts.length}
          errors={errors}
          onChange={(updated) => updateWorkouts((workouts) => workouts.map((item) => (item.key === workout.key ? updated : item)))}
          onMove={(offset) => moveWorkout(index, offset)}
          onRemove={() => updateWorkouts((workouts) => workouts.filter((item) => item.key !== workout.key))}
          onAddExercise={() => setPickerWorkoutKey(workout.key)}
        />
      ))}
      <button
        type="button"
        className="button button--secondary plan-editor__add-workout"
        onClick={addWorkout}
        disabled={form.workouts.length >= PLAN_LIMITS.workouts}
      >
        + {t('plans.editor.addWorkout')}
      </button>

      <SectionCard
        title={t('plans.editor.weekPreview')}
        description={t('plans.editor.scheduledCount', {
          scheduled: scheduledCount,
          count: Number(form.workoutsPerWeek) || 0,
        })}
      >
        <WeekSchedule workouts={form.workouts} />
      </SectionCard>

      <div className="plan-editor__savebar">
        {formError && (
          <p className="section-form__error plan-editor__error" role="alert">
            {errorMessage(formError)}
          </p>
        )}
        <div className="plan-editor__savebar-buttons">
          <Link className="button button--secondary" to={ROUTES.plans}>
            {t('common.cancel')}
          </Link>
          <button className="button button--primary" type="submit" disabled={saving}>
            {saving ? t('common.saving') : t('plans.editor.save')}
          </button>
        </div>
      </div>

      <ExercisePicker
        open={pickerWorkoutKey !== null}
        exercises={exercises}
        onSelect={addExercise}
        onClose={() => setPickerWorkoutKey(null)}
      />
    </form>
  )
}

export default PlanEditorPage
