import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { updateSettings } from '../../api/meApi.js'
import { useAuth } from '../../hooks/useAuth.js'
import { getLanguage } from '../../i18n/languages.js'
import { getThemePreference, setLocalThemePreference } from '../../utils/theme.js'

// When a user logs in (or opens the app already logged in), apply the preferences saved in their account.
// If the account has none yet (e.g. right after registration), save this device's current choices to it
function PreferencesSync() {
  const { i18n } = useTranslation()
  const { user, updateUser } = useAuth()
  const syncedForRef = useRef(null)

  useEffect(() => {
    if (!user) {
      syncedForRef.current = null
      return
    }
    if (syncedForRef.current === user.username) return
    syncedForRef.current = user.username

    const { language, theme } = user.settings
    const missing = {}
    // A language saved from a newer app version that this build doesn't have is ignored
    if (language) {
      if (getLanguage(language) && language !== i18n.resolvedLanguage) i18n.changeLanguage(language)
    } else {
      missing.language = i18n.resolvedLanguage
    }
    if (theme) setLocalThemePreference(theme)
    else missing.theme = getThemePreference()

    if (Object.keys(missing).length) {
      updateSettings(missing)
        .then((data) => updateUser(data.user))
        .catch(() => {})
    }
  }, [user, i18n, updateUser])

  return null
}

export default PreferencesSync
