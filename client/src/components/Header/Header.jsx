import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { ROUTES } from '../../constants/routes.js'
import { useAuth } from '../../hooks/useAuth.js'
import LanguageSwitcher from '../LanguageSwitcher/LanguageSwitcher.jsx'
import ThemeToggle from '../ThemeToggle/ThemeToggle.jsx'
import UserMenu from '../UserMenu/UserMenu.jsx'
import './Header.css'

function Header() {
  const { t } = useTranslation()
  const { user } = useAuth()

  return (
    <header className="header">
      <Link className="header__title" to={ROUTES.home}>
        {t('app.name')}
      </Link>
      <div className="header__actions">
        <LanguageSwitcher />
        <ThemeToggle />
        {user && <UserMenu />}
      </div>
    </header>
  )
}

export default Header
