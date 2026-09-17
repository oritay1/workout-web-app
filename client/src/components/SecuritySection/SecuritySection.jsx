import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { changePassword } from '../../api/authApi.js'
import { MAX_PASSWORD_BYTES, MIN_PASSWORD_LENGTH } from '../../constants/validation.js'
import { useAuth } from '../../hooks/useAuth.js'
import { useErrorMessage } from '../../hooks/useErrorMessage.js'
import PasswordField from '../PasswordField/PasswordField.jsx'
import SectionCard from '../SectionCard/SectionCard.jsx'

const EMPTY = { currentPassword: '', newPassword: '' }

function SecuritySection() {
  const { t } = useTranslation()
  const errorMessage = useErrorMessage()
  const { user, updateUser } = useAuth()
  const [form, setForm] = useState(EMPTY)
  const [fieldErrors, setFieldErrors] = useState({})
  const [formError, setFormError] = useState('')
  // 'idle' | 'saving' | 'saved'
  const [status, setStatus] = useState('idle')

  function setField(name, value) {
    setForm((current) => ({ ...current, [name]: value }))
    setFieldErrors((current) => ({ ...current, [name]: undefined }))
    setStatus('idle')
    setFormError('')
  }

  async function handleSubmit(event) {
    event.preventDefault()
    const errors = {}
    if (!form.currentPassword) errors.currentPassword = 'INVALID_CURRENT_PASSWORD'
    const { length } = form.newPassword
    if (length < MIN_PASSWORD_LENGTH || new TextEncoder().encode(form.newPassword).length > MAX_PASSWORD_BYTES) {
      errors.newPassword = 'INVALID_PASSWORD'
    } else if (form.newPassword === form.currentPassword) {
      errors.newPassword = 'SAME_PASSWORD'
    }
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) return

    setStatus('saving')
    try {
      const data = await changePassword(form.currentPassword, form.newPassword)
      updateUser(data.user)
      setForm(EMPTY)
      setStatus('saved')
    } catch (err) {
      if (err.field) setFieldErrors({ [err.field]: err.code })
      else setFormError(err.code)
      setStatus('idle')
    }
  }

  return (
    <SectionCard title={t('security.title')} description={t('security.description')}>
      <form className="section-form" onSubmit={handleSubmit} noValidate>
        {/* Helps password managers pair the new password with the account */}
        <input type="text" name="username" autoComplete="username" value={user.username} hidden readOnly />
        <PasswordField
          label={t('security.currentPassword')}
          autoComplete="current-password"
          value={form.currentPassword}
          error={errorMessage(fieldErrors.currentPassword)}
          onChange={(event) => setField('currentPassword', event.target.value)}
        />
        <PasswordField
          label={t('security.newPassword')}
          hint={t('auth.passwordHint')}
          autoComplete="new-password"
          value={form.newPassword}
          error={errorMessage(fieldErrors.newPassword)}
          onChange={(event) => setField('newPassword', event.target.value)}
        />
        <div className="section-form__footer">
          <button className="button button--primary" type="submit" disabled={status === 'saving'}>
            {status === 'saving' ? t('common.saving') : t('security.change')}
          </button>
          {status === 'saved' && (
            <p className="section-form__status" role="status">
              {t('security.changed')}
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

export default SecuritySection
