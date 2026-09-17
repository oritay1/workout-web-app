import { useTranslation } from 'react-i18next'
import LanguageSwitcher from '../LanguageSwitcher/LanguageSwitcher.jsx'
import ThemeToggle from '../ThemeToggle/ThemeToggle.jsx'
import './Header.css'

function Header() {
  const { t } = useTranslation()

  return (
    <header className="header">
      <span className="header__title">{t('app.name')}</span>
      <div className="header__actions">
        <LanguageSwitcher />
        <ThemeToggle />
      </div>
    </header>
  )
}

export default Header
