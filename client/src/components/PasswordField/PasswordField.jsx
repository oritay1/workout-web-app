import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import FormField from '../FormField/FormField.jsx'
import './PasswordField.css'

function PasswordField(props) {
  const { t } = useTranslation()
  const [visible, setVisible] = useState(false)

  return (
    <FormField {...props} type={visible ? 'text' : 'password'} dir="ltr" className="password-field__input">
      <button
        type="button"
        className="password-field__toggle"
        onClick={() => setVisible((current) => !current)}
        aria-pressed={visible}
      >
        {visible ? t('auth.hidePassword') : t('auth.showPassword')}
      </button>
    </FormField>
  )
}

export default PasswordField
