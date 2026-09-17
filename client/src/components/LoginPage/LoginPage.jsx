import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation, useNavigate } from 'react-router'
import { ROUTES } from '../../constants/routes.js'
import { useAuth } from '../../hooks/useAuth.js'
import { useErrorMessage } from '../../hooks/useErrorMessage.js'
import AuthLayout from '../AuthLayout/AuthLayout.jsx'
import FormField from '../FormField/FormField.jsx'
import PasswordField from '../PasswordField/PasswordField.jsx'

function LoginPage() {
  const { t } = useTranslation()
  const errorMessage = useErrorMessage()
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [errorCode, setErrorCode] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()
    if (!identifier.trim() || !password) {
      setErrorCode('MISSING_CREDENTIALS')
      return
    }
    setSubmitting(true)
    setErrorCode('')
    try {
      await login(identifier, password)
      navigate(location.state?.from ?? ROUTES.home, { replace: true })
    } catch (err) {
      setErrorCode(err.code)
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout
      title={t('auth.loginTitle')}
      subtitle={t('auth.loginSubtitle')}
      footer={
        <>
          {t('auth.noAccount')} <Link to={ROUTES.register}>{t('auth.registerLink')}</Link>
        </>
      }
    >
      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        <FormField
          label={t('auth.identifier')}
          type="text"
          dir="ltr"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          value={identifier}
          onChange={(event) => setIdentifier(event.target.value)}
        />
        <PasswordField
          label={t('auth.password')}
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        {errorCode && (
          <p className="auth-form__error" role="alert">
            {errorMessage(errorCode)}
          </p>
        )}
        <button className="auth-form__submit" type="submit" disabled={submitting}>
          {submitting ? t('auth.loggingIn') : t('auth.loginButton')}
        </button>
      </form>
    </AuthLayout>
  )
}

export default LoginPage
