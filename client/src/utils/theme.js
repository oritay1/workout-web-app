import { THEME_KEY } from './storageKeys.js'
import { readStorage, removeStorage, writeStorage } from './storage.js'

export const THEMES = ['light', 'dark']
// What the user chooses; 'system' follows the device setting
export const THEME_PREFERENCES = ['system', 'light', 'dark']

const darkQuery = window.matchMedia('(prefers-color-scheme: dark)')
const preferenceEvents = new EventTarget()

// The user's explicit choice, or null when following the system setting
export function getSavedTheme() {
  const theme = readStorage(THEME_KEY)
  return THEMES.includes(theme) ? theme : null
}

export function getThemePreference() {
  return getSavedTheme() ?? 'system'
}

export function getSystemTheme() {
  return darkQuery.matches ? 'dark' : 'light'
}

export function getCurrentTheme() {
  return getSavedTheme() ?? getSystemTheme()
}

export function applyTheme(theme) {
  document.documentElement.dataset.theme = theme
}

// Saves the choice on this device, applies it and tells every listener (header toggle, settings page)
export function setLocalThemePreference(preference) {
  if (preference === 'system') removeStorage(THEME_KEY)
  else writeStorage(THEME_KEY, preference)
  applyTheme(getCurrentTheme())
  preferenceEvents.dispatchEvent(new Event('change'))
}

export function onThemePreferenceChange(callback) {
  const listener = () => callback(getThemePreference())
  preferenceEvents.addEventListener('change', listener)
  return () => preferenceEvents.removeEventListener('change', listener)
}

// Follow system changes only while the user has not picked a theme
export function onSystemThemeChange(callback) {
  const listener = () => {
    if (!getSavedTheme()) {
      applyTheme(getSystemTheme())
      callback(getSystemTheme())
    }
  }
  darkQuery.addEventListener('change', listener)
  return () => darkQuery.removeEventListener('change', listener)
}
