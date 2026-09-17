import { THEME_KEY } from './storageKeys.js'
import { readStorage, writeStorage } from './storage.js'

export const THEMES = ['light', 'dark']

const darkQuery = window.matchMedia('(prefers-color-scheme: dark)')

// The user's explicit choice, or null when following the system setting
export function getSavedTheme() {
  const theme = readStorage(THEME_KEY)
  return THEMES.includes(theme) ? theme : null
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

export function saveTheme(theme) {
  writeStorage(THEME_KEY, theme)
  applyTheme(theme)
}

// Follow system changes only while the user has not picked a theme
export function onSystemThemeChange(callback) {
  const listener = () => {
    if (!getSavedTheme()) callback(getSystemTheme())
  }
  darkQuery.addEventListener('change', listener)
  return () => darkQuery.removeEventListener('change', listener)
}
