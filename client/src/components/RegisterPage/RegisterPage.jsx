import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router'
import { ROUTES } from '../../constants/routes.js'
import { ERROR_FIELDS, validateRegistration } from '../../constants/validation.js'
import { useAuth } from '../../hooks/useAuth.js'
import { useErrorMessage } from '../../hooks/useErrorMessage.js'
import AuthLayout from '../AuthLayout/AuthLayout.jsx'
import AvatarUpload from '../AvatarUpload/AvatarUpload.jsx'
import FormField from '../FormField/FormField.jsx'
import PasswordField from '../PasswordField/PasswordField.jsx'

const EMPTY_FORM = { username: '', email: '', phone: '', password: '', avatar: '' }

function RegisterPage() {
  const { t } = useTranslation()
  const errorMessage = useErrorMessage()
  const { register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState(EMPTY_FORM)
  // { field: errorCode }
  const [fieldErrors, setFieldErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [processingAvatar, setProcessingAvatar] = useState(false)

  function setField(name, value) {
    setForm((current) => ({ ...current, [name]: value }))
    setFieldErrors((current) => ({ ...current, [name]: undefined }))
  }

  const inputProps = (name) => ({
    value: form[name],
    onChange: (event) => setField(name, event.target.value),
    error: errorMessage(fieldErrors[name]),
  })

  async function handleSubmit(event) {
    event.preventDefault()
    setFormError('')
    const errors = validateRegistration(form)
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) return

    setSubmitting(true)
    try {
      await register(form)
      navigate(ROUTES.home, { replace: true })
    } catch (err) {
      const field = ERROR_FIELDS[err.code]
      if (field) setFieldErrors({ [field]: err.code })
      else setFormError(err.code)
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout
      title={t('auth.registerTitle')}
      subtitle={t('auth.registerSubtitle')}
      footer={
        <>
          {t('auth.haveAccount')} <Link to={ROUTES.login}>{t('auth.loginLink')}</Link>
        </>
      }
    >
      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        <AvatarUpload
          value={form.avatar}
          onChange={(value) => setField('avatar', value)}
          onProcessingChange={setProcessingAvatar}
          error={errorMessage(fieldErrors.avatar)}
        />
        <FormField
          label={t('auth.username')}
          hint={t('auth.usernameHint')}
          type="text"
          dir="ltr"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          {...inputProps('username')}
        />
        <FormField
          label={t('auth.email')}
          type="email"
          dir="ltr"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          {...inputProps('email')}
        />
        <FormField label={t('auth.phone')} type="tel" dir="ltr" autoComplete="tel" {...inputProps('phone')} />
        <PasswordField
          label={t('auth.password')}
          hint={t('auth.passwordHint')}
          autoComplete="new-password"
          {...inputProps('password')}
        />
        {formError && (
          <p className="auth-form__error" role="alert">
            {errorMessage(formError)}
          </p>
        )}
        <button className="auth-form__submit" type="submit" disabled={submitting || processingAvatar}>
          {submitting ? t('auth.registering') : t('auth.registerButton')}
        </button>
      </form>
    </AuthLayout>
  )
}

export default RegisterPage
