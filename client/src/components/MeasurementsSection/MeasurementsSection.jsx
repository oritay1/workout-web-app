import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { addMeasurement, deleteMeasurement, getLatestMeasurements, listMeasurements } from '../../api/meApi.js'
import { MEASUREMENT_TYPES } from '../../constants/health.js'
import { useErrorMessage } from '../../hooks/useErrorMessage.js'
import { formatDate, toDateInputValue } from '../../utils/date.js'
import { isNumberInRange } from '../../utils/healthForm.js'
import FormField from '../FormField/FormField.jsx'
import Loader from '../Loader/Loader.jsx'
import SectionCard from '../SectionCard/SectionCard.jsx'
import './MeasurementsSection.css'

const TYPES = Object.keys(MEASUREMENT_TYPES)
const emptyEntry = () => ({ date: toDateInputValue(), value: '', systolic: '', diastolic: '' })

function MeasurementsSection() {
  const { t, i18n } = useTranslation()
  const errorMessage = useErrorMessage()
  const [selectedType, setSelectedType] = useState('weight')
  const [latest, setLatest] = useState(null)
  // null while loading
  const [history, setHistory] = useState(null)
  const [entry, setEntry] = useState(emptyEntry)
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [adding, setAdding] = useState(false)

  const { unit, inputs } = MEASUREMENT_TYPES[selectedType]
  const unitLabel = t(`units.${unit}`)

  const formatValue = (measurement) =>
    measurement.type === 'bloodPressure'
      ? `${measurement.systolic}/${measurement.diastolic} ${t(`units.${MEASUREMENT_TYPES.bloodPressure.unit}`)}`
      : `${measurement.value} ${t(`units.${MEASUREMENT_TYPES[measurement.type].unit}`)}`

  const refresh = useCallback(async (type) => {
    const [latestData, historyData] = await Promise.all([getLatestMeasurements(), listMeasurements(type)])
    setLatest(latestData.latest)
    setHistory(historyData.measurements)
  }, [])

  useEffect(() => {
    let cancelled = false
    listMeasurements(selectedType)
      .then((data) => !cancelled && setHistory(data.measurements))
      .catch((err) => !cancelled && setFormError(err.code))
    return () => {
      cancelled = true
    }
  }, [selectedType])

  useEffect(() => {
    getLatestMeasurements()
      .then((data) => setLatest(data.latest))
      .catch((err) => setFormError(err.code))
  }, [])

  function selectType(type) {
    if (type === selectedType) return
    setSelectedType(type)
    setHistory(null)
    setEntry(emptyEntry())
    setErrors({})
    setFormError('')
  }

  function setEntryField(name, value) {
    setEntry((current) => ({ ...current, [name]: value }))
    setErrors((current) => ({ ...current, [name]: undefined }))
  }

  async function handleAdd(event) {
    event.preventDefault()
    setFormError('')
    const validationErrors = {}
    if (!entry.date) validationErrors.date = true
    for (const [name, range] of Object.entries(inputs)) {
      if (entry[name].trim() === '' || !isNumberInRange(entry[name], range)) validationErrors[name] = true
    }
    if (
      selectedType === 'bloodPressure' &&
      !validationErrors.systolic &&
      !validationErrors.diastolic &&
      Number(entry.diastolic) >= Number(entry.systolic)
    ) {
      validationErrors.diastolic = true
    }
    setErrors(validationErrors)
    if (Object.keys(validationErrors).length > 0) return

    setAdding(true)
    try {
      await addMeasurement({
        type: selectedType,
        date: entry.date,
        ...Object.fromEntries(Object.keys(inputs).map((name) => [name, Number(entry[name])])),
      })
      setEntry(emptyEntry())
      await refresh(selectedType)
    } catch (err) {
      if (err.field && err.field in entry) setErrors({ [err.field]: true })
      else setFormError(err.code)
    } finally {
      setAdding(false)
    }
  }

  async function handleDelete(id) {
    setFormError('')
    try {
      await deleteMeasurement(id)
      await refresh(selectedType)
    } catch (err) {
      setFormError(err.code)
    }
  }

  const inputError = (name) => {
    if (!errors[name]) return ''
    if (name === 'date') return t('errors.INVALID_FIELD')
    if (name === 'diastolic' && selectedType === 'bloodPressure' && isNumberInRange(entry.diastolic, inputs.diastolic)) {
      return t('measurements.diastolicError')
    }
    return t('health.rangeError', inputs[name])
  }

  return (
    <SectionCard title={t('profile.sections.measurements.title')} description={t('profile.sections.measurements.description')}>
      <div className="measurements__tiles">
        {TYPES.map((type) => (
          <button
            key={type}
            type="button"
            className="measurements__tile"
            aria-pressed={type === selectedType}
            onClick={() => selectType(type)}
          >
            <span className="measurements__tile-label">{t(`measurements.types.${type}`)}</span>
            <span className="measurements__tile-value">
              {latest?.[type] ? formatValue(latest[type]) : '—'}
            </span>
            {latest?.[type] && (
              <span className="measurements__tile-date">{formatDate(latest[type].date, i18n.language)}</span>
            )}
          </button>
        ))}
      </div>

      <form className="measurements__form" onSubmit={handleAdd} noValidate>
        <h3 className="measurements__subtitle">
          {t('measurements.addTitle', { type: t(`measurements.types.${selectedType}`) })}
        </h3>
        <div className="measurements__inputs">
          <FormField
            label={t('measurements.date')}
            type="date"
            max={toDateInputValue()}
            value={entry.date}
            error={inputError('date')}
            onChange={(event) => setEntryField('date', event.target.value)}
          />
          {Object.entries(inputs).map(([name, range]) => (
            <FormField
              key={`${selectedType}-${name}`}
              label={t('health.labelWithUnit', { label: t(`measurements.inputs.${name}`), unit: unitLabel })}
              type="number"
              inputMode="decimal"
              min={range.min}
              max={range.max}
              step={range.step}
              value={entry[name]}
              error={inputError(name)}
              onChange={(event) => setEntryField(name, event.target.value)}
            />
          ))}
        </div>
        <div className="section-form__footer">
          <button className="button button--primary" type="submit" disabled={adding}>
            {adding ? t('common.saving') : t('measurements.add')}
          </button>
          {formError && (
            <p className="section-form__error" role="alert">
              {errorMessage(formError)}
            </p>
          )}
        </div>
      </form>

      <h3 className="measurements__subtitle">{t('measurements.history')}</h3>
      {history === null ? (
        <Loader />
      ) : history.length === 0 ? (
        <p className="measurements__empty">{t('measurements.empty')}</p>
      ) : (
        <ul className="measurements__history">
          {history.map((measurement) => {
            const date = formatDate(measurement.date, i18n.language)
            return (
              <li key={measurement.id} className="measurements__row">
                <span className="measurements__row-date">{date}</span>
                <span className="measurements__row-value">{formatValue(measurement)}</span>
                <button
                  type="button"
                  className="measurements__delete"
                  onClick={() => handleDelete(measurement.id)}
                  aria-label={t('measurements.delete', { date })}
                >
                  ×
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </SectionCard>
  )
}

export default MeasurementsSection
