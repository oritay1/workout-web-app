import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { updateHealth } from '../../api/meApi.js'
import { useErrorMessage } from '../../hooks/useErrorMessage.js'
import { toFormValues, toPayload, validateHealthValues } from '../../utils/healthForm.js'
import HealthFields from '../HealthFields/HealthFields.jsx'
import SectionCard from '../SectionCard/SectionCard.jsx'

// One profile card (body / lifestyle / medical) with its own save button
function HealthSection({ sectionId, fields, health, onSaved }) {
  const { t } = useTranslation()
  const errorMessage = useErrorMessage()
  const [values, setValues] = useState(() => toFormValues(health, fields))
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  // 'idle' | 'saving' | 'saved'
  const [status, setStatus] = useState('idle')

  function handleChange(field, value) {
    setValues((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: undefined }))
    setStatus('idle')
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setFormError('')
    const validationErrors = validateHealthValues(values, fields)
    setErrors(validationErrors)
    if (Object.keys(validationErrors).length > 0) return

    setStatus('saving')
    try {
      const data = await updateHealth(toPayload(values, fields))
      setValues(toFormValues(data.health, fields))
      onSaved(data.health)
      setStatus('saved')
    } catch (err) {
      if (err.field && fields.includes(err.field)) setErrors({ [err.field]: err.code })
      else setFormError(err.code)
      setStatus('idle')
    }
  }

  return (
    <SectionCard title={t(`profile.sections.${sectionId}.title`)} description={t(`profile.sections.${sectionId}.description`)}>
      <form className="section-form" onSubmit={handleSubmit} noValidate>
        <HealthFields fields={fields} values={values} errors={errors} onChange={handleChange} />
        <div className="section-form__footer">
          <button className="button button--primary" type="submit" disabled={status === 'saving'}>
            {status === 'saving' ? t('common.saving') : t('common.save')}
          </button>
          {status === 'saved' && (
            <p className="section-form__status" role="status">
              {t('common.saved')}
            </p>
          )}
          {formError && (
            <p className="section-form__error" role="alert">
              {errorMessage(formError)}
            </p>
          )}
        </div>
      </form>
    </SectionCard>
  )
}

export default HealthSection
