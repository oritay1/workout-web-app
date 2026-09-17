import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useParams } from 'react-router'
import { createExercise, getExercise, updateExercise } from '../../api/exercisesApi.js'
import {
  EQUIPMENT,
  EXERCISE_TYPES,
  MAX_EXERCISE_NAME_LENGTH,
  MAX_EXERCISE_NOTES_LENGTH,
  MUSCLE_GROUPS,
} from '../../constants/exercises.js'
import { ROUTES } from '../../constants/routes.js'
import { useErrorMessage } from '../../hooks/useErrorMessage.js'
import ChipGroup from '../ChipGroup/ChipGroup.jsx'
import FormField from '../FormField/FormField.jsx'
import Loader from '../Loader/Loader.jsx'
import './ExerciseFormPage.css'

const EMPTY_FORM = {
  name: '',
  type: 'strength',
  equipment: 'none',
  primaryMuscles: [],
  secondaryMuscles: [],
  notes: '',
}

const toForm = (exercise) => ({
  name: exercise.name,
  type: exercise.type,
  equipment: exercise.equipment,
  primaryMuscles: exercise.primaryMuscles,
  secondaryMuscles: exercise.secondaryMuscles,
  notes: exercise.notes ?? '',
})

// Create a custom exercise, or edit one (route with :id)
function ExerciseFormPage() {
  const { t } = useTranslation()
  const errorMessage = useErrorMessage()
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = Boolean(id)
  // null while loading an exercise to edit
  const [form, setForm] = useState(isEdit ? null : EMPTY_FORM)
  const [fieldErrors, setFieldErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!id) return
    getExercise(id)
      .then(({ exercise }) => {
        if (exercise.isCustom) setForm(toForm(exercise))
        else setFormError('EXERCISE_NOT_FOUND')
      })
      .catch((err) => setFormError(err.code))
  }, [id])

  function setField(name, value) {
    setForm((current) => ({ ...current, [name]: value }))
    setFieldErrors((current) => ({ ...current, [name]: undefined }))
  }

  // A muscle picked as primary is removed from the secondary list
  function setPrimaryMuscles(primaryMuscles) {
    setForm((current) => ({
      ...current,
      primaryMuscles,
      secondaryMuscles: current.secondaryMuscles.filter((muscle) => !primaryMuscles.includes(muscle)),
    }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setFormError('')
    if (!form.name.trim()) {
      setFieldErrors({ name: 'REQUIRED' })
      return
    }

    setSaving(true)
    const payload = { ...form, name: form.name.trim(), notes: form.notes.trim() || null }
    try {
      if (isEdit) await updateExercise(id, payload)
      else await createExercise(payload)
      navigate(ROUTES.exercises)
    } catch (err) {
      if (err.field === 'name') setFieldErrors({ name: err.code })
      else setFormError(err.code)
      setSaving(false)
    }
  }

  const options = (values, group) =>
    values.map((value) => ({ value, label: t(`exercises.${group}.${value}`) }))

  const nameError =
    fieldErrors.name === 'EXERCISE_NAME_TAKEN'
      ? errorMessage('EXERCISE_NAME_TAKEN')
      : fieldErrors.name
        ? t('exercises.form.nameRequired')
        : ''

  return (
    <section className="exercise-form-page">
      <Link className="exercise-form-page__back" to={ROUTES.exercises}>
        {t('exercises.backToLibrary')}
      </Link>
      <h1 className="exercise-form-page__title">{isEdit ? t('exercises.form.editTitle') : t('exercises.form.newTitle')}</h1>

      {form === null ? (
        formError ? (
          <p className="section-form__error" role="alert">
            {errorMessage(formError)}
          </p>
        ) : (
          <Loader />
        )
      ) : (
        <form className="exercise-form-page__form" onSubmit={handleSubmit} noValidate>
          <FormField
            label={t('exercises.form.name')}
            value={form.name}
            maxLength={MAX_EXERCISE_NAME_LENGTH}
            placeholder={t('exercises.form.namePlaceholder')}
            error={nameError}
            onChange={(event) => setField('name', event.target.value)}
          />
          <FormField as="select" label={t('exercises.form.type')} hint={t(`exercises.typeHints.${form.type}`)} value={form.type} onChange={(event) => setField('type', event.target.value)}>
            {options(EXERCISE_TYPES, 'types').map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </FormField>
          <FormField as="select" label={t('exercises.form.equipment')} value={form.equipment} onChange={(event) => setField('equipment', event.target.value)}>
            {options(EQUIPMENT, 'equipment').map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </FormField>
          <ChipGroup
            label={t('exercises.form.primaryMuscles')}
            options={options(MUSCLE_GROUPS, 'muscles')}
            selected={form.primaryMuscles}
            onChange={setPrimaryMuscles}
          />
          <ChipGroup
            label={t('exercises.form.secondaryMuscles')}
            options={options(
              MUSCLE_GROUPS.filter((muscle) => !form.primaryMuscles.includes(muscle)),
              'muscles',
            )}
            selected={form.secondaryMuscles}
            onChange={(value) => setField('secondaryMuscles', value)}
          />
          <FormField
            as="textarea"
            label={t('exercises.form.notes')}
            value={form.notes}
            maxLength={MAX_EXERCISE_NOTES_LENGTH}
            placeholder={t('exercises.form.notesPlaceholder')}
            onChange={(event) => setField('notes', event.target.value)}
          />
          {formError && (
            <p className="section-form__error" role="alert">
              {errorMessage(formError)}
            </p>
          )}
          <div className="exercise-form-page__actions">
            <button className="button button--primary" type="submit" disabled={saving}>
              {saving ? t('common.saving') : t('common.save')}
            </button>
            <Link className="button button--secondary" to={ROUTES.exercises}>
              {t('common.cancel')}
            </Link>
          </div>
        </form>
      )}
    </section>
  )
}

export default ExerciseFormPage
