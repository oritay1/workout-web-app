import { useTranslation } from 'react-i18next'
import { usePreferences } from '../../hooks/usePreferences.js'
import { LANGUAGES } from '../../i18n/languages.js'
import './LanguageSwitcher.css'

function LanguageSwitcher() {
  const { t } = useTranslation()
  const { language, setLanguage } = usePreferences()

  return (
    <select
      className="language-switcher"
      value={language}
      onChange={(event) => setLanguage(event.target.value)}
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
