import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { updateAccount } from '../../api/meApi.js'
import { ERROR_FIELDS, validateAccount } from '../../constants/validation.js'
import { useAuth } from '../../hooks/useAuth.js'
import { useErrorMessage } from '../../hooks/useErrorMessage.js'
import AvatarUpload from '../AvatarUpload/AvatarUpload.jsx'
import FormField from '../FormField/FormField.jsx'
import SectionCard from '../SectionCard/SectionCard.jsx'

const ACCOUNT_FIELDS = ['username', 'email', 'phone', 'avatar']

const toForm = (user) => ({ username: user.username, email: user.email, phone: user.phone, avatar: user.avatar ?? '' })

function AccountSection() {
  const { t } = useTranslation()
  const errorMessage = useErrorMessage()
  const { user, updateUser } = useAuth()
  const [form, setForm] = useState(() => toForm(user))
  const [fieldErrors, setFieldErrors] = useState({})
  const [formError, setFormError] = useState('')
  // 'idle' | 'saving' | 'saved'
  const [status, setStatus] = useState('idle')
  const [processingAvatar, setProcessingAvatar] = useState(false)

  function setField(name, value) {
    setForm((current) => ({ ...current, [name]: value }))
    setFieldErrors((current) => ({ ...current, [name]: undefined }))
    setStatus('idle')
  }

  const inputProps = (name) => ({
    value: form[name],
    onChange: (event) => setField(name, event.target.value),
    error: errorMessage(fieldErrors[name]),
  })

  async function handleSubmit(event) {
    event.preventDefault()
    setFormError('')
    const errors = validateAccount(form)
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) return

    // Send only what changed (an unchanged photo is not uploaded again)
    const original = toForm(user)
    const changes = Object.fromEntries(
      ACCOUNT_FIELDS.filter((field) => form[field] !== original[field]).map((field) => [field, form[field] || null]),
    )
    if (Object.keys(changes).length === 0) {
      setStatus('saved')
      return
    }

    setStatus('saving')
    try {
      const data = await updateAccount(changes)
      updateUser(data.user)
      setForm(toForm(data.user))
      setStatus('saved')
    } catch (err) {
      const field = ERROR_FIELDS[err.code]
      if (field) setFieldErrors({ [field]: err.code })
      else setFormError(err.code)
      setStatus('idle')
    }
  }

  return (
    <SectionCard title={t('profile.sections.account.title')} description={t('profile.sections.account.description')}>
      <form className="section-form" onSubmit={handleSubmit} noValidate>
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
        <div className="section-form__footer">
          <button className="button button--primary" type="submit" disabled={status === 'saving' || processingAvatar}>
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

export default AccountSection
