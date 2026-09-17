import { useTranslation } from 'react-i18next'
import { usePreferences } from '../../hooks/usePreferences.js'
import { LANGUAGES } from '../../i18n/languages.js'
import { THEME_PREFERENCES } from '../../utils/theme.js'
import FormField from '../FormField/FormField.jsx'
import SectionCard from '../SectionCard/SectionCard.jsx'

function DisplaySettingsSection() {
  const { t } = useTranslation()
  const { language, themePreference, setLanguage, setThemePreference } = usePreferences()

  return (
    <SectionCard title={t('settings.title')} description={t('settings.description')}>
      <div className="section-form">
        <FormField as="select" label={t('header.language')} value={language} onChange={(event) => setLanguage(event.target.value)}>
          {LANGUAGES.map(({ code, name }) => (
            <option key={code} value={code}>
              {name}
            </option>
          ))}
        </FormField>
        <FormField
          as="select"
          label={t('settings.theme')}
          value={themePreference}
          onChange={(event) => setThemePreference(event.target.value)}
        >
          {THEME_PREFERENCES.map((preference) => (
            <option key={preference} value={preference}>
              {t(`settings.themes.${preference}`)}
            </option>
          ))}
        </FormField>
      </div>
    </SectionCard>
  )
}

export default DisplaySettingsSection
