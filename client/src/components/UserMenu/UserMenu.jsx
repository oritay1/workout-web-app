import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../hooks/useAuth.js'
import './UserMenu.css'

function UserMenu() {
  const { t } = useTranslation()
  const { user, logout } = useAuth()
  const [open, setOpen] = useState(false)
  const menuRef = useRef(null)

  // Close when clicking outside or pressing Escape
  useEffect(() => {
    if (!open) return
    const handleClick = (event) => {
      if (!menuRef.current?.contains(event.target)) setOpen(false)
    }
    const handleKey = (event) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('pointerdown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [open])

  return (
    <div className="user-menu" ref={menuRef}>
      <button
        type="button"
        className="user-menu__trigger"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={t('userMenu.open')}
      >
        {user.avatar ? (
          <img className="user-menu__avatar" src={user.avatar} alt="" />
        ) : (
          <span className="user-menu__initial" aria-hidden="true">
            {user.username[0].toUpperCase()}
          </span>
        )}
      </button>
      {open && (
        <div className="user-menu__dropdown" role="menu">
          <p className="user-menu__username" dir="ltr">
            {user.username}
          </p>
          <button type="button" className="user-menu__item" role="menuitem" onClick={logout}>
            {t('userMenu.logout')}
          </button>
        </div>
      )}
    </div>
  )
}

export default UserMenu
