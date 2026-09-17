import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { deleteExercise, listExercises } from '../../api/exercisesApi.js'
import { EQUIPMENT, EXERCISE_TYPES, MUSCLE_GROUPS } from '../../constants/exercises.js'
import { ROUTES } from '../../constants/routes.js'
import { useErrorMessage } from '../../hooks/useErrorMessage.js'
import { getExerciseName, matchesFilters, matchesSearch } from '../../utils/exercises.js'
import ExerciseListItem from '../ExerciseListItem/ExerciseListItem.jsx'
import FormField from '../FormField/FormField.jsx'
import Loader from '../Loader/Loader.jsx'
import './ExercisesPage.css'

const NO_FILTERS = { muscle: '', equipment: '', type: '', source: '' }

function ExercisesPage() {
  const { t, i18n } = useTranslation()
  const errorMessage = useErrorMessage()
  // null while loading
  const [exercises, setExercises] = useState(null)
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState(NO_FILTERS)
  const [errorCode, setErrorCode] = useState('')
  const [deletingId, setDeletingId] = useState(null)

  useEffect(() => {
    listExercises()
      .then((data) => setExercises(data.exercises))
      .catch((err) => setErrorCode(err.code))
  }, [])

  const language = i18n.resolvedLanguage

  const visibleExercises = useMemo(() => {
    if (!exercises) return []
    const collator = new Intl.Collator(language)
    return exercises
      .filter((exercise) => matchesFilters(exercise, filters) && matchesSearch(exercise, search))
      .map((exercise) => ({ exercise, name: getExerciseName(exercise, language) }))
      .sort((a, b) => collator.compare(a.name, b.name))
  }, [exercises, filters, search, language])

  const hasActiveFilters = search.trim() !== '' || Object.values(filters).some(Boolean)

  function setFilter(name, value) {
    setFilters((current) => ({ ...current, [name]: value }))
  }

  function clearFilters() {
    setSearch('')
    setFilters(NO_FILTERS)
  }

  async function handleDelete(exercise, name) {
    if (!window.confirm(t('exercises.confirmDelete', { name }))) return
    setDeletingId(exercise.id)
    setErrorCode('')
    try {
      await deleteExercise(exercise.id)
      setExercises((current) => current.filter((item) => item.id !== exercise.id))
    } catch (err) {
      setErrorCode(err.code)
    } finally {
      setDeletingId(null)
    }
  }

  const selectOptions = (values, group) =>
    values.map((value) => (
      <option key={value} value={value}>
        {t(`exercises.${group}.${value}`)}
      </option>
    ))

  return (
    <section className="exercises-page">
      <div className="exercises-page__header">
        <h1 className="exercises-page__title">{t('exercises.title')}</h1>
        <Link className="button button--primary" to={ROUTES.newExercise}>
          {t('exercises.new')}
        </Link>
      </div>

      <div className="exercises-page__filters">
        <FormField
          label={t('exercises.search')}
          type="search"
          value={search}
          placeholder={t('exercises.searchPlaceholder')}
          onChange={(event) => setSearch(event.target.value)}
        />
        <div className="exercises-page__selects">
          <FormField as="select" label={t('exercises.filters.muscle')} value={filters.muscle} onChange={(event) => setFilter('muscle', event.target.value)}>
            <option value="">{t('exercises.filters.all')}</option>
            {selectOptions(MUSCLE_GROUPS, 'muscles')}
          </FormField>
          <FormField as="select" label={t('exercises.filters.equipment')} value={filters.equipment} onChange={(event) => setFilter('equipment', event.target.value)}>
            <option value="">{t('exercises.filters.all')}</option>
            {selectOptions(EQUIPMENT, 'equipment')}
          </FormField>
          <FormField as="select" label={t('exercises.filters.type')} value={filters.type} onChange={(event) => setFilter('type', event.target.value)}>
            <option value="">{t('exercises.filters.all')}</option>
            {selectOptions(EXERCISE_TYPES, 'types')}
          </FormField>
          <FormField as="select" label={t('exercises.filters.source')} value={filters.source} onChange={(event) => setFilter('source', event.target.value)}>
            <option value="">{t('exercises.filters.all')}</option>
            <option value="builtIn">{t('exercises.filters.builtIn')}</option>
            <option value="custom">{t('exercises.filters.custom')}</option>
          </FormField>
        </div>
      </div>

      {errorCode && (
        <p className="section-form__error" role="alert">
          {errorMessage(errorCode)}
        </p>
      )}

      {exercises === null ? (
        !errorCode && <Loader />
      ) : (
        <>
          <div className="exercises-page__summary">
            <p className="exercises-page__count" role="status">
              {t('exercises.count', { count: visibleExercises.length })}
            </p>
            {hasActiveFilters && (
              <button type="button" className="exercises-page__clear" onClick={clearFilters}>
                {t('exercises.filters.clear')}
              </button>
            )}
          </div>
          {visibleExercises.length === 0 ? (
            <p className="exercises-page__empty">{t('exercises.empty')}</p>
          ) : (
            <ul className="exercises-page__list">
              {visibleExercises.map(({ exercise, name }) => (
                <ExerciseListItem
                  key={exercise.id}
                  exercise={exercise}
                  name={name}
                  onDelete={handleDelete}
                  deleting={deletingId === exercise.id}
                />
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  )
}

export default ExercisesPage
