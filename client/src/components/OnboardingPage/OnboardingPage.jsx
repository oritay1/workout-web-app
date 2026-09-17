import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Navigate, useNavigate } from 'react-router'
import { completeOnboarding } from '../../api/meApi.js'
import { MEASUREMENT_TYPES } from '../../constants/health.js'
import { ROUTES } from '../../constants/routes.js'
import { useAuth } from '../../hooks/useAuth.js'
import { useErrorMessage } from '../../hooks/useErrorMessage.js'
import { toDateInputValue } from '../../utils/date.js'
import { isNumberInRange, toFormValues, toPayload, validateHealthValues } from '../../utils/healthForm.js'
import FormField from '../FormField/FormField.jsx'
import HealthFields from '../HealthFields/HealthFields.jsx'
import './OnboardingPage.css'

const ABOUT_FIELDS = ['sex', 'dateOfBirth', 'heightCm']
const GOAL_FIELDS = ['activityLevel', 'goal', 'targetWeightKg']
const HEALTH_FIELDS = [...ABOUT_FIELDS, ...GOAL_FIELDS]
const MEASUREMENTS = ['weight', 'bodyFat', 'restingHeartRate']

// Shown once, right after registration. Everything is optional and the whole screen can be skipped
function OnboardingPage() {
  const { t } = useTranslation()
  const errorMessage = useErrorMessage()
  const { user, updateUser } = useAuth()
  const navigate = useNavigate()
  const [values, setValues] = useState(() => toFormValues({}, HEALTH_FIELDS))
  const [measurements, setMeasurements] = useState({ weight: '', bodyFat: '', restingHeartRate: '' })
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  // null | 'save' | 'skip'
  const [pending, setPending] = useState(null)

  if (user.onboardingCompleted) return <Navigate to={ROUTES.home} replace />

  function handleChange(field, value) {
    setValues((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: undefined }))
  }

  function handleMeasurementChange(type, value) {
    setMeasurements((current) => ({ ...current, [type]: value }))
    setErrors((current) => ({ ...current, [type]: undefined }))
  }

  async function finish(action, data) {
    setPending(action)
    setFormError('')
    try {
      const result = await completeOnboarding(data)
      updateUser(result.user)
      navigate(ROUTES.home, { replace: true })
    } catch (err) {
      if (err.field && err.field in values) setErrors({ [err.field]: err.code })
      else setFormError(err.code)
      setPending(null)
    }
  }

  function handleSubmit(event) {
    event.preventDefault()
    const validationErrors = validateHealthValues(values, HEALTH_FIELDS)
    for (const type of MEASUREMENTS) {
      if (!isNumberInRange(measurements[type], MEASUREMENT_TYPES[type].inputs.value)) validationErrors[type] = true
    }
    setErrors(validationErrors)
    if (Object.keys(validationErrors).length > 0) return

    const date = toDateInputValue()
    finish('save', {
      health: toPayload(values, HEALTH_FIELDS),
      measurements: MEASUREMENTS.filter((type) => measurements[type].trim() !== '').map((type) => ({
        type,
        date,
        value: Number(measurements[type]),
      })),
    })
  }

  return (
    <section className="onboarding">
      <h1 className="onboarding__title">{t('onboarding.title')}</h1>
      <p className="onboarding__subtitle">{t('onboarding.subtitle')}</p>

      <form className="onboarding__form" onSubmit={handleSubmit} noValidate>
        <div className="onboarding__group">
          <h2 className="onboarding__group-title">{t('onboarding.about')}</h2>
          <HealthFields fields={ABOUT_FIELDS} values={values} errors={errors} onChange={handleChange} />
        </div>

        <div className="onboarding__group">
          <h2 className="onboarding__group-title">{t('onboarding.measurements')}</h2>
          {MEASUREMENTS.map((type) => {
            const { unit, inputs } = MEASUREMENT_TYPES[type]
            return (
              <FormField
                key={type}
                label={t('health.labelWithUnit', { label: t(`measurements.types.${type}`), unit: t(`units.${unit}`) })}
                type="number"
                inputMode="decimal"
                {...inputs.value}
                value={measurements[type]}
                error={errors[type] ? t('health.rangeError', inputs.value) : ''}
                onChange={(event) => handleMeasurementChange(type, event.target.value)}
              />
            )
          })}
        </div>

        <div className="onboarding__group">
          <h2 className="onboarding__group-title">{t('onboarding.goals')}</h2>
          <HealthFields fields={GOAL_FIELDS} values={values} errors={errors} onChange={handleChange} />
        </div>

        <p className="onboarding__note">{t('onboarding.moreInProfile')}</p>

        {formError && (
          <p className="section-form__error" role="alert">
            {errorMessage(formError)}
          </p>
        )}

        <div className="onboarding__actions">
          <button className="button button--primary" type="submit" disabled={pending !== null}>
            {pending === 'save' ? t('common.saving') : t('onboarding.save')}
          </button>
          <button
            className="button button--secondary"
            type="button"
            disabled={pending !== null}
            onClick={() => finish('skip')}
          >
            {t('onboarding.skip')}
          </button>
        </div>
      </form>
    </section>
  )
}

export default OnboardingPage
