import { useTranslation } from 'react-i18next'
import { LANGUAGES } from '../../i18n/languages.js'
import './LanguageSwitcher.css'

function LanguageSwitcher() {
  const { t, i18n } = useTranslation()

  return (
    <select
      className="language-switcher"
      value={i18n.resolvedLanguage}
      onChange={(event) => i18n.changeLanguage(event.target.value)}
      aria-label={t('header.language')}
    >
      {LANGUAGES.map(({ code, name }) => (
        <option key={code} value={code}>
          {name}
        </option>
      ))}
    </select>
  )
}

export default LanguageSwitcher
