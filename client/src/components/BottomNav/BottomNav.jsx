import { useTranslation } from 'react-i18next'
import { NavLink, useLocation } from 'react-router'
import { ROUTES } from '../../constants/routes.js'
import './BottomNav.css'

const ITEMS = [
  {
    to: ROUTES.home,
    labelKey: 'nav.home',
    end: true,
    icon: <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />,
  },
  {
    to: ROUTES.plans,
    labelKey: 'nav.plans',
    icon: (
      <>
        <rect x="4" y="5" width="16" height="16" rx="2" />
        <path d="M8 3v4M16 3v4M4 10h16M8 14h3M8 17h6" />
      </>
    ),
  },
  {
    to: ROUTES.history,
    labelKey: 'nav.history',
    icon: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
  },
  {
    to: ROUTES.exercises,
    labelKey: 'nav.exercises',
    icon: <path d="M6.5 6.5v11M17.5 6.5v11M3 9.5v5M21 9.5v5M6.5 12h11" />,
  },
  {
    to: ROUTES.nutrition,
    labelKey: 'nav.nutrition',
    activeFor: [ROUTES.foods],
    icon: (
      <>
        <path d="M12 7c-2-2.5-7-2-7 3.5C5 16 9 21 12 21s7-5 7-10.5C19 5 14 4.5 12 7z" />
        <path d="M12 7c0-2 1-3.5 3-4" />
      </>
    ),
  },
]

// Main navigation for logged-in users, fixed to the bottom of the screen (thumb-friendly on phones)
function BottomNav() {
  const { t } = useTranslation()
  const { pathname } = useLocation()

  return (
    <>
      {/* Keeps page content from hiding behind the fixed bar */}
      <div className="bottom-nav__spacer" aria-hidden="true" />
      <nav className="bottom-nav" aria-label={t('nav.label')}>
        {ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `bottom-nav__link${isActive || item.activeFor?.some((path) => pathname.startsWith(path)) ? ' active' : ''}`
            }
          >
            <svg className="bottom-nav__icon" viewBox="0 0 24 24" aria-hidden="true">
              {item.icon}
            </svg>
            <span>{t(item.labelKey)}</span>
          </NavLink>
        ))}
      </nav>
    </>
  )
}

export default BottomNav
