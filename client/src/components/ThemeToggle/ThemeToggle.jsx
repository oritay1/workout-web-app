import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { applyTheme, getCurrentTheme, onSystemThemeChange, saveTheme } from '../../utils/theme.js'
import './ThemeToggle.css'

function ThemeToggle() {
  const { t } = useTranslation()
  const [theme, setTheme] = useState(getCurrentTheme)

  useEffect(
    () =>
      onSystemThemeChange((systemTheme) => {
        applyTheme(systemTheme)
        setTheme(systemTheme)
      }),
    [],
  )

  const isDark = theme === 'dark'
  const label = isDark ? t('header.switchToLight') : t('header.switchToDark')

  function toggle() {
    const next = isDark ? 'light' : 'dark'
    saveTheme(next)
    setTheme(next)
  }

  return (
    <button type="button" className="theme-toggle" onClick={toggle} aria-label={label} title={label}>
      {isDark ? (
        <svg className="theme-toggle__icon" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="4.5" />
          <path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8" />
        </svg>
      ) : (
        <svg className="theme-toggle__icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5a8.5 8.5 0 1 0 11 11z" />
        </svg>
      )}
    </button>
  )
}

export default ThemeToggle
