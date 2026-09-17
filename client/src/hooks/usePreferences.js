import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { updateSettings } from '../api/meApi.js'
import { getThemePreference, onThemePreferenceChange, setLocalThemePreference } from '../utils/theme.js'
import { useAuth } from './useAuth.js'

// Language and light/dark preference: applied on this device right away and, when logged in,
// saved to the account so they follow the user to other devices
export function usePreferences() {
  const { i18n } = useTranslation()
  const { user, updateUser } = useAuth()
  const [themePreference, setThemePreferenceState] = useState(getThemePreference)

  useEffect(() => onThemePreferenceChange(setThemePreferenceState), [])

  const saveToAccount = useCallback(
    (changes) => {
      if (!user) return
      updateSettings(changes)
        .then((data) => updateUser(data.user))
        // The local choice still applies; the account copy is refreshed on the next change
        .catch(() => {})
    },
    [user, updateUser],
  )

  const setLanguage = useCallback(
    (code) => {
      i18n.changeLanguage(code)
      saveToAccount({ language: code })
    },
    [i18n, saveToAccount],
  )

  const setThemePreference = useCallback(
    (preference) => {
      setLocalThemePreference(preference)
      saveToAccount({ theme: preference })
    },
    [saveToAccount],
  )

  return { language: i18n.resolvedLanguage, themePreference, setLanguage, setThemePreference }
}
